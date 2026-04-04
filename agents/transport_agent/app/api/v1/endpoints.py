from fastapi import APIRouter, Depends, HTTPException
from app.schemas.request import TransportRequest
from app.schemas.response import TransportOption
from app.services.transport_service import TransportService
from typing import List

router = APIRouter()


@router.post("/search", response_model=List[TransportOption])
async def search_transport(
    request: TransportRequest,
    service: TransportService = Depends(TransportService)
) -> List[TransportOption]:
    """
    POST to search for transport options.
    Returns a list of TransportOption based on target budget.
    """
    try:
        return await service.search(request)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Transport search failed: {str(exc)}"
        )
