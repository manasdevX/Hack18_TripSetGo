from typing import List, Optional, Dict, Any

from pydantic import BaseModel, Field


class DayPlan(BaseModel):
    """
    Day-by-day activity plan.
    Contains morning, afternoon, and evening activities.
    """
    day_number: int = Field(..., description="Day number (1-indexed)")
    activities: List[Dict[str, str]] = Field(
        ...,
        description="List of activities with 'time' (Morning/Afternoon/Evening) and 'task' keys"
    )
    notes: Optional[str] = Field(
        default=None,
        description="Additional notes or travel tips for the day"
    )


class ItineraryResponse(BaseModel):
    """
    Response from the Itinerary Planning Agent.
    Contains full day-by-day trip plan.
    """
    days: List[DayPlan] = Field(..., description="List of day plans")
    travel_tips: str = Field(
        ...,
        description="General travel tips and recommendations for the trip"
    )
