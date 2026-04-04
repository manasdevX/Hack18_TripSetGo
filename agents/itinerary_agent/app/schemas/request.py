from typing import List, Optional, Dict, Any

from pydantic import BaseModel, Field


class TransportOption(BaseModel):
    """Transport option from the Transport Agent."""
    mode: str = Field(..., description="Type of transport (flight, train, bus, car)")
    price: float = Field(..., description="Total transport cost")
    duration_hours: Optional[float] = None
    description: Optional[str] = None


class StayOption(BaseModel):
    """Stay option from the Stay Agent."""
    name: str = Field(..., description="Name of accommodation")
    price_per_night: float = Field(..., description="Nightly rate")
    total_nights: int = Field(..., description="Number of nights")
    category: Optional[str] = None
    location: Optional[str] = None


class ContextResponse(BaseModel):
    """Context response from the Destination Agent."""
    destination: str
    areas: List[str]
    top_attractions: List[str] = Field(default_factory=list)
    weather_summary: str
    best_areas_to_stay: List[str]
    travel_advisories: List[str]
    local_tips: str


class ItineraryRequest(BaseModel):
    """
    Input for the Itinerary Planning Agent.
    Synthesizes destination context, transport, and stay to create day-by-day plan.
    """
    destination: str = Field(..., description="Destination name")
    num_days: int = Field(..., description="Number of days in the trip")
    transport_details: TransportOption = Field(..., description="Selected transport option")
    stay_details: StayOption = Field(..., description="Selected accommodation option")
    destination_context: ContextResponse = Field(..., description="Destination context from Agent 3")
    preferences: str = Field(
        default="",
        description="User preferences (e.g., 'adventure activities', 'cultural sites')"
    )
    travellers: int = 1
    group_type: str = "solo"
