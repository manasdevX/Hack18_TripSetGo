import logging
from typing import Optional, List, Tuple

from app.core.config import get_settings
from app.core.llm import LLMWrapper
from app.schemas.request import IntentRequest
from app.schemas.response import IntentResponse

logger = logging.getLogger(__name__)
settings = get_settings()


class IntentService:
    """
    Logic for validating user intent and completing missing fields.
    """

    def __init__(self) -> None:
        self.llm = LLMWrapper()

    async def validate(self, request: IntentRequest) -> IntentResponse:
        """
        Main validation entry point.
        """
        # 0. Infer defaults for group_aware planning
        if request.travellers == 1 and not request.group_type:
            request.group_type = "solo"
        elif request.travellers == 2 and not request.group_type:
            request.group_type = "couple"
        
        # 1. Programmatic validation
        missing_fields = self._get_missing_fields(request)
        
        if not missing_fields:
            # All required fields are present
            # Optional: Perform semantic validation (dates logic etc.)
            if request.start_date and request.return_date and request.return_date <= request.start_date:
                return IntentResponse(
                    status="incomplete",
                    question="I noticed your return date is before or equal to your start date. Could you please check the dates?"
                )
            
            return IntentResponse(status="success")

        # 2. Re-planning validation (special case)
        if request.replan and not request.navigation_state:
            return IntentResponse(
                status="incomplete",
                question="It looks like you're trying to re-plan, but I'm missing your current trip progress. What happened during your trip?"
            )

        # 3. Handle missing fields via LLM
        question = await self._generate_missing_info_question(request, missing_fields)
        
        return IntentResponse(
            status="incomplete",
            question=question
        )

    def _get_missing_fields(self, request: IntentRequest) -> List[str]:
        """
        Check for missing required fields as defined in settings.
        """
        missing = []
        for field in settings.REQUIRED_FIELDS:
            val = getattr(request, field, None)
            if val is None or (isinstance(val, str) and not val.strip()):
                missing.append(field)
        return missing

    async def _generate_missing_info_question(self, request: IntentRequest, missing: List[str]) -> str:
        """
        Use LLM to generate a natural, helpful question based on missing fields.
        """
        system_prompt = (
            "You are the Intent Agent for TripSetGo. Your goal is to help users complete their trip plan. "
            "The following fields are missing from their current request: " + ", ".join(missing) + ". "
            "Generate a Friendly, concise, and helpful question to ask the user for this missing information. "
            "If multiple fields are missing, ask for all of them in a conversational way. "
            "Do NOT output anything other than the question text."
        )
        
        # Build user context
        context = []
        if request.source: context.append(f"Source: {request.source}")
        if request.destination: context.append(f"Destination: {request.destination}")
        if request.start_date: context.append(f"Starts: {request.start_date}")
        if request.return_date: context.append(f"Returns: {request.return_date}")
        if request.budget: context.append(f"Budget: {request.budget}")
        if request.travellers: context.append(f"Travellers: {request.travellers}")
        if request.group_type: context.append(f"Group Type: {request.group_type}")
        if request.preferences: context.append(f"Preferences: {request.preferences}")

        user_prompt = "CurrentUserContext:\n" + "\n".join(context) if context else "No context provided yet. The user just started planning."

        try:
            return await self.llm.call(system_prompt, user_prompt)
        except Exception as exc:
            logger.error("[INTENT] LLM question generation failed: %s", exc)
            # Generic fallback
            field_names = [f.replace('_', ' ') for f in missing]
            return f"I see you're planning a trip! To help you better, could you provide your {', '.join(field_names)}?"
