from pydantic import BaseModel, EmailStr, Field
from typing import Optional

# --- Request Schemas ---

class SignupRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    credential: str  # The ID Token/Credential received from Google Frontend

class CompleteGoogleRequest(BaseModel):
    signup_token: str  # The temporary JWT signed by our backend
    password: str = Field(..., min_length=8)

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)

class ResendOTPRequest(BaseModel):
    email: EmailStr

class RefreshTokenRequest(BaseModel):
    refresh_token: str

# --- Response Schemas ---

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    status: Optional[str] = "SUCCESS"

class GoogleAuthResponse(BaseModel):
    # This matches the custom logic: either return tokens or a redirect status
    status: str  # "SUCCESS", "SIGNUP_REQUIRED", or "VERIFICATION_REQUIRED"
    email: Optional[str] = None
    full_name: Optional[str] = None
    signup_token: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None

class UserProfileResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    email_verified: bool
    signup_source: str

    class Config:
        from_attributes = True # Allows Pydantic to read SQLAlchemy models