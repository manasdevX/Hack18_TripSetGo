from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.config import settings
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_token,
)
# from app.core.email import send_verification_email  # disabled in dev
from app.models.user import User
from app.api.v1.auth.schemas import UserRegister
from app.api.deps import get_current_active_user

router = APIRouter()


@router.post("/signup", response_model=dict)
def signup(user_in: UserRegister, db: Session = Depends(get_db)):
    """Create new user and send verification email"""
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user_in.password)

    user = User(
        email=user_in.email,
        password_hash=hashed_password,
        full_name=user_in.full_name,
        is_email_verified=True,  # Auto-verified — email gate disabled in dev
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "Account created successfully. You can now log in."}


@router.post("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    """Verify email with token"""
    payload = decode_token(token)

    if not payload or payload.get("type") != "email_verification":
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_email_verified = True
    db.add(user)
    db.commit()

    return {"message": "Email verified successfully"}


@router.post("/login", response_model=dict)
def login_access_token(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """Login with email and password"""
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    # User signed up via Google — has no password
    if not user.password_hash:
        raise HTTPException(
            status_code=400,
            detail="This account uses Google Sign-In. Please log in with Google."
        )

    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    # Email verification gate disabled in dev

    access_token_expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    return {
        "access_token": create_access_token(
            data={"sub": user.email},
            expires_delta=access_token_expires
        ),
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "is_email_verified": user.is_email_verified,
        }
    }


@router.get("/me", response_model=dict)
def read_user_me(current_user: User = Depends(get_current_active_user)):
    """Get current user info"""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_email_verified": current_user.is_email_verified,
    }