from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class UserBase(BaseModel):
    email: str
    full_name: str
    institution_name: Optional[str] = None  # Coaching Center / Tuition Name
    phone: Optional[str] = None
    role: str = "teacher"
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class TutorRegisterRequest(BaseModel):
    """
    Self-service registration payload for independent tuition teachers.
    """
    email: str
    password: str
    full_name: str
    institution_name: Optional[str] = None
    phone: Optional[str] = None


class UserLogin(BaseModel):
    """
    JSON login payload.
    """
    email: str
    password: str


class UserResponse(UserBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TutorAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
