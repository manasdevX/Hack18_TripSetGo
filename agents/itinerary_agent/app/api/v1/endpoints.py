from fastapi import APIRouter, Depends, HTTPException

from app.schemas.request import ItineraryRequest
from app.schemas.response import ItineraryResponse
from app.services.itinerary_service import ItineraryService

router = APIRouter()


@router.post("/plan", response_model=ItineraryResponse)
async def generate_itinerary(
    request: ItineraryRequest,
    service: ItineraryService = Depends(ItineraryService)
) -> ItineraryResponse:
    """
    POST /plan - Generate day-by-day itinerary.
    
    Called by Orchestrator after Destination, Transport, and Stay agents provide context.
    Creates a detailed day-by-day plan with Morning/Afternoon/Evening activities.
    
    Request:
        {
            "destination": "Paris",
            "num_days": 5,
            "transport_details": {"mode": "flight", "price": 600.0},
            "stay_details": {
                "name": "Hotel XYZ",
                "price_per_night": 150.0,
                "total_nights": 5,
                "category": "4-star",
                "location": "Central Paris"
            },
            "destination_context": {
                "destination": "Paris",
                "areas": ["Le Marais", "Montmartre", "Latin Quarter"],
                "weather_summary": "Sunny and pleasant",
                "best_areas_to_stay": ["Le Marais (Central)"],
                "travel_advisories": ["Standard precautions"],
                "local_tips": "Use the Metro"
            }
        }
    
    Response:
        {
            "days": [
                {
                    "day_number": 1,
                    "activities": [
                        {"time": "Morning", "task": "Check into accommodation"},
                        {"time": "Afternoon", "task": "Explore Le Marais neighborhood"},
                        {"time": "Evening", "task": "Dinner at a local restaurant"}
                    ],
                    "notes": "Arrival day - settle in and get oriented"
                },
                ...
            ],
            "travel_tips": "Use the Metro for efficient travel; book museum tickets in advance"
        }
    """
    try:
        return await service.generate_itinerary(request)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Itinerary generation failed: {str(exc)}"
        )
