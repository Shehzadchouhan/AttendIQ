import io
import csv
from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import settings
from app.core.database import get_db
from app.models.batch import Batch, Enrollment
from app.models.student import Student
from app.models.attendance import AttendanceSession, AttendanceRecord
from app.models.user import User, UserRole
from app.schemas.reports import (
    StudentBatchAttendance,
    StudentAttendanceReport,
    BatchStudentAttendanceItem,
    DailyTrendItem,
    BatchAttendanceReport,
    DashboardAttendanceSummary,
)
from app.api.deps import get_current_user, verify_student_access

router = APIRouter()


# ============================================================================
# 1. INDIVIDUAL STUDENT ATTENDANCE REPORT
# ============================================================================
@router.get("/student/{id}", response_model=StudentAttendanceReport, summary="Student Attendance Report")
def get_student_report(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Computes overall attendance percentage and per-batch breakdown for a student.
    Flags is_low_attendance=True if overall percentage is below ATTENDANCE_ALERT_THRESHOLD (75%).
    RBAC: Admins can view any student; Teachers only students enrolled in their own batches.
    """
    student = verify_student_access(id, current_user, db)

    # Get batches student is enrolled in
    enrollments_query = (
        db.query(Enrollment)
        .join(Batch, Batch.id == Enrollment.batch_id)
        .filter(Enrollment.student_id == student.id)
    )

    # For teachers, only include batches taught by this teacher
    if current_user.role != UserRole.ADMIN.value:
        enrollments_query = enrollments_query.filter(Batch.teacher_id == current_user.id)

    enrollments = enrollments_query.all()

    total_sessions_all = 0
    total_present_all = 0
    total_absent_all = 0
    total_late_all = 0
    batch_breakdowns: List[StudentBatchAttendance] = []

    for enr in enrollments:
        b = enr.batch
        # Query completed sessions for this batch
        sessions = (
            db.query(AttendanceSession)
            .filter(
                AttendanceSession.batch_id == b.id,
                AttendanceSession.status == "completed"
            )
            .all()
        )
        total_sessions_batch = len(sessions)
        session_ids = [s.id for s in sessions]

        present_b = 0
        absent_b = 0
        late_b = 0

        if session_ids:
            records = (
                db.query(AttendanceRecord)
                .filter(
                    AttendanceRecord.session_id.in_(session_ids),
                    AttendanceRecord.student_id == student.id
                )
                .all()
            )
            present_b = sum(1 for r in records if r.status == "present")
            absent_b = sum(1 for r in records if r.status == "absent")
            late_b = sum(1 for r in records if r.status == "late")

        pct_b = (
            round(((present_b + late_b) / total_sessions_batch * 100), 2)
            if total_sessions_batch > 0 else 0.0
        )

        batch_breakdowns.append(
            StudentBatchAttendance(
                batch_id=b.id,
                batch_name=b.name,
                total_sessions=total_sessions_batch,
                present_count=present_b,
                absent_count=absent_b,
                late_count=late_b,
                attendance_percentage=pct_b
            )
        )

        total_sessions_all += total_sessions_batch
        total_present_all += present_b
        total_absent_all += absent_b
        total_late_all += late_b

    overall_pct = (
        round(((total_present_all + total_late_all) / total_sessions_all * 100), 2)
        if total_sessions_all > 0 else 0.0
    )
    is_low = (overall_pct < settings.ATTENDANCE_ALERT_THRESHOLD) if total_sessions_all > 0 else False

    return StudentAttendanceReport(
        student_id=student.id,
        roll_number=student.roll_number,
        full_name=student.full_name,
        overall_percentage=overall_pct,
        total_sessions=total_sessions_all,
        present_count=total_present_all,
        absent_count=total_absent_all,
        late_count=total_late_all,
        is_low_attendance=is_low,
        batch_breakdown=batch_breakdowns
    )


# ============================================================================
# 2. BATCH ATTENDANCE REPORT & ANALYTICS
# ============================================================================
def _calculate_batch_report_data(
    batch_id: int,
    from_date: Optional[date],
    to_date: Optional[date],
    db: Session,
    current_user: User
) -> BatchAttendanceReport:
    """Helper to compute batch attendance aggregates and trend data."""
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch with ID {batch_id} not found."
        )

    if current_user.role != UserRole.ADMIN.value and batch.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view reports for this batch."
        )

    # Query completed sessions within date range
    sess_query = db.query(AttendanceSession).filter(
        AttendanceSession.batch_id == batch.id,
        AttendanceSession.status == "completed"
    )
    if from_date:
        sess_query = sess_query.filter(AttendanceSession.session_date >= from_date)
    if to_date:
        sess_query = sess_query.filter(AttendanceSession.session_date <= to_date)

    sessions = sess_query.order_by(AttendanceSession.session_date.asc()).all()
    total_sessions = len(sessions)
    session_ids = [s.id for s in sessions]

    # Query enrolled active students
    enrolled_students = (
        db.query(Student)
        .join(Enrollment, Enrollment.student_id == Student.id)
        .filter(
            Enrollment.batch_id == batch.id,
            Student.is_active == True
        )
        .order_by(Student.roll_number.asc())
        .all()
    )

    students_items: List[BatchStudentAttendanceItem] = []
    low_attendance_count = 0

    for s in enrolled_students:
        present_count = 0
        absent_count = 0
        late_count = 0
        consecutive_absent = 0
        is_at_risk = False
        at_risk_reason = None

        if session_ids:
            records = (
                db.query(AttendanceRecord)
                .filter(
                    AttendanceRecord.session_id.in_(session_ids),
                    AttendanceRecord.student_id == s.id
                )
                .all()
            )
            present_count = sum(1 for r in records if r.status == "present")
            absent_count = sum(1 for r in records if r.status == "absent")
            late_count = sum(1 for r in records if r.status == "late")

            record_by_session = {r.session_id: r.status for r in records}

            # 1. Consecutive absences (scan from latest session backwards)
            for sess in reversed(sessions):
                st = record_by_session.get(sess.id)
                if st == "absent":
                    consecutive_absent += 1
                elif st in ["present", "late"]:
                    break

            if consecutive_absent >= 3:
                is_at_risk = True
                at_risk_reason = f"{consecutive_absent} consecutive absences"
            elif len(sessions) >= 4:
                # 2. Week-over-week / recent rate drop (recent half vs prior half)
                mid = len(sessions) // 2
                prior_sessions = sessions[:mid]
                recent_sessions = sessions[mid:]

                prior_present = sum(1 for sess in prior_sessions if record_by_session.get(sess.id) in ["present", "late"])
                prior_pct = (prior_present / len(prior_sessions) * 100) if prior_sessions else 0.0

                recent_present = sum(1 for sess in recent_sessions if record_by_session.get(sess.id) in ["present", "late"])
                recent_pct = (recent_present / len(recent_sessions) * 100) if recent_sessions else 0.0

                drop = prior_pct - recent_pct
                if drop >= 15.0:
                    is_at_risk = True
                    at_risk_reason = f"Dropped {round(drop, 1)}% recently"

        pct = (
            round(((present_count + late_count) / total_sessions * 100), 2)
            if total_sessions > 0 else 0.0
        )
        is_low = (pct < settings.ATTENDANCE_ALERT_THRESHOLD) if total_sessions > 0 else False
        if is_low:
            low_attendance_count += 1

        students_items.append(
            BatchStudentAttendanceItem(
                student_id=s.id,
                roll_number=s.roll_number,
                full_name=s.full_name,
                parent_name=s.parent_name,
                parent_phone=s.parent_phone,
                present_count=present_count,
                absent_count=absent_count,
                late_count=late_count,
                total_sessions=total_sessions,
                attendance_percentage=pct,
                is_low_attendance=is_low,
                is_at_risk=is_at_risk,
                at_risk_reason=at_risk_reason,
                consecutive_absent_count=consecutive_absent
            )
        )

    # Daily trend timeline
    daily_trends: List[DailyTrendItem] = []
    for s in sessions:
        recs = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == s.id).all()
        p = sum(1 for r in recs if r.status == "present")
        a = sum(1 for r in recs if r.status == "absent")
        l = sum(1 for r in recs if r.status == "late")
        tot = len(recs)
        rate = round(((p + l) / tot * 100), 2) if tot > 0 else 0.0

        daily_trends.append(
            DailyTrendItem(
                date=str(s.session_date),
                total_present=p,
                total_absent=a,
                total_late=l,
                attendance_rate=rate
            )
        )

    batch_avg = (
        round(sum(si.attendance_percentage for si in students_items) / len(students_items), 2)
        if students_items else 0.0
    )

    return BatchAttendanceReport(
        batch_id=batch.id,
        batch_name=batch.name,
        teacher_name=batch.teacher.full_name if batch.teacher else None,
        date_from=from_date,
        date_to=to_date,
        total_sessions=total_sessions,
        batch_average_percentage=batch_avg,
        low_attendance_count=low_attendance_count,
        alert_threshold=settings.ATTENDANCE_ALERT_THRESHOLD,
        students=students_items,
        daily_trend=daily_trends
    )


@router.get("/batch/{id}", response_model=BatchAttendanceReport, summary="Batch Attendance Report & Trend")
def get_batch_report(
    id: int,
    from_date: Optional[date] = Query(None, alias="from", description="Start date (YYYY-MM-DD)"),
    to_date: Optional[date] = Query(None, alias="to", description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates detailed batch attendance report:
    - Per-student present/absent/late counts and attendance percentages.
    - Flags students with attendance below ATTENDANCE_ALERT_THRESHOLD (75%).
    - Daily attendance timeline for Recharts visual charts.
    - RBAC: Teachers only for their assigned batches; Admins for all.
    """
    return _calculate_batch_report_data(id, from_date, to_date, db, current_user)


# ============================================================================
# 3. CSV EXPORT
# ============================================================================
@router.get("/batch/{id}/export", summary="Export Batch Attendance to CSV")
def export_batch_attendance_csv(
    id: int,
    from_date: Optional[date] = Query(None, alias="from", description="Start date (YYYY-MM-DD)"),
    to_date: Optional[date] = Query(None, alias="to", description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Exports batch attendance report as a downloadable CSV file.
    Includes student roll numbers, names, status counts, percentage, and warning flags.
    RBAC: Teachers only for their own batches; Admins for all.
    """
    report = _calculate_batch_report_data(id, from_date, to_date, db, current_user)

    output = io.StringIO()
    writer = csv.writer(output)

    # Write CSV Header
    writer.writerow([
        "Roll Number",
        "Student Name",
        "Parent Name",
        "Parent Phone",
        "Present Days",
        "Absent Days",
        "Late Days",
        "Total Sessions",
        "Attendance Percentage (%)",
        "Alert Status",
        "Risk Warning"
    ])

    # Write Student Rows
    for s in report.students:
        status_text = "LOW ATTENDANCE ALERT" if s.is_low_attendance else "Good"
        risk_text = f"AT RISK ({s.at_risk_reason})" if s.is_at_risk else "Normal"
        writer.writerow([
            s.roll_number,
            s.full_name,
            s.parent_name or "N/A",
            s.parent_phone or "N/A",
            s.present_count,
            s.absent_count,
            s.late_count,
            s.total_sessions,
            f"{s.attendance_percentage:.1f}%",
            status_text,
            risk_text
        ])

    csv_data = output.getvalue()
    filename = f"attendance_report_batch_{id}_{date.today().isoformat()}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Content-Type": "text/csv; charset=utf-8"
        }
    )


# ============================================================================
# 4. DASHBOARD ATTENDANCE SUMMARY WIDGET
# ============================================================================
@router.get("/dashboard", response_model=DashboardAttendanceSummary, summary="Dashboard Attendance Summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Provides today's attendance metrics and lists low-attendance students (< 75%)
    across accessible batches for quick dashboard display.
    """
    today = date.today()

    sess_query = db.query(AttendanceSession).join(Batch, Batch.id == AttendanceSession.batch_id)
    if current_user.role != UserRole.ADMIN.value:
        sess_query = sess_query.filter(Batch.teacher_id == current_user.id)

    today_sessions = sess_query.filter(AttendanceSession.session_date == today).all()
    today_session_ids = [s.id for s in today_sessions]

    today_present = 0
    today_absent = 0

    if today_session_ids:
        today_records = (
            db.query(AttendanceRecord)
            .filter(AttendanceRecord.session_id.in_(today_session_ids))
            .all()
        )
        today_present = sum(1 for r in today_records if r.status in ["present", "late"])
        today_absent = sum(1 for r in today_records if r.status == "absent")

    total_marked = today_present + today_absent
    today_rate = round((today_present / total_marked * 100), 2) if total_marked > 0 else 0.0

    # Low attendance students query across accessible batches
    batch_query = db.query(Batch)
    if current_user.role != UserRole.ADMIN.value:
        batch_query = batch_query.filter(Batch.teacher_id == current_user.id)
    batches = batch_query.all()

    low_attendance_students: List[BatchStudentAttendanceItem] = []
    seen_student_ids = set()

    for b in batches:
        b_report = _calculate_batch_report_data(b.id, None, None, db, current_user)
        for s in b_report.students:
            if s.is_low_attendance and s.student_id not in seen_student_ids:
                low_attendance_students.append(s)
                seen_student_ids.add(s.student_id)

    return DashboardAttendanceSummary(
        today_sessions_count=len(today_sessions),
        today_present_count=today_present,
        today_absent_count=today_absent,
        today_attendance_rate=today_rate,
        low_attendance_students=low_attendance_students[:10]  # Top 10 for dashboard
    )
