"""
Pytest Test Suite: Batches Role-Based Access Control (RBAC)
Tests the following requirements:
1. A teacher cannot see or edit another teacher's batch.
2. An admin can see and access all batches.
3. Batch deletion is restricted to Admins only (Teachers get HTTP 403).
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash, create_access_token
from app.models.user import User, UserRole
from app.models.batch import Batch

# In-memory SQLite database for isolated, fast unit testing
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


# Override dependency in FastAPI application
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
def db_session():
    """Create fresh tables for every test function and tear them down afterwards."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client():
    return TestClient(app)


@pytest.fixture(scope="function")
def setup_rbac_data(db_session):
    """
    Seeds:
    - 1 Admin user
    - 2 Teacher users (Teacher 1 and Teacher 2)
    - Batch 1 assigned to Teacher 1
    - Batch 2 assigned to Teacher 2
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
    db_session.refresh(admin)
    db_session.refresh(teacher1)
    db_session.refresh(teacher2)

    batch1 = Batch(
        name="Physics 101",
        subject="Physics",
        description="Teacher 1 batch",
        teacher_id=teacher1.id
    )
    batch2 = Batch(
        name="Chemistry 201",
        subject="Chemistry",
        description="Teacher 2 batch",
        teacher_id=teacher2.id
    )
    db_session.add_all([batch1, batch2])
    db_session.commit()
    db_session.refresh(batch1)
    db_session.refresh(batch2)

    return {
        "admin": admin,
        "teacher1": teacher1,
        "teacher2": teacher2,
        "batch1": batch1,
        "batch2": batch2,
    }


def get_auth_headers(user: User) -> dict:
    """Generates a valid Bearer token header for the given user."""
    token = create_access_token(
        data={"sub": user.email, "role": user.role, "user_id": user.id}
    )
    return {"Authorization": f"Bearer {token}"}


# ==============================================================================
# TEST 1: Teacher cannot see or edit another teacher's batch
# ==============================================================================

def test_teacher_cannot_see_other_teacher_batch_in_list(client, setup_rbac_data):
    """
    When Teacher 1 requests GET /api/v1/batches/, only Batch 1 (their batch)
    must be returned. Batch 2 must be filtered out.
    """
    teacher1 = setup_rbac_data["teacher1"]
    batch1 = setup_rbac_data["batch1"]
    batch2 = setup_rbac_data["batch2"]

    headers = get_auth_headers(teacher1)
    response = client.get("/api/v1/batches/", headers=headers)

    assert response.status_code == 200
    returned_batches = response.json()
    batch_ids = [b["id"] for b in returned_batches]

    assert batch1.id in batch_ids
    assert batch2.id not in batch_ids


def test_teacher_cannot_view_other_teacher_batch_detail(client, setup_rbac_data):
    """
    When Teacher 1 attempts to request GET /api/v1/batches/{batch2_id},
    the server must reject with HTTP 403 Forbidden.
    """
    teacher1 = setup_rbac_data["teacher1"]
    batch2 = setup_rbac_data["batch2"]

    headers = get_auth_headers(teacher1)
    response = client.get(f"/api/v1/batches/{batch2.id}", headers=headers)

    assert response.status_code == 403
    assert "You do not have permission" in response.json()["detail"]


def test_teacher_cannot_edit_other_teacher_batch(client, setup_rbac_data):
    """
    When Teacher 1 attempts to update Batch 2 (belonging to Teacher 2),
    the server must reject with HTTP 403 Forbidden.
    """
    teacher1 = setup_rbac_data["teacher1"]
    batch2 = setup_rbac_data["batch2"]

    headers = get_auth_headers(teacher1)
    payload = {"name": "Hacked Chemistry"}
    response = client.put(f"/api/v1/batches/{batch2.id}", json=payload, headers=headers)

    assert response.status_code == 403
    assert "You do not have permission to edit another teacher's batch" in response.json()["detail"]


def test_teacher_cannot_reassign_batch_teacher(client, setup_rbac_data):
    """
    When Teacher 1 attempts to change the teacher_id of their own batch to Teacher 2,
    the server must reject with HTTP 403 Forbidden (only admins can reassign).
    """
    teacher1 = setup_rbac_data["teacher1"]
    teacher2 = setup_rbac_data["teacher2"]
    batch1 = setup_rbac_data["batch1"]

    headers = get_auth_headers(teacher1)
    payload = {"name": "Physics 101", "teacher_id": teacher2.id}
    response = client.put(f"/api/v1/batches/{batch1.id}", json=payload, headers=headers)

    assert response.status_code == 403
    assert "Only administrators can assign or reassign batches" in response.json()["detail"]


# ==============================================================================
# TEST 2: Admin can see all batches
# ==============================================================================

def test_admin_can_see_all_batches(client, setup_rbac_data):
    """
    When an Admin requests GET /api/v1/batches/, ALL batches must be returned.
    The admin can also view details of any batch.
    """
    admin = setup_rbac_data["admin"]
    batch1 = setup_rbac_data["batch1"]
    batch2 = setup_rbac_data["batch2"]

    headers = get_auth_headers(admin)

    # 1. Admin lists all batches
    list_response = client.get("/api/v1/batches/", headers=headers)
    assert list_response.status_code == 200
    returned_ids = [b["id"] for b in list_response.json()]
    assert batch1.id in returned_ids
    assert batch2.id in returned_ids

    # 2. Admin views batch 1
    b1_response = client.get(f"/api/v1/batches/{batch1.id}", headers=headers)
    assert b1_response.status_code == 200
    assert b1_response.json()["id"] == batch1.id

    # 3. Admin views batch 2
    b2_response = client.get(f"/api/v1/batches/{batch2.id}", headers=headers)
    assert b2_response.status_code == 200
    assert b2_response.json()["id"] == batch2.id


# ==============================================================================
# TEST 3: Delete is Admin only
# ==============================================================================

def test_delete_batch_is_admin_only(client, setup_rbac_data, db_session):
    """
    1. A teacher trying to delete a batch (even their own) must receive HTTP 403 Forbidden.
    2. An admin deleting a batch must receive HTTP 204 No Content, and the batch is deleted.
    """
    admin = setup_rbac_data["admin"]
    teacher1 = setup_rbac_data["teacher1"]
    batch1 = setup_rbac_data["batch1"]

    teacher_headers = get_auth_headers(teacher1)
    admin_headers = get_auth_headers(admin)

    # 1. Teacher attempt -> 403 Forbidden
    teacher_delete_res = client.delete(f"/api/v1/batches/{batch1.id}", headers=teacher_headers)
    assert teacher_delete_res.status_code == 403
    assert "Admin privileges" in teacher_delete_res.json()["detail"]

    # 2. Admin attempt -> 204 No Content
    admin_delete_res = client.delete(f"/api/v1/batches/{batch1.id}", headers=admin_headers)
    assert admin_delete_res.status_code == 204

    # 3. Confirm deletion in database
    deleted_batch = db_session.query(Batch).filter(Batch.id == batch1.id).first()
    assert deleted_batch is None
