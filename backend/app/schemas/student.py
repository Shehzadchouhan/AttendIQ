from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class StudentBase(BaseModel):
    roll_number: str = Field(..., examples=["STU-101"])
    full_name: str = Field(..., examples=["Aarav Patel"])
    email: Optional[str] = Field(None, examples=["aarav@example.com"])
    phone: Optional[str] = Field(None, examples=["+91 9876543210"])
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
    consent_given: bool = False
    consent_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StudentConsentUpdate(BaseModel):
    consent_given: bool


class StudentFacesResponse(BaseModel):
    student_id: int
    enrolled_count: int
    consent_given: bool
    consent_at: Optional[datetime] = None
