
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.user import User, AuthProvider
from app.utils.password import hash_user_password
from uuid import UUID
from typing import Optional

class UserService:
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """Get user by email."""
        return db.query(User).filter(User.email == email).first()
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: UUID) -> Optional[User]:
        """Get user by ID."""
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def get_user_by_google_id(db: Session, google_id: str) -> Optional[User]:
        """Get user by Google ID."""
        return db.query(User).filter(User.google_id == google_id).first()
    
    @staticmethod
    def create_user(
        db: Session,
        email: str,
        full_name: str,
        password: Optional[str] = None,
        google_id: Optional[str] = None,
        auth_provider: AuthProvider = AuthProvider.LOCAL
    ) -> User:
        """Create a new user."""
        password_hash = hash_user_password(password) if password else None
        
        user = User(
            email=email,
            full_name=full_name,
            password_hash=password_hash,
            google_id=google_id,
            auth_provider=auth_provider,
            is_email_verified=(auth_provider == AuthProvider.GOOGLE),
            is_active=True
        )
        
        try:
            db.add(user)
            db.commit()
            db.refresh(user)
            return user
        except IntegrityError:
            db.rollback()
            raise Exception("Email already exists")
    
    @staticmethod
    def update_user(db: Session, user: User, **kwargs) -> User:
        """Update user fields."""
        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)
        
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def link_google_account(db: Session, user: User, google_id: str) -> User:
        """Link Google account to existing user."""
        user.google_id = google_id
        user.auth_provider = AuthProvider.GOOGLE
        user.is_email_verified = True
        db.commit()
        db.refresh(user)
        return user

user_service = UserService()