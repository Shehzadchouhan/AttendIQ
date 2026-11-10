"""
Pytest Configuration & Shared Test Fixtures for FaceMark Backend.
Supports both isolated in-memory SQLite for local testing and PostgreSQL for CI.
"""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash, create_access_token
from app.models.user import User, UserRole

# 1. Configurable Test Database URL (defaults to SQLite memory; CI sets PostgreSQL)
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "sqlite:///:memory:")

if "sqlite" in TEST_DATABASE_URL:
    test_engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    test_engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Ensure dependency override is permanently registered for testing
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """
    Creates database schema once for the entire test session.
    """
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def db():
    """
    Provides a clean database session per test.
    Cleans up all table rows after each test without dropping tables.
    """
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        with test_engine.begin() as conn:
            for table in reversed(Base.metadata.sorted_tables):
                conn.execute(table.delete())


@pytest.fixture(scope="function")
def db_session(db):
    """
    Alias fixture for existing test suites expecting db_session.
    """
    yield db


@pytest.fixture(scope="function")
def client():
    """
    FastAPI TestClient instance.
    """
    return TestClient(app)


@pytest.fixture
def admin_user(db):
    user = User(
        email="test_admin@facemark.local",
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Test Administrator",
        role=UserRole.ADMIN.value,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def teacher_user(db):
    user = User(
        email="test_teacher@facemark.local",
        hashed_password=get_password_hash("TeacherPass123!"),
        full_name="Test Teacher",
        role=UserRole.TEACHER.value,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_headers(admin_user):
    token = create_access_token(
        data={"sub": admin_user.email, "role": admin_user.role, "user_id": admin_user.id}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def teacher_headers(teacher_user):
    token = create_access_token(
        data={"sub": teacher_user.email, "role": teacher_user.role, "user_id": teacher_user.id}
    )
    return {"Authorization": f"Bearer {token}"}
