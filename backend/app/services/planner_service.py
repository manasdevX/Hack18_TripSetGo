"""
Phase 3: RAG-Powered Planner Service
======================================
Core service that grounds all trip generation in the private knowledge base.

Flow:
    1. User provides: destination, budget (INR), days
    2. Retriever fetches relevant facts from ChromaDB
    3. Groq LLM generates a structured itinerary using ONLY those facts
    4. Returns a verified JSON itinerary

Usage by agents:
    from app.services.planner_service import planner_service
    result = await planner_service.generate_trip_plan("Goa", 25000, 3)
"""

import os
import json
import logging
from typing import Optional
from datetime import datetime

from dotenv import load_dotenv
from groq import AsyncGroq

from app.rag.retriever import TripRetriever, get_retriever

load_dotenv()
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────

GROQ_MODEL = "llama-3.3-70b-versatile"   # Best for structured JSON output; fallback: mixtral-8x7b-32768
MAX_TOKENS = 4096
TEMPERATURE = 0.15               # Low: factual grounding is more important than creativity

# Strict system prompt — the LLM must NOT go beyond the provided context
_SYSTEM_PROMPT = """\
You are TripSetGo's expert travel planner.

Your SOLE job is to construct a detailed, day-by-day trip itinerary using ONLY the information \
provided in the "Knowledge Base Context" section below.

### CRITICAL RULES — NEVER BREAK THESE:
1. You MUST NOT hallucinate, invent, or assume any hotel name, price, rating, restaurant, or attraction \
   that is NOT explicitly present in the Knowledge Base Context.
2. If the context is insufficient or contains "NO_CONTEXT_FOUND", you MUST respond with a valid JSON \
   explaining the limitation — do NOT make up alternatives.
3. All prices MUST come directly from the context. Do not estimate or guess.
4. Use ONLY the hotels and activities listed in the context.

### REQUIRED OUTPUT FORMAT:
Return a single, valid JSON object with this exact structure:
{
  "destination": "<city name>",
  "total_days": <integer>,
  "total_estimated_cost_inr": <float>,
  "within_budget": <boolean>,
  "itinerary": [
    {
      "day": <integer>,
      "date_label": "<e.g. Day 1 – Arrival>",
      "morning": "<activity with location name>",
      "afternoon": "<activity with location name>",
      "evening": "<activity or restaurant name>",
      "accommodation": "<hotel name and price per night in INR from context>",
      "meals_summary": "<brief description>",
      "estimated_day_cost_inr": <float>
    }
  ],
  "recommended_hotels": [
    {
      "name": "<from context>",
      "area": "<from context>",
      "price_per_night_inr": <float>,
      "rating": <float or null>,
      "why_recommended": "<brief reason from context>"
    }
  ],
  "travel_tips": ["<tip from context>"],
  "context_limitation": "<null or a brief note if context was insufficient>"
}

Do NOT include any text outside the JSON object.
"""


class PlannerService:
    """
    TripSetGo RAG-Powered Planner Service.

    Every itinerary generation goes through:
        Retrieve → Augment → Generate → Parse → Return
    """

    def __init__(self, retriever: Optional[TripRetriever] = None) -> None:
        self.retriever = retriever or get_retriever()
        self._groq_api_key = os.getenv("GROQ_API_KEY", "")
        self._client: Optional[AsyncGroq] = None

    def _get_client(self) -> AsyncGroq:
        """Lazily initialize the Groq async client."""
        if self._client is None:
            if not self._groq_api_key:
                raise RuntimeError(
                    "GROQ_API_KEY is not set. Please add it to your backend/.env file. "
                    "Get a free key at https://console.groq.com/keys"
                )
            self._client = AsyncGroq(api_key=self._groq_api_key)
        return self._client

    async def generate_trip_plan(
        self,
        destination: str,
        budget: float,
        days: int,
        source_city: Optional[str] = None,
        preferences: Optional[str] = None,
    ) -> dict:
        """
        Generate a fully grounded trip plan.

        Args:
            destination:  Target city (e.g. "Goa", "Manali").
            budget:       Total budget in INR.
            days:         Number of travel days.
            source_city:  Departure city for transport context (optional).
            preferences:  Free-text preferences (e.g. "vegetarian, adventure sports").

        Returns:
            dict: Structured JSON itinerary, or an error dict.
        """
        if not destination:
            return {"error": "Destination is required."}

        logger.info(f"[PLANNER] Planning: {destination} | {days}d | ₹{budget:,.0f}")

        # ─────────────────────────────────────────────
        # STEP A: Retrieve grounded context from ChromaDB
        # ─────────────────────────────────────────────
        queries = [
            f"Top hotels and accommodation in {destination} with price per night in INR",
            f"Best restaurants and local food in {destination}",
            f"Must-visit tourist attractions and sightseeing in {destination}",
            f"Travel tips, weather, and local advice for {destination}",
        ]
        if source_city:
            queries.append(f"Transportation from {source_city} to {destination}")

        # Fetch context for all sub-queries and merge
        context_parts = []
        for query in queries:
            result = await self.retriever.search_knowledge_base(query, top_k=2)
            if result and result != "NO_CONTEXT_FOUND" and "[RETRIEVAL_ERROR]" not in result:
                context_parts.append(result)

        context_str = "\n\n---\n\n".join(context_parts) if context_parts else "NO_CONTEXT_FOUND"
        logger.info(f"[PLANNER] Context assembled ({len(context_str)} chars)")

        # ─────────────────────────────────────────────
        # STEP B: Construct user prompt
        # ─────────────────────────────────────────────
        from_clause = f" from {source_city}" if source_city else ""
        pref_clause = f"\nUser preferences: {preferences}" if preferences else ""
        budget_per_day = budget / days if days > 0 else budget

        user_prompt = f"""\
Plan a {days}-day trip to {destination}{from_clause}.

Trip details:
- Total budget: ₹{budget:,.0f} INR
- Budget per day (approx): ₹{budget_per_day:,.0f} INR
- Number of days: {days}{pref_clause}

### Knowledge Base Context:
{context_str}

Generate the complete itinerary JSON now. Remember: ONLY use information from the Knowledge Base Context above.
"""

        # ─────────────────────────────────────────────
        # STEP C: Generate via Groq
        # ─────────────────────────────────────────────
        try:
            client = self._get_client()
            logger.info(f"[PLANNER] Calling Groq ({GROQ_MODEL})...")

            completion = await client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=TEMPERATURE,
                max_tokens=MAX_TOKENS,
                response_format={"type": "json_object"},
            )

            raw_text = completion.choices[0].message.content.strip()
            logger.info(f"[PLANNER] Groq responded ({len(raw_text)} chars)")

        except RuntimeError as e:
            logger.error(f"[PLANNER] Client init failed: {e}")
            return {"error": str(e)}
        except Exception as e:
            logger.error(f"[PLANNER] Groq API call failed: {e}")
            return {"error": f"LLM generation failed: {e}"}

        # ─────────────────────────────────────────────
        # STEP D: Parse & validate JSON response
        # ─────────────────────────────────────────────
        try:
            plan = json.loads(raw_text)
        except json.JSONDecodeError:
            # Attempt to extract JSON if there's surrounding text
            import re
            json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
            if json_match:
                try:
                    plan = json.loads(json_match.group())
                except Exception:
                    logger.error("[PLANNER] Failed to parse Groq JSON response.")
                    return {"error": "LLM returned malformed JSON.", "raw": raw_text}
            else:
                return {"error": "LLM returned non-JSON content.", "raw": raw_text}

        # Attach generation metadata
        plan["_meta"] = {
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "model": GROQ_MODEL,
            "context_retrieved": len(context_parts) > 0 and context_str != "NO_CONTEXT_FOUND",
        }

        logger.info(f"[PLANNER] ✅ Plan generated for {destination} ({days}d)")
        return plan

    async def quick_plan(self, destination: str, budget: float, days: int) -> dict:
        """Convenience wrapper for simple API calls."""
        return await self.generate_trip_plan(
            destination=destination,
            budget=budget,
            days=days
        )


# ─────────────────────────────────────────────────────────────
# Singleton instance for use across the app
# ─────────────────────────────────────────────────────────────
planner_service = PlannerService()
