from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, Float, JSON, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.database.base_class import Base


class Trip(Base):
    __tablename__ = "trips"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Core trip info
    title = Column(String(255), nullable=False)
    destination = Column(String(255), nullable=False, index=True)
    source = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)

    # Dates & duration
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    duration_days = Column(Integer, nullable=True)

    # Budget & travelers
    budget = Column(Float, nullable=True)
    cost_per_person = Column(Float, nullable=True)
    num_travelers = Column(Integer, nullable=True, default=1)
    group_type = Column(String(50), nullable=True, default="solo")  # solo, friends, family, couple

    # Itinerary (JSON from orchestrator)
    itinerary = Column(JSON, nullable=True)
    transport = Column(JSON, nullable=True)
    stay = Column(JSON, nullable=True)
    budget_summary = Column(JSON, nullable=True)

    # Cover image
    cover_image = Column(Text, nullable=True)
    images = Column(JSON, nullable=True)  # list of image URLs

    # Social / Discover features
    is_public = Column(Boolean, nullable=False, default=True)
    likes_count = Column(Integer, nullable=False, default=0)
    saves_count = Column(Integer, nullable=False, default=0)
    views_count = Column(Integer, nullable=False, default=0)
    comments_count = Column(Integer, nullable=False, default=0)

    # Tags
    tags = Column(JSON, nullable=True)  # ["beach", "solo", "budget"]

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    likes = relationship("TripLike", back_populates="trip", cascade="all, delete-orphan")
    saves = relationship("TripSave", back_populates="trip", cascade="all, delete-orphan")
    comments = relationship("TripComment", back_populates="trip", cascade="all, delete-orphan", order_by="TripComment.created_at")


class TripLike(Base):
    __tablename__ = "trip_likes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    trip = relationship("Trip", back_populates="likes")


class TripSave(Base):
    __tablename__ = "trip_saves"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    trip = relationship("Trip", back_populates="saves")


class TripComment(Base):
    __tablename__ = "trip_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    trip = relationship("Trip", back_populates="comments")


class UserFollow(Base):
    __tablename__ = "user_follows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    follower_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    following_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
