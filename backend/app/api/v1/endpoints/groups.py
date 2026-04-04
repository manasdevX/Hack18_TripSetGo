from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.expense import Expense, Settlement
from app.schemas.group import GroupCreate, GroupUpdate, GroupResponse, GroupDetailResponse, GroupMemberCreate
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    SettlementCreate,
    SettlementResponse,
    BalanceResponse,
    DebtResponse,
)

router = APIRouter(prefix="/api/v1", tags=["groups"])


@router.post("/groups", response_model=GroupResponse)
def create_group(
    group_in: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new group"""
    group = Group(
        name=group_in.name,
        description=group_in.description,
        currency=group_in.currency,
        creator_id=current_user.id,
    )
    
    # Add creator as first member
    creator_member = GroupMember(
        group=group,
        user_id=current_user.id,
        name=current_user.full_name,
        email=current_user.email,
    )
    group.members.append(creator_member)
    
    db.add(group)
    db.commit()
    db.refresh(group)
    
    return group


@router.get("/groups", response_model=List[GroupResponse])
def list_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all groups for current user"""
    groups = db.query(Group).options(
        joinedload(Group.expenses),
        joinedload(Group.settlements)
    ).join(GroupMember).filter(
        GroupMember.user_id == current_user.id
    ).all()
    return groups


@router.get("/groups/{group_id}", response_model=GroupDetailResponse)
def get_group(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get group details"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user is member
    is_member = any(m.user_id == current_user.id for m in group.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a group member")
    
    return group


@router.put("/groups/{group_id}", response_model=GroupResponse)
def update_group(
    group_id: UUID,
    group_in: GroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only creator can update group")
    
    if group_in.name:
        group.name = group_in.name
    if group_in.description is not None:
        group.description = group_in.description
    if group_in.currency:
        group.currency = group_in.currency
    
    db.add(group)
    db.commit()
    db.refresh(group)
    
    return group


@router.delete("/groups/{group_id}", status_code=204)
def delete_group(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete group (only creator)"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only creator can delete group")
    
    db.delete(group)
    db.commit()


@router.post("/groups/{group_id}/members", response_model=GroupDetailResponse)
def add_group_member(
    group_id: UUID,
    member_in: GroupMemberCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add member to group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only creator can add members")
    
    # Create new member
    new_member = GroupMember(
        group_id=group_id,
        name=member_in.name,
        email=member_in.email,
    )
    
    db.add(new_member)
    db.commit()
    db.refresh(group)
    
    return group


@router.delete("/groups/{group_id}/members/{member_id}", status_code=204)
def remove_group_member(
    group_id: UUID,
    member_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove member from group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only creator can remove members")
    
    member = db.query(GroupMember).filter(
        GroupMember.id == member_id,
        GroupMember.group_id == group_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    db.delete(member)
    db.commit()
