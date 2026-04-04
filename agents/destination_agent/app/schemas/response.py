from typing import List, Optional

from pydantic import BaseModel


class ContextResponse(BaseModel):
    """
    Response from the Destination & Context Agent.
    Provides ground truth about destination for other agents.
    """
    destination: str
    areas: List[str]
    top_attractions: List[str]
    weather_summary: str
    best_areas_to_stay: List[str]
    travel_advisories: List[str]
    local_tips: str
