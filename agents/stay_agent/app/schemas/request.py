from datetime import date
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class StayRequest(BaseModel):
    """
    Input for the Stay Agent.
    """
    destination: str
    check_in: date
    check_out: date
    travellers: int = 1
    group_type: str = "solo"
    budget: float
    preferences: Optional[str] = None
    
    # Context from Orchestrator/Destination Agent
    nights: int = 1
    destination_context: Optional[Dict[str, Any]] = None
    target_budget: float = 0.0

    # Flags
    use_cache: bool = True
    use_api: bool = True
    use_web_fallback: bool = True
