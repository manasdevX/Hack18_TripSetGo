from fastapi import APIRouter, Depends, HTTPException

from app.schemas.request import ContextRequest
from app.schemas.response import ContextResponse
from app.services.context_service import ContextService

router = APIRouter()


@router.post("/context", response_model=ContextResponse)
async def get_destination_context(
    request: ContextRequest,
    service: ContextService = Depends(ContextService)
) -> ContextResponse:
    """
    POST /context - Fetch destination context.
    
    Called by Orchestrator immediately after intent validation.
    Provides ground truth about destination for downstream agents.
    
    Request:
        {
            "destination": "Paris",
            "dates": "2024-06-01 to 2024-06-10"
        }
    
    Response:
        {
            "destination": "Paris",
            "areas": ["Le Marais", "Montmartre", "Latin Quarter"],
            "weather_summary": "Sunny and pleasant, highs around 22°C.",
            "best_areas_to_stay": ["Le Marais (Central)", "Saint-Germain-des-Prés (Shopping)"],
            "travel_advisories": ["Standard precautions apply"],
            "local_tips": "Book Museum tickets in advance; use the Metro."
        }
    """
    try:
        return await service.get_context(request)
    except ValueError as exc:
        # JSON parsing error
        raise HTTPException(
            status_code=400,
            detail=f"Invalid context response format: {str(exc)}"
        )
    except Exception as exc:
        # Unexpected error
        raise HTTPException(
            status_code=500,
            detail=f"Context generation failed: {str(exc)}"
        )
