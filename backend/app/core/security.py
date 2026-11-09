from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Dict
import bcrypt
import jwt
from app.core.config import settings


def get_password_hash(password: str) -> str:
    """
    Hashes a plain text password using bcrypt directly (avoids passlib issues).
    1. Encodes string to UTF-8 bytes.
    2. Generates a random cryptographic salt.
    3. Returns the resulting hash as a readable string.
    """
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies whether a plain text password matches an existing bcrypt hash.
    Safe against timing attacks.
    """
    try:
        plain_bytes = plain_password.encode("utf-8")
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(plain_bytes, hash_bytes)
    except Exception:
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a signed JSON Web Token (JWT) containing user claims.
    - 'sub': Subject (typically user email or user ID)
    - 'role': Role (admin or teacher) for Role-Based Access Control
    - 'exp': Expiration timestamp
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodes and cryptographically verifies a JWT token.
    Returns the payload dictionary if valid, or None if expired or tampered with.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
