from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Any, Dict
from datetime import datetime
from uuid import UUID

# --- Base Schemas ---

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

# --- Request Schemas ---

class EmailRequest(BaseModel):
    """Used for the 'Verify' button to trigger OTP sending."""
    email: EmailStr

class UserRegister(BaseModel):
    """Final signup step after email is verified."""
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8, max_length=100)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class VerifyOTPRequest(BaseModel):
    """Used to confirm the 6-digit code entered by the user."""
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)

class GoogleSignupComplete(BaseModel):
    """If using a token-based finalization for Google users."""
    signup_token: str
    password: str = Field(..., min_length=8)

class ResetPasswordRequest(BaseModel):
    """Password reset endpoint - requires existing token and new password."""
    reset_token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=100)

class VerifyPasswordOTPRequest(BaseModel):
    """Verify password recovery OTP - returns temporary reset token."""
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)

# --- Response & Data Schemas ---

class TokenData(BaseModel):
    sub: Optional[str] = None # Will hold the User UUID string

class UserResponse(UserBase):
    id: UUID
    email_verified: bool
    signup_source: str
    picture: Optional[str] = None # Added for Google Profile Image support
    
    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    status: str
    message: Optional[str] = None
    tokens: Optional[Dict[str, str]] = None # Access and Refresh tokens
    user: Optional[UserResponse] = None
    
    # Fields for Google/Prefill Flow
    signup_token: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_verified: Optional[bool] = False