import random
import string
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.database.session import get_db
from app.core.config import settings
from app.core.security import (
    get_password_hash, verify_password,
    create_access_token, create_refresh_token
)
from app.models.user import User
from app.models.email_otp import EmailOTP
from app.models.password_reset import PasswordReset
from app.api.v1.auth import schemas
from app.services.email_service import email_service

auth_router = APIRouter()

# --- Internal Utility ---

async def generate_and_persist_otp(db: Session, email: str, user_id=None):
    """
    Generates and saves OTP. 
    Strict Logic: Rolls back DB if SMTP fails to ensure data integrity.
    """
    try:
        # 1. Invalidate old unused OTPs for this email
        db.query(EmailOTP).filter(
            EmailOTP.email == email,
            EmailOTP.is_used == False
        ).update({"is_used": True}, synchronize_session=False)

        # 2. Generate 6-digit code
        otp_code = "".join(random.choices(string.digits, k=6))
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

        # 3. Stage the record in DB
        new_otp = EmailOTP(
            email=email,
            user_id=user_id,
            otp_code=otp_code,
            expires_at=expires_at,
            purpose="signup_verification"
        )
        db.add(new_otp)
        
        # 4. Attempt to send Email BEFORE committing
        email_sent = email_service.send_otp(email, otp_code)
        
        if not email_sent:
            db.rollback() # Don't save OTP if user never received it
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification email. Please check your SMTP settings."
            )

        # 5. Success - Commit transaction
        db.commit()
        return otp_code

    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# --- Inline Verification Routes ---

@auth_router.post("/send-signup-otp")
async def send_signup_otp(payload: schemas.EmailRequest, db: Session = Depends(get_db)):
    """Step 1: Check if email exists, then send OTP."""
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        raise HTTPException(status_code=409, detail="Email already registered")
    
    await generate_and_persist_otp(db, payload.email)
    return {"status": "OTP_SENT", "message": "Verification code sent to email."}

@auth_router.post("/verify-signup-otp")
async def verify_signup_otp(payload: schemas.VerifyOTPRequest, db: Session = Depends(get_db)):
    """Step 2: Validate the code from the user's inbox."""
    otp_record = db.query(EmailOTP).filter(
        EmailOTP.email == payload.email,
        EmailOTP.otp_code == payload.otp_code,
        EmailOTP.is_used == False,
        EmailOTP.expires_at > datetime.now(timezone.utc)
    ).order_by(EmailOTP.created_at.desc()).first()

    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    otp_record.is_used = True
    db.commit()
    return {"status": "VERIFIED", "message": "Email verified successfully."}

# --- Core Auth Routes ---

@auth_router.post("/signup")
async def signup(user_in: schemas.UserRegister, db: Session = Depends(get_db)):
    """Step 3: Finalize account creation (only possible after verification)."""
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        password_hash=get_password_hash(user_in.password),
        signup_source="local",
        email_verified=True 
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "status": "SUCCESS",
        "tokens": {
            "access_token": create_access_token({"sub": str(user.id)}),
            "refresh_token": create_refresh_token(user.id),
        },
        "user": user
    }

@auth_router.post("/login")
def login(data: schemas.UserLogin, db: Session = Depends(get_db)):
    """Standard Login with 404 handling for smart frontend redirects."""
    user = db.query(User).filter(User.email == data.email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Account not found. Please sign up."
        )

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid password"
        )

    return {
        "status": "SUCCESS",
        "tokens": {
            "access_token": create_access_token({"sub": str(user.id)}),
            "refresh_token": create_refresh_token(user.id),
        },
        "user": user
    }

@auth_router.post("/google/start")
def google_start(payload: dict, db: Session = Depends(get_db)):
    """Google OAuth logic optimized to avoid rollbacks on new users."""
    try:
        idinfo = id_token.verify_oauth2_token(
            payload["id_token"], google_requests.Request(), settings.GOOGLE_CLIENT_ID
        )
        email, name = idinfo["email"], idinfo.get("name", "")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google Identity Token")

    user = db.query(User).filter(User.email == email).first()

    if user:
        # Existing user: Link Google account if needed
        if not user.google_sub:
            user.google_sub = idinfo.get("sub")
            if user.signup_source != "google":
                # Keep original source if it was local, just linking
                pass
            db.commit()
            db.refresh(user)

        # Immediate success
        return {
            "status": "SUCCESS",
            "tokens": {
                "access_token": create_access_token({"sub": str(user.id)}),
                "refresh_token": create_refresh_token(user.id)
            },
            "user": user
        }

    # New user: Return pre-fill payload. No DB work here = No Rollbacks.
    return {
        "status": "SIGNUP_REQUIRED",
        "email": email,
        "full_name": name,
        "is_verified": True
    }

@auth_router.post("/resend-otp")
async def resend_otp(payload: schemas.EmailRequest, db: Session = Depends(get_db)):
    """Resend logic compatible with both new signups and existing users."""
    user = db.query(User).filter(User.email == payload.email).first()
    user_id = user.id if user else None
    
    await generate_and_persist_otp(db, payload.email, user_id=user_id)
    return {"message": "New OTP sent to email"}

# --- Logout Endpoint ---

@auth_router.post("/logout")
def logout(db: Session = Depends(get_db)):
    """
    Logout endpoint that invalidates the current session.
    Frontend deletes token from localStorage on 200 response.
    """
    # Currently: Simple success response for client-side token removal
    # Future enhancement: Implement token blacklist in Redis if needed
    return {"status": "SUCCESS", "message": "Successfully logged out"}

# --- Forgot Password Flow (OTP-Based) ---

@auth_router.post("/forgot-password")
async def forgot_password(payload: schemas.EmailRequest, db: Session = Depends(get_db)):
    """
    Stage 1: Request password recovery OTP.
    Generates a 6-digit numeric OTP if user exists.
    Returns the same message for security (prevents account enumeration).
    """
    user = db.query(User).filter(User.email == payload.email).first()
    
    if user:
        # Generate 6-digit numeric OTP (no letters, just numbers)
        otp_code = "".join(random.choices(string.digits, k=6))
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        
        # Invalidate old unused OTPs for this email
        db.query(EmailOTP).filter(
            EmailOTP.email == user.email,
            EmailOTP.is_used == False,
            EmailOTP.purpose == "password_recovery"
        ).update({"is_used": True}, synchronize_session=False)
        
        # Create new password recovery OTP
        otp_record = EmailOTP(
            email=user.email,
            user_id=user.id,
            otp_code=otp_code,
            expires_at=expires_at,
            purpose="password_recovery"
        )
        db.add(otp_record)
        db.commit()
        
        # 📧 SEND EMAIL: Password recovery OTP
        from app.services.email_service import email_service
        email_sent = email_service.send_password_recovery_otp(user.email, otp_code)
        
        if email_sent:
            print(f"✅ Password recovery OTP sent to {user.email}")
        else:
            # Log to console for testing/debugging
            print(f"\n{'='*70}")
            print(f"🔐 PASSWORD RECOVERY OTP (Valid for 5 minutes)")
            print(f"User Email: {user.email}")
            print(f"OTP Code: {otp_code}")
            print(f"Expires At: {expires_at.isoformat()}")
            print(f"{'='*70}\n")
    
    # Generic response (doesn't leak if account exists)
    return {
        "status": "OTP_SENT",
        "message": "If an account exists with this email, you will receive a 6-digit code shortly."
    }

# --- Verify Password Reset OTP ---

@auth_router.post("/verify-password-otp")
def verify_password_otp(payload: schemas.VerifyPasswordOTPRequest, db: Session = Depends(get_db)):
    """
    Stage 2: Verify the OTP and get temporary reset authorization.
    Returns a temporary reset_token if OTP is valid.
    """
    # Find user
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or OTP"
        )
    
    # Find valid OTP record
    otp_record = db.query(EmailOTP).filter(
        EmailOTP.email == payload.email,
        EmailOTP.otp_code == payload.otp_code,
        EmailOTP.is_used == False,
        EmailOTP.purpose == "password_recovery",
        EmailOTP.expires_at > datetime.now(timezone.utc)
    ).first()
    
    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )
    
    # Mark OTP as used
    otp_record.is_used = True
    db.commit()
    
    # Generate temporary reset token (valid for 15 minutes)
    reset_token = str(secrets.token_urlsafe(32))
    password_reset_record = PasswordReset(
        user_id=user.id,
        email=user.email,
        reset_token=reset_token,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15)
    )
    db.add(password_reset_record)
    db.commit()
    
    return {
        "status": "OTP_VERIFIED",
        "message": "OTP verified successfully",
        "reset_token": reset_token
    }

# --- Reset Password Endpoint (Stage 3) ---

@auth_router.post("/reset-password")
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Stage 3: Reset password with temporary reset token (obtained after OTP verification).
    Validates token, updates password, and invalidates token immediately.
    """
    # Find reset token record
    reset_record = db.query(PasswordReset).filter(
        PasswordReset.reset_token == payload.reset_token
    ).first()
    
    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token"
        )
    
    # Check if token is valid (not used and not expired)
    if not reset_record.is_valid():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired or already been used"
        )
    
    # Find user
    user = db.query(User).filter(User.id == reset_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update password (hash with bcrypt)
    user.password_hash = get_password_hash(payload.new_password)
    
    # Mark token as used (CRITICAL: Prevent token reuse)
    reset_record.mark_as_used()
    
    db.commit()
    
    return {
        "status": "SUCCESS",
        "message": "Password has been successfully reset. Please log in with your new password."
    }