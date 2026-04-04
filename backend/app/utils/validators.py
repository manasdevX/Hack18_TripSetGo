import re

def validate_email(email: str) -> bool:
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password: str) -> tuple:
    """
    Validate password strength.
    Returns (is_valid, message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain lowercase letters"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain uppercase letters"
    
    if not re.search(r'[0-9]', password):
        return False, "Password must contain numbers"
    
    return True, "Password is valid"

def validate_full_name(name: str) -> bool:
    """Validate full name."""
    return len(name.strip()) >= 2 and len(name) <= 255