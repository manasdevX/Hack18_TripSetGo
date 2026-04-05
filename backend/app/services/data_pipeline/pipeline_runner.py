"""
TripSetGo Data Pipeline — pipeline_runner.py
=============================================
Orchestrates the full data refresh pipeline:
  1. Fetch trains for all major route pairs
  2. Fetch restaurants for all major destinations
  3. Store results in PostgreSQL cache tables
  4. Update vector store with new embeddings

Can be run:
  - As a scheduled weekly job (via APScheduler)
  - Manually: python pipeline_runner.py [--destination Goa]
"""
from __future__ import annotations
import asyncio
import logging
import sys
import os

# Allow running as script
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))

logger = logging.getLogger(__name__)


async def run_pipeline(destination: str = None, db=None) -> dict:
    """
    Run the full data pipeline.
    Args:
        destination: If set, only process that destination. Otherwise process all.
        db: SQLAlchemy session. If None, creates one.
    Returns dict with counts of items fetched.
    """
    from app.services.data_pipeline.fetch_train_data import run_all_routes, ROUTE_PAIRS
    from app.services.data_pipeline.fetch_restaurant_data import (
        fetch_restaurants_for_destination,
        upsert_restaurants_to_db,
        DESTINATION_COORDS,
    )

    close_db = False
    if db is None:
        from app.database.session import SessionLocal
        db = SessionLocal()
        close_db = True

    results = {"trains_fetched": 0, "restaurants_fetched": 0, "errors": []}

    try:
        # ── 1. Train data ──────────────────────────────────────────────────────
        logger.info("[Pipeline] Starting train data fetch...")
        if destination:
            # Filter route pairs involving this destination
            relevant_pairs = [
                (src, dst) for src, dst in ROUTE_PAIRS
                if destination.lower() in src.lower() or destination.lower() in dst.lower()
            ]
        else:
            from app.services.data_pipeline.fetch_train_data import ROUTE_PAIRS as ALL_PAIRS
            relevant_pairs = ALL_PAIRS

        from app.services.data_pipeline.fetch_train_data import fetch_trains_for_route, _upsert_transport_cache
        for source, dest in relevant_pairs:
            try:
                trains = await fetch_trains_for_route(source, dest)
                if trains:
                    _upsert_transport_cache(db, source, dest, trains)
                    results["trains_fetched"] += len(trains)
                    logger.info("[Pipeline] ✓ Trains %s→%s: %d", source, dest, len(trains))
            except Exception as e:
                err = f"Train {source}→{dest}: {e}"
                results["errors"].append(err)
                logger.error("[Pipeline] %s", err)

        # ── 2. Restaurant data ─────────────────────────────────────────────────
        logger.info("[Pipeline] Starting restaurant data fetch...")
        destinations_to_fetch = (
            [destination] if destination
            else list(DESTINATION_COORDS.keys())
        )

        for dest in destinations_to_fetch:
            try:
                restaurants = await fetch_restaurants_for_destination(dest)
                if restaurants:
                    upsert_restaurants_to_db(db, restaurants)
                    results["restaurants_fetched"] += len(restaurants)
                    logger.info("[Pipeline] ✓ Restaurants %s: %d", dest, len(restaurants))
            except Exception as e:
                err = f"Restaurants {dest}: {e}"
                results["errors"].append(err)
                logger.error("[Pipeline] %s", err)

        logger.info("[Pipeline] ✅ Done! Trains: %d | Restaurants: %d | Errors: %d",
                    results["trains_fetched"], results["restaurants_fetched"], len(results["errors"]))

    except Exception as e:
        logger.error("[Pipeline] Fatal error: %s", e)
        results["errors"].append(str(e))
    finally:
        if close_db:
            db.close()

    return results


# ── Convenience function for scheduler ────────────────────────────────────────

async def run_weekly_pipeline():
    """Called by APScheduler weekly. Runs full refresh."""
    logger.info("[Pipeline] Weekly refresh triggered")
    try:
        results = await run_pipeline()
        logger.info("[Pipeline] Weekly refresh complete: %s", results)
    except Exception as e:
        logger.error("[Pipeline] Weekly refresh failed: %s", e)


# ── CLI entry point ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")

    parser = argparse.ArgumentParser(description="TripSetGo Data Pipeline")
    parser.add_argument("--destination", type=str, default=None,
                        help="Only fetch data for this destination (e.g. 'Goa')")
    args = parser.parse_args()

    # Run pipeline
    asyncio.run(run_pipeline(destination=args.destination))
