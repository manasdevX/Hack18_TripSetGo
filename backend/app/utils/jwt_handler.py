from app.core.security import create_access_token, create_refresh_token
from app.core.config import settings
from datetime import timedelta
from uuid import UUID

def generate_tokens(user_id: UUID) -> dict:
    """Generate access and refresh tokens."""
    access_token = create_access_token(
        data={"sub": str(user_id)},
        expires_delta=timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_refresh_token(user_id)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }