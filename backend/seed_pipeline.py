"""
Initial data seed — populates transport_cache and restaurant_cache
with mock data so the planning engine has data from day one.
"""
import asyncio
import sys
sys.path.insert(0, '/app')

async def main():
    from app.database.session import SessionLocal
    from app.services.data_pipeline.pipeline_runner import run_pipeline
    db = SessionLocal()
    print("Starting initial data seed...")
    results = await run_pipeline(db=db)
    db.close()
    print(f"Seed complete: {results}")

asyncio.run(main())
