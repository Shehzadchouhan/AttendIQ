from typing import Generator, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole

# OAuth2 scheme: informs Swagger/OpenAPI docs where to obtain the Bearer token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency that decodes the Bearer JWT token, validates its integrity,
    and returns the currently authenticated User instance from the database.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    if payload is None:
        raise credentials_exception

    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )

    return user


def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency that ensures the authenticated user has the 'admin' role.
    Raises 403 Forbidden otherwise.
    """
    if current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation requires Admin privileges"
        )
    return current_user


def verify_student_access(
    student_id: int,
    current_user: User,
    db: Session
):
    """
    Verifies that the current user has permission to access the student:
    - Admins can access any student.
    - Teachers can only access students enrolled in at least one batch they teach.
    """
    from app.models.student import Student
    from app.models.batch import Batch, Enrollment

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {student_id} not found."
        )

    if current_user.role != UserRole.ADMIN.value:
        # Multi-tenant isolation: allow if teacher created the student OR teaches the student in a batch
        is_creator = (student.creator_id == current_user.id)
        has_enrollment = False
        if not is_creator:
            has_enrollment = db.query(Enrollment.id).join(
                Batch, Batch.id == Enrollment.batch_id
            ).filter(
                Enrollment.student_id == student_id,
                Batch.teacher_id == current_user.id
            ).first() is not None

        if not is_creator and not has_enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access face data or records for this student."
            )

    return student
