from fastapi import APIRouter, Depends, HTTPException
from app.schemas.request import IntentRequest
from app.schemas.response import IntentResponse
from app.services.intent_service import IntentService

router = APIRouter()


@router.post("/validate", response_model=IntentResponse)
async def validate_intent(
    request: IntentRequest,
    service: IntentService = Depends(IntentService)
) -> IntentResponse:
    """
    POST to validate trip intent.
    Checks for missing fields and returns a question if any are missing.
    """
    try:
        return await service.validate(request)
    except Exception as exc:
        # Unexpected error
        raise HTTPException(
            status_code=500,
            detail=f"Intent validation failed: {str(exc)}"
        )
