# Phase 3: Attendance Sessions, Analytics & CI/CD Pipeline

> [!NOTE]
> This phase represents an architectural development phase of the AttendIQ software project, not a calendar training week. It does not claim to have occurred during the training window.

---

## Overview

Phase 3 delivered the end-to-end attendance session workflow, greedy bipartite face matching, interactive canvas visual overlays, analytics reporting with 28-day heatmaps, API rate limiting, and production CI/CD automation pipelines.

---

## Technical Objectives

* Implement session-based attendance execution supporting wide-angle group photos and live webcam captures.
* Develop a greedy maximum similarity bipartite matching algorithm to assign detected faces to students without duplicates.
* Enforce database uniqueness constraints preventing duplicate sessions per batch per date.
* Build the analytics engine: monthly attendance rates, 28-day heatmaps, at-risk student detection (<75%), and CSV exports.
* Protect authentication endpoints using SlowAPI token-bucket rate limiting.
* Establish automated CI/CD workflows on GitHub Actions for linting, testing, code coverage, and Docker image publishing.

---

## Modules & Deliverables

### 1. Attendance Execution & Bipartite Matching
* Implemented `POST /api/v1/attendance/sessions/{id}/recognize`:
  * Detects all faces in a single classroom photograph.
  * Calculates pairwise cosine similarities against enrolled student vectors.
  * Employs greedy bipartite matching: selects highest-scoring pairs iteratively to enforce 1-to-1 face-student correspondence.
  * Categorizes each face into tri-state confidence levels: Green ($\ge 0.45$), Amber ($0.35$–$0.45$), and Red ($< 0.35$).
* Applied Alembic migration `0004_session_batch_date_unique.py` to prevent duplicate sessions for the same batch on the same day.

### 2. Frontend Attendance UI & Live Camera
* Developed `TakeAttendance.jsx` featuring HTML5 canvas overlays for bounding boxes with color coding and confidence tags.
* Built `WebcamModal.jsx` for direct browser camera streaming and instantaneous photo capture.
* Enabled manual instructor overrides for attendance status (`present`, `absent`, `late`) prior to session confirmation.

### 3. Analytics, Reporting & Rate Limiting
* Created `backend/app/api/v1/reports.py` and `Reports.jsx` featuring Recharts visualizations:
  * Attendance trend area charts and batch-wise comparison bars.
  * 28-day color-coded attendance heatmaps.
  * At-risk student lists (<75% attendance or $\ge 3$ consecutive absences) with 1-click WhatsApp parent notification shortcuts.
  * Streaming CSV export (`GET /api/v1/reports/batches/{id}/export-csv`).
* Integrated SlowAPI rate limiter (`limiter.py`) restricting `/auth/login` to 5 requests per minute.

### 4. CI/CD & Production Dockerization
* Configured `.github/workflows/ci.yml`: Automated backend linting, pytest with `pytest-cov`, and frontend test suites.
* Configured `.github/workflows/publish.yml`: Automated multi-stage Docker image builds published to GitHub Container Registry (GHCR).
* Added `Dockerfile.prod` and `docker-compose.prod.yml` with Nginx reverse proxy configuration and `DEPLOYMENT.md`.

---

## Verifiable Evidence

* **Commit**: [`030aeab`](https://github.com/Shehzadchouhan/AttendIQ/commit/030aeab) — `complete from phase 1 to phase 5`.
* **Primary Files**:
  * `backend/app/api/v1/attendance.py`, `backend/app/api/v1/reports.py`
  * `backend/alembic/versions/0004_session_batch_date_unique.py`
  * `backend/app/core/limiter.py`
  * `frontend/src/pages/TakeAttendance.jsx`, `frontend/src/pages/Reports.jsx`
  * `frontend/src/components/WebcamModal.jsx`, `SessionHistoryModal.jsx`
  * `.github/workflows/ci.yml`, `.github/workflows/publish.yml`
  * `DEPLOYMENT.md`, `docker-compose.prod.yml`

---

[← Back to Home](index.md)
