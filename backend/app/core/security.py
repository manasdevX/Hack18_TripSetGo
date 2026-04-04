import bcrypt as _bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Dict
from jose import JWTError, jwt
from app.core.config import settings

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode("utf-8")
    salt = _bcrypt.gensalt()
    return _bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    return _bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def create_refresh_token(user_id: Any) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {"sub": str(user_id), "exp": expire, "type": "refresh"}
    return jwt.encode(payload, settings.REFRESH_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def create_signup_token(email: str, name: str) -> str:
    """Temporary signed token for the Google 'complete-signup' bridge."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.SIGNUP_TOKEN_EXPIRE_MINUTES
    )
    payload = {"email": email, "name": name, "exp": expire, "type": "signup_prefill"}
    return jwt.encode(payload, settings.GOOGLE_PREFILL_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str, secret: str) -> Optional[dict]:
    try:
        return jwt.decode(token, secret, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None