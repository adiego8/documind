from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import re
from collections import defaultdict
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import UserDB
from app.config import settings

SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Account lockout configuration
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15

# In-memory tracking of failed login attempts
# Format: {username: {"attempts": int, "locked_until": datetime}}
failed_login_attempts: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"attempts": 0, "locked_until": None})

def validate_password_strength(password: str) -> None:
    """
    Validate password meets security requirements
    Raises HTTPException if password is weak
    """
    errors = []

    # Minimum length
    if len(password) < 12:
        errors.append("Password must be at least 12 characters long")

    # Check for uppercase letter
    if not re.search(r'[A-Z]', password):
        errors.append("Password must contain at least one uppercase letter")

    # Check for lowercase letter
    if not re.search(r'[a-z]', password):
        errors.append("Password must contain at least one lowercase letter")

    # Check for digit
    if not re.search(r'\d', password):
        errors.append("Password must contain at least one number")

    # Check for special character
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        errors.append("Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>)")

    # Check for common weak passwords
    weak_passwords = [
        "password123", "123456789012", "qwerty123456",
        "admin123456", "letmein12345", "welcome12345"
    ]
    if password.lower() in weak_passwords:
        errors.append("Password is too common")

    if errors:
        # Format errors as a single string for frontend compatibility
        error_message = "Password does not meet security requirements:\n" + "\n".join(f"• {error}" for error in errors)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def is_account_locked(username: str) -> bool:
    """Check if account is currently locked due to failed login attempts"""
    if username not in failed_login_attempts:
        return False

    account_data = failed_login_attempts[username]
    locked_until = account_data.get("locked_until")

    if locked_until and datetime.utcnow() < locked_until:
        return True

    # Lockout period expired, reset
    if locked_until and datetime.utcnow() >= locked_until:
        failed_login_attempts[username] = {"attempts": 0, "locked_until": None}
        return False

    return False

def record_failed_login(username: str) -> None:
    """Record a failed login attempt and lock account if threshold exceeded"""
    failed_login_attempts[username]["attempts"] += 1

    if failed_login_attempts[username]["attempts"] >= MAX_FAILED_ATTEMPTS:
        failed_login_attempts[username]["locked_until"] = datetime.utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)

def clear_failed_login_attempts(username: str) -> None:
    """Clear failed login attempts on successful login"""
    if username in failed_login_attempts:
        failed_login_attempts[username] = {"attempts": 0, "locked_until": None}

def get_lockout_info(username: str) -> Optional[Dict[str, Any]]:
    """Get lockout information for user"""
    if username not in failed_login_attempts:
        return None

    account_data = failed_login_attempts[username]
    locked_until = account_data.get("locked_until")

    if locked_until and datetime.utcnow() < locked_until:
        remaining_seconds = int((locked_until - datetime.utcnow()).total_seconds())
        return {
            "locked": True,
            "remaining_seconds": remaining_seconds,
            "attempts": account_data["attempts"]
        }

    return {
        "locked": False,
        "attempts": account_data["attempts"]
    }

def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticate user with username and password"""
    # Check if account is locked
    if is_account_locked(username):
        lockout_info = get_lockout_info(username)
        remaining_minutes = lockout_info.get("remaining_seconds", 0) // 60
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Account locked due to too many failed login attempts. Please try again in {remaining_minutes} minute(s)."
        )

    user = UserDB.get_user_by_username(username)
    if not user:
        record_failed_login(username)
        return None

    if not verify_password(password, user['hashed_password']):
        record_failed_login(username)
        return None

    # Successful login - clear failed attempts
    clear_failed_login_attempts(username)
    return user

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = UserDB.get_user_by_username(username)
    if user is None:
        raise credentials_exception
    return user

def get_current_admin_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if current_user['role'] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user