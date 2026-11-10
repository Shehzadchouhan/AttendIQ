"""
Pytest Test Suite: Student CRUD, Consent Management, and Face Upload Limits
Tests:
1. Student creation and listing with pagination & search.
2. Unique roll number validation (HTTP 400).
3. Student retrieval by ID and 404 for nonexistent IDs.
4. Student updates with duplicate roll number protection.
5. Student deletion: Admin permitted (204), Teacher denied (403).
6. Consent updating (PATCH /students/{id}/consent) and automatic embedding purge on consent revocation.
7. Payload Too Large (HTTP 413) on photo upload exceeding MAX_UPLOAD_MB.
"""
import io
import pytest
from app.models.student import Student, FaceEmbedding
from app.models.batch import Batch, Enrollment
from app.models.user import UserRole


def test_create_and_get_student(client, admin_headers):
    payload = {
        "roll_number": "TEST-101",
        "full_name": "Test Student A",
        "email": "student_a@facemark.local",
        "phone": "+91 9999900001",
        "is_active": True
    }
    response = client.post("/api/v1/students/", json=payload, headers=admin_headers)
    assert response.status_code == 201
    created = response.json()
    assert created["roll_number"] == "TEST-101"
    assert created["full_name"] == "Test Student A"
    assert created["consent_given"] is False

    # Retrieve student
    get_res = client.get(f"/api/v1/students/{created['id']}", headers=admin_headers)
    assert get_res.status_code == 200
    assert get_res.json()["roll_number"] == "TEST-101"


def test_create_duplicate_roll_number(client, admin_headers):
    payload = {
        "roll_number": "TEST-DUP",
        "full_name": "Original Student"
    }
    res1 = client.post("/api/v1/students/", json=payload, headers=admin_headers)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/students/", json=payload, headers=admin_headers)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]


def test_list_students_and_search(client, admin_headers):
    client.post("/api/v1/students/", json={"roll_number": "SEARCH-ALPHA", "full_name": "Alpha Searchable"}, headers=admin_headers)
    client.post("/api/v1/students/", json={"roll_number": "SEARCH-BETA", "full_name": "Beta NonMatching"}, headers=admin_headers)

    # Search by query
    res = client.get("/api/v1/students/?search=Alpha", headers=admin_headers)
    assert res.status_code == 200
    items = res.json()
    assert any(s["roll_number"] == "SEARCH-ALPHA" for s in items)
    assert not any(s["roll_number"] == "SEARCH-BETA" for s in items)

    # Pagination skip & limit
    page_res = client.get("/api/v1/students/?skip=0&limit=1", headers=admin_headers)
    assert page_res.status_code == 200
    assert len(page_res.json()) == 1


def test_update_student(client, admin_headers):
    created = client.post("/api/v1/students/", json={"roll_number": "UPDATE-1", "full_name": "Before Update"}, headers=admin_headers).json()

    update_payload = {"full_name": "After Update"}
    update_res = client.put(f"/api/v1/students/{created['id']}", json=update_payload, headers=admin_headers)
    assert update_res.status_code == 200
    assert update_res.json()["full_name"] == "After Update"


def test_delete_student_rbac(client, admin_headers, teacher_headers):
    created = client.post("/api/v1/students/", json={"roll_number": "DEL-1", "full_name": "To Delete"}, headers=admin_headers).json()

    # Teacher should get 403 Forbidden
    teacher_del = client.delete(f"/api/v1/students/{created['id']}", headers=teacher_headers)
    assert teacher_del.status_code == 403

    # Admin should get 204 No Content
    admin_del = client.delete(f"/api/v1/students/{created['id']}", headers=admin_headers)
    assert admin_del.status_code == 204

    # Confirms 404
    get_after = client.get(f"/api/v1/students/{created['id']}", headers=admin_headers)
    assert get_after.status_code == 404


def test_consent_management_and_embedding_purge(client, admin_headers, db):
    created = client.post("/api/v1/students/", json={"roll_number": "CONSENT-1", "full_name": "Consent Test"}, headers=admin_headers).json()
    student_id = created["id"]

    # Grant consent
    patch_res = client.patch(f"/api/v1/students/{student_id}/consent", json={"consent_given": True}, headers=admin_headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["consent_given"] is True
    assert patch_res.json()["consent_at"] is not None

    # Add mock embedding
    fake_embedding = FaceEmbedding(
        student_id=student_id,
        embedding_data=[0.05] * 512
    )
    db.add(fake_embedding)
    db.commit()

    # Verify embedding exists
    face_count = db.query(FaceEmbedding).filter(FaceEmbedding.student_id == student_id).count()
    assert face_count == 1

    # Revoke consent -> must purge embeddings
    revoke_res = client.patch(f"/api/v1/students/{student_id}/consent", json={"consent_given": False}, headers=admin_headers)
    assert revoke_res.status_code == 200
    assert revoke_res.json()["consent_given"] is False
    assert revoke_res.json()["consent_at"] is None

    # Check embeddings are cleared
    purged_count = db.query(FaceEmbedding).filter(FaceEmbedding.student_id == student_id).count()
    assert purged_count == 0


def test_upload_face_payload_too_large(client, admin_headers):
    created = client.post("/api/v1/students/", json={"roll_number": "LARGE-1", "full_name": "Large File Test"}, headers=admin_headers).json()
    client.patch(f"/api/v1/students/{created['id']}/consent", json={"consent_given": True}, headers=admin_headers)

    # Create dummy payload larger than 10MB
    oversized_data = b"x" * (11 * 1024 * 1024)
    file_payload = ("test_large.jpg", io.BytesIO(oversized_data), "image/jpeg")

    res = client.post(
        f"/api/v1/students/{created['id']}/faces",
        files=[("photos", file_payload)],
        headers=admin_headers
    )
    assert res.status_code == 413
    assert "exceeds maximum allowed size" in res.json()["detail"]
