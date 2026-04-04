"""
Pydantic schemas for orchestrator request inputs.
Supports both fresh trip requests and re-planning requests from Navigation Agent.
"""
from datetime import date
from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field, model_validator


class NavigationState(BaseModel):
    """Passed during a replan — carries the Navigation Agent's current tracking state."""
    current_day: int = 1
    current_location: str = "start"
    remaining_plan: Optional[Dict[str, Any]] = None
    reason: Optional[str] = Field(
        default=None,
        description="Why replanning was triggered, e.g. 'flight cancelled'",
    )


class TripPlanRequest(BaseModel):
    """Full trip planning request — all required fields present."""

    source: str = Field(..., min_length=2, description="Departure city")
    destination: str = Field(..., min_length=2, description="Arrival city")
    start_date: date = Field(..., description="Trip start date (YYYY-MM-DD)")
    return_date: date = Field(..., description="Trip return date (YYYY-MM-DD)")
    budget: float = Field(..., gt=0, description="Total budget in INR")

    travellers: int = Field(default=1, ge=1, le=50)
    group_type: Literal["solo", "couple", "family", "friends"] = Field(default="solo")
    preferences: Optional[str] = Field(
        default=None,
        description="e.g. 'beach, vegetarian, luxury hotel'",
    )

    # Re-planning support
    replan: bool = Field(
        default=False,
        description="Set True when Navigation Agent triggers re-planning",
    )
    navigation_state: Optional[NavigationState] = Field(
        default=None,
        description="Current navigation state — required when replan=True",
    )

    # Execution control flags
    use_cache: bool = True
    use_api: bool = True
    use_web_fallback: bool = True

    @model_validator(mode="after")
    def validate_dates(self) -> "TripPlanRequest":
        if self.return_date <= self.start_date:
            raise ValueError("return_date must be after start_date")
        return self

    @model_validator(mode="after")
    def validate_replan(self) -> "TripPlanRequest":
        if self.replan and self.navigation_state is None:
            raise ValueError("navigation_state is required when replan=True")
        return self


class PartialTripRequest(BaseModel):
    """
    Accepts incomplete trip data for conversational flow.
    Orchestrator returns need_more_info with a question for missing fields.
    """
    source: Optional[str] = None
    destination: Optional[str] = None
    start_date: Optional[date] = None
    return_date: Optional[date] = None
    budget: Optional[float] = None
    travellers: Optional[int] = 1
    group_type: Optional[Literal["solo", "couple", "family", "friends"]] = "solo"
    preferences: Optional[str] = None

    replan: bool = False
    navigation_state: Optional[NavigationState] = None

    use_cache: bool = True
    use_api: bool = True
    use_web_fallback: bool = True
