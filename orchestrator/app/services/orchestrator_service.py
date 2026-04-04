"""
Orchestrator service — Public API for the TripSetGo 2.0 architecture.
"""
import logging
from typing import Optional, Dict, Any

from app.core.cache import cache_manager
from app.schemas.request import TripPlanRequest, PartialTripRequest
from app.schemas.response import TripPlanResponse
from app.services.workflow import build_orchestrator_graph

logger = logging.getLogger(__name__)


class OrchestratorService:
    """
    Manages the LangGraph execution for fresh planning and replanning.
    """

    def __init__(self) -> None:
        self._graph = build_orchestrator_graph().compile()

    async def plan_trip(self, request: TripPlanRequest) -> TripPlanResponse:
        """Execute the full 7-agent orchestration pipeline."""
        
        # Check cache first for full response
        if request.use_cache:
            cache_key_kwargs = {
                "source": request.source,
                "destination": request.destination,
                "start": str(request.start_date),
                "end": str(request.return_date),
                "budget": request.budget,
                "replan": request.replan
            }
            cached = await cache_manager.get_full_response(**cache_key_kwargs)
            if cached:
                logger.info("[ORCH] Full Response Cache HIT!")
                return TripPlanResponse(**cached)

        initial_state = {
            "request": request,
            "cache_hits": 0,
            "agent_metrics": [],
            "missing_agents": [],
            "warnings": []
        }

        try:
            final_state = await self._graph.ainvoke(initial_state)
        except Exception as exc:
            logger.exception("[ORCH] Workflow Failure: %s", exc)
            return TripPlanResponse(
                status="error",
                warnings=[f"Internal Orchestrator Failure: {str(exc)}"]
            )

        response: TripPlanResponse = final_state.get("response")
        
        # Handle "Incomplete" intent result specifically
        intent_data = final_state.get("intent_data", {})
        if intent_data.get("status") == "incomplete":
            response.status = "need_more_info"
            response.question = intent_data.get("question", "What is your budget?")
            return response

        # Store in cache
        if response and response.status in ("success", "partial_success") and request.use_cache:
            cache_key_kwargs = {
                "source": request.source,
                "destination": request.destination,
                "start": str(request.start_date),
                "end": str(request.return_date),
                "budget": request.budget,
                "replan": request.replan
            }
            await cache_manager.set_full_response(response.model_dump(), **cache_key_kwargs)

        return response


# Singleton
orchestrator_service = OrchestratorService()
