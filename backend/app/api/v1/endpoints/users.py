from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, get_db
from app.models.user import User

router = APIRouter(prefix="/api/v1/users", tags=["users"])

@router.get("/verify/{email}")
def verify_user(
    email: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify if a user exists by email"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email
        }
    }
