import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class UserRole(str, enum.Enum):
    """
    Role-Based Access Control (RBAC) roles.
    - ADMIN: Full system access (can create/delete batches, users, students).
    - TEACHER: Can view students/batches, take attendance sessions.
    """
    ADMIN = "admin"
    TEACHER = "teacher"


class User(Base):
    """
    SQLAlchemy Model for system users (Admins and Teachers).
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default=UserRole.TEACHER.value)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    attendance_sessions = relationship("AttendanceSession", back_populates="taken_by_user")
    taught_batches = relationship("Batch", back_populates="teacher")
