from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.batch import Batch, Enrollment
from app.models.student import Student, FaceEmbedding
from app.models.user import User, UserRole
from app.schemas.attendance import AttendanceRecognizeResponse, FaceDetectionResult
from app.api.deps import get_current_user
from app.services.face_engine import face_engine

router = APIRouter()


@router.post("/recognize", response_model=AttendanceRecognizeResponse, summary="Recognize Faces in Class Photo")
def recognize_class_attendance(
    batch_id: int = Form(..., description="ID of the batch being photographed"),
    file: UploadFile = File(..., description="Classroom group photo (JPG or PNG)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Classroom face recognition endpoint:
    1. Validates file format (JPG/PNG), size (<= 10MB), and max megapixels (<= 40MP).
    2. RBAC: Admins can recognize any batch; teachers can only recognize their own assigned batches.
    3. Detects all faces using RECOGNITION_DET_SIZE (default 1280 for small/far faces).
    4. Compares each detected face against ALL enrolled embeddings for students in this batch.
    5. Applies ONE-STUDENT-ONE-FACE matching: assigns highest scoring student per face.
    6. Categorizes each face as 'matched' (>= 0.45), 'review' (>= 0.35), or 'unknown'.
    7. Returns absent_student_ids for enrolled students not detected.
    8. Returns image_width and image_height for client-side bounding box overlay.
    9. Does NOT write attendance records to the database (preview/recognition step only).
    """
    # 1. Fetch batch & verify RBAC access
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch with ID {batch_id} not found."
        )

    if current_user.role != UserRole.ADMIN.value and batch.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to run recognition for another teacher's batch."
        )

    # 2. Read image content into memory (zero disk writes)
    content = file.file.read()

    # 3. Detect all faces in photo with wide detection size
    detected_faces, img_width, img_height = face_engine.get_faces(
        content,
        filename=file.filename,
        det_size=settings.RECOGNITION_DET_SIZE
    )

    # 4. Fetch enrolled active students for this batch
    enrolled_students = (
        db.query(Student)
        .join(Enrollment, Enrollment.student_id == Student.id)
        .filter(
            Enrollment.batch_id == batch_id,
            Student.is_active == True
        )
        .order_by(Student.roll_number.asc())
        .all()
    )

    # 5. Load stored face embeddings for candidate students
    students_data = []
    for s in enrolled_students:
        embedding_records = (
            db.query(FaceEmbedding.embedding_data)
            .filter(FaceEmbedding.student_id == s.id)
            .all()
        )
        # embedding_data is a JSON list of floats
        embeddings_list = [record[0] for record in embedding_records if record[0]]
        students_data.append({
            "id": s.id,
            "name": s.full_name,
            "embeddings": embeddings_list
        })

    # 6. Perform matching against all embeddings per student
    faces_results, absent_student_ids = face_engine.match_faces_to_students(
        detected_faces,
        students_data
    )

    return AttendanceRecognizeResponse(
        image_width=img_width,
        image_height=img_height,
        faces=[FaceDetectionResult(**f) for f in faces_results],
        absent_student_ids=absent_student_ids
    )
