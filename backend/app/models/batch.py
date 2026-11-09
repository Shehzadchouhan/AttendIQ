from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Batch(Base):
    """
    SQLAlchemy Model for academic batches (e.g., "Class 10 - Mathematics Morning").
    """
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), index=True, nullable=False)
    subject = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    teacher_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    teacher = relationship("User", back_populates="taught_batches")
    enrollments = relationship(
        "Enrollment",
        back_populates="batch",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    attendance_sessions = relationship(
        "AttendanceSession",
        back_populates="batch",
        cascade="all, delete-orphan",
        passive_deletes=True
    )


class Enrollment(Base):
    """
    Many-to-Many association model linking Students to Batches.
    Includes ondelete="CASCADE" so removing a student or batch cleans up enrollments.
    """
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(
        Integer,
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    batch_id = Column(
        Integer,
        ForeignKey("batches.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Prevent a student from being enrolled twice in the exact same batch
    __table_args__ = (
        UniqueConstraint("student_id", "batch_id", name="uq_batch_student"),
    )

    student = relationship("Student", back_populates="enrollments")
    batch = relationship("Batch", back_populates="enrollments")
