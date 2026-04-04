from pydantic import BaseModel
from typing import Dict, Optional
from datetime import datetime
from decimal import Decimal
from uuid import UUID


class ExpenseBase(BaseModel):
    title: str
    description: Optional[str] = None
    amount: Decimal
    category: str = "other"
    split_type: str = "equal"  # equal, custom, settlement
    splits: Dict[str, Decimal]  # {member_id: amount}
    paid_by: UUID


class ExpenseCreate(ExpenseBase):
    group_id: UUID
    expense_type: str = "regular"  # regular, settlement


class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    category: Optional[str] = None
    split_type: Optional[str] = None
    splits: Optional[Dict[str, Decimal]] = None
    paid_by: Optional[UUID] = None


class ExpenseResponse(ExpenseBase):
    id: UUID
    group_id: UUID
    expense_type: str
    expense_date: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SettlementBase(BaseModel):
    from_member: UUID
    to_member: UUID
    amount: Decimal
    method: str = "bank-transfer"


class SettlementCreate(SettlementBase):
    group_id: UUID


class SettlementResponse(SettlementBase):
    id: UUID
    group_id: UUID
    expense_id: Optional[UUID]
    status: str
    settled_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class BalanceResponse(BaseModel):
    member_id: UUID
    balance: Decimal
    is_owed: bool  # True if they are owed money, False if they owe money


class DebtResponse(BaseModel):
    from_member: UUID
    to_member: UUID
    amount: Decimal
