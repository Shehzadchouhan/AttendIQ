from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.models.student import Student
from app.models.user import User
from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse
from app.api.deps import get_current_user, require_admin

router = APIRouter()


@router.get("/", response_model=List[StudentResponse], summary="List Students")
def list_students(
    search: Optional[str] = Query(None, description="Search by name or roll number"),
    skip: int = Query(0, ge=0, description="Records to skip for pagination"),
    limit: int = Query(100, ge=1, le=200, description="Max records to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all registered students with optional search filter and pagination.
    Available to both Admins and Teachers.
    """
    query = db.query(Student)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Student.full_name.ilike(search_filter),
                Student.roll_number.ilike(search_filter)
            )
        )
    return query.order_by(Student.roll_number.asc()).offset(skip).limit(limit).all()


@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED, summary="Create Student")
def create_student(
    student_in: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Register a new student.
    Ensures roll number is unique across all students.
    """
    existing_student = db.query(Student).filter(Student.roll_number == student_in.roll_number).first()
    if existing_student:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Student with roll number '{student_in.roll_number}' already exists."
        )

    new_student = Student(
        roll_number=student_in.roll_number,
        full_name=student_in.full_name,
        email=student_in.email,
        phone=student_in.phone,
        is_active=student_in.is_active
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return new_student


@router.get("/{student_id}", response_model=StudentResponse, summary="Get Student by ID")
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetch a single student by primary key ID.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {student_id} not found."
        )
    return student


@router.put("/{student_id}", response_model=StudentResponse, summary="Update Student")
def update_student(
    student_id: int,
    student_in: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update student profile details.
    Validates roll number conflict if changed.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {student_id} not found."
        )

    # Check roll number uniqueness if updated
    if student_in.roll_number and student_in.roll_number != student.roll_number:
        duplicate = db.query(Student).filter(
            Student.roll_number == student_in.roll_number,
            Student.id != student_id
        ).first()
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Another student with roll number '{student_in.roll_number}' already exists."
            )
        student.roll_number = student_in.roll_number

    if student_in.full_name is not None:
        student.full_name = student_in.full_name
    if student_in.email is not None:
        student.email = student_in.email
    if student_in.phone is not None:
        student.phone = student_in.phone
    if student_in.is_active is not None:
        student.is_active = student_in.is_active

    db.commit()
    db.refresh(student)
    return student


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete Student (Admin Only)")
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Delete a student from the system.
    Restricted to Admins.
    Cascade automatically removes associated enrollments and embeddings.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {student_id} not found."
        )

    db.delete(student)
    db.commit()
    return None
