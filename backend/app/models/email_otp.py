from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database.base_class import Base

class EmailOTP(Base):
    __tablename__ = "email_otps"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    
    # FIX 1: Allow user_id to be NULL so we can send OTPs before account creation
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    
    # FIX 2: Add email column to track the OTP recipient for new signups
    email = Column(String(255), index=True, nullable=True)
    
    otp_code = Column(String(6), nullable=False)
    purpose = Column(String(50), default="verification") # signup, reset_password, etc.
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())