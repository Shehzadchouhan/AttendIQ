from typing import Optional
from pydantic import BaseModel


class Token(BaseModel):
    """
    Schema for JWT access token response sent upon successful login or registration.
    """
    access_token: str
    token_type: str = "bearer"
    user_id: Optional[int] = None
    user_role: str
    user_name: str
    user_email: str
    institution_name: Optional[str] = None


class TokenPayload(BaseModel):
    """
    Schema for decoded claims inside the JWT token.
    """
    sub: Optional[str] = None       # User email
    role: Optional[str] = None      # Role ("admin" | "teacher")
    user_id: Optional[int] = None   # User primary key ID
