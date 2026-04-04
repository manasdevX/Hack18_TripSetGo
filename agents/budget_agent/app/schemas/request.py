from typing import Optional

from pydantic import BaseModel, Field


class TransportOption(BaseModel):
    """
    Transport option from the Transport Agent.
    Contains mode of transport and associated cost.
    """
    mode: str = Field(..., description="Type of transport (flight, train, bus, car)")
    price: float = Field(..., description="Total transport cost in user's currency")
    duration_hours: Optional[float] = None
    description: Optional[str] = None


class StayOption(BaseModel):
    """
    Stay option from the Stay Agent.
    Contains accommodation type and associated cost.
    """
    name: str = Field(..., description="Name of accommodation or hotel")
    price_per_night: float = Field(..., description="Nightly rate")
    total_nights: int = Field(..., description="Number of nights in accommodation")
    category: Optional[str] = None  # e.g., "5-star", "3-star", "budget"
    location: Optional[str] = None


class BudgetOptimizationRequest(BaseModel):
    """
    Input for the Budget Optimization Agent.
    Contains user budget and selected transport/stay options.
    """
    total_user_budget: float = Field(..., description="User's total trip budget")
    selected_transport: TransportOption = Field(..., description="Selected transport option")
    selected_stay: StayOption = Field(..., description="Selected accommodation option")
    estimated_other_costs: float = Field(
        default=0.0,
        description="Estimated costs for food, activities, etc."
    )
    preferences: str = Field(
        default="",
        description="User preferences or priorities (e.g., 'comfort over cost')"
    )
    travellers: int = 1
    group_type: str = "solo"
