from datetime import date
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class NavigationState(BaseModel):
    """Matches the orchestrator's NavigationState for re-planning."""
    current_day: int = 1
    current_location: str = "start"
    remaining_plan: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None


class IntentRequest(BaseModel):
    """
    Input for the Intent Agent.
    Accepts partial or complete trip information.
    """
    source: Optional[str] = None
    destination: Optional[str] = None
    start_date: Optional[date] = None
    return_date: Optional[date] = None
    budget: Optional[float] = None
    travellers: int = 1
    group_type: str = "solo"
    preferences: Optional[str] = None

    # Re-planning support
    replan: bool = False
    navigation_state: Optional[NavigationState] = None

    # Flags passed through from orchestrator
    use_cache: bool = True
    use_api: bool = True
    use_web_fallback: bool = True
