"""
Travel RAG Service — Enriches agent prompts with real destination knowledge.
Uses a lightweight in-memory store built from destination JSON files.
Falls back gracefully if files are unavailable.
"""
import json
import logging
import os
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# Path to the destinations data directory
DATA_DIR = Path(__file__).parent.parent.parent / "data" / "destinations"


class TravelRAG:
    """
    Lightweight RAG layer for enriching agent prompts with real destination knowledge.
    Loaded once at startup and kept in memory for fast lookups.
    """

    def __init__(self):
        self.knowledge_base: Dict[str, Any] = {}
        self._load_knowledge_base()

    def _load_knowledge_base(self) -> None:
        """Load destination knowledge from JSON files in data/destinations/."""
        try:
            if not DATA_DIR.exists():
                logger.warning("[RAG] Data directory not found: %s", DATA_DIR)
                return

            for json_file in DATA_DIR.glob("*.json"):
                try:
                    with open(json_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if isinstance(data, dict):
                            self.knowledge_base.update(data)
                    logger.info("[RAG] Loaded %d destinations from %s", len(data), json_file.name)
                except Exception as e:
                    logger.warning("[RAG] Failed to load %s: %s", json_file, e)

        except Exception as e:
            logger.error("[RAG] Knowledge base loading failed: %s", e)

    def _normalize_key(self, destination: str) -> Optional[str]:
        """Normalize destination name to match knowledge base keys."""
        normalized = destination.lower().strip()

        # Direct match
        if normalized in self.knowledge_base:
            return normalized

        # Partial match (e.g. "Goa, India" matches "goa")
        for key in self.knowledge_base:
            if key in normalized or normalized.startswith(key):
                return key

        # Word-by-word match
        dest_words = normalized.replace("-", " ").replace(",", "").split()
        for key in self.knowledge_base:
            key_words = key.replace("_", " ").split()
            if any(word in key_words for word in dest_words):
                return key

        return None

    def get_destination_context(self, destination: str) -> str:
        """
        Returns relevant context about the destination to inject into agent prompts.
        Returns empty string if destination not found (graceful degradation).
        """
        key = self._normalize_key(destination)
        if not key or key not in self.knowledge_base:
            return ""

        data = self.knowledge_base[key]
        context_parts = []

        if data.get("overview"):
            context_parts.append(f"DESTINATION OVERVIEW: {data['overview']}")

        if data.get("best_months"):
            context_parts.append(f"BEST MONTHS: {', '.join(data['best_months'])}")

        if data.get("avoid_months"):
            context_parts.append(f"AVOID MONTHS: {', '.join(data['avoid_months'])}")

        if data.get("must_eat"):
            context_parts.append(f"MUST EAT: {', '.join(data['must_eat'][:5])}")

        if data.get("famous_spots"):
            context_parts.append(f"FAMOUS SPOTS: {', '.join(data['famous_spots'][:5])}")

        if data.get("hidden_gems"):
            context_parts.append(f"HIDDEN GEMS: {', '.join(data['hidden_gems'][:3])}")

        return "\n".join(context_parts)

    def get_seasonal_tips(self, destination: str, month: str) -> List[str]:
        """Returns seasonal tips for the destination in the given month."""
        key = self._normalize_key(destination)
        if not key or key not in self.knowledge_base:
            return []

        data = self.knowledge_base[key]
        seasonal = data.get("seasonal_tips", {})

        # Look for the specific month
        for month_key, tip in seasonal.items():
            if month.lower() in month_key.lower() or month_key.lower() in month.lower():
                return [tip]

        # Return generic tip
        best_months = data.get("best_months", [])
        avoid_months = data.get("avoid_months", [])

        tips = []
        if month in best_months:
            tips.append(f"{month} is one of the BEST times to visit {destination}.")
        elif month in avoid_months:
            tips.append(f"⚠️ {month} is NOT ideal for {destination} (off-season/monsoon). Budget prices are lower but some facilities may be closed.")

        return tips

    def get_price_benchmarks(self, destination: str) -> Dict[str, Any]:
        """Returns typical price benchmarks for food, transport, stay."""
        key = self._normalize_key(destination)
        if not key or key not in self.knowledge_base:
            return {}

        return self.knowledge_base[key].get("price_benchmarks", {})

    def get_enriched_prompt_context(self, destination: str, month: str) -> str:
        """
        Returns a full enriched context string ready to inject into any agent prompt.
        Combines destination overview, seasonal tips, and price benchmarks.
        """
        destination_ctx = self.get_destination_context(destination)
        seasonal_tips = self.get_seasonal_tips(destination, month)
        price_benchmarks = self.get_price_benchmarks(destination)

        if not destination_ctx and not price_benchmarks:
            return ""

        parts = ["=== DESTINATION KNOWLEDGE BASE (use to ground your response in reality) ==="]

        if destination_ctx:
            parts.append(destination_ctx)

        if seasonal_tips:
            parts.append(f"\nSEASONAL TIPS FOR {month.upper()}:")
            parts.extend(f"  • {tip}" for tip in seasonal_tips)

        if price_benchmarks:
            parts.append(f"\nPRICE BENCHMARKS FOR {destination.upper()} (2024-2025 INR):")
            for key, value in price_benchmarks.items():
                label = key.replace("_", " ").title()
                parts.append(f"  • {label}: ₹{value:,}" if isinstance(value, (int, float)) else f"  • {label}: {value}")

        parts.append("=== END KNOWLEDGE BASE ===\n")
        return "\n".join(parts)


# Singleton instance
travel_rag = TravelRAG()
