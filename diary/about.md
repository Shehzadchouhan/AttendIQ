# About AttendIQ (FaceMark)

**AttendIQ** (initially developed under the project name **FaceMark**) is an automated biometric attendance web platform designed for tuition centres, coaching institutes, and after-school academies. It replaces manual roll-calling and costly dedicated fingerprint/RFID hardware with single-shot group facial recognition using commodity webcams and laptops.

---

## 1. Problem Statement & Motivation

1. **Instructional Time Wastage**: Manual roll-calling takes 5 to 10 minutes per lecture, consuming up to 15% of instructional time in 45-minute coaching sessions.
2. **Attendance Fraud & Proxy Calling**: Paper attendance sheets are easily manipulated and lack verifiable audit trails.
3. **Expensive Proprietary Hardware**: Fingerprint scanners and RFID turnstiles cost ₹15,000–₹50,000 per unit, require physical contact, and create entrance bottlenecks during batch switchovers.
4. **Biometric Privacy Risks**: Cloud-based facial recognition APIs charge recurring fees and require uploading raw student photographs to third-party servers, posing data protection risks under India's Digital Personal Data Protection (DPDP) Act, 2023.

---

## 2. Core Architectural Principles

* **Zero-Disk Ephemeral Biometrics**: Student classroom group photos are processed entirely in-memory (`io.BytesIO`). Raw images are never saved to disk or database tables, designed with DPDP Act principles in mind (consent tracking, in-memory processing, no biometric images stored).
* **512-Dimensional Vector Embeddings**: Facial features are transformed into mathematical embedding arrays (`face_embeddings.embedding_data`) via deep metric learning.
* **Greedy Global Bipartite Matching**: Multiple faces detected in a group photograph are globally matched against enrolled student vectors to ensure a strict 1-to-1 assignment.
* **Tri-State Visual Telemetry**: The UI overlays color-coded bounding boxes on an HTML5 canvas:
  * **Green ($\ge 0.45$)**: High-confidence verified match.
  * **Amber ($0.35$ to $0.45$)**: Ambiguous match requiring teacher verification.
  * **Red ($< 0.35$)**: Unrecognized person or visitor.
* **Tamper-Resistant Audit Trail**: Completed attendance sessions lock automatically after 24 hours. Any unlock requires administrator privileges and a logged reason.
* **Multi-Tenant Tutor Scoping**: Independent tutors and teachers manage their own students, batches, and records with data isolation.

---

## 3. Technology Stack

| Layer | Technology | Version | Role |
| :--- | :--- | :--- | :--- |
| **Backend Framework** | **FastAPI** | $\ge 0.110.0, < 1.0.0$ | Asynchronous ASGI REST API, dependency injection, and Pydantic validation. |
| **ASGI Server** | **Uvicorn** | $\ge 0.28.0$ | Production ASGI application server. |
| **Primary Database** | **PostgreSQL** | 15 (Docker) | Relational persistence with foreign keys, indexes, and JSON column support. |
| **ORM & Migrations** | **SQLAlchemy** & **Alembic** | SQLAlchemy $\ge 2.0.25$, Alembic $\ge 1.13.1$ | Declarative schema definitions and migrations (`0001` through `0006`). |
| **Biometric Vision** | **InsightFace** | 0.7.3 (`buffalo_l`) | ArcFace ResNet-50 feature extraction and RetinaFace facial landmark detection. |
| **Inference Runtime** | **ONNX Runtime** | 1.17.1 | CPU-optimized neural network inference (`CPUExecutionProvider`). |
| **Computer Vision** | **OpenCV Headless** | 4.9.0.80 | In-memory buffer conversion and BGR format transformation. |
| **Numerical Computing** | **NumPy** | $\ge 1.24.0, < 2.0.0$ | Pairwise cosine similarity matrix calculations and sorting. |
| **Image Decoding** | **Pillow** | $\ge 10.2.0$ | Image loading and EXIF orientation normalization. |
| **Stateless Auth** | **PyJWT** | $\ge 2.8.0$ | HMAC-SHA256 (`HS256`) signed JWT access tokens. |
| **Password Hashing** | **bcrypt** | 4.0.1 | Salted cryptographic password hashing. |
| **Rate Limiter** | **SlowAPI** | $\ge 0.1.9$ | In-memory token bucket rate limiter (5 req/min on `/auth/login`). |
| **Frontend UI** | **React** | 18.2.0 | Modular component library with hooks and context providers. |
| **Build Tool & Bundler** | **Vite** | 5.1.6 | Native ESM development server and Rollup production bundler. |
| **Routing** | **React Router DOM** | 6.22.3 | Client-side routing and protected route wrappers. |
| **Data Visualization** | **Recharts** | 2.15.4 | SVG attendance trend charts, batch comparison bars, and 28-day heatmaps. |
| **UI Motion & Toast** | **Framer Motion** & **Sonner** | Motion 14.12.0, Sonner 2.0.8 | Smooth UI transitions and toast notifications. |
| **Iconography** | **Lucide React** | 0.359.0 | Scalable vector SVG icons. |
| **Containerization** | **Docker** & **Docker Compose** | Multi-stage Dockerfile | Container orchestration with Alpine Nginx static serving. |
| **Automated Testing** | **pytest** & **Vitest** | pytest $\ge 8.0.0$, Vitest 1.4.0 | Unit and integration test suites with `pytest-cov` coverage checks. |

---

## 4. System Modules

1. **Authentication & Multi-Tenant Workspaces**: Self-registration, JWT token validation, role-based access control (`admin` vs. `teacher`), and brute-force protection.
2. **Student Directory & Consent Tracking**: Student profile management, search, multi-tenant creator scoping, and consent tracking designed with DPDP Act principles in mind (consent tracking, in-memory processing, no biometric images stored).
3. **Batch & Enrollment Management**: Batch creation, student enrollment mapping, and teacher assignment.
4. **Group Facial Attendance Engine**: Group photo upload or webcam capture, face detection, 512-d feature extraction, and greedy bipartite matching.
5. **Analytics & Automated Reporting**: Monthly attendance rates, 28-day heatmaps, at-risk student identification (<75% attendance or $\ge 3$ consecutive absences), and CSV export.
6. **Audit & Session Governance**: 24-hour session locking, reason-mandated audit logs, and parent communication shortcuts.

---

[← Back to Home](index.md)
