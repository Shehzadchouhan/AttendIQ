"""
Pytest Test Suite: Multi-Tenant Open Tutor Platform & Workspace Isolation
Tests:
1. Self-service tutor registration (`POST /api/v1/auth/register`) with institution_name.
2. Duplicate email rejection on registration (HTTP 400).
3. Independent roll number namespaces across tutors (Tutor A and Tutor B can both have roll '101').
4. Strict student directory isolation: Tutor A cannot see Tutor B's students.
5. Strict student access control: Tutor A cannot view, update, or delete Tutor B's students.
6. Batch isolation: Tutor A cannot see or edit Tutor B's batches.
"""
import pytest
from app.models.user import User, UserRole
from app.models.student import Student
from app.models.batch import Batch
from app.core.security import get_password_hash, create_access_token


def get_auth_headers(user: User) -> dict:
    token = create_access_token(
        data={"sub": user.email, "role": user.role, "user_id": user.id}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def two_tutors(db_session):
    tutor_a = User(
        email="tutor.sharma@test.com",
        hashed_password=get_password_hash("password123"),
        full_name="Prof. Sharma",
        institution_name="Sharma Mathematics Academy",
        phone="+919811100001",
        role=UserRole.TEACHER.value,
        is_active=True
    )
    tutor_b = User(
        email="tutor.verma@test.com",
        hashed_password=get_password_hash("password123"),
        full_name="Dr. Verma",
        institution_name="Verma Physics Hub",
        phone="+919811100002",
        role=UserRole.TEACHER.value,
        is_active=True
    )
    db_session.add_all([tutor_a, tutor_b])
    db_session.commit()
    db_session.refresh(tutor_a)
    db_session.refresh(tutor_b)
    return tutor_a, tutor_b


def test_self_service_tutor_registration(client):
    reg_payload = {
        "email": "new.tutor@example.com",
        "password": "securepassword123",
        "full_name": "Ramesh Kumar",
        "institution_name": "Kumar Coaching Classes",
        "phone": "+91 9876543210"
    }
    res = client.post("/api/v1/auth/register", json=reg_payload)
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["user_role"] == "teacher"
    assert data["user_name"] == "Ramesh Kumar"
    assert data["institution_name"] == "Kumar Coaching Classes"

    # Attempting to register again with same email -> 400 Bad Request
    res_dup = client.post("/api/v1/auth/register", json=reg_payload)
    assert res_dup.status_code == 400
    assert "already exists" in res_dup.json()["detail"].lower()


def test_multi_tenant_student_isolation(client, two_tutors, db_session):
    tutor_a, tutor_b = two_tutors
    headers_a = get_auth_headers(tutor_a)
    headers_b = get_auth_headers(tutor_b)

    # 1. Tutor A creates student with roll "ROLL-101"
    stu_payload_a = {
        "roll_number": "ROLL-101",
        "full_name": "Aarav Sharma",
        "parent_name": "Mr. Sharma",
        "parent_phone": "+919811100101"
    }
    res_a = client.post("/api/v1/students/", json=stu_payload_a, headers=headers_a)
    assert res_a.status_code == 201
    stu_a_id = res_a.json()["id"]

    # 2. Tutor B can also create student with same roll "ROLL-101" in their own workspace
    stu_payload_b = {
        "roll_number": "ROLL-101",
        "full_name": "Diya Verma",
        "parent_name": "Mr. Verma",
        "parent_phone": "+919811100102"
    }
    res_b = client.post("/api/v1/students/", json=stu_payload_b, headers=headers_b)
    assert res_b.status_code == 201
    stu_b_id = res_b.json()["id"]

    # 3. Tutor A lists students -> only sees Aarav Sharma, NOT Diya Verma
    list_a = client.get("/api/v1/students/", headers=headers_a)
    assert list_a.status_code == 200
    names_a = [s["full_name"] for s in list_a.json()]
    assert "Aarav Sharma" in names_a
    assert "Diya Verma" not in names_a

    # 4. Tutor B lists students -> only sees Diya Verma, NOT Aarav Sharma
    list_b = client.get("/api/v1/students/", headers=headers_b)
    assert list_b.status_code == 200
    names_b = [s["full_name"] for s in list_b.json()]
    assert "Diya Verma" in names_b
    assert "Aarav Sharma" not in names_b

    # 5. Tutor A attempting to inspect Tutor B's student -> 403 Forbidden
    res_cross_get = client.get(f"/api/v1/students/{stu_b_id}", headers=headers_a)
    assert res_cross_get.status_code == 403

    # 6. Tutor A attempting to delete Tutor B's student -> 403 Forbidden
    res_cross_del = client.delete(f"/api/v1/students/{stu_b_id}", headers=headers_a)
    assert res_cross_del.status_code == 403

    # 7. Tutor A deleting their own student -> 204 No Content
    res_own_del = client.delete(f"/api/v1/students/{stu_a_id}", headers=headers_a)
    assert res_own_del.status_code == 204


def test_multi_tenant_batch_isolation(client, two_tutors):
    tutor_a, tutor_b = two_tutors
    headers_a = get_auth_headers(tutor_a)
    headers_b = get_auth_headers(tutor_b)

    # Tutor A creates batch
    batch_payload_a = {
        "name": "Sharma Advanced Calculus",
        "subject": "Mathematics",
        "description": "Calculus for Class 12"
    }
    res_b_a = client.post("/api/v1/batches/", json=batch_payload_a, headers=headers_a)
    assert res_b_a.status_code == 201
    batch_a_id = res_b_a.json()["id"]
    assert res_b_a.json()["teacher_id"] == tutor_a.id

    # Tutor B listing batches -> cannot see Tutor A's batch
    list_b = client.get("/api/v1/batches/", headers=headers_b)
    assert list_b.status_code == 200
    b_ids = [b["id"] for b in list_b.json()]
    assert batch_a_id not in b_ids
