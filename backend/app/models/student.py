from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, func, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class Student(Base):
    """
    SQLAlchemy Model for registered tuition center students.
    Multi-tenant scoped: Each student belongs to a specific tutor / creator (creator_id).
    """
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    roll_number = Column(String(50), index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    parent_name = Column(String(255), nullable=True)
    parent_phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    # Face Enrollment Consent tracking
    consent_given = Column(Boolean, default=False, server_default="false", nullable=False)
    consent_at = Column(DateTime(timezone=True), nullable=True)
    # Multi-tenant workspace creator (Tutor ID)
    creator_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("creator_id", "roll_number", name="uq_student_creator_roll"),
    )

    # Cascade deletes: If a student is deleted, their enrollments, face embeddings,
    # and attendance records are automatically deleted.
    creator = relationship("User", back_populates="created_students")
    enrollments = relationship(
        "Enrollment",
        back_populates="student",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    face_embeddings = relationship(
        "FaceEmbedding",
        back_populates="student",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    attendance_records = relationship(
        "AttendanceRecord",
        back_populates="student",
        cascade="all, delete-orphan",
        passive_deletes=True
    )


class FaceEmbedding(Base):
    """
    SQLAlchemy Model for storing facial feature vector embeddings.
    Note: For privacy and lightweight storage, NO raw photos/image_paths are stored.
    The embedding_data stores a JSON array of floats (e.g. 128-d or 512-d feature vector)
    ready for cosine-distance matching in Phase 2.
    """
    __tablename__ = "face_embeddings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(
        Integer,
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    # Stored as a JSON list of floats (e.g., [0.012, -0.45, ...])
    embedding_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    student = relationship("Student", back_populates="face_embeddings")
