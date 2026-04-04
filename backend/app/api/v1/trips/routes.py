"""
Trips Planning API Routes — Deterministic Engine
=================================================
Replaces the LLM orchestrator with a fast, rule-based planning engine.
Response time: <100ms (vs 30-60s LLM).
"""

from datetime import date
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.models.user import User
from app.database.session import get_db
from app.services.subscription_service import check_and_increment_usage
from app.planning_engine import TripPlanner, TripPlanInput

router = APIRouter()

_planner = TripPlanner()  # Singleton — no state, thread-safe


class TripPlanRequest(BaseModel):
    source: str = Field(..., min_length=2, description="Departure city")
    destination: str = Field(..., min_length=2, description="Destination city")
    start_date: date = Field(..., description="Trip start date (YYYY-MM-DD)")
    end_date: date = Field(..., description="Trip end date (YYYY-MM-DD)")
    budget: float = Field(..., gt=0, description="Total budget (INR)")
    num_travelers: int = Field(default=1, ge=1, le=20, description="Number of travelers")
    group_type: str = Field(default="friends", description="solo | couple | friends | family")


@router.post("", response_model=Dict[str, Any])
async def plan_trip(
    payload: TripPlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """
    Generate a complete, deterministic trip plan instantly.
    - No LLM dependency
    - Consistent, explainable results
    - Sub-100ms response time
    """
    # Daily usage limit enforcement
    check_and_increment_usage(db, current_user)

    try:
        plan_input = TripPlanInput(
            source=payload.source.strip(),
            destination=payload.destination.strip(),
            start_date=payload.start_date,
            end_date=payload.end_date,
            budget=payload.budget,
            num_travelers=payload.num_travelers,
            group_type=payload.group_type,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    try:
        result = _planner.plan(plan_input)
        return result.model_dump()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Planning engine error: {str(exc)}",
        )
