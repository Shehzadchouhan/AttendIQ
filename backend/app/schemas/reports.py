from datetime import date
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class StudentBatchAttendance(BaseModel):
    batch_id: int
    batch_name: str
    total_sessions: int
    present_count: int
    absent_count: int
    late_count: int
    attendance_percentage: float

    model_config = ConfigDict(from_attributes=True)


class StudentAttendanceReport(BaseModel):
    student_id: int
    roll_number: str
    full_name: str
    overall_percentage: float
    total_sessions: int
    present_count: int
    absent_count: int
    late_count: int
    is_low_attendance: bool
    batch_breakdown: List[StudentBatchAttendance]

    model_config = ConfigDict(from_attributes=True)


class BatchStudentAttendanceItem(BaseModel):
    student_id: int
    roll_number: str
    full_name: str
    present_count: int
    absent_count: int
    late_count: int
    total_sessions: int
    attendance_percentage: float
    is_low_attendance: bool

    model_config = ConfigDict(from_attributes=True)


class DailyTrendItem(BaseModel):
    date: str
    total_present: int
    total_absent: int
    total_late: int
    attendance_rate: float


class BatchAttendanceReport(BaseModel):
    batch_id: int
    batch_name: str
    teacher_name: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    total_sessions: int
    batch_average_percentage: float
    low_attendance_count: int
    alert_threshold: float
    students: List[BatchStudentAttendanceItem]
    daily_trend: List[DailyTrendItem]

    model_config = ConfigDict(from_attributes=True)


class DashboardAttendanceSummary(BaseModel):
    today_sessions_count: int
    today_present_count: int
    today_absent_count: int
    today_attendance_rate: float
    low_attendance_students: List[BatchStudentAttendanceItem]
