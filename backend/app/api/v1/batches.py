from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.batch import Batch, Enrollment
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.batch import (
    BatchCreate,
    BatchUpdate,
    BatchResponse,
    BatchDetailResponse,
    EnrollStudentRequest,
)
from app.schemas.user import UserResponse
from app.schemas.student import StudentResponse
from app.api.deps import get_current_user, require_admin

router = APIRouter()


@router.get("/teachers", response_model=List[UserResponse], summary="List All Teachers (For Admin Dropdown)")
def list_teachers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve active teachers in the system.
    Used by admins to assign batches to teachers.
    """
    teachers = db.query(User).filter(
        User.role == UserRole.TEACHER.value,
        User.is_active == True
    ).order_by(User.full_name.asc()).all()
    return teachers


@router.get("/", response_model=List[BatchResponse], summary="List Batches")
def list_batches(
    scope: Optional[str] = Query(None, description="Set 'all' to list all batches; defaults to role-filtered batches"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve batches:
    - Admins see all batches.
    - Teachers only see batches where teacher_id equals their user ID by default, or all if scope='all'.
    """
    query = db.query(Batch)
    if current_user.role != UserRole.ADMIN.value and scope != "all":
        query = query.filter(Batch.teacher_id == current_user.id)

    batches = query.order_by(Batch.name.asc()).all()
    results = []
    for b in batches:
        count = db.query(func.count(Enrollment.id)).filter(Enrollment.batch_id == b.id).scalar() or 0
        teacher_name = b.teacher.full_name if b.teacher else None
        results.append(
            BatchResponse(
                id=b.id,
                name=b.name,
                subject=b.subject,
                description=b.description,
                teacher_id=b.teacher_id,
                teacher_name=teacher_name,
                created_at=b.created_at,
                enrolled_count=count
            )
        )
    return results


@router.post("/", response_model=BatchResponse, status_code=status.HTTP_201_CREATED, summary="Create Batch")
def create_batch(
    batch_in: BatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new batch.
    - Admins can assign any teacher_id.
    - Teachers can only create batches assigned to themselves.
    """
    assigned_teacher_id: Optional[int] = None

    if current_user.role == UserRole.ADMIN.value:
        if batch_in.teacher_id is not None:
            # Validate assigned teacher exists
            assigned_teacher = db.query(User).filter(
                User.id == batch_in.teacher_id,
                User.role == UserRole.TEACHER.value
            ).first()
            if not assigned_teacher:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Teacher with ID {batch_in.teacher_id} not found."
                )
            assigned_teacher_id = assigned_teacher.id
    else:
        # User is a teacher: can only assign batch to themselves
        if batch_in.teacher_id is not None and batch_in.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Teachers can only create batches assigned to themselves."
            )
        assigned_teacher_id = current_user.id

    batch = Batch(
        name=batch_in.name,
        subject=batch_in.subject,
        description=batch_in.description,
        teacher_id=assigned_teacher_id
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    teacher_name = batch.teacher.full_name if batch.teacher else None

    return BatchResponse(
        id=batch.id,
        name=batch.name,
        subject=batch.subject,
        description=batch.description,
        teacher_id=batch.teacher_id,
        teacher_name=teacher_name,
        created_at=batch.created_at,
        enrolled_count=0
    )


@router.get("/{batch_id}", response_model=BatchDetailResponse, summary="Get Batch Details")
def get_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetch batch details and enrolled students.
    Admins can see any batch; teachers can only see batches where teacher_id matches their user ID.
    """
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch with ID {batch_id} not found."
        )

    # RBAC check: teacher cannot view another teacher's batch
    if current_user.role != UserRole.ADMIN.value and batch.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this batch."
        )

    enrolled_students = (
        db.query(Student)
        .join(Enrollment, Enrollment.student_id == Student.id)
        .filter(Enrollment.batch_id == batch_id)
        .order_by(Student.roll_number.asc())
        .all()
    )

    teacher_name = batch.teacher.full_name if batch.teacher else None

    return BatchDetailResponse(
        id=batch.id,
        name=batch.name,
        subject=batch.subject,
        description=batch.description,
        teacher_id=batch.teacher_id,
        teacher_name=teacher_name,
        created_at=batch.created_at,
        enrolled_students=enrolled_students
    )


@router.put("/{batch_id}", response_model=BatchResponse, summary="Update Batch")
def update_batch(
    batch_id: int,
    batch_in: BatchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update batch details:
    - Admins can update any batch and assign/reassign teachers.
    - Teachers can only edit their own batches and cannot reassign teacher_id.
    """
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch with ID {batch_id} not found."
        )

    # RBAC check: teacher can only edit their own batch
    if current_user.role != UserRole.ADMIN.value:
        if batch.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to edit another teacher's batch."
            )
        # Teachers cannot reassign teacher_id
        if batch_in.teacher_id is not None and batch_in.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can assign or reassign batches to other teachers."
            )
    else:
        # Admin updating teacher_id
        if batch_in.teacher_id is not None:
            assigned_teacher = db.query(User).filter(
                User.id == batch_in.teacher_id,
                User.role == UserRole.TEACHER.value
            ).first()
            if not assigned_teacher:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Teacher with ID {batch_in.teacher_id} not found."
                )
            batch.teacher_id = assigned_teacher.id

    if batch_in.name is not None:
        batch.name = batch_in.name
    if batch_in.subject is not None:
        batch.subject = batch_in.subject
    if batch_in.description is not None:
        batch.description = batch_in.description

    db.commit()
    db.refresh(batch)

    count = db.query(func.count(Enrollment.id)).filter(Enrollment.batch_id == batch.id).scalar() or 0
    teacher_name = batch.teacher.full_name if batch.teacher else None

    return BatchResponse(
        id=batch.id,
        name=batch.name,
        subject=batch.subject,
        description=batch.description,
        teacher_id=batch.teacher_id,
        teacher_name=teacher_name,
        created_at=batch.created_at,
        enrolled_count=count
    )


@router.delete("/{batch_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete Batch (Admin Only)")
def delete_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Delete a batch. Restricted strictly to Admins.
    """
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch with ID {batch_id} not found."
        )

    db.delete(batch)
    db.commit()
    return None


@router.post("/{batch_id}/enroll", status_code=status.HTTP_201_CREATED, summary="Enroll Student into Batch")
def enroll_student(
    batch_id: int,
    request: EnrollStudentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Enroll a student into a batch.
    - Admins can enroll into any batch.
    - Teachers can only enroll students into their own batches.
    """
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch with ID {batch_id} not found."
        )

    # RBAC check
    if current_user.role != UserRole.ADMIN.value and batch.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage enrollments for another teacher's batch."
        )

    student = db.query(Student).filter(Student.id == request.student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {request.student_id} not found."
        )

    # Check for existing enrollment
    existing = db.query(Enrollment).filter(
        Enrollment.batch_id == batch_id,
        Enrollment.student_id == request.student_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Student '{student.full_name}' is already enrolled in batch '{batch.name}'."
        )

    enrollment = Enrollment(batch_id=batch_id, student_id=request.student_id)
    db.add(enrollment)
    db.commit()

    return {"message": f"Successfully enrolled student {student.full_name} into {batch.name}"}


@router.delete("/{batch_id}/enroll/{student_id}", status_code=status.HTTP_200_OK, summary="Remove Student from Batch")
def unenroll_student(
    batch_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Unenroll a student from a batch.
    - Admins can unenroll from any batch.
    - Teachers can only unenroll from their own batches.
    """
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch with ID {batch_id} not found."
        )

    # RBAC check
    if current_user.role != UserRole.ADMIN.value and batch.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage enrollments for another teacher's batch."
        )

    enrollment = db.query(Enrollment).filter(
        Enrollment.batch_id == batch_id,
        Enrollment.student_id == student_id
    ).first()

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment record not found."
        )

    db.delete(enrollment)
    db.commit()
    return {"message": "Student successfully removed from batch"}
