from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, text, desc
from typing import Optional, List, Dict, Any
import uuid
import math

from app.api.deps import get_current_active_user
from app.database.session import get_db
from app.models.user import User
from app.models.trip import Trip, TripLike, TripSave, TripComment, UserFollow

router = APIRouter()

DESTINATION_IMAGES = {
    "goa": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800",
    "kerala": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800",
    "rajasthan": "https://images.unsplash.com/photo-1477587458883-47145ed31fd1?w=800",
    "manali": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800",
    "paris": "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800",
    "bali": "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800",
    "singapore": "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800",
    "dubai": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800",
    "mumbai": "https://images.unsplash.com/photo-1580581096469-7057e8564f8e?w=800",
    "delhi": "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800",
    "default": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800",
}


def get_cover_image(destination: str) -> str:
    dest_lower = destination.lower()
    for key in DESTINATION_IMAGES:
        if key in dest_lower:
            return DESTINATION_IMAGES[key]
    return DESTINATION_IMAGES["default"]


def _trip_to_card(trip: Trip, user: User, current_user_id=None, liked_ids=None, saved_ids=None) -> Dict[str, Any]:
    """Convert Trip ORM to card-shaped dict for feed."""
    liked_ids = liked_ids or set()
    saved_ids = saved_ids or set()
    cover = trip.cover_image or get_cover_image(trip.destination)
    return {
        "trip_id": str(trip.id),
        "title": trip.title,
        "destination": trip.destination,
        "source": trip.source,
        "description": trip.description,
        "cover_image": cover,
        "images": trip.images or [cover],
        "cost_per_person": trip.cost_per_person,
        "budget": trip.budget,
        "duration_days": trip.duration_days,
        "num_travelers": trip.num_travelers,
        "group_type": trip.group_type,
        "start_date": trip.start_date,
        "end_date": trip.end_date,
        "tags": trip.tags or [],
        "likes": trip.likes_count,
        "saves": trip.saves_count,
        "views": trip.views_count,
        "comments_count": trip.comments_count,
        "is_liked": str(trip.id) in liked_ids,
        "is_saved": str(trip.id) in saved_ids,
        "created_at": trip.created_at.isoformat() if trip.created_at else None,
        "user": {
            "user_id": str(user.id),
            "username": user.username or user.full_name or user.email.split("@")[0],
            "full_name": user.full_name or "",
            "profile_image": user.profile_image or "",
        },
        "itinerary": trip.itinerary,
        "transport": trip.transport,
        "stay": trip.stay,
        "budget_summary": trip.budget_summary,
    }


def _engagement_score(trip: Trip) -> float:
    """Trending score: likes*2 + saves*3 + comments*1 + recency boost."""
    from datetime import datetime, timezone
    likes = trip.likes_count or 0
    saves = trip.saves_count or 0
    comments = trip.comments_count or 0
    views = trip.views_count or 0
    now = datetime.now(timezone.utc)
    if trip.created_at:
        age_hours = max((now - trip.created_at.replace(tzinfo=timezone.utc)).total_seconds() / 3600, 1)
        recency_boost = 100 / math.log1p(age_hours)
    else:
        recency_boost = 0
    return likes * 2 + saves * 3 + comments * 1 + views * 0.1 + recency_boost


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/v1/discover — Main Feed
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/discover")
async def discover_feed(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
    destination: Optional[str] = None,
    budget_min: Optional[float] = None,
    budget_max: Optional[float] = None,
    group_type: Optional[str] = None,
    duration_min: Optional[int] = None,
    duration_max: Optional[int] = None,
    sort: Optional[str] = Query("trending", regex="^(trending|newest|popular|budget)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Discover public trips with filtering, sorting, and pagination."""
    query = db.query(Trip).filter(Trip.is_public == True)

    # Apply filters
    if destination:
        query = query.filter(Trip.destination.ilike(f"%{destination}%"))
    if budget_min is not None:
        query = query.filter(Trip.cost_per_person >= budget_min)
    if budget_max is not None:
        query = query.filter(Trip.cost_per_person <= budget_max)
    if group_type:
        query = query.filter(Trip.group_type == group_type)
    if duration_min is not None:
        query = query.filter(Trip.duration_days >= duration_min)
    if duration_max is not None:
        query = query.filter(Trip.duration_days <= duration_max)

    total = query.count()

    # Sort
    if sort == "newest":
        query = query.order_by(desc(Trip.created_at))
    elif sort == "popular":
        query = query.order_by(desc(Trip.likes_count))
    elif sort == "budget":
        query = query.order_by(Trip.cost_per_person.asc().nullslast())
    else:
        # Trending: sort by engagement score approximation (SQL-level)
        query = query.order_by(
            desc(Trip.likes_count * 2 + Trip.saves_count * 3 + Trip.comments_count),
            desc(Trip.created_at)
        )

    trips = query.offset((page - 1) * limit).limit(limit).all()

    # Bulk fetch user liked/saved IDs for this page
    trip_ids = [str(t.id) for t in trips]
    liked_ids = set()
    saved_ids = set()
    if trip_ids:
        liked_rows = db.query(TripLike.trip_id).filter(
            TripLike.user_id == current_user.id,
            TripLike.trip_id.in_([t.id for t in trips])
        ).all()
        liked_ids = {str(r.trip_id) for r in liked_rows}

        saved_rows = db.query(TripSave.trip_id).filter(
            TripSave.user_id == current_user.id,
            TripSave.trip_id.in_([t.id for t in trips])
        ).all()
        saved_ids = {str(r.trip_id) for r in saved_rows}

    # Bulk fetch users for these trips
    user_ids = list({t.user_id for t in trips})
    users_map = {}
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        users_map = {str(u.id): u for u in users}

    cards = [
        _trip_to_card(trip, users_map.get(str(trip.user_id)), str(current_user.id), liked_ids, saved_ids)
        for trip in trips
        if users_map.get(str(trip.user_id))
    ]

    return {
        "trips": cards,
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": (page * limit) < total,
        "total_pages": math.ceil(total / limit),
    }


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/v1/discover/search — Full-text search
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/discover/search")
async def search_trips(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Full-text search on trips (destination, title, description)."""
    search_term = f"%{q}%"
    query = db.query(Trip).filter(
        Trip.is_public == True,
        or_(
            Trip.destination.ilike(search_term),
            Trip.title.ilike(search_term),
            Trip.description.ilike(search_term),
        )
    ).order_by(desc(Trip.likes_count), desc(Trip.created_at))

    total = query.count()
    trips = query.offset((page - 1) * limit).limit(limit).all()

    user_ids = list({t.user_id for t in trips})
    users_map = {}
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        users_map = {str(u.id): u for u in users}

    liked_ids = set()
    saved_ids = set()
    if trips:
        liked_rows = db.query(TripLike.trip_id).filter(
            TripLike.user_id == current_user.id,
            TripLike.trip_id.in_([t.id for t in trips])
        ).all()
        liked_ids = {str(r.trip_id) for r in liked_rows}
        saved_rows = db.query(TripSave.trip_id).filter(
            TripSave.user_id == current_user.id,
            TripSave.trip_id.in_([t.id for t in trips])
        ).all()
        saved_ids = {str(r.trip_id) for r in saved_rows}

    cards = [
        _trip_to_card(trip, users_map.get(str(trip.user_id)), str(current_user.id), liked_ids, saved_ids)
        for trip in trips
        if users_map.get(str(trip.user_id))
    ]

    return {"trips": cards, "total": total, "page": page, "limit": limit, "has_more": (page * limit) < total}


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/v1/discover/trending — Top 6 trending trips this week
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/discover/trending")
async def trending_trips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from datetime import datetime, timezone, timedelta
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    trips = (
        db.query(Trip)
        .filter(Trip.is_public == True, Trip.created_at >= week_ago)
        .order_by(desc(Trip.likes_count * 2 + Trip.saves_count * 3 + Trip.comments_count))
        .limit(6)
        .all()
    )
    # If less than 6 from this week, pad with all-time top
    if len(trips) < 6:
        all_time = (
            db.query(Trip)
            .filter(Trip.is_public == True)
            .order_by(desc(Trip.likes_count))
            .limit(6)
            .all()
        )
        seen = {t.id for t in trips}
        for t in all_time:
            if t.id not in seen and len(trips) < 6:
                trips.append(t)

    user_ids = list({t.user_id for t in trips})
    users_map = {}
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        users_map = {str(u.id): u for u in users}

    liked_ids = set()
    saved_ids = set()
    if trips:
        liked_rows = db.query(TripLike.trip_id).filter(
            TripLike.user_id == current_user.id,
            TripLike.trip_id.in_([t.id for t in trips])
        ).all()
        liked_ids = {str(r.trip_id) for r in liked_rows}

    return {
        "trips": [
            _trip_to_card(trip, users_map.get(str(trip.user_id)), str(current_user.id), liked_ids, saved_ids)
            for trip in trips
            if users_map.get(str(trip.user_id))
        ]
    }


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/v1/trips/{trip_id} — Trip Detail
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/trips/{trip_id}")
async def get_trip_detail(
    trip_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        tid = uuid.UUID(trip_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid trip ID")

    trip = db.query(Trip).filter(Trip.id == tid).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if not trip.is_public and str(trip.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Trip is private")

    # Increment views
    trip.views_count = (trip.views_count or 0) + 1
    db.commit()

    creator = db.query(User).filter(User.id == trip.user_id).first()
    liked = db.query(TripLike).filter(
        TripLike.user_id == current_user.id, TripLike.trip_id == trip.id
    ).first() is not None
    saved = db.query(TripSave).filter(
        TripSave.user_id == current_user.id, TripSave.trip_id == trip.id
    ).first() is not None

    return _trip_to_card(
        trip, creator, str(current_user.id),
        {str(trip.id)} if liked else set(),
        {str(trip.id)} if saved else set()
    )


# ──────────────────────────────────────────────────────────────────────────────
# POST /api/v1/trips/{trip_id}/like — Like / Unlike toggle
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/trips/{trip_id}/like")
async def toggle_like(
    trip_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        tid = uuid.UUID(trip_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid trip ID")

    trip = db.query(Trip).filter(Trip.id == tid, Trip.is_public == True).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    existing = db.query(TripLike).filter(
        TripLike.user_id == current_user.id, TripLike.trip_id == tid
    ).first()

    if existing:
        db.delete(existing)
        trip.likes_count = max((trip.likes_count or 0) - 1, 0)
        db.commit()
        return {"liked": False, "likes": trip.likes_count}
    else:
        like = TripLike(user_id=current_user.id, trip_id=tid)
        db.add(like)
        trip.likes_count = (trip.likes_count or 0) + 1
        db.commit()
        return {"liked": True, "likes": trip.likes_count}


# ──────────────────────────────────────────────────────────────────────────────
# POST /api/v1/trips/{trip_id}/save — Save / Unsave toggle
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/trips/{trip_id}/save")
async def toggle_save(
    trip_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        tid = uuid.UUID(trip_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid trip ID")

    trip = db.query(Trip).filter(Trip.id == tid, Trip.is_public == True).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    existing = db.query(TripSave).filter(
        TripSave.user_id == current_user.id, TripSave.trip_id == tid
    ).first()

    if existing:
        db.delete(existing)
        trip.saves_count = max((trip.saves_count or 0) - 1, 0)
        db.commit()
        return {"saved": False, "saves": trip.saves_count}
    else:
        save = TripSave(user_id=current_user.id, trip_id=tid)
        db.add(save)
        trip.saves_count = (trip.saves_count or 0) + 1
        db.commit()
        return {"saved": True, "saves": trip.saves_count}


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/v1/trips/{trip_id}/comments
# POST /api/v1/trips/{trip_id}/comment
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/trips/{trip_id}/comments")
async def get_comments(
    trip_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        tid = uuid.UUID(trip_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid trip ID")

    comments = (
        db.query(TripComment)
        .filter(TripComment.trip_id == tid)
        .order_by(desc(TripComment.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    user_ids = list({c.user_id for c in comments})
    users_map = {}
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        users_map = {str(u.id): u for u in users}

    result = []
    for c in comments:
        u = users_map.get(str(c.user_id))
        result.append({
            "id": str(c.id),
            "comment": c.comment,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "user": {
                "user_id": str(u.id) if u else None,
                "username": (u.username or u.full_name or u.email.split("@")[0]) if u else "Unknown",
                "profile_image": u.profile_image if u else "",
            }
        })

    return {"comments": result}


class CommentCreate:
    comment: str


from pydantic import BaseModel

class CommentBody(BaseModel):
    comment: str


@router.post("/trips/{trip_id}/comment")
async def add_comment(
    trip_id: str,
    body: CommentBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        tid = uuid.UUID(trip_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid trip ID")

    trip = db.query(Trip).filter(Trip.id == tid, Trip.is_public == True).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if not body.comment.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    comment = TripComment(user_id=current_user.id, trip_id=tid, comment=body.comment.strip())
    db.add(comment)
    trip.comments_count = (trip.comments_count or 0) + 1
    db.commit()
    db.refresh(comment)

    return {
        "id": str(comment.id),
        "comment": comment.comment,
        "created_at": comment.created_at.isoformat() if comment.created_at else None,
        "user": {
            "user_id": str(current_user.id),
            "username": current_user.username or current_user.full_name or current_user.email.split("@")[0],
            "profile_image": current_user.profile_image or "",
        }
    }


# ──────────────────────────────────────────────────────────────────────────────
# POST /api/v1/trips/{trip_id}/clone — Clone trip to own account
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/trips/{trip_id}/clone")
async def clone_trip(
    trip_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        tid = uuid.UUID(trip_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid trip ID")

    original = db.query(Trip).filter(Trip.id == tid, Trip.is_public == True).first()
    if not original:
        raise HTTPException(status_code=404, detail="Trip not found")

    cloned = Trip(
        user_id=current_user.id,
        title=f"{original.title} (Copy)",
        destination=original.destination,
        source=original.source,
        description=original.description,
        start_date=original.start_date,
        end_date=original.end_date,
        duration_days=original.duration_days,
        budget=original.budget,
        cost_per_person=original.cost_per_person,
        num_travelers=original.num_travelers,
        group_type=original.group_type,
        itinerary=original.itinerary,
        transport=original.transport,
        stay=original.stay,
        budget_summary=original.budget_summary,
        cover_image=original.cover_image,
        images=original.images,
        tags=original.tags,
        is_public=False,  # cloned trips start private
    )
    db.add(cloned)
    db.commit()
    db.refresh(cloned)

    return {
        "trip_id": str(cloned.id),
        "title": cloned.title,
        "destination": cloned.destination,
        "message": "Trip cloned successfully! You can now edit and plan this trip.",
        "itinerary": cloned.itinerary,
        "transport": cloned.transport,
        "stay": cloned.stay,
        "budget_summary": cloned.budget_summary,
    }


# ──────────────────────────────────────────────────────────────────────────────
# POST /api/v1/trips — Create a new public trip (from planner output)
# ──────────────────────────────────────────────────────────────────────────────
class TripPublishBody(BaseModel):
    title: str
    destination: str
    source: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration_days: Optional[int] = None
    budget: Optional[float] = None
    cost_per_person: Optional[float] = None
    num_travelers: Optional[int] = 1
    group_type: Optional[str] = "solo"
    itinerary: Optional[dict] = None
    transport: Optional[list] = None
    stay: Optional[list] = None
    budget_summary: Optional[dict] = None
    cover_image: Optional[str] = None
    images: Optional[list] = None
    is_public: Optional[bool] = True
    tags: Optional[list] = None


@router.post("/trips", status_code=status.HTTP_201_CREATED)
async def create_trip(
    body: TripPublishBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    trip = Trip(
        user_id=current_user.id,
        title=body.title,
        destination=body.destination,
        source=body.source,
        description=body.description,
        start_date=body.start_date,
        end_date=body.end_date,
        duration_days=body.duration_days,
        budget=body.budget,
        cost_per_person=body.cost_per_person,
        num_travelers=body.num_travelers,
        group_type=body.group_type,
        itinerary=body.itinerary,
        transport=body.transport,
        stay=body.stay,
        budget_summary=body.budget_summary,
        cover_image=body.cover_image or get_cover_image(body.destination),
        images=body.images,
        is_public=body.is_public if body.is_public is not None else True,
        tags=body.tags or [],
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return {"trip_id": str(trip.id), "message": "Trip published successfully!"}


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/v1/users/{username}/profile — Public user profile + trips
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/users/{username}/profile")
async def get_user_profile(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Try to match by username or email prefix
    user = db.query(User).filter(User.username == username).first()
    if not user:
        # Fallback: find by email prefix
        users = db.query(User).filter(User.email.ilike(f"{username}@%")).all()
        user = users[0] if users else None
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    trips = (
        db.query(Trip)
        .filter(Trip.user_id == user.id, Trip.is_public == True)
        .order_by(desc(Trip.created_at))
        .limit(12)
        .all()
    )

    is_following = db.query(UserFollow).filter(
        UserFollow.follower_id == current_user.id,
        UserFollow.following_id == user.id
    ).first() is not None

    liked_ids = set()
    saved_ids = set()
    if trips:
        liked_rows = db.query(TripLike.trip_id).filter(
            TripLike.user_id == current_user.id,
            TripLike.trip_id.in_([t.id for t in trips])
        ).all()
        liked_ids = {str(r.trip_id) for r in liked_rows}

    return {
        "user": {
            "user_id": str(user.id),
            "username": user.username or user.full_name or user.email.split("@")[0],
            "full_name": user.full_name or "",
            "email": user.email,
            "profile_image": user.profile_image or "",
            "bio": user.bio or "",
            "followers_count": user.followers_count or 0,
            "following_count": user.following_count or 0,
            "is_following": is_following,
        },
        "trips": [
            _trip_to_card(t, user, str(current_user.id), liked_ids, saved_ids)
            for t in trips
        ],
        "total_trips": len(trips),
    }


# ──────────────────────────────────────────────────────────────────────────────
# POST /api/v1/users/{username}/follow — Follow / Unfollow
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/users/{username}/follow")
async def toggle_follow(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if str(target.id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    existing = db.query(UserFollow).filter(
        UserFollow.follower_id == current_user.id,
        UserFollow.following_id == target.id
    ).first()

    if existing:
        db.delete(existing)
        target.followers_count = max((target.followers_count or 0) - 1, 0)
        current_user.following_count = max((current_user.following_count or 0) - 1, 0)
        db.commit()
        return {"following": False, "followers": target.followers_count}
    else:
        follow = UserFollow(follower_id=current_user.id, following_id=target.id)
        db.add(follow)
        target.followers_count = (target.followers_count or 0) + 1
        current_user.following_count = (current_user.following_count or 0) + 1
        db.commit()
        return {"following": True, "followers": target.followers_count}


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/v1/my-trips — Get current user's saved/published trips
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/my-discover-trips")
async def my_trips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    trips = (
        db.query(Trip)
        .filter(Trip.user_id == current_user.id)
        .order_by(desc(Trip.created_at))
        .limit(20)
        .all()
    )
    return {
        "trips": [
            _trip_to_card(t, current_user, str(current_user.id))
            for t in trips
        ]
    }
