from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.core.security import (
    verify_password, get_password_hash, 
    create_access_token, create_refresh_token
)

class AuthService:
    @staticmethod
    def login_user(db: Session, email: str, password: str) -> dict:
        user = db.query(User).filter(User.email == email).first()
        
        # Requirement: If account doesn't exist, throw 404 so frontend redirects to Signup
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found. Please sign up."
            )
        
        # Check password
        if not user.password_hash or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Safety check (though our new flow ensures verification before creation)
        if not user.email_verified:
            return {"status": "UNVERIFIED", "email": email}

        return {
            "status": "SUCCESS",
            "tokens": {
                "access_token": create_access_token({"sub": str(user.id)}),
                "refresh_token": create_refresh_token(user.id),
            },
            "user": user
        }

    @staticmethod
    def logout_user():
        # JWTs are stateless; client handles deletion. 
        # Server-side logout is a placeholder for future token blacklisting.
        return {"message": "Logged out successfully"}

auth_service = AuthService()