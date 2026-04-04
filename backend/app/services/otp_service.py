import random
import string
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..models.email_otp import EmailOTP

class OTPService:
    @staticmethod
    def generate_otp(db: Session, user_id: int):
        """
        Generates a 6-digit numeric OTP, saves it to the database, 
        and invalidates any previous unused OTPs for the same user.
        """
        # 1. Invalidate previous OTPs for this user to prevent clutter/confusion
        db.query(EmailOTP).filter(
            EmailOTP.user_id == user_id, 
            EmailOTP.is_used == False
        ).update({"is_used": True})
        
        # 2. Generate a random 6-digit string
        otp_code = ''.join(random.choices(string.digits, k=6))
        
        # 3. Set expiration (e.g., 10 minutes from now)
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        
        # 4. Save to database
        db_otp = EmailOTP(
            user_id=user_id,
            otp_code=otp_code,
            expires_at=expires_at,
            purpose="email_verification"
        )
        
        db.add(db_otp)
        db.commit()
        db.refresh(db_otp)
        
        return otp_code

    @staticmethod
    def verify(db: Session, user_id: int, code: str) -> bool:
        """
        Checks if the provided code matches the latest valid OTP in the database.
        Returns True if valid, otherwise False.
        """
        otp_record = db.query(EmailOTP).filter(
            EmailOTP.user_id == user_id,
            EmailOTP.otp_code == code,
            EmailOTP.is_used == False,
            EmailOTP.expires_at > datetime.utcnow()
        ).first()
        
        if not otp_record:
            return False
            
        # Mark as used so it cannot be reused
        otp_record.is_used = True
        db.commit()
        
        return True

    @staticmethod
    def cleanup_expired_otps(db: Session):
        """
        Optional helper: Utility to delete very old OTP records to keep the table lean.
        """
        day_ago = datetime.utcnow() - timedelta(days=1)
        db.query(EmailOTP).filter(EmailOTP.expires_at < day_ago).delete()
        db.commit()