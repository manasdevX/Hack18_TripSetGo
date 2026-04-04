import json
import logging
import re
from typing import List, Optional

from app.core.config import get_settings
from app.core.llm import LLMWrapper
from app.schemas.request import StayRequest
from app.schemas.response import StayOption

logger = logging.getLogger(__name__)
settings = get_settings()


class StayService:
    """
    Logic for searching/simulating stay (hotel) options.
    Uses LLM to generate realistic options based on regions and budget.
    """

    def __init__(self) -> None:
        self.llm = LLMWrapper()

    async def search(self, request: StayRequest) -> List[StayOption]:
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
            
            results = []
            for opt in options_data:
                # Ensure total_price is calculated if missing
                if "total_price" not in opt and "price_per_night" in opt:
                    opt["total_price"] = opt["price_per_night"] * request.nights
                elif "price_per_night" not in opt and "total_price" in opt:
                    opt["price_per_night"] = opt["total_price"] / request.nights
                
                results.append(StayOption(**opt))
            
            # 3. Sort by rating (desc) then price (asc)
            results.sort(key=lambda x: (-(x.rating or 0), x.total_price))
            
            return results
            
        except Exception as exc:
            logger.error("[STAY] Failed to parse LLM response: %s", exc)
            logger.debug("[STAY] Raw Output: %s", prompt_output)
            return self._get_fallback_options(request)

    async def _call_llm_for_options(self, request: StayRequest) -> str:
        """
        Ask LLM to generate 3-5 realistic stay options.
        """
        # Build context about areas if available
        areas_context = ""
        if request.destination_context and "best_areas_to_stay" in request.destination_context:
            areas = request.destination_context["best_areas_to_stay"]
            areas_context = f"\nPreferred Areas to stay in {request.destination}: " + ", ".join(areas)

        system_prompt = (
            "You are a specialized Travel Stay & Accommodation Agent. Your goal is to find realistic "
            "stay options (hotels, hostels, airbnbs, resorts) for the given destination and budget.\n\n"
            "Return ONLY a JSON array of objects representing stay options. Each object MUST have:\n"
            "- name: string (Hotel name)\n"
            "- type: string (hotel | hostel | airbnb | resort)\n"
            "- location: string (Specific area in the destination)\n"
            "- price_per_night: number (Price in INR for ONE night)\n"
            "- total_price: number (Total price in INR for the full duration)\n"
            "- currency: string (Fixed as 'INR')\n"
            "- rating: number (1.0 to 5.0)\n"
            "- amenities: list of strings (e.g. ['WiFi', 'Pool', 'Breakfast'])\n"
            "- description: string (Brief 1-sentence highlight)\n\n"
            f"Budget Constraint: The total price for {request.travellers} travelers for {request.nights} nights "
            f"must ideally be around or below {request.target_budget} INR.\n"
            f"Group Dynamic: This is a {request.group_type} trip. Suggest accommodations suited for this dynamic (e.g. suites/safety for families, hostels for solo/friends, romantic spots for couples).\n"
            f"Room Allocation: Suggest accommodations that can comfortably house {request.travellers} people.\n"
            f"{areas_context}\n"
            "Do NOT include any conversational text."
        )

        user_prompt = (
            f"Destination: {request.destination}\n"
            f"Check-in: {request.check_in}\n"
            f"Check-out: {request.check_out}\n"
            f"Duration: {request.nights} nights\n"
            f"Travelers: {request.travellers}\n"
            f"Group Type: {request.group_type}\n"
            f"Target Budget for Stay: {request.target_budget} INR\n"
            f"Preferences: {request.preferences or 'None'}"
        )

        return await self.llm.call(system_prompt, user_prompt, temperature=0.2)

    def _extract_json(self, text: str) -> List[dict]:
        """
        Robustly extract JSON list from LLM output.
        """
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            return json.loads(match.group())
        return json.loads(text)

    def _get_fallback_options(self, request: StayRequest) -> List[StayOption]:
        """
        Basic fallback if LLM fails.
        """
        return [
            StayOption(
                name="Standard Stay",
                type="hotel",
                location=request.destination,
                price_per_night=request.target_budget / request.nights * 0.9,
                total_price=request.target_budget * 0.9,
                rating=4.0,
                amenities=["WiFi", "Standard Room"],
                description="A comfortable budget-friendly option."
            )
        ]
