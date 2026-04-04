from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List
from uuid import UUID
from decimal import Decimal

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.expense import Expense, Settlement
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    SettlementCreate,
    SettlementResponse,
    BalanceResponse,
    DebtResponse,
)

router = APIRouter(prefix="/api/v1", tags=["expenses"])


@router.post("/groups/{group_id}/expenses", response_model=ExpenseResponse)
def create_expense(
    group_id: UUID,
    expense_in: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new expense in a group"""
    # Verify group exists and user is member
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    is_member = any(m.user_id == current_user.id for m in group.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a group member")
    
    expense = Expense(
        group_id=group_id,
        title=expense_in.title,
        description=expense_in.description,
        amount=expense_in.amount,
        category=expense_in.category,
        paid_by=expense_in.paid_by,
        split_type=expense_in.split_type,
        splits={str(k): float(v) for k, v in expense_in.splits.items()},
        expense_type=expense_in.expense_type,
    )
    
    db.add(expense)
    db.commit()
    db.refresh(expense)
    
    return expense


@router.get("/groups/{group_id}/expenses", response_model=List[ExpenseResponse])
def list_expenses(
    group_id: UUID,
    category: str = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List expenses for a group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    is_member = any(m.user_id == current_user.id for m in group.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a group member")
    
    query = db.query(Expense).filter(Expense.group_id == group_id)
    
    if category:
        query = query.filter(Expense.category == category)
    
    return query.all()


@router.get("/expenses/{expense_id}", response_model=ExpenseResponse)
def get_expense(
    expense_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get expense details"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Verify user is group member
    is_member = any(m.user_id == current_user.id for m in expense.group.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a group member")
    
    return expense


@router.put("/expenses/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: UUID,
    expense_in: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an expense"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Authorization: any group member can edit expenses (collaborative model)
    is_member = any(m.user_id == current_user.id for m in expense.group.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Only group members can edit expenses")
    
    if expense_in.title is not None:
        expense.title = expense_in.title
    if expense_in.description is not None:
        expense.description = expense_in.description
    if expense_in.amount is not None:
        expense.amount = expense_in.amount
    if expense_in.category is not None:
        expense.category = expense_in.category
    if expense_in.split_type is not None:
        expense.split_type = expense_in.split_type
    if expense_in.splits is not None:
        expense.splits = {str(k): float(v) for k, v in expense_in.splits.items()}
    if expense_in.paid_by is not None:
        expense.paid_by = expense_in.paid_by
    
    db.add(expense)
    db.commit()
    db.refresh(expense)
    
    return expense


@router.delete("/expenses/{expense_id}", status_code=204)
def delete_expense(
    expense_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an expense"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Authorization: any group member can delete expenses (collaborative model)
    is_member = any(m.user_id == current_user.id for m in expense.group.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Only group members can delete expenses")
    
    db.delete(expense)
    db.commit()


@router.post("/groups/{group_id}/settlements", response_model=SettlementResponse)
def create_settlement(
    group_id: UUID,
    settlement_in: SettlementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a settlement (payment between members)"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Validate both members exist in the group
    from_member = db.query(GroupMember).filter(
        GroupMember.id == settlement_in.from_member,
        GroupMember.group_id == group_id
    ).first()
    if not from_member:
        raise HTTPException(status_code=400, detail="From member not found in group")
    
    to_member = db.query(GroupMember).filter(
        GroupMember.id == settlement_in.to_member,
        GroupMember.group_id == group_id
    ).first()
    if not to_member:
        raise HTTPException(status_code=400, detail="To member not found in group")
    
    # Create settlement record only (don't create expense record)
    # Settlements are tracked separately for reconciliation purposes
    settlement = Settlement(
        group_id=group_id,
        from_member=settlement_in.from_member,
        to_member=settlement_in.to_member,
        amount=settlement_in.amount,
        method=settlement_in.method,
        status="completed",
    )
    
    db.add(settlement)
    db.commit()
    db.refresh(settlement)
    
    return settlement


@router.get("/groups/{group_id}/settlements", response_model=List[SettlementResponse])
def list_settlements(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List settlements for a group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    is_member = any(m.user_id == current_user.id for m in group.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a group member")
    
    settlements = db.query(Settlement).filter(Settlement.group_id == group_id).all()
    return settlements


@router.get("/groups/{group_id}/balances", response_model=List[BalanceResponse])
def get_group_balances(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculate balances for all group members"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    is_member = any(m.user_id == current_user.id for m in group.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a group member")
    
    balances = {}
    
    # Initialize balances
    for member in group.members:
        balances[str(member.id)] = Decimal("0.00")
    
    # Add expenses
    for expense in group.expenses:
        if expense.expense_type != "settlement":
            balances[str(expense.paid_by)] = balances.get(str(expense.paid_by), Decimal("0.00")) + expense.amount
            
            for member_id, split_amount in expense.splits.items():
                balances[str(member_id)] = balances.get(str(member_id), Decimal("0.00")) - Decimal(str(split_amount))
    
    # Subtract settlements
    for settlement in group.settlements:
        balances[str(settlement.from_member)] = balances.get(str(settlement.from_member), Decimal("0.00")) + settlement.amount
        balances[str(settlement.to_member)] = balances.get(str(settlement.to_member), Decimal("0.00")) - settlement.amount
    
    result = []
    for member_id, balance in balances.items():
        result.append(
            BalanceResponse(
                member_id=UUID(member_id),
                balance=balance,
                is_owed=balance > 0,
            )
        )
    
    return result


@router.get("/groups/{group_id}/simplified-debts", response_model=List[DebtResponse])
def get_simplified_debts(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get simplified debts using greedy algorithm"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    is_member = any(m.user_id == current_user.id for m in group.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a group member")
    
    # Get balances
    balances = {}
    for member in group.members:
        balances[str(member.id)] = Decimal("0.00")
    
    for expense in group.expenses:
        if expense.expense_type != "settlement":
            balances[str(expense.paid_by)] += expense.amount
            for member_id, split_amount in expense.splits.items():
                balances[str(member_id)] -= Decimal(str(split_amount))
    
    for settlement in group.settlements:
        balances[str(settlement.from_member)] += settlement.amount
        balances[str(settlement.to_member)] -= settlement.amount
    
    # Apply greedy algorithm
    debts = []
    creditors = sorted(
        [(k, v) for k, v in balances.items() if v > Decimal("0.01")],
        key=lambda x: x[1],
        reverse=True,
    )
    debtors = sorted(
        [(k, v) for k, v in balances.items() if v < Decimal("-0.01")],
        key=lambda x: x[1],
    )
    
    creditor_idx = 0
    debtor_idx = 0
    
    while creditor_idx < len(creditors) and debtor_idx < len(debtors):
        creditor_id, creditor_bal = creditors[creditor_idx]
        debtor_id, debtor_bal = debtors[debtor_idx]
        
        settle_amount = min(creditor_bal, abs(debtor_bal))
        
        debts.append(
            DebtResponse(
                from_member=UUID(debtor_id),
                to_member=UUID(creditor_id),
                amount=settle_amount,
            )
        )
        
        creditors[creditor_idx] = (creditor_id, creditor_bal - settle_amount)
        debtors[debtor_idx] = (debtor_id, debtor_bal + settle_amount)
        
        if creditors[creditor_idx][1] <= Decimal("0.01"):
            creditor_idx += 1
        if debtors[debtor_idx][1] >= Decimal("-0.01"):
            debtor_idx += 1
    
    return debts


@router.delete("/settlements/{settlement_id}", status_code=204)
def delete_settlement(
    settlement_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a settlement and its corresponding expense"""
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")
    
    # Ensure current user is either from, to, or group creator
    group = db.query(Group).filter(Group.id == settlement.group_id).first()
    if settlement.from_member != current_user.id and settlement.to_member != current_user.id and (group and group.creator_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete settlement")
    
    if settlement.expense_id:
        expense = db.query(Expense).filter(Expense.id == settlement.expense_id).first()
        if expense:
            db.delete(expense)
            
    db.delete(settlement)
    db.commit()
