from datetime import date
from typing import Optional, Any, Dict

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.core.config import settings
from app.models.user import User
from app.database.session import get_db
from app.services.subscription_service import check_and_increment_usage

router = APIRouter()


class TripPlanInputs(BaseModel):
    source: str = Field(..., min_length=2, description="Departure city")
    destination: str = Field(..., min_length=2, description="Arrival city")
    start_date: date = Field(..., description="Trip start date (YYYY-MM-DD)")
    return_date: date = Field(..., description="Trip return date (YYYY-MM-DD)")
    budget: float = Field(..., gt=0, description="Total budget (INR)")

    num_travelers: int = Field(default=1, ge=1, le=20)
    preferences: Optional[str] = None

    # Execution control flags (forwarded to orchestrator)
    use_cache: bool = True
    use_api: bool = True
    use_web_fallback: bool = True


@router.post("", response_model=Dict[str, Any])
async def create_trip_roadmap(
    payload: TripPlanInputs,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """
    Create a trip planning roadmap by delegating to the Orchestrator (multi-agent pipeline).
    Enforces daily usage limits based on user subscription tier.
    """
    # 🔥 Daily usage limit enforcement
    check_and_increment_usage(db, current_user)

    orchestrator_url = f"{settings.ORCHESTRATOR_URL}/api/v1/plan-trip"

    orchestrator_payload = payload.model_dump(mode="json")
    # Rename field to match orchestrator's TripPlanRequest schema
    orchestrator_payload["travellers"] = orchestrator_payload.pop("num_travelers", 1)
    orchestrator_payload["group_type"] = "solo"  # default; not exposed in frontend yet
    orchestrator_payload["replan"] = False

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(orchestrator_url, json=orchestrator_payload)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as exc:
        detail = f"Orchestrator returned HTTP {exc.response.status_code}: {exc.response.text}"
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to call orchestrator: {str(exc)}",
        )

