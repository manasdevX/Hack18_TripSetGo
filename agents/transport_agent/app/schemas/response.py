from typing import List, Optional

from pydantic import BaseModel, Field


class TransportOption(BaseModel):
    """
    A single transport result (matches Orchestrator's schema).
    """
    mode: str = "flight"              # flight | train | bus | cab
    provider: str
    route_number: Optional[str] = None
    departure: str
    arrival: str
    duration_minutes: Optional[int] = None
    price: float
    currency: str = "INR"
    class_type: str = "economy"
    source_url: Optional[str] = None


class TransportSearchResponse(BaseModel):
    """
    List of transport options returned by the /search endpoint.
    """
    results: List[TransportOption] = Field(default_factory=list)
