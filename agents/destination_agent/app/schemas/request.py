from typing import Optional

from pydantic import BaseModel


class ContextRequest(BaseModel):
    """
    Input for the Destination & Context Agent.
    Called by Orchestrator with destination and dates.
    """
    destination: str
    dates: Optional[str] = None
    travellers: int = 1
    group_type: str = "solo"
