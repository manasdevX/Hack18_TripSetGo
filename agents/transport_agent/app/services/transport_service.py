import json
import logging
import re
from typing import List, Optional

from app.core.config import get_settings
from app.core.llm import LLMWrapper
from app.schemas.request import TransportRequest
from app.schemas.response import TransportOption

logger = logging.getLogger(__name__)
settings = get_settings()


class TransportService:
    """
    Logic for searching/simulating transport options.
    Uses LLM to generate realistic options based on routes and budget.
    """

    def __init__(self) -> None:
        self.llm = LLMWrapper()

    async def search(self, request: TransportRequest) -> List[TransportOption]:
        """
        Main search entry point.
        """
        # 1. Generate options via LLM
        prompt_output = await self._call_llm_for_options(request)
        
        # 2. Parse JSON from LLM output
        try:
            options_data = self._extract_json(prompt_output)
            if not isinstance(options_data, list):
                if isinstance(options_data, dict) and "results" in options_data:
                    options_data = options_data["results"]
                else:
                    options_data = []
            
            results = [TransportOption(**opt) for opt in options_data]
            
            # 3. Filter/Sort by price (ensure within target_budget)
            # Orchestrator does its own ranking, but we should be helpful
            results.sort(key=lambda x: x.price)
            
            return results
            
        except Exception as exc:
            logger.error("[TRANSPORT] Failed to parse LLM response: %s", exc)
            logger.debug("[TRANSPORT] Raw Output: %s", prompt_output)
            return self._get_fallback_options(request)

    async def _call_llm_for_options(self, request: TransportRequest) -> str:
        """
        Ask LLM to generate 3-5 realistic transport options.
        """
        system_prompt = (
            "You are a specialized Travel Transport Agent. Your goal is to find realistic transportation "
            "options (flight, train, bus, cab) for the given route and budget.\n\n"
            "Return ONLY a JSON array of objects representing transport options. Each object MUST have:\n"
            "- mode: string (flight | train | bus | cab)\n"
            "- provider: string (Airline name, Train operator, etc.)\n"
            "- departure: string (Time and location, e.g. '08:00 Mumbai T2')\n"
            "- arrival: string (Time and location, e.g. '11:30 Delhi T3')\n"
            "- price: number (Total price in INR for all travelers)\n"
            "- currency: string (Fixed as 'INR')\n"
            "- class_type: string (economy | business | sleeper | AC)\n"
            "- duration_minutes: number\n\n"
            "Budget Constraint: The total price for ALL travelers must ideally be around or below "
            f"{request.target_budget} INR. If it is impossible, provide the cheapest available.\n"
            f"Group Dynamic: Optimize for a {request.group_type} trip. (e.g. comfort for families, speed for solo).\n"
            "Do NOT include any conversational text."
        )

        user_prompt = (
            f"Route: {request.source} to {request.destination}\n"
            f"Dates: {request.start_date} to {request.return_date}\n"
            f"Travelers: {request.travellers}\n"
            f"Group Type: {request.group_type}\n"
            f"Target Budget for Transport: {request.target_budget} INR\n"
            f"Preferences: {request.preferences or 'None'}\n"
            f"Destination Context: {json.dumps(request.destination_context) if request.destination_context else 'None'}"
        )

        return await self.llm.call(system_prompt, user_prompt, temperature=0.1)

    def _extract_json(self, text: str) -> List[dict]:
        """
        Robustly extract JSON list from LLM output.
        """
        # Look for the first '[' and last ']'
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            return json.loads(match.group())
        
        # Try to parse the whole thing if no brackets
        return json.loads(text)

    def _get_fallback_options(self, request: TransportRequest) -> List[TransportOption]:
        """
        Basic fallback if LLM fails.
        """
        return [
            TransportOption(
                mode="flight" if "international" in (request.preferences or "").lower() else "train",
                provider="Generic Carrier",
                departure="Morning",
                arrival="Afternoon",
                price=request.target_budget * 0.8,
                class_type="Economy"
            )
        ]
