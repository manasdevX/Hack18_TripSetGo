from typing import Optional, Dict, Any

from pydantic import BaseModel, Field


class NavigationState(BaseModel):
    """
    Tracks current position in a live trip.
    Used for continuity and re-planning triggers.
    """
    current_day: int = Field(default=1, description="Current day number in the trip")
    current_location: str = Field(
        default="unknown",
        description="Current location (hotel, destination, in transit, etc.)"
    )
    activities_completed: int = Field(
        default=0,
        description="Number of activities completed"
    )
    estimated_next_checkpoint: Optional[str] = Field(
        default=None,
        description="Next scheduled checkpoint (e.g., flight time, hotel check-in)"
    )
    delays_encountered: int = Field(default=0, description="Number of delays or issues")
    reason: Optional[str] = Field(
        default=None,
        description="Reason for last state change"
    )


class NavigationRequest(BaseModel):
    """
    Input for the Navigation & Continuity Agent.
    Contains full itinerary and current state with user update.
    """
    destination: str = Field(..., description="Destination name")
    full_itinerary: Dict[str, Any] = Field(
        ...,
        description="Complete itinerary from Agent 7 (ItineraryResponse as dict)"
    )
    current_state: NavigationState = Field(..., description="Current state of the trip")
    user_update: str = Field(
        ...,
        description="User-reported update (e.g., 'Flight delayed by 2 hours', 'Museum took longer')"
    )
    travellers: int = 1
    group_type: str = "solo"
