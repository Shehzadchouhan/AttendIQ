"""
Pytest Test Suite: Attendance Sessions, Review Confirmation, and Reports (Phase 3)
Tests:
1. Session creation (batch_id, date) and unique per batch & date constraint (HTTP 409).
2. Session confirmation (records, is_confirmed=True, unrecognized_count, status completed).
3. Duplicate student protection in confirmation payload (HTTP 400).
4. Session listing and filtering by batch and date range.
5. Student attendance report (% overall and per-batch breakdown, low-attendance alert flag).
6. Batch attendance report & daily trend timeline for charts.
7. Batch attendance CSV export.
8. RBAC: Teachers only access their own batches; Admins access all.
"""

from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash, create_access_token
from app.models.user import User, UserRole
from app.models.student import Student
from app.models.batch import Batch, Enrollment
from app.models.attendance import AttendanceSession, AttendanceRecord

# Setup in-memory SQLite database




def get_auth_headers(user: User) -> dict:
    token = create_access_token(
        data={"sub": user.email, "role": user.role, "user_id": user.id}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def setup_data(db_session):
    """
    Seeds:
    - 1 Admin
    - 2 Teachers (Teacher 1, Teacher 2)
    - Batch 1 (assigned to Teacher 1)
    - Batch 2 (assigned to Teacher 2)
    - Student 1 and Student 2 enrolled in Batch 1
    - Student 3 enrolled in Batch 2
    """
    admin = User(
        email="admin@test.com",
        hashed_password=get_password_hash("admin123"),
        full_name="Admin User",
        role=UserRole.ADMIN.value,
        is_active=True
    )
    teacher1 = User(
        email="teacher1@test.com",
        hashed_password=get_password_hash("teacher123"),
        full_name="Teacher One",
        role=UserRole.TEACHER.value,
        is_active=True
    )
    teacher2 = User(
        email="teacher2@test.com",
        hashed_password=get_password_hash("teacher123"),
        full_name="Teacher Two",
        role=UserRole.TEACHER.value,
        is_active=True
    )
    db_session.add_all([admin, teacher1, teacher2])
    db_session.commit()

    batch1 = Batch(name="Class 10 - Math", subject="Math", teacher_id=teacher1.id)
    batch2 = Batch(name="Class 11 - Physics", subject="Physics", teacher_id=teacher2.id)
    db_session.add_all([batch1, batch2])
    db_session.commit()

    student1 = Student(roll_number="STU-001", full_name="Alice Smith", is_active=True)
    student2 = Student(roll_number="STU-002", full_name="Bob Jones", is_active=True)
    student3 = Student(roll_number="STU-003", full_name="Charlie Brown", is_active=True)
    db_session.add_all([student1, student2, student3])
    db_session.commit()

    enr1 = Enrollment(student_id=student1.id, batch_id=batch1.id)
    enr2 = Enrollment(student_id=student2.id, batch_id=batch1.id)
    enr3 = Enrollment(student_id=student3.id, batch_id=batch2.id)
    db_session.add_all([enr1, enr2, enr3])
    db_session.commit()

    return {
        "admin": admin,
        "teacher1": teacher1,
        "teacher2": teacher2,
        "batch1": batch1,
        "batch2": batch2,
        "student1": student1,
        "student2": student2,
        "student3": student3,
    }


# ============================================================================
# 1. SESSION CREATION & UNIQUE PROTECTION
# ============================================================================
def test_create_session_and_unique_constraint(client, setup_data):
    teacher1 = setup_data["teacher1"]
    batch1 = setup_data["batch1"]
    headers = get_auth_headers(teacher1)

    today_str = date.today().isoformat()
    payload = {"batch_id": batch1.id, "session_date": today_str}

    # First creation -> 201 Created
    res = client.post("/api/v1/attendance/sessions", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["batch_id"] == batch1.id
    assert data["session_date"] == today_str
    assert data["status"] == "scheduled"
    assert data["total_enrolled"] == 2

    # Second creation on same date -> 409 Conflict
    res_dup = client.post("/api/v1/attendance/sessions", json=payload, headers=headers)
    assert res_dup.status_code == 409
    assert "already exists" in res_dup.json()["detail"]


# ============================================================================
# 2. SESSION CONFIRMATION & DUPLICATE PROTECTION
# ============================================================================
def test_confirm_session_and_duplicate_student_protection(client, setup_data, db_session):
    teacher1 = setup_data["teacher1"]
    batch1 = setup_data["batch1"]
    student1 = setup_data["student1"]
    student2 = setup_data["student2"]
    headers = get_auth_headers(teacher1)

    today_str = date.today().isoformat()
    session = AttendanceSession(
        batch_id=batch1.id,
        session_date=date.today(),
        taken_by_user_id=teacher1.id,
        status="scheduled"
    )
    db_session.add(session)
    db_session.commit()

    # Confirm with duplicate student_id -> 400 Bad Request
    dup_payload = [
        {"student_id": student1.id, "status": "present", "method": "face", "confidence_score": 0.95},
        {"student_id": student1.id, "status": "absent", "method": "manual", "confidence_score": None},
    ]
    res_dup = client.post(f"/api/v1/attendance/sessions/{session.id}/confirm", json=dup_payload, headers=headers)
    assert res_dup.status_code == 400
    assert "Duplicate student_id" in res_dup.json()["detail"]

    # Valid confirmation payload with 1 unrecognized face
    valid_payload = {
        "records": [
            {"student_id": student1.id, "status": "present", "method": "face", "confidence_score": 0.92},
            {"student_id": student2.id, "status": "absent", "method": "face", "confidence_score": None},
        ],
        "unrecognized_count": 1
    }
    res = client.post(f"/api/v1/attendance/sessions/{session.id}/confirm", json=valid_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert data["unrecognized_count"] == 1
    assert data["present_count"] == 1
    assert data["absent_count"] == 1
    assert len(data["records"]) == 2
    assert all(r["is_confirmed"] for r in data["records"])


# ============================================================================
# 3. SESSION LISTING & DATE FILTERS
# ============================================================================
def test_list_sessions_filtering(client, setup_data, db_session):
    teacher1 = setup_data["teacher1"]
    batch1 = setup_data["batch1"]
    headers = get_auth_headers(teacher1)

    d1 = date.today() - timedelta(days=2)
    d2 = date.today() - timedelta(days=1)
    s1 = AttendanceSession(batch_id=batch1.id, session_date=d1, status="completed")
    s2 = AttendanceSession(batch_id=batch1.id, session_date=d2, status="completed")
    db_session.add_all([s1, s2])
    db_session.commit()

    # List all
    res = client.get("/api/v1/attendance/sessions", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) >= 2

    # Filter by date range
    res_range = client.get(
        f"/api/v1/attendance/sessions?from_date={d2.isoformat()}&to_date={d2.isoformat()}",
        headers=headers
    )
    assert res_range.status_code == 200
    assert len(res_range.json()) == 1
    assert res_range.json()[0]["session_date"] == d2.isoformat()


# ============================================================================
# 4. STUDENT ATTENDANCE REPORT & THRESHOLD ALERT
# ============================================================================
def test_student_attendance_report(client, setup_data, db_session):
    teacher1 = setup_data["teacher1"]
    batch1 = setup_data["batch1"]
    student1 = setup_data["student1"]
    student2 = setup_data["student2"]
    headers = get_auth_headers(teacher1)

    # Create 4 completed sessions:
    # Student 1 attended 3 of 4 -> 75%
    # Student 2 attended 2 of 4 -> 50% (< 75% -> alert)
    for i in range(4):
        s_date = date.today() - timedelta(days=i)
        sess = AttendanceSession(batch_id=batch1.id, session_date=s_date, status="completed")
        db_session.add(sess)
        db_session.commit()

        # Student 1: present in first 3, absent in 4th
        st1_status = "present" if i < 3 else "absent"
        r1 = AttendanceRecord(session_id=sess.id, student_id=student1.id, status=st1_status, is_confirmed=True)

        # Student 2: present in first 2, absent in other 2
        st2_status = "present" if i < 2 else "absent"
        r2 = AttendanceRecord(session_id=sess.id, student_id=student2.id, status=st2_status, is_confirmed=True)
        db_session.add_all([r1, r2])
        db_session.commit()

    # Check Student 1 (75.0%)
    res1 = client.get(f"/api/v1/reports/student/{student1.id}", headers=headers)
    assert res1.status_code == 200
    rep1 = res1.json()
    assert rep1["total_sessions"] == 4
    assert rep1["present_count"] == 3
    assert rep1["overall_percentage"] == 75.0
    assert rep1["is_low_attendance"] is False

    # Check Student 2 (50.0% -> is_low_attendance True)
    res2 = client.get(f"/api/v1/reports/student/{student2.id}", headers=headers)
    assert res2.status_code == 200
    rep2 = res2.json()
    assert rep2["total_sessions"] == 4
    assert rep2["present_count"] == 2
    assert rep2["overall_percentage"] == 50.0
    assert rep2["is_low_attendance"] is True


# ============================================================================
# 5. BATCH REPORT, DAILY TREND, AND CSV EXPORT
# ============================================================================
def test_batch_report_and_csv_export(client, setup_data, db_session):
    teacher1 = setup_data["teacher1"]
    batch1 = setup_data["batch1"]
    student1 = setup_data["student1"]
    student2 = setup_data["student2"]
    headers = get_auth_headers(teacher1)

    # Create 2 completed sessions
    d1 = date.today() - timedelta(days=1)
    d2 = date.today()
    s1 = AttendanceSession(batch_id=batch1.id, session_date=d1, status="completed")
    s2 = AttendanceSession(batch_id=batch1.id, session_date=d2, status="completed")
    db_session.add_all([s1, s2])
    db_session.commit()

    # Session 1: Both present (100% rate)
    r1 = AttendanceRecord(session_id=s1.id, student_id=student1.id, status="present", is_confirmed=True)
    r2 = AttendanceRecord(session_id=s1.id, student_id=student2.id, status="present", is_confirmed=True)
    # Session 2: Student 1 present, Student 2 absent (50% rate)
    r3 = AttendanceRecord(session_id=s2.id, student_id=student1.id, status="present", is_confirmed=True)
    r4 = AttendanceRecord(session_id=s2.id, student_id=student2.id, status="absent", is_confirmed=True)
    db_session.add_all([r1, r2, r3, r4])
    db_session.commit()

    # 1. Batch Report JSON
    res_rep = client.get(f"/api/v1/reports/batch/{batch1.id}", headers=headers)
    assert res_rep.status_code == 200
    rep = res_rep.json()
    assert rep["total_sessions"] == 2
    assert rep["low_attendance_count"] == 1  # Student 2 is at 50% (< 75%)
    assert len(rep["daily_trend"]) == 2
    assert rep["daily_trend"][0]["attendance_rate"] == 100.0
    assert rep["daily_trend"][1]["attendance_rate"] == 50.0

    # 2. CSV Export
    res_csv = client.get(f"/api/v1/reports/batch/{batch1.id}/export", headers=headers)
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    csv_text = res_csv.text
    assert "Roll Number,Student Name,Present Days,Absent Days" in csv_text
    assert "Alice Smith" in csv_text
    assert "Bob Jones" in csv_text
    assert "LOW ATTENDANCE ALERT" in csv_text


# ============================================================================
# 6. RBAC RULES: TEACHER VS ADMIN ACCESS
# ============================================================================
def test_teacher_vs_admin_rbac(client, setup_data, db_session):
    admin = setup_data["admin"]
    teacher1 = setup_data["teacher1"]
    teacher2 = setup_data["teacher2"]
    batch1 = setup_data["batch1"]
    batch2 = setup_data["batch2"]

    t1_headers = get_auth_headers(teacher1)
    admin_headers = get_auth_headers(admin)

    # Teacher 1 attempting to create session for Teacher 2's batch -> 403 Forbidden
    payload = {"batch_id": batch2.id, "session_date": date.today().isoformat()}
    res_t1 = client.post("/api/v1/attendance/sessions", json=payload, headers=t1_headers)
    assert res_t1.status_code == 403
    assert "do not have permission" in res_t1.json()["detail"]

    # Teacher 1 attempting to view reports for Teacher 2's batch -> 403 Forbidden
    res_rep = client.get(f"/api/v1/reports/batch/{batch2.id}", headers=t1_headers)
    assert res_rep.status_code == 403

    # Teacher 1 attempting to export CSV for Teacher 2's batch -> 403 Forbidden
    res_exp = client.get(f"/api/v1/reports/batch/{batch2.id}/export", headers=t1_headers)
    assert res_exp.status_code == 403

    # Admin creating session for Teacher 2's batch -> 201 Created
    res_admin = client.post("/api/v1/attendance/sessions", json=payload, headers=admin_headers)
    assert res_admin.status_code == 201

    # Admin viewing report for Teacher 2's batch -> 200 OK
    res_admin_rep = client.get(f"/api/v1/reports/batch/{batch2.id}", headers=admin_headers)
    assert res_admin_rep.status_code == 200
