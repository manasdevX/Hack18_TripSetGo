import logging
from typing import Optional

from app.core.config import get_settings
from app.core.llm import LLMWrapper
from app.schemas.request import NavigationRequest
from app.schemas.response import NavigationResponse, NavigationState

logger = logging.getLogger(__name__)
settings = get_settings()


class NavigationService:
    """
    Service for tracking trip continuity and detecting re-plan triggers.
    Monitors user updates and detects significant deviations.
    """

    def __init__(self) -> None:
        self.llm = LLMWrapper()

    async def process_update(self, request: NavigationRequest) -> NavigationResponse:
        """
        Main entry point: process user update and determine if re-plan is needed.
        """
        # Analyze user update
        trigger_replan, replan_reason = await self._analyze_update(request)
        
        # Update navigation state based on analysis
        updated_state = self._update_state(request.current_state, request.user_update, trigger_replan)
        
        # Generate immediate instruction
        immediate_instruction = self._generate_instruction(
            request.user_update,
            trigger_replan,
            updated_state
        )

        return NavigationResponse(
            updated_state=updated_state,
            trigger_replan=trigger_replan,
            immediate_instruction=immediate_instruction,
            replan_reason=replan_reason
        )

    async def _analyze_update(self, request: NavigationRequest) -> tuple[bool, Optional[str]]:
        """
        Use LLM to analyze if user update is significant enough to trigger re-plan.
        """
        system_prompt = (
            "You are a trip continuity expert. Analyze the user's update on their live trip. "
            "Determine if this update requires a full re-plan by the Orchestrator. "
            "Return ONLY 'YES' or 'NO' - nothing else."
        )

        user_prompt = (
            f"Current Trip Day: {request.current_state.current_day}\n"
            f"Current Location: {request.current_state.current_location}\n"
            f"Destination: {request.destination}\n"
            f"Travellers: {request.travellers} ({request.group_type})\n"
            f"User Update: {request.user_update}\n\n"
            f"Should this update trigger a complete re-plan of remaining trip days? "
            f"Consider the {request.group_type} dynamic. Small delays for {request.travellers} people can cause significant fatigue. "
            f"Consider: flight/transport delays >2 hours, missed activities/transport, "
            f"major schedule conflicts. Ignore minor delays <30 minutes."
        )

        try:
            response = await self.llm.call(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.1,
                max_tokens=10
            )

            should_replan = "YES" in response.upper()
            reason = self._extract_reason(request.user_update) if should_replan else None
            
            return should_replan, reason

        except Exception as exc:
            logger.error("[NAVIGATION] LLM analysis failed: %s", exc)
            # Fallback heuristic-based analysis
            return self._heuristic_replan_check(request)

    def _heuristic_replan_check(self, request: NavigationRequest) -> tuple[bool, Optional[str]]:
        """
        Fallback heuristic to detect re-plan triggers without LLM.
        """
        update_lower = request.user_update.lower()
        
        # Keywords indicating major delays
        major_delay_keywords = ["delayed", "cancelled", "missed", "broken", "accident", "emergency", "stuck"]
        
        # Check for major issues
        for keyword in major_delay_keywords:
            if keyword in update_lower:
                # Check if it mentions significant time
                if any(time_ref in update_lower for time_ref in ["hour", "hours", "2", "3", "4", "5"]):
                    return True, f"Significant delay detected: {request.user_update}"
                    
        # Check for missed activities
        if "missed" in update_lower:
            return True, f"Activity or transport missed: {request.user_update}"
        
        # Default: no re-plan needed for minor issues
        return False, None

    def _update_state(
        self,
        current_state: NavigationState,
        user_update: str,
        trigger_replan: bool
    ) -> NavigationState:
        """
        Update navigation state based on user update.
        """
        updated_state = NavigationState(
            current_day=current_state.current_day,
            current_location=current_state.current_location,
            activities_completed=current_state.activities_completed,
            estimated_next_checkpoint=current_state.estimated_next_checkpoint,
            delays_encountered=current_state.delays_encountered,
            reason=current_state.reason
        )

        # Increment delays if update mentions issues
        if any(keyword in user_update.lower() for keyword in ["delay", "missed", "cancelled", "late", "stuck"]):
            updated_state.delays_encountered += 1
        
        # Update reason
        updated_state.reason = user_update

        # Advance day if explicitly mentioned
        if "next day" in user_update.lower():
            updated_state.current_day += 1
            updated_state.activities_completed = 0

        return updated_state

    def _generate_instruction(
        self,
        user_update: str,
        trigger_replan: bool,
        updated_state: NavigationState
    ) -> str:
        """
        Generate immediate instruction for the user.
        """
        if trigger_replan:
            return (
                f"Your trip plan needs adjustment due to: {user_update[:50]}... "
                f"Please wait while we recalculate your itinerary for the remaining days."
            )
        else:
            # Check delay severity
            if "delay" in user_update.lower() and any(time in user_update for time in ["hour", "hours"]):
                delay_indicator = "slight" if updated_state.delays_encountered == 1 else "multiple"
                return (
                    f"Noted: {user_update} "
                    f"Stay flexible with your schedule. Your main activities remain on track."
                )
            else:
                return f"Understood: {user_update}. Continue with your planned activities."

    def _extract_reason(self, user_update: str) -> str:
        """
        Extract a concise reason from the user update.
        """
        if "flight" in user_update.lower() or "plane" in user_update.lower():
            return "Flight delay or cancellation"
        elif "train" in user_update.lower() or "bus" in user_update.lower():
            return "Transport delay"
        elif "missed" in user_update.lower():
            return "Missed activity or transport"
        elif "accident" in user_update.lower() or "emergency" in user_update.lower():
            return "Emergency or accident"
        else:
            return "Schedule conflict"
