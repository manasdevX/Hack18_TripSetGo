from app.core.security import hash_password, verify_password

def hash_user_password(password: str) -> str:
    """Hash user password."""
    return hash_password(password)

def check_password(plain_password: str, hashed_password: str) -> bool:
    """Check if plain password matches hash."""
    return verify_password(plain_password, hashed_password)