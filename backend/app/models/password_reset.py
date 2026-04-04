from sqlalchemy import Column, String, DateTime, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timedelta, timezone
from app.database.base_class import Base

class PasswordReset(Base):
    """
    Stores one-time password reset tokens with expiry times.
    Tokens are invalidated after successful use.
    """
    __tablename__ = "password_resets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    
    # Token stored as-is (not hashed) for quick lookups and comparison
    # (Alternative: hash both token and stored version for extra security)
    reset_token = Column(String(255), unique=True, nullable=False, index=True)
    
    is_used = Column(Boolean, default=False, nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def is_valid(self) -> bool:
        """Check if token is valid (not used and not expired)"""
        now = datetime.now(timezone.utc)
        return not self.is_used and self.expires_at > now
    
    def mark_as_used(self):
        """Invalidate token by marking as used"""
        self.is_used = True
        self.used_at = datetime.now(timezone.utc)
