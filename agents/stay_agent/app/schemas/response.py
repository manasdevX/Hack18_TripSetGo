from typing import List, Optional

from pydantic import BaseModel, Field


class StayOption(BaseModel):
    """
    A single stay/hotel result.
    """
    name: str
    type: str = "hotel"              # hotel | hostel | airbnb | resort
    location: str
    price_per_night: float
    total_price: float
    currency: str = "INR"
    rating: Optional[float] = None
    amenities: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    source_url: Optional[str] = None


class StaySearchResponse(BaseModel):
    """
    List of stay options returned by the /search endpoint.
    """
    results: List[StayOption] = Field(default_factory=list)
