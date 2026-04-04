"""
FastAPI route handlers for TripSetGo 2.0 Orchestrator.
Endpoints:
  POST /plan-trip         - Full Trip Execution (New or Replan)
  POST /plan-trip/partial - Partial Intent Recognition
"""
import logging

from fastapi import APIRouter, HTTPException, status

from app.schemas.request import TripPlanRequest, PartialTripRequest
from app.schemas.response import TripPlanResponse
from app.services.orchestrator_service import orchestrator_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/plan-trip", tags=["Orchestrator"])


@router.post(
    "",
    response_model=TripPlanResponse,
    summary="Plan a trip / re-plan a trip",
    description=(
        "Executes 7-agent parallel orchestration. Supports fresh planning "
        "and re-planning from existing navigation state."
    ),
    status_code=status.HTTP_200_OK,
)
async def plan_trip(request: TripPlanRequest) -> TripPlanResponse:
    """
    Core Planning Pipeline.

    - Intent check (first stage)
    - Destination analysis
    - Parallel execution (Transport, Stay, Budget)
    - Budget loop
    - Itinerary/Navigation generation
    """
    logger.info("[ENDPOINT] POST /plan-trip (replan=%s)", request.replan)
    response = await orchestrator_service.plan_trip(request)

    if response.status == "error":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=response.warnings,
        )

    return response


@router.post(
    "/partial",
    response_model=TripPlanResponse,
    summary="Conversational Input Handling",
    description="Same as /plan-trip but allows for missing fields and conversational flow.",
    status_code=status.HTTP_200_OK,
)
async def plan_trip_partial(request: PartialTripRequest) -> TripPlanResponse:
    """
    Partial planning API.
    
    Checks missing fields first before moving to Intent Agent.
    """
    logger.info("[ENDPOINT] POST /plan-trip/partial")
    
    # ── Quick local missing field check ─────────────────────────────────────
    required = ["source", "destination", "start_date", "return_date", "budget", "travellers", "group_type"]
    missing = [f for f in required if getattr(request, f) is None]
    
    if missing:
        # Prompt user directly
        field_questions = {
            "source": "What city are you departing from?",
            "destination": "Where would you like to travel?",
            "start_date": "When would you like to leave?",
            "return_date": "When are you returning?",
            "budget": "What is your total budget in INR?",
            "travellers": "How many people are traveling?",
            "group_type": "Is this a solo, couple, family, or friends trip?"
        }
        return TripPlanResponse(
            status="need_more_info", 
            question=field_questions.get(missing[0], "Missing some info..."),
            warnings=[f"Missing required fields: {', '.join(missing)}"]
        )

    # If all present: convert to TripPlanRequest and full plan
    full_req = TripPlanRequest(**request.model_dump())
    return await orchestrator_service.plan_trip(full_req)
