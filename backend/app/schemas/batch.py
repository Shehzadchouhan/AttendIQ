from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.student import StudentResponse


class BatchBase(BaseModel):
    name: str = Field(..., example="Class 10 - Mathematics")
    subject: str = Field(..., example="Mathematics")
    description: Optional[str] = Field(None, example="Morning regular batch covering algebra and geometry")
    teacher_id: Optional[int] = Field(None, example=2)


class BatchCreate(BatchBase):
    pass


class BatchUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    teacher_id: Optional[int] = None


class BatchResponse(BatchBase):
    id: int
    created_at: datetime
    enrolled_count: int = 0
    teacher_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class BatchDetailResponse(BatchBase):
    id: int
    created_at: datetime
    teacher_name: Optional[str] = None
    enrolled_students: List[StudentResponse] = []

    model_config = ConfigDict(from_attributes=True)


class EnrollStudentRequest(BaseModel):
    student_id: int = Field(..., example=1)
