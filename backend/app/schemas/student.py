from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class StudentBase(BaseModel):
    roll_number: str = Field(..., example="STU-101")
    full_name: str = Field(..., example="Aarav Patel")
    email: Optional[str] = Field(None, example="aarav@example.com")
    phone: Optional[str] = Field(None, example="+91 9876543210")
    is_active: bool = True


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    roll_number: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class StudentResponse(StudentBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
