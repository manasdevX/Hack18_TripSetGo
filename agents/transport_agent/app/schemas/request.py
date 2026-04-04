from datetime import date
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class TransportRequest(BaseModel):
    """
    Input for the Transport Agent.
    """
    source: str
    destination: str
    start_date: date
    return_date: date
    budget: float
    travellers: int = 1
    group_type: str = "solo"
    preferences: Optional[str] = None
    
    # Context from Orchestrator/Destination Agent
    nights: int = 1
    destination_context: Optional[Dict[str, Any]] = None
    target_budget: float = 0.0

    # Flags
    use_cache: bool = True
    use_api: bool = True
    use_web_fallback: bool = True
