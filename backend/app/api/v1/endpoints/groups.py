from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
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
    """Create a new group and auto-add the creator as the first member."""
    group = Group(
        name=group_in.name,
        description=group_in.description,
        currency=group_in.currency,
        creator_id=current_user.id,
    )

    # Add creator as first member — link their user_id so they appear in GET /groups
    creator_member = GroupMember(
        group=group,
        user_id=current_user.id,
        name=current_user.full_name or current_user.email,
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
    """List all groups where the current user is a member (shared visibility)."""
    groups = (
        db.query(Group)
        .options(
            joinedload(Group.members),
            joinedload(Group.expenses),
            joinedload(Group.settlements),
        )
        .join(GroupMember, Group.id == GroupMember.group_id)
        .filter(GroupMember.user_id == current_user.id)
        .distinct()
        .all()
    )
    return groups


@router.get("/groups/{group_id}", response_model=GroupDetailResponse)
def get_group(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get full group details — accessible to any group member."""
    group = (
        db.query(Group)
        .options(
            joinedload(Group.members),
            joinedload(Group.expenses),
            joinedload(Group.settlements),
        )
        .filter(Group.id == group_id)
        .first()
    )
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Authorization: any member of the group can view it
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
    """Update group metadata — restricted to the group creator."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if group.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can update group details")

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
    """Delete a group — restricted to the group creator."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if group.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can delete this group")

    db.delete(group)
    db.commit()


@router.post("/groups/{group_id}/members", response_model=GroupDetailResponse)
def add_group_member(
    group_id: UUID,
    member_in: GroupMemberCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Add a registered TripSetGo user to a group.

    - Any existing group member can add a new member (collaborative model).
    - The new member MUST be a registered user (verified via email).
    - Stores user_id on the GroupMember row so the user sees the group in their dashboard.
    - Prevents duplicate membership (same user_id in the same group).
    """
    group = (
        db.query(Group)
        .options(joinedload(Group.members))
        .filter(Group.id == group_id)
        .first()
    )
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Authorization: any current member can invite others
    is_current_member = any(m.user_id == current_user.id for m in group.members)
    if not is_current_member:
        raise HTTPException(status_code=403, detail="Only group members can add new members")

    # Resolve user_id: prefer explicit user_id from payload, else look up by email
    resolved_user_id = member_in.user_id
    resolved_name = member_in.name
    resolved_email = member_in.email

    if resolved_user_id is None and resolved_email:
        # Lookup by email to get the real user_id
        target_user = db.query(User).filter(User.email == resolved_email).first()
        if not target_user:
            raise HTTPException(
                status_code=404,
                detail=f"No TripSetGo account found for email: {resolved_email}",
            )
        resolved_user_id = target_user.id
        resolved_name = resolved_name or target_user.full_name or target_user.email
        resolved_email = target_user.email

    # Prevent duplicate membership
    if resolved_user_id:
        existing = db.query(GroupMember).filter(
            and_(
                GroupMember.group_id == group_id,
                GroupMember.user_id == resolved_user_id,
            )
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="User is already a member of this group")

    # Create the linked member record
    new_member = GroupMember(
        group_id=group_id,
        user_id=resolved_user_id,   # ← CRITICAL: links User B to group for shared visibility
        name=resolved_name or "Unknown User",
        email=resolved_email,
    )

    db.add(new_member)
    db.commit()

    # Reload group with all relationships for response
    db.refresh(group)
    return group


@router.delete("/groups/{group_id}/members/{member_id}", status_code=204)
def remove_group_member(
    group_id: UUID,
    member_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a member from a group — restricted to the group creator."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if group.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can remove members")

    member = db.query(GroupMember).filter(
        GroupMember.id == member_id,
        GroupMember.group_id == group_id,
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    db.delete(member)
    db.commit()
