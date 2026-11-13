# TR-103 Daily Training Diary

**Course Code**: TR-103 (Four Weeks Industrial Training)  
**Academic Program**: B.Tech Computer Science & Engineering (2023–2027)  
**Institution**: Guru Nanak Dev Engineering College, Ludhiana  

---

## Student Particulars

| Field | Detail |
| :--- | :--- |
| **Student Name** | Mohd Shehzad |
| **University Roll No. (URN)** | 2302612 |
| **Class Roll No. (CRN)** | 2315157 |
| **Department** | Computer Science and Engineering |
| **Semester** | 7th Semester (Evaluation of 4-Week Training) |

---

## Industrial Training Particulars

| Field | Detail |
| :--- | :--- |
| **Training Stream** | Full Stack Development |
| **Organization** | Techversys Solutions Pvt. Ltd. |
| **Training Location** | F-539, Phase 8-B, Sector 74, Mohali, Punjab - 160071 |
| **Company Supervisor** | Mr. Sushil Kumar |
| **Training Period** | 24 June 2026 to July 2026 (exact end date as per certificate) |
| **Project Title** | FaceMark / AttendIQ: Face-Recognition Based Attendance System for Tuition Centres |

---

## Important Notice on Dates

> [!NOTE]
> This diary reflects the real, verified development timeline of the AttendIQ repository as recorded in Git version history. Please read the full disclosure on the [Note on Dates](note-on-dates.md) page.

---

## Development Timeline & Daily Logs

The project codebase, database migrations, biometric engine, analytics, and design system were developed and version-controlled on the active dates below.

| Date | Commits | Phase Focus | Key Deliverables | Daily Page |
| :--- | :---: | :--- | :--- | :--- |
| **2026-11-09** | 3 | Phase 1 & Phase 2 | Architecture spec, FastAPI backend, JWT auth, Alembic migrations 0001–0003, React scaffold, and InsightFace ArcFace biometric engine. | [9 November 2026](days/2026-11-09.md) |
| **2026-11-10** | 1 | Phase 3 | Live classroom attendance pipeline, greedy bipartite face matching, 28-day attendance heatmaps, SlowAPI rate limiter, and GitHub Actions CI/CD. | [10 November 2026](days/2026-11-10.md) |
| **2026-11-11** | 3 | Phase 4 | 24-hour session locking (Alembic 0005), multi-tenant tutor scoping (Alembic 0006), component design system, AttendIQ platform overhaul, and name update. | [11 November 2026](days/2026-11-11.md) |

---

## Project Development Phases

These phases represent technical milestones in the codebase development, not calendar training weeks:

* [**Phase 1: Architecture, Core Schema & Authentication**](phase-1.md) — Specification, relational schema design, JWT auth, RBAC, and basic UI routing.
* [**Phase 2: Biometrics & Face Recognition Engine**](phase-2.md) — InsightFace ArcFace/RetinaFace on ONNX Runtime CPU, zero-disk ephemeral biometric processing, and consent tracking designed with DPDP Act principles in mind.
* [**Phase 3: Attendance Sessions, Analytics & CI/CD Pipeline**](phase-3.md) — Group photo bipartite matching, Recharts attendance analytics, session uniqueness constraints, and automated workflows.
* [**Phase 4: Design System, Multi-Tenancy & Platform Overhaul**](phase-4.md) — Modular UI token system, multi-tenant tutor data isolation, session audit locking, community chat, and branding alignment.

---

## Additional Information

* [**About AttendIQ**](about.md) — Technical problem statement, system architecture, and technology stack.
* [**Note on Dates**](note-on-dates.md) — Clarification of the development timeline and repository evidence.
* [**GitHub Repository**](https://github.com/Shehzadchouhan/AttendIQ) — Source code, commit logs, test suites, and Docker configurations.
