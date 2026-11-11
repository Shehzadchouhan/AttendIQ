from datetime import date, datetime, timezone, timedelta
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Body, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import settings
from app.core.database import get_db
from app.models.batch import Batch, Enrollment
from app.models.student import Student, FaceEmbedding
from app.models.attendance import AttendanceSession, AttendanceRecord, AttendanceAuditLog
from app.models.user import User, UserRole
from app.schemas.attendance import (
    AttendanceRecognizeResponse,
    FaceDetectionResult,
    AttendanceSessionCreate,
    AttendanceRecordConfirmItem,
    AttendanceSessionConfirmRequest,
    AttendanceRecordResponse,
    AttendanceSessionResponse,
    SessionUnlockRequest,
    AttendanceAuditLogResponse,
)
from app.api.deps import get_current_user, require_admin
from app.services.face_engine import face_engine

router = APIRouter()


def _is_session_locked(session: AttendanceSession) -> bool:
    """Helper to check if a session is locked manually or automatically after 24h."""
    if session.is_locked:
        return True
    # Auto-lock 24h after creation if completed and not explicitly unlocked with an audit reason
    if session.status == "completed" and not session.unlock_reason:
        created_at = session.created_at
        if created_at:
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            now_utc = datetime.now(timezone.utc)
            if (now_utc - created_at) > timedelta(hours=24):
                return True
    return False


def _build_session_response(session: AttendanceSession, db: Session, include_records: bool = False) -> AttendanceSessionResponse:
    """Helper to assemble AttendanceSessionResponse with enrolled count, locking status, and record aggregates."""
    batch = session.batch
    taken_by = session.taken_by_user

    total_enrolled = db.query(Enrollment).filter(Enrollment.batch_id == session.batch_id).count()
    records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session.id).all()

    present_count = sum(1 for r in records if r.status == "present")
    absent_count = sum(1 for r in records if r.status == "absent")
    late_count = sum(1 for r in records if r.status == "late")

    record_responses = None
    if include_records:
        record_responses = [
            AttendanceRecordResponse(
                id=r.id,
                session_id=r.session_id,
                student_id=r.student_id,
                student_name=r.student.full_name if r.student else None,
                roll_number=r.student.roll_number if r.student else None,
                status=r.status,
                method=r.method,
                is_confirmed=r.is_confirmed,
                confidence_score=r.confidence_score,
                marked_at=r.marked_at,
            )
            for r in records
        ]

    effective_locked = _is_session_locked(session)

    return AttendanceSessionResponse(
        id=session.id,
        batch_id=session.batch_id,
        batch_name=batch.name if batch else None,
        session_date=session.session_date,
        status=session.status,
        taken_by_user_id=session.taken_by_user_id,
        taken_by_user_name=taken_by.full_name if taken_by else None,
        unrecognized_count=session.unrecognized_count,
        is_locked=effective_locked,
        locked_at=session.locked_at if session.is_locked else (session.created_at + timedelta(hours=24) if effective_locked and session.created_at else None),
        unlock_reason=session.unlock_reason,
        present_count=present_count,
        absent_count=absent_count,
        late_count=late_count,
        total_enrolled=total_enrolled,
        created_at=session.created_at,
        records=record_responses,
    )


# ============================================================================
# 1. FACE RECOGNITION (EPHEMERAL PREVIEW)
# ============================================================================
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

    content = file.file.read()
    detected_faces, img_width, img_height = face_engine.get_faces(
        content,
        filename=file.filename,
        det_size=settings.RECOGNITION_DET_SIZE
    )

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

    students_data = []
    for s in enrolled_students:
        embedding_records = (
            db.query(FaceEmbedding.embedding_data)
            .filter(FaceEmbedding.student_id == s.id)
            .all()
        )
        embeddings_list = []
        for record in embedding_records:
            val = record[0]
            if val:
                if isinstance(val, str):
                    import json
                    embeddings_list.append(json.loads(val))
                else:
                    embeddings_list.append(val)
        students_data.append({
            "id": s.id,
            "name": s.full_name,
            "embeddings": embeddings_list
        })

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


# ============================================================================
# 2. CREATE ATTENDANCE SESSION
# ============================================================================
@router.post("/sessions", response_model=AttendanceSessionResponse, status_code=status.HTTP_201_CREATED, summary="Create Attendance Session")
def create_attendance_session(
    payload: AttendanceSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Creates an attendance session for a specific batch and date.
    Strictly enforces one session per batch per date (UniqueConstraint / HTTP 409).
    RBAC: Teachers can only create sessions for their assigned batches; Admins for any.
    """
    batch = db.query(Batch).filter(Batch.id == payload.batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch with ID {payload.batch_id} not found."
        )

    if current_user.role != UserRole.ADMIN.value and batch.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create sessions for this batch."
        )

    # Check for existing session on this date for this batch
    existing = (
        db.query(AttendanceSession)
        .filter(
            AttendanceSession.batch_id == payload.batch_id,
            AttendanceSession.session_date == payload.session_date
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An attendance session for batch '{batch.name}' on {payload.session_date} already exists."
        )

    new_session = AttendanceSession(
        batch_id=payload.batch_id,
        session_date=payload.session_date,
        taken_by_user_id=current_user.id,
        status="scheduled",
        unrecognized_count=0
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return _build_session_response(new_session, db)


# ============================================================================
# 3. CONFIRM ATTENDANCE SESSION
# ============================================================================
@router.post("/sessions/{id}/confirm", response_model=AttendanceSessionResponse, summary="Confirm Attendance Session Records")
def confirm_attendance_session(
    id: int,
    body: Union[List[AttendanceRecordConfirmItem], AttendanceSessionConfirmRequest] = Body(...),
    unrecognized_count: Optional[int] = Query(None, description="Optional unrecognized count override"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Confirms and saves attendance marks for an attendance session:
    1. Body can be a list of records or AttendanceSessionConfirmRequest object.
    2. Rejects duplicate student_id in the payload (HTTP 400).
    3. Saves each record with is_confirmed=True and updates timestamp.
    4. Updates session.unrecognized_count and sets session.status='completed'.
    5. RBAC: Teachers only for their own batches; Admins for all.
    """
    session = db.query(AttendanceSession).filter(AttendanceSession.id == id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attendance session with ID {id} not found."
        )

    batch = session.batch
    if current_user.role != UserRole.ADMIN.value and batch.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to confirm attendance for this batch."
        )

    # Check session locking policy
    if _is_session_locked(session) and current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Attendance session is locked (24-hour integrity policy). Only an administrator can unlock this session to make changes."
        )

    # Normalize body format (bare list vs wrapper request)
    if isinstance(body, list):
        records_to_save = body
        final_unrecognized = unrecognized_count if unrecognized_count is not None else 0
    else:
        records_to_save = body.records
        final_unrecognized = body.unrecognized_count or (unrecognized_count or 0)

    # Reject duplicate students in input list
    seen_students = set()
    for item in records_to_save:
        if item.student_id in seen_students:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate student_id {item.student_id} in confirmation payload."
            )
        seen_students.add(item.student_id)

    # Insert or update each attendance record and track audit logs
    for item in records_to_save:
        existing_rec = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.session_id == session.id,
                AttendanceRecord.student_id == item.student_id
            )
            .first()
        )
        if existing_rec:
            if existing_rec.status != item.status:
                audit_entry = AttendanceAuditLog(
                    session_id=session.id,
                    student_id=item.student_id,
                    changed_by_user_id=current_user.id,
                    previous_status=existing_rec.status,
                    new_status=item.status,
                    action="manual_override" if session.status == "completed" else "status_update",
                    reason=f"Status changed from {existing_rec.status} to {item.status}"
                )
                db.add(audit_entry)
            existing_rec.status = item.status
            existing_rec.method = item.method
            existing_rec.confidence_score = item.confidence_score
            existing_rec.is_confirmed = True
            existing_rec.marked_at = func.now()
        else:
            new_rec = AttendanceRecord(
                session_id=session.id,
                student_id=item.student_id,
                status=item.status,
                method=item.method,
                confidence_score=item.confidence_score,
                is_confirmed=True
            )
            db.add(new_rec)
            audit_entry = AttendanceAuditLog(
                session_id=session.id,
                student_id=item.student_id,
                changed_by_user_id=current_user.id,
                previous_status=None,
                new_status=item.status,
                action="initial_confirm" if item.method == "face_recognition" else "manual_mark",
                reason=f"Marked {item.status} via {item.method}"
            )
            db.add(audit_entry)

    session.unrecognized_count = final_unrecognized
    session.status = "completed"
    db.commit()
    db.refresh(session)

    return _build_session_response(session, db, include_records=True)


# ============================================================================
# 4. LOCK / UNLOCK ATTENDANCE SESSION & AUDIT TRAIL
# ============================================================================
@router.post("/sessions/{id}/lock", response_model=AttendanceSessionResponse, summary="Lock Attendance Session")
def lock_attendance_session(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Manually locks an attendance session to guarantee data integrity (Admin only).
    """
    session = db.query(AttendanceSession).filter(AttendanceSession.id == id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attendance session with ID {id} not found."
        )

    session.is_locked = True
    session.locked_at = func.now()
    session.unlock_reason = None

    db.add(AttendanceAuditLog(
        session_id=session.id,
        student_id=None,
        changed_by_user_id=current_user.id,
        previous_status=None,
        new_status=None,
        action="session_locked",
        reason="Session manually locked by administrator"
    ))
    db.commit()
    db.refresh(session)
    return _build_session_response(session, db, include_records=True)


@router.post("/sessions/{id}/unlock", response_model=AttendanceSessionResponse, summary="Unlock Attendance Session with Audit Reason")
def unlock_attendance_session(
    id: int,
    payload: SessionUnlockRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Unlocks a locked attendance session. Requires a verifiable audit reason (Admin only).
    """
    session = db.query(AttendanceSession).filter(AttendanceSession.id == id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attendance session with ID {id} not found."
        )

    session.is_locked = False
    session.unlock_reason = payload.reason
    session.locked_at = None

    db.add(AttendanceAuditLog(
        session_id=session.id,
        student_id=None,
        changed_by_user_id=current_user.id,
        previous_status=None,
        new_status=None,
        action="session_unlocked",
        reason=payload.reason
    ))
    db.commit()
    db.refresh(session)
    return _build_session_response(session, db, include_records=True)


@router.get("/sessions/{id}/audit-logs", response_model=List[AttendanceAuditLogResponse], summary="Get Attendance Session Audit Logs")
def get_session_audit_logs(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves full chronological audit trail of all changes and overrides for an attendance session.
    """
    session = db.query(AttendanceSession).filter(AttendanceSession.id == id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attendance session with ID {id} not found."
        )

    if current_user.role != UserRole.ADMIN.value and session.batch.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view audit logs for this batch."
        )

    logs = (
        db.query(AttendanceAuditLog)
        .filter(AttendanceAuditLog.session_id == id)
        .order_by(AttendanceAuditLog.timestamp.desc(), AttendanceAuditLog.id.desc())
        .all()
    )

    return [
        AttendanceAuditLogResponse(
            id=log.id,
            session_id=log.session_id,
            student_id=log.student_id,
            student_name=log.student.full_name if log.student else None,
            roll_number=log.student.roll_number if log.student else None,
            changed_by_user_id=log.changed_by_user_id,
            changed_by_user_name=log.changed_by_user.full_name if log.changed_by_user else None,
            previous_status=log.previous_status,
            new_status=log.new_status,
            action=log.action,
            reason=log.reason,
            timestamp=log.timestamp
        )
        for log in logs
    ]

    return _build_session_response(session, db, include_records=True)


# ============================================================================
# 4. LIST ATTENDANCE SESSIONS
# ============================================================================
@router.get("/sessions", response_model=List[AttendanceSessionResponse], summary="List Attendance Sessions")
def list_attendance_sessions(
    batch_id: Optional[int] = Query(None, description="Filter by batch ID"),
    from_date: Optional[date] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    to_date: Optional[date] = Query(None, description="End date filter (YYYY-MM-DD)"),
    scope: Optional[str] = Query(None, description="Set 'all' to list all institute sessions"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists attendance sessions with aggregated counts.
    Filterable by batch_id, from_date, and to_date.
    RBAC: Teachers only see their assigned batches by default, or all if scope='all'.
    """
    query = db.query(AttendanceSession).join(Batch, Batch.id == AttendanceSession.batch_id)

    if current_user.role != UserRole.ADMIN.value and scope != "all":
        query = query.filter(Batch.teacher_id == current_user.id)

    if batch_id is not None:
        if current_user.role != UserRole.ADMIN.value and scope != "all":
            batch = db.query(Batch).filter(Batch.id == batch_id).first()
            if not batch or batch.teacher_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have access to view sessions for this batch."
                )
        query = query.filter(AttendanceSession.batch_id == batch_id)

    if from_date:
        query = query.filter(AttendanceSession.session_date >= from_date)
    if to_date:
        query = query.filter(AttendanceSession.session_date <= to_date)

    sessions = query.order_by(AttendanceSession.session_date.desc(), AttendanceSession.id.desc()).all()
    return [_build_session_response(s, db, include_records=False) for s in sessions]


# ============================================================================
# 5. GET SESSION DETAILS
# ============================================================================
@router.get("/sessions/{id}", response_model=AttendanceSessionResponse, summary="Get Session Details with Records")
def get_attendance_session(
    id: int,
    scope: Optional[str] = Query(None, description="Set 'all' to inspect institute session"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves full details of a specific attendance session along with all student records.
    """
    session = db.query(AttendanceSession).filter(AttendanceSession.id == id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attendance session with ID {id} not found."
        )

    if current_user.role != UserRole.ADMIN.value and scope != "all" and session.batch.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this session."
        )

    return _build_session_response(session, db, include_records=True)
