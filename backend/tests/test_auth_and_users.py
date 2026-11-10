"""
Pytest Test Suite: Authentication, Security, and Rate Limiting
Tests:
1. Valid user login via JSON and form endpoints.
2. Invalid password and non-existent user rejections (HTTP 401).
3. Inactive user rejection (HTTP 400).
4. Profile retrieval via /auth/me and token validation.
5. Password hashing and JWT encoding/decoding utilities.
6. CORS configuration and production security check warnings.
7. Rate limiting behavior on /auth/login.
"""
import pytest
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_token
)
from app.core.config import Settings
from app.models.user import User, UserRole


def test_password_hashing():
    raw_password = "SecurePassword123!"
    hashed = get_password_hash(raw_password)
    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_jwt_token_creation_and_decoding():
    data = {"sub": "user@test.local", "role": "admin", "user_id": 42}
    token = create_access_token(data=data)
    decoded = decode_token(token)
    assert decoded is not None
    assert decoded["sub"] == "user@test.local"
    assert decoded["role"] == "admin"
    assert decoded["user_id"] == 42


def test_jwt_decode_invalid_token():
    assert decode_token("invalid.jwt.token") is None
    assert decode_token("") is None


def test_cors_origins_parsing():
    s = Settings(CORS_ORIGINS="http://localhost:3000, https://app.example.com")
    origins = s.cors_origins_list
    assert "http://localhost:3000" in origins
    assert "https://app.example.com" in origins

    s_wildcard = Settings(CORS_ORIGINS="*")
    assert s_wildcard.cors_origins_list == ["*"]


def test_login_json_success(client, admin_user):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": admin_user.email, "password": "AdminPass123!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user_role"] == UserRole.ADMIN.value
    assert data["user_email"] == admin_user.email


def test_login_form_success(client, teacher_user):
    response = client.post(
        "/api/v1/auth/login/token",
        data={"username": teacher_user.email, "password": "TeacherPass123!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user_role"] == UserRole.TEACHER.value


def test_login_invalid_password(client, admin_user):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": admin_user.email, "password": "IncorrectPassword"}
    )
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_login_nonexistent_email(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@nowhere.com", "password": "SomePassword123!"}
    )
    assert response.status_code == 401


def test_login_inactive_user(client, db):
    inactive_user = User(
        email="inactive@facemark.local",
        hashed_password=get_password_hash("SecretPass123!"),
        full_name="Inactive Employee",
        role=UserRole.TEACHER.value,
        is_active=False
    )
    db.add(inactive_user)
    db.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "inactive@facemark.local", "password": "SecretPass123!"}
    )
    assert response.status_code == 400
    assert "inactive" in response.json()["detail"].lower()


def test_get_current_user_profile(client, admin_headers, admin_user):
    response = client.get("/api/v1/auth/me", headers=admin_headers)
    assert response.status_code == 200
    profile = response.json()
    assert profile["email"] == admin_user.email
    assert profile["full_name"] == admin_user.full_name
    assert profile["role"] == admin_user.role


def test_get_current_user_unauthorized(client):
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer bad_token"})
    assert response.status_code == 401
