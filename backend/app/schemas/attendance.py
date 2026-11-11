from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class FaceDetectionResult(BaseModel):
    bbox: List[int] = Field(..., description="[x1, y1, x2, y2] bounding box coordinates")
    det_score: float = Field(..., description="Face detector confidence score")
    student_id: Optional[int] = Field(None, description="Matched student ID (or null)")
    student_name: Optional[str] = Field(None, description="Matched student full name (or null)")
    score: float = Field(..., description="Highest cosine similarity score achieved")
    status: str = Field(..., description="'matched' | 'review' | 'unknown'")


class AttendanceRecognizeResponse(BaseModel):
    image_width: int
    image_height: int
    faces: List[FaceDetectionResult]
    absent_student_ids: List[int]


class AttendanceSessionCreate(BaseModel):
    batch_id: int = Field(..., examples=[1], description="ID of the batch")
    session_date: date = Field(..., description="Calendar date for the session (YYYY-MM-DD)")


class AttendanceRecordConfirmItem(BaseModel):
    student_id: int = Field(..., examples=[1])
    status: str = Field(..., examples=["present"], description="present | absent | late")
    method: str = Field("manual", examples=["face"], description="face | manual")
    confidence_score: Optional[float] = Field(None, examples=[0.88])


class AttendanceSessionConfirmRequest(BaseModel):
    records: List[AttendanceRecordConfirmItem]
    unrecognized_count: Optional[int] = Field(0, description="Count of unidentified faces in photo")


class AttendanceRecordResponse(BaseModel):
    id: int
    session_id: int
    student_id: int
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    status: str
    method: str
    is_confirmed: bool
    confidence_score: Optional[float] = None
    marked_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AttendanceSessionResponse(BaseModel):
    id: int
    batch_id: int
    batch_name: Optional[str] = None
    session_date: date
    status: str
    taken_by_user_id: Optional[int] = None
    taken_by_user_name: Optional[str] = None
    unrecognized_count: int = 0
    is_locked: bool = False
    locked_at: Optional[datetime] = None
    unlock_reason: Optional[str] = None
    present_count: int = 0
    absent_count: int = 0
    late_count: int = 0
    total_enrolled: int = 0
    created_at: datetime
    records: Optional[List[AttendanceRecordResponse]] = None

    model_config = ConfigDict(from_attributes=True)


class SessionUnlockRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500, description="Audit reason for unlocking historical attendance session")


class AttendanceAuditLogResponse(BaseModel):
    id: int
    session_id: int
    student_id: Optional[int] = None
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    changed_by_user_id: Optional[int] = None
    changed_by_user_name: Optional[str] = None
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    action: str
    reason: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
