from typing import List, Optional
from pydantic import BaseModel, Field


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
