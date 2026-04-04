import json
import logging
from typing import List, Dict, Any, Optional

from app.core.config import get_settings
from app.core.llm import LLMWrapper
from app.schemas.request import ItineraryRequest
from app.schemas.response import DayPlan, ItineraryResponse

logger = logging.getLogger(__name__)
settings = get_settings()


class ItineraryService:
    """
    Service for generating day-by-day itineraries.
    Synthesizes destination context with transport/stay constraints.
    """

    def __init__(self) -> None:
        self.llm = LLMWrapper()

    async def generate_itinerary(self, request: ItineraryRequest) -> ItineraryResponse:
        """
        Main entry point: generate day-by-day itinerary plan.
        """
        # Build context for LLM
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(request)

        try:
            # Call LLM to generate activities and structure
            raw_response = await self.llm.call(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.4,
                max_tokens=2000
            )

            # Parse JSON response
            itinerary_data = self._parse_json_response(raw_response)
            
            # Convert to response models
            day_plans = self._create_day_plans(itinerary_data.get("days", []))
            travel_tips = itinerary_data.get("travel_tips", "")

            return ItineraryResponse(
                days=day_plans,
                travel_tips=travel_tips
            )

        except Exception as exc:
            logger.error("[ITINERARY] Itinerary generation failed: %s", exc)
            # Fallback: generate basic itinerary
            return await self._generate_fallback_itinerary(request)

    def _build_system_prompt(self) -> str:
        """
        Build system prompt for LLM to ensure structured itinerary output.
        """
        return (
            "You are an expert travel planner. Your task is to create a detailed, "
            "day-by-day itinerary based on destination context, transport, and accommodation details. "
            "Each day must include Morning, Afternoon, and Evening activities. "
            "Suggest activities from the provided destination areas and tips. "
            "Return a valid JSON object with 'days' array and 'travel_tips' string. "
            "Each day object must have 'day_number' (int), 'activities' (array of {time, task}), and 'notes' (optional string). "
            "DO NOT include markdown or conversational text. RETURN ONLY THE JSON."
        )

    def _build_user_prompt(self, request: ItineraryRequest) -> str:
        """
        Build user prompt with all itinerary constraints.
        """
        areas_str = ", ".join(request.destination_context.areas)
        attractions_str = ", ".join(request.destination_context.top_attractions)
        best_areas_str = ", ".join(request.destination_context.best_areas_to_stay)
        
        prompt = (
            f"Trip Destination: {request.destination}\n"
            f"Duration: {request.num_days} days\n"
            f"Accommodation: {request.stay_details.name} ({request.stay_details.category or 'Standard'}) "
            f"in {request.stay_details.location or request.destination}\n"
            f"Transport: {request.transport_details.mode} ({request.transport_details.description or 'Standard'})\n"
            f"Check-in: Day 1, Check-out: Day {request.num_days}\n\n"
            f"Destination Context:\n"
            f"Weather: {request.destination_context.weather_summary}\n"
            f"Popular Areas: {areas_str}\n"
            f"Must-Visit Attractions: {attractions_str}\n"
            f"Best Stay Areas: {best_areas_str}\n"
            f"Local Tips: {request.destination_context.local_tips}\n"
            f"Travel Advisories: {', '.join(request.destination_context.travel_advisories)}\n\n"
            f"Group Dynamic: {request.travellers} travellers as a {request.group_type} trip.\n"
            f"User Preferences: {request.preferences or 'No specific preferences'}\n\n"
            f"Create a detailed {request.num_days}-day itinerary with Morning/Afternoon/Evening activities each day. "
            f"Tailor the activities and pace for a {request.group_type} group dynamic. "
            f"CRITICAL: You must explicitly include visits to the Must-Visit Attractions listed above. "
            f"Use the provided areas and tips. Be creative but realistic."
        )
        return prompt

    def _parse_json_response(self, response: str) -> Dict[str, Any]:
        """
        Parse JSON from LLM response.
        Remove markdown code blocks if present.
        """
        cleaned_response = response.strip()

        # Remove markdown code blocks if present
        if cleaned_response.startswith("```"):
            first_newline = cleaned_response.find("\n")
            if first_newline != -1:
                cleaned_response = cleaned_response[first_newline + 1:]

            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]

        cleaned_response = cleaned_response.strip()

        # Parse JSON
        return json.loads(cleaned_response)

    def _create_day_plans(self, days_data: List[Dict[str, Any]]) -> List[DayPlan]:
        """
        Convert LLM-generated day data into DayPlan models.
        """
        day_plans = []
        for day_data in days_data:
            day_plan = DayPlan(
                day_number=day_data.get("day_number", len(day_plans) + 1),
                activities=day_data.get("activities", []),
                notes=day_data.get("notes")
            )
            day_plans.append(day_plan)
        return day_plans

    async def _generate_fallback_itinerary(self, request: ItineraryRequest) -> ItineraryResponse:
        """
        Generate a basic fallback itinerary if LLM fails, using real top attractions.
        """
        day_plans = []
        # Fallback to areas if attractions are somehow missing
        attractions = request.destination_context.top_attractions
        if not attractions:
            attractions = request.destination_context.areas
        if not attractions:
            attractions = [request.destination]
            
        for day in range(1, request.num_days + 1):
            target_place = attractions[day % len(attractions)]
            activities = [
                {"time": "Morning", "task": f"Visit {target_place} and explore the surroundings"},
                {"time": "Afternoon", "task": f"Lunch near {target_place} and shopping/local walks"},
                {"time": "Evening", "task": "Dinner and local entertainment"}
            ]
            
            if day == 1:
                activities[0] = {"time": "Morning", "task": "Check into accommodation and rest"}
            elif day == request.num_days:
                activities[2] = {"time": "Evening", "task": "Pack and prepare for departure"}
            
            day_plans.append(DayPlan(
                day_number=day,
                activities=activities,
                notes=f"Day {day} in {request.destination} - Focus on {target_place}"
            ))

        return ItineraryResponse(
            days=day_plans,
            travel_tips=request.destination_context.local_tips
        )
