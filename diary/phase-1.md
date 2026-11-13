# Phase 1: Architecture, Core Schema & Authentication

> [!NOTE]
> This phase represents an architectural development phase of the AttendIQ software project, not a calendar training week. It does not claim to have occurred during the training window.

---

## Overview

In Phase 1, the foundational architecture of the AttendIQ attendance system was designed and implemented. This phase established the system specification, relational database schemas, stateless authentication pipeline, role-based access control (RBAC), and initial client scaffolding.

---

## Technical Objectives

* Define complete database models for users, students, batches, and attendance sessions using SQLAlchemy 2.0.
* Establish version-controlled schema migrations with Alembic (`0001_initial_schema` and `0002_add_batch_teacher_and_attendance_fields`).
* Implement secure user authentication with bcrypt password hashing and HMAC-SHA256 JWT access tokens.
* Enforce role-based access control (`admin` and `teacher` roles) through FastAPI dependency injection.
* Build the frontend client shell with React 18, Vite, React Router DOM, and Axios API interceptors.
* Configure Docker and Docker Compose for local multi-container development.

---

## Modules & Deliverables

### 1. Database Schema & Migrations
* Designed SQLAlchemy declarative models:
  * `User`: System accounts with role definitions (`admin`, `teacher`), email, and hashed credentials.
  * `Student`: Student profiles, registration IDs, parent contact numbers, and active status.
  * `Batch`: Course/classroom groupings with assigned teachers and scheduled lecture timings.
  * `AttendanceSession` & `AttendanceRecord`: Session tracking and individual student attendance statuses.
* Generated and applied Alembic migrations `0001` and `0002`.

### 2. Backend API Services
* `POST /api/v1/auth/login`: Issues JWT tokens for valid credentials.
* `GET /api/v1/auth/me`: Returns the authenticated user's profile and assigned role.
* `GET`, `POST`, `PUT`, `DELETE /api/v1/batches`: CRUD management for batches and student cohort enrollments.
* `GET`, `POST`, `PUT`, `DELETE /api/v1/students`: Directory management for student records.

### 3. Frontend Scaffolding
* Initialized React 18 single-page application using Vite.
* Implemented `AuthContext` with local storage persistence and Axios authorization header injection.
* Configured `ProtectedRoute` to restrict administrative routes.
* Created initial dashboard, navigation sidebar, login form, and student/batch management tables.

---

## Verifiable Evidence

* **Commit**: [`3d0a9cf`](https://github.com/Shehzadchouhan/AttendIQ/commit/3d0a9cf) — `first commit` (System specifications and architecture).
* **Commit**: [`6b1c328`](https://github.com/Shehzadchouhan/AttendIQ/commit/6b1c328) — `Phase 1 + patch: auth, RBAC, students, batches, enrollment`.
* **Primary Files**:
  * `backend/app/main.py`
  * `backend/app/core/security.py`, `database.py`, `config.py`
  * `backend/app/models/` (`user.py`, `student.py`, `batch.py`, `attendance.py`)
  * `backend/alembic/versions/` (`0001_initial_schema.py`, `0002_add_batch_teacher_and_attendance_fields.py`)
  * `backend/tests/test_batches_rbac.py`
  * `frontend/src/App.jsx`, `context/AuthContext.jsx`, `api/client.js`
  * `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`

---

[← Back to Home](index.md)
