from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.core.config import settings
from app.core.database import get_db
from app.models.student import Student, FaceEmbedding
from app.models.user import User
from app.schemas.student import (
    StudentCreate,
    StudentUpdate,
    StudentResponse,
    StudentConsentUpdate,
    StudentFacesResponse
)
from app.api.deps import get_current_user, require_admin, verify_student_access
from app.services.face_engine import face_engine

router = APIRouter()


@router.get("/", response_model=List[StudentResponse], summary="List Students")
def list_students(
    search: Optional[str] = Query(None, description="Search by name or roll number"),
    skip: int = Query(0, ge=0, description="Records to skip for pagination"),
    limit: int = Query(100, ge=1, le=1000, description="Max records to return"),
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
        is_active=student_in.is_active,
        consent_given=False
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


# ==============================================================================
# PHASE 2: FACE ENROLLMENT & CONSENT MANAGEMENT ENDPOINTS
# ==============================================================================

@router.patch("/{student_id}/consent", response_model=StudentResponse, summary="Update Student Face Data Consent")
def update_student_consent(
    student_id: int,
    consent_in: StudentConsentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update consent to store face data for a student.
    - Setting to true records current timestamp.
    - Setting to false revokes consent and automatically deletes any enrolled face embeddings.
    - RBAC: Admins can update any student; teachers can only update students enrolled in their own batches.
    """
    student = verify_student_access(student_id, current_user, db)

    if consent_in.consent_given:
        student.consent_given = True
        student.consent_at = datetime.now(timezone.utc)
    else:
        student.consent_given = False
        student.consent_at = None
        # Deleting consent also purges all stored embeddings for privacy
        db.query(FaceEmbedding).filter(FaceEmbedding.student_id == student_id).delete()

    db.commit()
    db.refresh(student)
    return student


@router.post("/{student_id}/faces", summary="Enroll Student Face Photos")
def enroll_student_faces(
    student_id: int,
    photos: List[UploadFile] = File(..., description="1 to 5 face portrait photos (JPG or PNG)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload 1 to 5 photos for face enrollment.
    - Enforces consent check (student.consent_given must be True).
    - Validates file format (JPG/PNG), size (<= 10MB), and max megapixels (<= 40MP).
    - Requires EXACTLY ONE high-quality face per photo (det_score >= 0.6, width >= 80px).
    - Stores 512-d normalized vector embeddings in database as JSON.
    - ZERO photos are stored on disk or in the database.
    - RBAC: Admins can enroll any student; teachers can only enroll students in their own batches.
    """
    student = verify_student_access(student_id, current_user, db)

    if not student.consent_given:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consent to store face data has not been granted for this student."
        )

    if len(photos) < 1 or len(photos) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide between 1 and 5 face portrait photos."
        )

    new_embeddings = []

    for photo_idx, photo in enumerate(photos, 1):
        content = photo.file.read()

        # Run face detection and feature extraction in memory
        faces, img_w, img_h = face_engine.get_faces(
            content,
            filename=photo.filename,
            det_size=settings.DETECTION_SIZE
        )

        if len(faces) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Photo {photo_idx} ('{photo.filename}'): No face detected. Please provide a clear, well-lit portrait photo."
            )

        if len(faces) > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Photo {photo_idx} ('{photo.filename}'): Multiple faces ({len(faces)}) detected. Each photo must contain exactly one face."
            )

        face = faces[0]
        face_width = face["bbox"][2] - face["bbox"][0]

        if face_width < settings.MIN_FACE_WIDTH:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Photo {photo_idx} ('{photo.filename}'): Face is too small ({face_width}px wide). Minimum required width is {settings.MIN_FACE_WIDTH}px."
            )

        if face["det_score"] < settings.MIN_DET_SCORE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Photo {photo_idx} ('{photo.filename}'): Face detection confidence is too low ({face['det_score']:.2f}). Minimum required confidence is {settings.MIN_DET_SCORE}."
            )

        embedding_record = FaceEmbedding(
            student_id=student.id,
            embedding_data=face["embedding"]
        )
        new_embeddings.append(embedding_record)

    db.add_all(new_embeddings)
    db.commit()

    total_count = db.query(func.count(FaceEmbedding.id)).filter(FaceEmbedding.student_id == student.id).scalar() or 0

    return {
        "message": f"Successfully enrolled {len(new_embeddings)} face embedding(s) for student '{student.full_name}'.",
        "enrolled_count": total_count
    }


@router.get("/{student_id}/faces", response_model=StudentFacesResponse, summary="Get Enrolled Face Count")
def get_student_faces(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Return count of enrolled face embeddings and consent status for a student.
    RBAC: Admins can view any student; teachers can view students in their own batches.
    """
    student = verify_student_access(student_id, current_user, db)
    count = db.query(func.count(FaceEmbedding.id)).filter(FaceEmbedding.student_id == student.id).scalar() or 0

    return StudentFacesResponse(
        student_id=student.id,
        enrolled_count=count,
        consent_given=student.consent_given,
        consent_at=student.consent_at
    )


@router.delete("/{student_id}/faces", summary="Delete Student Face Embeddings")
def delete_student_faces(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete all enrolled face embeddings for a student.
    RBAC: Admins can delete for any student; teachers can delete for students in their own batches.
    """
    student = verify_student_access(student_id, current_user, db)
    deleted_count = db.query(FaceEmbedding).filter(FaceEmbedding.student_id == student.id).delete()
    db.commit()

    return {
        "message": f"Deleted {deleted_count} face embedding(s) for student '{student.full_name}'."
    }
