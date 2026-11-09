from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class AttendanceSession(Base):
    """
    Represents an attendance session conducted for a specific batch on a particular date.
    """
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    batch_id = Column(
        Integer,
        ForeignKey("batches.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    taken_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    session_date = Column(Date, nullable=False)
    status = Column(String(50), default="completed", nullable=False)  # "scheduled", "completed"
    unrecognized_count = Column(Integer, default=0, server_default="0", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    batch = relationship("Batch", back_populates="attendance_sessions")
    taken_by_user = relationship("User", back_populates="attendance_sessions")
    records = relationship(
        "AttendanceRecord",
        back_populates="session",
        cascade="all, delete-orphan",
        passive_deletes=True
    )


class AttendanceRecord(Base):
    """
    Individual attendance mark for a student in a session.
    Unique constraint ensures one record per student per session.
    """
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(
        Integer,
        ForeignKey("attendance_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    student_id = Column(
        Integer,
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    # Status: 'present', 'absent', 'late'
    status = Column(String(20), nullable=False, default="present")
    # Attendance method: 'face' | 'manual'
    method = Column(String(20), default="manual", server_default="manual", nullable=False)
    # Confirmation status (true once reviewed / validated)
    is_confirmed = Column(Boolean, default=False, server_default="false", nullable=False)
    # For Phase 2 Face Recognition confidence (e.g. 0.94), null when marked manually
    confidence_score = Column(Float, nullable=True)
    marked_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Unique constraint preventing duplicate attendance marks for a student in the same session
    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_session_student"),
    )

    session = relationship("AttendanceSession", back_populates="records")
    student = relationship("Student", back_populates="attendance_records")
