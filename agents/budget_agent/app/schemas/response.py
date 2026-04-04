from typing import List

from pydantic import BaseModel, Field


class BudgetOptimizationResponse(BaseModel):
    """
    Response from the Budget Optimization Agent.
    Indicates whether the trip is within budget and suggests adjustments if needed.
    """
    status: str = Field(
        ...,
        description="Status: 'within_budget', 'exceeded', or 'optimized'",
        pattern="^(within_budget|exceeded|optimized)$"
    )
    total_cost: float = Field(
        ...,
        description="Total calculated cost of the trip"
    )
    cost_per_person: float = Field(
        ...,
        description="Calculated cost per individual traveller"
    )
    budget_delta: float = Field(
        ...,
        description="Budget difference (user_budget - total_cost). Positive if under budget."
    )
    adjustments: List[str] = Field(
        default_factory=list,
        description="List of specific suggestions to reduce cost if exceeded"
    )
    optimization_summary: str = Field(
        ...,
        description="Brief explanation of the budget status and recommendations"
    )
