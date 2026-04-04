from typing import Optional

from pydantic import BaseModel, Field


class NavigationState(BaseModel):
    """
    Tracks current position in a live trip.
    Returned in response to reflect updated state.
    """
    current_day: int = Field(default=1, description="Current day number")
    current_location: str = Field(default="unknown", description="Current location")
    activities_completed: int = Field(default=0, description="Activities completed")
    estimated_next_checkpoint: Optional[str] = Field(default=None, description="Next checkpoint")
    delays_encountered: int = Field(default=0, description="Total delays encountered")
    reason: Optional[str] = Field(default=None, description="Reason for state change")


class NavigationResponse(BaseModel):
    """
    Response from the Navigation & Continuity Agent.
    Indicates if re-planning is needed and provides immediate guidance.
    """
    updated_state: NavigationState = Field(
        ...,
        description="Updated trip state after processing user update"
    )
    trigger_replan: bool = Field(
        ...,
        description="True if Orchestrator should trigger a full re-plan"
    )
    immediate_instruction: str = Field(
        ...,
        description="Immediate instruction for the user (e.g., 'Stay at the station, re-calculating...')"
    )
    replan_reason: Optional[str] = Field(
        default=None,
        description="Reason for triggering re-plan, if applicable"
    )
