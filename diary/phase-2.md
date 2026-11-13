# Phase 2: Biometrics & Face Recognition Engine

> [!NOTE]
> This phase represents an architectural development phase of the AttendIQ software project, not a calendar training week. It does not claim to have occurred during the training window.

---

## Overview

Phase 2 integrated the core computer vision and deep learning biometric pipeline into the FastAPI backend. It introduced in-memory image processing, ArcFace facial embedding extraction, RetinaFace face detection, biometric consent tracking designed with DPDP Act principles in mind (consent tracking, in-memory processing, no biometric images stored), and automated accuracy evaluation.

---

## Technical Objectives

* Integrate InsightFace (`buffalo_l`) with ONNX Runtime using the CPU execution provider.
* Implement zero-disk ephemeral biometric processing so that raw photos are never persisted to disk or the database.
* Extract 512-dimensional normalized float vectors for enrolled student face profiles.
* Add database fields and migrations for biometric consent tracking designed with DPDP Act principles in mind (consent tracking, in-memory processing, no biometric images stored).
* Develop face enrollment and recognition endpoints with confidence scoring.
* Write unit and integration test suites validating facial detection and cosine similarity matching.

---

## Modules & Deliverables

### 1. In-Memory Biometric Service (`face_engine.py`)
* Used Pillow (`PIL.Image`) and `ImageOps.exif_transpose` for orientation normalization and decompression protection.
* Converted memory buffers to BGR NumPy arrays for InsightFace processing without intermediate disk writes.
* Built single-face validation for enrollment: rejects images with zero faces or multiple faces to guarantee clean embeddings.
* Generated L2-normalized 512-dimensional embeddings via ArcFace ResNet-50.

### 2. Privacy & Biometric Consent Tracking
* Applied Alembic migration `0003_student_face_consent.py`:
  * `has_face_enrolled`: Boolean flag indicating biometric enrollment status.
  * `face_consent_given`: Explicit consent flag.
  * `face_consent_date`: Timestamp of consent recording.
* Implemented `POST /api/v1/students/privacy/purge-inactive-faces` to allow administrators to permanently purge biometric vectors for inactive students, designed with DPDP Act principles in mind (consent tracking, in-memory processing, no biometric images stored).

### 3. Verification & Evaluation
* `POST /api/v1/students/{id}/enroll-face`: Endpoint for enrolling student facial vectors.
* `POST /api/v1/attendance/recognize`: Group photo verification endpoint.
* Created `backend/scripts/evaluate_accuracy.py` to benchmark detection and cosine similarity thresholds ($0.45$ verified, $0.35$ uncertain).
* Developed comprehensive test suite in `backend/tests/test_face_engine_endpoints.py`.

---

## Verifiable Evidence

* **Commit**: [`06ae95a`](https://github.com/Shehzadchouhan/AttendIQ/commit/06ae95a) — `Phase 2: face enrollment and recognition engine`.
* **Primary Files**:
  * `backend/app/services/face_engine.py`
  * `backend/alembic/versions/0003_student_face_consent.py`
  * `backend/app/api/v1/attendance.py`, `backend/app/api/v1/students.py`
  * `backend/scripts/evaluate_accuracy.py`
  * `backend/tests/test_face_engine_endpoints.py`
  * `frontend/src/pages/Students.jsx` (face enrollment modal integration)

---

[← Back to Home](index.md)
