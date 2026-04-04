from sqlalchemy import Column, String, DateTime, func, ForeignKey, Numeric, Text, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum

from app.database.base_class import Base


class ExpenseType(str, enum.Enum):
    REGULAR = "regular"
    SETTLEMENT = "settlement"


class SplitType(str, enum.Enum):
    EQUAL = "equal"
    CUSTOM = "custom"
    SETTLEMENT = "settlement"


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    
    # Expense details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    category = Column(String(50), nullable=False, default="other")
    
    # Who paid
    paid_by = Column(UUID(as_uuid=True), ForeignKey("group_members.id", ondelete="CASCADE"), nullable=False)
    
    # How it was split
    split_type = Column(String(50), nullable=False, default="equal")
    splits = Column(JSON, nullable=False)  # {member_id: amount}
    
    # Metadata
    expense_type = Column(String(50), nullable=False, default="regular")
    expense_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    group = relationship("Group", back_populates="expenses")


class Settlement(Base):
    __tablename__ = "settlements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id"), nullable=True)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    
    # Settlement details
    from_member = Column(UUID(as_uuid=True), ForeignKey("group_members.id"), nullable=False)
    to_member = Column(UUID(as_uuid=True), ForeignKey("group_members.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    
    # Settlement metadata
    method = Column(String(50), default="bank-transfer")  # bank-transfer, cash, paypal, etc
    status = Column(String(50), default="pending")  # pending, completed, rejected
    
    settled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    group = relationship("Group", back_populates="settlements")
