from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from app.schemas.expense import ExpenseResponse, SettlementResponse


class GroupMemberBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None


class GroupMemberCreate(GroupMemberBase):
    pass


class GroupMemberResponse(GroupMemberBase):
    id: UUID
    user_id: Optional[UUID]
    joined_at: datetime

    class Config:
        from_attributes = True


class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None
    currency: str = "USD"


class GroupCreate(GroupBase):
    member_ids: List[UUID] = []


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    currency: Optional[str] = None


class GroupResponse(GroupBase):
    id: UUID
    creator_id: UUID
    members: List[GroupMemberResponse]
    expenses: List[ExpenseResponse] = []
    settlements: List[SettlementResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GroupDetailResponse(GroupResponse):
    expense_count: Optional[int] = 0
    total_spent: Optional[Decimal] = Decimal("0.00")


# ===== EXPENSE SCHEMAS =====
class ExpenseBase(BaseModel):
    title: str
    description: Optional[str] = None
    amount: Decimal
    category: str = "other"
    split_type: str = "equal"  # equal, custom, settlement
    paid_by: UUID


class ExpenseCreate(ExpenseBase):
    group_id: UUID
    splits: Dict[UUID, Decimal] = {}  # {member_id: amount}
    expense_date: Optional[datetime] = None


class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    category: Optional[str] = None
    split_type: Optional[str] = None
    splits: Optional[Dict[UUID, Decimal]] = None
    paid_by: Optional[UUID] = None


class ExpenseResponse(ExpenseBase):
    id: UUID
    group_id: UUID
    splits: Dict[UUID, Decimal]
    expense_type: str
    settlement_from: Optional[UUID]
    settlement_to: Optional[UUID]
    expense_date: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ===== SETTLEMENT SCHEMAS =====
class SettlementBase(BaseModel):
    from_member_id: UUID
    to_member_id: UUID
    amount: Decimal
    method: str = "bank-transfer"


class SettlementCreate(SettlementBase):
    group_id: UUID
    settlement_date: Optional[datetime] = None


class SettlementResponse(SettlementBase):
    id: UUID
    group_id: UUID
    status: str
    settlement_date: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

