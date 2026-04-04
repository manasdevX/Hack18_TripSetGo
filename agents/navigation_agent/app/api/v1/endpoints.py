from fastapi import APIRouter, Depends, HTTPException

from app.schemas.request import NavigationRequest
from app.schemas.response import NavigationResponse
from app.services.navigation_service import NavigationService

router = APIRouter()


@router.post("/track", response_model=NavigationResponse)
async def track_and_update(
    request: NavigationRequest,
    service: NavigationService = Depends(NavigationService)
) -> NavigationResponse:
    """
    POST /track - Process live trip update and determine re-plan needs.
    
    Called by the Orchestrator or mobile app to track real-time trip events.
    Analyzes user updates and triggers re-planning if critical deviations occur.
    
    Request:
        {
            "destination": "Paris",
            "full_itinerary": { ...ItineraryResponse... },
            "current_state": {
                "current_day": 2,
                "current_location": "Le Marais",
                "activities_completed": 2,
                "estimated_next_checkpoint": "Train at 14:00",
                "delays_encountered": 0
            },
            "user_update": "Flight delayed by 3 hours. Will arrive at 21:00 instead of 18:00."
        }
    
    Response (Need Re-plan):
        {
            "updated_state": {
                "current_day": 2,
                "current_location": "Le Marais",
                "activities_completed": 2,
                "estimated_next_checkpoint": null,
                "delays_encountered": 1,
                "reason": "Flight delayed by 3 hours..."
            },
            "trigger_replan": true,
            "immediate_instruction": "Your trip plan needs adjustment. Please wait while we recalculate...",
            "replan_reason": "Flight delay >2 hours"
        }
    
    Response (No Re-plan):
        {
            "updated_state": { ...updated... },
            "trigger_replan": false,
            "immediate_instruction": "Noted: Museum took 15 minutes longer. Continue with your planned activities.",
            "replan_reason": null
        }
    """
    try:
        return await service.process_update(request)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Trip tracking failed: {str(exc)}"
        )
