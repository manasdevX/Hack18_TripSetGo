from fastapi import APIRouter, Depends, HTTPException
from app.schemas.request import StayRequest
from app.schemas.response import StaySearchResponse
from app.services.stay_service import StayService

router = APIRouter()


@router.post("/search", response_model=StaySearchResponse)
async def search_stays(
    request: StayRequest,
    service: StayService = Depends(StayService)
) -> StaySearchResponse:
    """
    POST to search for stay options.
    """
    try:
        results = await service.search(request)
        return StaySearchResponse(results=results)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Stay search failed: {str(exc)}"
        )
