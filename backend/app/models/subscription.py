import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Date, Integer, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from app.database.base_class import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    plan_type = Column(String(50), nullable=False)          # FREE | PRO_MONTHLY | PRO_YEARLY
    status = Column(String(50), nullable=False, default="active")  # active | cancelled | expired

    razorpay_payment_id = Column(String(255), nullable=True, unique=True)
    razorpay_order_id = Column(String(255), nullable=True)

    start_date = Column(DateTime(timezone=True), server_default=func.now())
    end_date = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
