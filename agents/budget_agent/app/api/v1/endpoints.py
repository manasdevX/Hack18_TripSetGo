from fastapi import APIRouter, Depends, HTTPException

from app.schemas.request import BudgetOptimizationRequest
from app.schemas.response import BudgetOptimizationResponse
from app.services.optimization_service import OptimizationService

router = APIRouter()


@router.post("/optimize", response_model=BudgetOptimizationResponse)
async def optimize_budget(
    request: BudgetOptimizationRequest,
    service: OptimizationService = Depends(OptimizationService)
) -> BudgetOptimizationResponse:
    """
    POST /optimize - Optimize trip budget.
    
    Called by Orchestrator after Transport and Stay agents provide options.
    Calculates total cost and suggests optimizations if budget is exceeded.
    
    Request:
        {
            "total_user_budget": 5000.0,
            "selected_transport": {
                "mode": "flight",
                "price": 800.0,
                "duration_hours": 10,
                "description": "Economy class"
            },
            "selected_stay": {
                "name": "Hilton Paris",
                "price_per_night": 200.0,
                "total_nights": 7,
                "category": "5-star",
                "location": "Paris"
            },
            "estimated_other_costs": 500.0,
            "preferences": "Comfort is important but want to save where possible"
        }
    
    Response (Within Budget):
        {
            "status": "within_budget",
            "total_cost": 2300.0,
            "budget_delta": 2700.0,
            "adjustments": [],
            "optimization_summary": "Great news! Your trip is within budget. You have $2700.00 remaining."
        }
    
    Response (Over Budget):
        {
            "status": "exceeded",
            "total_cost": 6200.0,
            "budget_delta": -1200.0,
            "adjustments": [
                "Switch to a 4-star hotel instead of 5-star in Paris",
                "Consider a coach option instead of a direct flight",
                "Plan more free activities to reduce daily spending"
            ],
            "optimization_summary": "Your trip exceeds budget by $1200.00. We suggest the following cost-saving measures..."
        }
    """
    try:
        return await service.optimize(request)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Budget optimization failed: {str(exc)}"
        )
