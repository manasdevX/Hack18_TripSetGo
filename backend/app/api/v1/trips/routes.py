"""
Trips API — Interactive LLM Planning + Full CRUD with RAG.
Endpoints:
  POST   /api/v1/trips            → Generate interactive plan
  POST   /api/v1/trips/save       → Save finalized trip
  GET    /api/v1/trips/mine       → Fetch user's saved trips
  GET    /api/v1/trips/{id}       → Get single trip
  DELETE /api/v1/trips/{id}       → Delete trip
  POST   /api/v1/trips/{id}/duplicate  → Duplicate trip
  PATCH  /api/v1/trips/{id}/favorite  → Toggle favorite
"""
from datetime import date
from typing import Any, Dict, List, Optional
import uuid as _uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.models.user import User
from app.models.trip import Trip
from app.database.session import get_db
from app.services.subscription_service import check_and_increment_usage
from app.planning_engine.llm_planner import generate_interactive_plan

router = APIRouter()


# ─── Request / Response schemas ───────────────────────────────────────────────

class TripPlanRequest(BaseModel):
    source: str = Field(..., min_length=2)
    destination: str = Field(..., min_length=2)
    start_date: date
    end_date: date
    budget: float = Field(..., gt=0)
    num_travelers: int = Field(default=1, ge=1, le=20)
    group_type: str = Field(default="friends")
    preferences: Optional[List[str]] = Field(default=[])


class SaveTripRequest(BaseModel):
    """Client sends the finalized selections from the interactive planner."""
    destination: str
    source: str = ""
    start_date: str = ""
    end_date: str = ""
    budget: float = 0
    num_travelers: int = 1
    group_type: str = "friends"
    duration_days: int = 1
    # Finalized plan (from planner JSON)
    selected_transport: Optional[Dict] = None
    selected_hotel: Optional[Dict] = None
    selected_food: Optional[Dict] = None
    selected_activities: Optional[Dict] = None  # {slot_key: activity_obj}
    total_cost: float = 0
    plan_summary: Optional[str] = None
    tags: Optional[List[str]] = None
    is_public: bool = False
    # Full plan JSON for itinerary view
    full_plan: Optional[Dict] = None


def _trip_to_dict(trip: Trip, is_favorite: bool = False) -> Dict:
    return {
        "id": str(trip.id),
        "destination": trip.destination,
        "source": trip.source,
        "title": trip.title,
        "description": trip.description,
        "start_date": trip.start_date,
        "end_date": trip.end_date,
        "duration_days": trip.duration_days,
        "budget": trip.budget,
        "num_travelers": trip.num_travelers,
        "group_type": trip.group_type,
        "itinerary": trip.itinerary,
        "transport": trip.transport,
        "stay": trip.stay,
        "budget_summary": trip.budget_summary,
        "tags": trip.tags or [],
        "is_public": trip.is_public,
        "is_favorite": is_favorite,
        "status": "planned",
        "created_at": trip.created_at.isoformat() if trip.created_at else None,
        "updated_at": trip.updated_at.isoformat() if trip.updated_at else None,
    }


# ─── Generate Plan ─────────────────────────────────────────────────────────────

@router.post("", response_model=Dict[str, Any])
async def plan_trip(
    payload: TripPlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """Generate an interactive RAG-powered trip plan with multiple selectable options."""
    check_and_increment_usage(db, current_user)

    if payload.end_date <= payload.start_date:
        raise HTTPException(status_code=422, detail="end_date must be after start_date")
    if (payload.end_date - payload.start_date).days > 30:
        raise HTTPException(status_code=422, detail="Maximum trip duration is 30 days")

    try:
        return await generate_interactive_plan(
            source=payload.source.strip(),
            destination=payload.destination.strip(),
            start_date=payload.start_date,
            end_date=payload.end_date,
            budget=payload.budget,
            num_travelers=payload.num_travelers,
            group_type=payload.group_type,
            preferences=payload.preferences or [],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Planning failed: {str(exc)}")


# ─── Save Trip ────────────────────────────────────────────────────────────────

@router.post("/save", response_model=Dict[str, Any])
async def save_trip(
    payload: SaveTripRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Save a finalized interactive trip to the user's account."""
    title = f"{payload.destination} Trip"
    if payload.start_date:
        try:
            from datetime import datetime
            dt = datetime.fromisoformat(payload.start_date)
            title = f"{payload.destination} — {dt.strftime('%b %Y')}"
        except Exception:
            pass

    transport_json = None
    if payload.selected_transport:
        transport_json = payload.selected_transport

    stay_json = None
    if payload.selected_hotel:
        stay_json = payload.selected_hotel

    budget_summary = {
        "total_cost": payload.total_cost,
        "budget": payload.budget,
        "remaining": payload.budget - payload.total_cost,
        "selected_food": payload.selected_food,
    }

    # Merge selected activities into itinerary structure from full_plan
    itinerary_json = None
    if payload.full_plan and payload.full_plan.get("itinerary"):
        itinerary_json = {"days": payload.full_plan["itinerary"], "selected_activities": payload.selected_activities or {}}

    trip = Trip(
        user_id=current_user.id,
        title=title,
        destination=payload.destination,
        source=payload.source,
        description=payload.plan_summary,
        start_date=payload.start_date,
        end_date=payload.end_date,
        duration_days=payload.duration_days,
        budget=payload.budget,
        num_travelers=payload.num_travelers,
        group_type=payload.group_type,
        itinerary=itinerary_json,
        transport=transport_json,
        stay=stay_json,
        budget_summary=budget_summary,
        tags=payload.tags or [],
        is_public=payload.is_public,
    )

    db.add(trip)
    db.commit()
    db.refresh(trip)
    return {"message": "Trip saved successfully", "trip": _trip_to_dict(trip)}


# ─── Fetch My Trips ────────────────────────────────────────────────────────────

@router.get("/mine", response_model=List[Dict[str, Any]])
async def get_my_trips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Fetch all trips saved by the current user."""
    trips = db.query(Trip).filter(Trip.user_id == current_user.id).order_by(Trip.created_at.desc()).all()
    # For now, favorites are stored in trip tags (could be a separate table later)
    return [_trip_to_dict(t, is_favorite="favorite" in (t.tags or [])) for t in trips]


# ─── Get Single Trip ──────────────────────────────────────────────────────────

@router.get("/{trip_id}", response_model=Dict[str, Any])
async def get_trip(
    trip_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return _trip_to_dict(trip, is_favorite="favorite" in (trip.tags or []))


# ─── Delete Trip ──────────────────────────────────────────────────────────────

@router.delete("/{trip_id}")
async def delete_trip(
    trip_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    db.delete(trip)
    db.commit()
    return {"message": "Trip deleted"}


# ─── Favorite Toggle ──────────────────────────────────────────────────────────

@router.patch("/{trip_id}/favorite")
async def toggle_favorite(
    trip_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    tags = list(trip.tags or [])
    if "favorite" in tags:
        tags.remove("favorite")
        is_fav = False
    else:
        tags.append("favorite")
        is_fav = True
    trip.tags = tags
    db.commit()
    return {"is_favorite": is_fav, "message": "Favorite updated"}


# ─── Duplicate Trip ────────────────────────────────────────────────────────────

@router.post("/{trip_id}/duplicate")
async def duplicate_trip(
    trip_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    orig = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not orig:
        raise HTTPException(status_code=404, detail="Trip not found")

    new_trip = Trip(
        user_id=current_user.id,
        title=f"{orig.title} (Copy)",
        destination=orig.destination,
        source=orig.source,
        description=orig.description,
        start_date=orig.start_date,
        end_date=orig.end_date,
        duration_days=orig.duration_days,
        budget=orig.budget,
        num_travelers=orig.num_travelers,
        group_type=orig.group_type,
        itinerary=orig.itinerary,
        transport=orig.transport,
        stay=orig.stay,
        budget_summary=orig.budget_summary,
        tags=[t for t in (orig.tags or []) if t != "favorite"],  # don't copy favorite
        is_public=False,
    )
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    return {"message": "Trip duplicated", "trip": _trip_to_dict(new_trip)}
