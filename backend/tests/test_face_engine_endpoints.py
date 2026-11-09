"""
Pytest Test Suite: Face Enrollment and Recognition Engine (Phase 2)
Tests:
1. Consent enforcement (rejects upload if consent not given).
2. Exactly-one-face rule (rejects 0 faces or multiple faces).
3. File validation: wrong file type, oversize file, small face rejection.
4. Successful face enrollment (stores embeddings in database).
5. Consent revocation: setting consent_given=False deletes stored embeddings.
6. RBAC: Admins can access any student; Teachers only students in their own batches.
7. Attendance recognition: returns image_width, image_height, one-student-one-face,
   matches against ALL embeddings using highest similarity score, computes absent list,
   and enforces batch RBAC.
"""

import io
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from PIL import Image

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash, create_access_token
from app.models.user import User, UserRole
from app.models.student import Student, FaceEmbedding
from app.models.batch import Batch, Enrollment
from app.services.face_engine import face_engine

# Setup in-memory SQLite database
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client():
    return TestClient(app)


def get_auth_headers(user: User) -> dict:
    token = create_access_token(
        data={"sub": user.email, "role": user.role, "user_id": user.id}
    )
    return {"Authorization": f"Bearer {token}"}


def create_dummy_jpeg_bytes(width=200, height=200) -> bytes:
    """Helper creating valid in-memory JPEG bytes."""
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=(100, 150, 200))
    img.save(buf, format="JPEG")
    return buf.getvalue()


def create_oriented_jpeg_bytes(width=200, height=100, orientation=6, color=(255, 128, 0)) -> bytes:
    """Helper creating in-memory JPEG bytes with EXIF orientation metadata."""
    img = Image.new("RGB", (width, height), color=color)
    exif = img.getexif()
    # 0x0112 is standard TIFF/EXIF Orientation tag
    exif[0x0112] = orientation
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)
    return buf.getvalue()


@pytest.fixture(scope="function")
def setup_phase2_data(db_session):
    """
    Seeds:
    - 1 Admin
    - 2 Teachers: Teacher 1 and Teacher 2
    - Batch 1 (taught by Teacher 1)
    - Batch 2 (taught by Teacher 2)
    - Student 1 enrolled in Batch 1
    - Student 2 enrolled in Batch 2
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

    student1 = Student(
        roll_number="STU-001",
        full_name="Student One",
        email="stu1@test.com",
        consent_given=False
    )
    student2 = Student(
        roll_number="STU-002",
        full_name="Student Two",
        email="stu2@test.com",
        consent_given=False
    )
    db_session.add_all([student1, student2])
    db_session.commit()

    batch1 = Batch(name="Class 10 Math", subject="Math", teacher_id=teacher1.id)
    batch2 = Batch(name="Class 12 Physics", subject="Physics", teacher_id=teacher2.id)
    db_session.add_all([batch1, batch2])
    db_session.commit()

    # Enroll Student 1 into Batch 1, Student 2 into Batch 2
    enroll1 = Enrollment(batch_id=batch1.id, student_id=student1.id)
    enroll2 = Enrollment(batch_id=batch2.id, student_id=student2.id)
    db_session.add_all([enroll1, enroll2])
    db_session.commit()

    return {
        "admin": admin,
        "teacher1": teacher1,
        "teacher2": teacher2,
        "student1": student1,
        "student2": student2,
        "batch1": batch1,
        "batch2": batch2,
    }


# ==============================================================================
# TEST 1: CONSENT REQUIREMENT
# ==============================================================================

def test_upload_faces_requires_consent(client, setup_phase2_data):
    """Uploading face photos must be rejected if student consent is false."""
    admin = setup_phase2_data["admin"]
    student1 = setup_phase2_data["student1"]
    headers = get_auth_headers(admin)

    jpeg_bytes = create_dummy_jpeg_bytes()
    files = [("photos", ("selfie.jpg", jpeg_bytes, "image/jpeg"))]

    response = client.post(f"/api/v1/students/{student1.id}/faces", files=files, headers=headers)
    assert response.status_code == 400
    assert "Consent to store face data has not been granted" in response.json()["detail"]


# ==============================================================================
# TEST 2: ONE-FACE RULE & FACE QUALITY CHECKS
# ==============================================================================

def test_upload_faces_rejects_zero_or_multiple_faces(client, setup_phase2_data):
    """Each enrollment photo must contain EXACTLY one face."""
    admin = setup_phase2_data["admin"]
    student1 = setup_phase2_data["student1"]
    headers = get_auth_headers(admin)

    # 1. Grant consent first
    client.patch(f"/api/v1/students/{student1.id}/consent", json={"consent_given": True}, headers=headers)

    jpeg_bytes = create_dummy_jpeg_bytes()

    # Case A: 0 faces detected
    with patch.object(face_engine, "get_faces", return_value=([], 200, 200)):
        files = [("photos", ("photo1.jpg", jpeg_bytes, "image/jpeg"))]
        res = client.post(f"/api/v1/students/{student1.id}/faces", files=files, headers=headers)
        assert res.status_code == 400
        assert "No face detected" in res.json()["detail"]

    # Case B: Multiple faces (2 faces) detected
    two_faces = [
        {"bbox": [10, 10, 100, 100], "det_score": 0.9, "embedding": [0.1] * 512},
        {"bbox": [110, 10, 200, 100], "det_score": 0.85, "embedding": [0.2] * 512}
    ]
    with patch.object(face_engine, "get_faces", return_value=(two_faces, 200, 200)):
        files = [("photos", ("photo2.jpg", jpeg_bytes, "image/jpeg"))]
        res = client.post(f"/api/v1/students/{student1.id}/faces", files=files, headers=headers)
        assert res.status_code == 400
        assert "Multiple faces" in res.json()["detail"]


def test_upload_faces_rejects_small_face(client, setup_phase2_data):
    """Face must have width >= MIN_FACE_WIDTH (80px)."""
    admin = setup_phase2_data["admin"]
    student1 = setup_phase2_data["student1"]
    headers = get_auth_headers(admin)

    client.patch(f"/api/v1/students/{student1.id}/consent", json={"consent_given": True}, headers=headers)

    small_face = [{"bbox": [10, 10, 50, 60], "det_score": 0.9, "embedding": [0.1] * 512}]  # width = 40px (<80px)
    jpeg_bytes = create_dummy_jpeg_bytes()

    with patch.object(face_engine, "get_faces", return_value=(small_face, 200, 200)):
        files = [("photos", ("photo.jpg", jpeg_bytes, "image/jpeg"))]
        res = client.post(f"/api/v1/students/{student1.id}/faces", files=files, headers=headers)
        assert res.status_code == 400
        assert "Face is too small" in res.json()["detail"]


# ==============================================================================
# TEST 3: FILE TYPE & SIZE REJECTION
# ==============================================================================

def test_upload_faces_rejects_wrong_file_type(client, setup_phase2_data):
    """Rejects non-jpg/png extensions."""
    admin = setup_phase2_data["admin"]
    student1 = setup_phase2_data["student1"]
    headers = get_auth_headers(admin)

    client.patch(f"/api/v1/students/{student1.id}/consent", json={"consent_given": True}, headers=headers)

    files = [("photos", ("document.pdf", b"%PDF-1.4 dummy content", "application/pdf"))]
    res = client.post(f"/api/v1/students/{student1.id}/faces", files=files, headers=headers)
    assert res.status_code == 400
    assert "Only JPG and PNG images are supported" in res.json()["detail"]


def test_upload_faces_rejects_oversize_file(client, setup_phase2_data):
    """Rejects file exceeding MAX_UPLOAD_MB (10MB)."""
    admin = setup_phase2_data["admin"]
    student1 = setup_phase2_data["student1"]
    headers = get_auth_headers(admin)

    client.patch(f"/api/v1/students/{student1.id}/consent", json={"consent_given": True}, headers=headers)

    oversize_bytes = b"0" * (11 * 1024 * 1024)  # 11MB
    files = [("photos", ("huge.jpg", oversize_bytes, "image/jpeg"))]
    res = client.post(f"/api/v1/students/{student1.id}/faces", files=files, headers=headers)
    assert res.status_code == 400
    assert "exceeds maximum allowed size" in res.json()["detail"]


# ==============================================================================
# TEST 4: SUCCESSFUL ENROLLMENT & CONSENT REVOCATION
# ==============================================================================

def test_successful_face_enrollment_and_consent_revocation(client, setup_phase2_data, db_session):
    """
    1. Consent granted.
    2. 2 face photos uploaded and saved as vector embeddings.
    3. GET /faces returns count 2.
    4. PATCH consent=false wipes all stored embeddings.
    """
    admin = setup_phase2_data["admin"]
    student1 = setup_phase2_data["student1"]
    headers = get_auth_headers(admin)

    # 1. Grant consent
    client.patch(f"/api/v1/students/{student1.id}/consent", json={"consent_given": True}, headers=headers)

    # 2. Upload 2 photos
    valid_face = [{"bbox": [10, 10, 100, 100], "det_score": 0.95, "embedding": [0.05] * 512}]
    jpeg_bytes = create_dummy_jpeg_bytes()

    with patch.object(face_engine, "get_faces", return_value=(valid_face, 200, 200)):
        files = [
            ("photos", ("selfie1.jpg", jpeg_bytes, "image/jpeg")),
            ("photos", ("selfie2.jpg", jpeg_bytes, "image/jpeg")),
        ]
        res = client.post(f"/api/v1/students/{student1.id}/faces", files=files, headers=headers)
        assert res.status_code == 200
        assert res.json()["enrolled_count"] == 2

    # 3. GET /faces verifies count
    count_res = client.get(f"/api/v1/students/{student1.id}/faces", headers=headers)
    assert count_res.status_code == 200
    assert count_res.json()["enrolled_count"] == 2
    assert count_res.json()["consent_given"] is True

    # 4. Revoke consent -> embeddings must be automatically deleted
    revoke_res = client.patch(f"/api/v1/students/{student1.id}/consent", json={"consent_given": False}, headers=headers)
    assert revoke_res.status_code == 200
    assert revoke_res.json()["consent_given"] is False

    embeddings_count = db_session.query(FaceEmbedding).filter(FaceEmbedding.student_id == student1.id).count()
    assert embeddings_count == 0


# ==============================================================================
# TEST 5: TEACHER VS ADMIN RBAC ON FACE ENDPOINTS
# ==============================================================================

def test_face_endpoints_teacher_vs_admin_rbac(client, setup_phase2_data):
    """
    - Admin can access Student 1's faces.
    - Teacher 1 (whose batch includes Student 1) can access Student 1's faces.
    - Teacher 2 (whose batch does NOT include Student 1) gets HTTP 403 Forbidden.
    """
    admin = setup_phase2_data["admin"]
    teacher1 = setup_phase2_data["teacher1"]
    teacher2 = setup_phase2_data["teacher2"]
    student1 = setup_phase2_data["student1"]

    admin_headers = get_auth_headers(admin)
    t1_headers = get_auth_headers(teacher1)
    t2_headers = get_auth_headers(teacher2)

    # 1. Admin accesses Student 1 -> 200
    res_admin = client.get(f"/api/v1/students/{student1.id}/faces", headers=admin_headers)
    assert res_admin.status_code == 200

    # 2. Teacher 1 (enrolled in batch 1) accesses Student 1 -> 200
    res_t1 = client.get(f"/api/v1/students/{student1.id}/faces", headers=t1_headers)
    assert res_t1.status_code == 200

    # 3. Teacher 2 (Student 1 NOT in Teacher 2's batch) -> 403 Forbidden
    res_t2 = client.get(f"/api/v1/students/{student1.id}/faces", headers=t2_headers)
    assert res_t2.status_code == 403
    assert "You do not have permission to access face data" in res_t2.json()["detail"]


# ==============================================================================
# TEST 6: ATTENDANCE RECOGNITION (DIMENSIONS, MATCHING, ALL EMBEDDINGS, ABSENT)
# ==============================================================================

def test_attendance_recognition_matching_and_dimensions(client, setup_phase2_data, db_session):
    """
    Tests POST /api/v1/attendance/recognize:
    1. Returns image_width and image_height.
    2. Compares detected faces against ALL embeddings of a student (highest similarity used).
    3. Categorizes into matched (>= 0.45), review (>= 0.35), unknown.
    4. Computes absent student IDs.
    5. Teacher 2 cannot recognize Batch 1 (HTTP 403).
    """
    teacher1 = setup_phase2_data["teacher1"]
    teacher2 = setup_phase2_data["teacher2"]
    student1 = setup_phase2_data["student1"]
    batch1 = setup_phase2_data["batch1"]

    t1_headers = get_auth_headers(teacher1)
    t2_headers = get_auth_headers(teacher2)

    # Store 2 embeddings for Student 1:
    # Embedding A: [0.1, 0.1, ...] (low similarity to test vector)
    # Embedding B: [0.9, 0.0, ...] (high similarity to test vector)
    emb_a = [0.1] * 512
    emb_b = [0.9] + [0.0] * 511
    db_session.add_all([
        FaceEmbedding(student_id=student1.id, embedding_data=emb_a),
        FaceEmbedding(student_id=student1.id, embedding_data=emb_b),
    ])
    db_session.commit()

    # Teacher 2 attempting to recognize Teacher 1's batch -> 403
    jpeg_bytes = create_dummy_jpeg_bytes(width=1280, height=720)
    files = {"file": ("classroom.jpg", jpeg_bytes, "image/jpeg")}
    data = {"batch_id": batch1.id}

    res_t2 = client.post("/api/v1/attendance/recognize", data=data, files=files, headers=t2_headers)
    assert res_t2.status_code == 403
    assert "You do not have permission" in res_t2.json()["detail"]

    # Teacher 1 runs recognition:
    # 2 detected faces in class photo:
    # Face 1: matches Student 1's Embedding B with high score
    # Face 2: random stranger / unknown
    detected_faces = [
        {"bbox": [50, 50, 150, 150], "det_score": 0.98, "embedding": [0.85] + [0.0] * 511},
        {"bbox": [300, 50, 400, 150], "det_score": 0.92, "embedding": [-0.5] * 512}
    ]

    with patch.object(face_engine, "get_faces", return_value=(detected_faces, 1280, 720)):
        res_t1 = client.post("/api/v1/attendance/recognize", data=data, files=files, headers=t1_headers)
        assert res_t1.status_code == 200
        result = res_t1.json()

        # Check dimension reporting
        assert result["image_width"] == 1280
        assert result["image_height"] == 720

        # Check face results
        faces = result["faces"]
        assert len(faces) == 2

        # Face 1 should match Student 1 with status 'matched'
        assert faces[0]["student_id"] == student1.id
        assert faces[0]["status"] == "matched"
        assert faces[0]["score"] > 0.45

        # Face 2 should be unknown
        assert faces[1]["student_id"] is None
        assert faces[1]["status"] == "unknown"

        # Absent list: since student 1 was matched, absent list is empty
        assert result["absent_student_ids"] == []


def test_image_orientation_exif_transpose_and_bgr():
    """
    Verifies that:
    1. ImageOps.exif_transpose transposes phone photos upright (swaps width/height for orientation 6).
    2. Image is converted to RGB before NumPy array creation.
    3. NumPy array is converted from RGB to BGR order for InsightFace/OpenCV.
    """
    from app.services.face_engine import validate_image_file

    # Original image: width=200, height=100, Color RGB=(255, 128, 0)
    # Orientation 6 specifies a 90-degree counter-clockwise rotation,
    # so upright transposition transposes dimensions to width=100, height=200.
    jpeg_bytes = create_oriented_jpeg_bytes(width=200, height=100, orientation=6, color=(255, 128, 0))

    bgr_arr, upright_width, upright_height = validate_image_file("phone_photo.jpg", jpeg_bytes)

    # 1. Check dimensions are corrected to upright
    assert upright_width == 100
    assert upright_height == 200
    assert bgr_arr.shape == (200, 100, 3)

    # 2. Check BGR channel order:
    # Original RGB was (255, 128, 0). In BGR order:
    # Channel 0 is Blue (~0), Channel 1 is Green (~128), Channel 2 is Red (~255).
    # Small tolerance (+/- 2) accounts for standard lossy JPEG YCbCr quantization.
    assert abs(int(bgr_arr[0, 0, 0]) - 0) <= 2    # Blue
    assert abs(int(bgr_arr[0, 0, 1]) - 128) <= 2  # Green
    assert abs(int(bgr_arr[0, 0, 2]) - 255) <= 2  # Red


def test_attendance_recognize_reports_upright_dimensions(client, setup_phase2_data, db_session):
    """
    Verifies that /attendance/recognize reports image_width and image_height
    referring to the corrected upright image.
    """
    teacher1 = setup_phase2_data["teacher1"]
    batch1 = setup_phase2_data["batch1"]
    t1_headers = get_auth_headers(teacher1)

    # Original width=400, height=200 with orientation=6 -> upright width=200, height=400
    oriented_bytes = create_oriented_jpeg_bytes(width=400, height=200, orientation=6)
    files = {"file": ("class_oriented.jpg", oriented_bytes, "image/jpeg")}
    data = {"batch_id": batch1.id}

    mock_app = MagicMock()
    mock_app.get.return_value = []

    with patch.object(face_engine, "app", mock_app), patch.object(face_engine, "is_initialized", True):
        res = client.post("/api/v1/attendance/recognize", data=data, files=files, headers=t1_headers)
        assert res.status_code == 200
        result = res.json()

        # Dimensions must refer to the upright image (200x400, not 400x200)
        assert result["image_width"] == 200
        assert result["image_height"] == 400

        # And InsightFace model received the upright BGR image array
        assert mock_app.get.called
        passed_bgr_img = mock_app.get.call_args[0][0]
        assert passed_bgr_img.shape == (400, 200, 3)

