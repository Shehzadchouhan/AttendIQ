"""
FaceMark Database Seed Script - Production Coaching Dataset & History Simulation
Creates:
1. Admin and 2 Faculty Members:
   - Prof. Rajesh Sharma (Mathematics & Physics)
   - Dr. Neha Kapoor (Chemistry & Biology)
2. 5 Realistic Coaching Batches:
   - Class 10 CBSE - Mathematics Booster
   - Class 12 JEE - Advanced Physics
   - Class 11 NEET - Medical Chemistry
   - Class 9 ICSE - Foundation Science
   - Class 12 Board - Mathematics Morning
3. 20 Realistic Students with authentic roll numbers (STU-101 to STU-120), emails, and phone numbers.
4. 14 Days of Historical & Live Attendance Sessions (13 historical days + 1 session for Today):
   - Star students (90%–95% attendance rate)
   - Average students (78%–85% attendance rate)
   - Flagged students (60%–70% attendance rate) triggering Low Attendance Alerts (< 75%)
   - Active Today session populating real-time metrics, KPI gauges, and alert banners on the Dashboard.
Idempotent: Safe to run multiple times without duplicating entries.
"""
from datetime import date, datetime, timedelta, time, timezone
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.student import Student
from app.models.batch import Batch, Enrollment
from app.models.attendance import AttendanceSession, AttendanceRecord


def get_session_dates(num_days: int = 14) -> list[date]:
    """
    Generates a chronological sequence of coaching session dates ending on Today.
    Skips Sundays for historical coaching schedule consistency.
    """
    dates = []
    curr = date.today()
    while len(dates) < num_days:
        if curr == date.today() or curr.weekday() != 6:
            dates.append(curr)
        curr -= timedelta(days=1)
    dates.reverse()  # Chronological order: [oldest_date, ..., today]
    return dates


def seed_database():
    db = SessionLocal()
    try:
        print("[*] Starting FaceMark database seeding (Production Upgrade)...")

        # ======================================================================
        # 1. Seed System Admin
        # ======================================================================
        admin = db.query(User).filter(User.email == settings.SEED_ADMIN_EMAIL).first()
        if not admin:
            admin = User(
                email=settings.SEED_ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.SEED_ADMIN_PASSWORD),
                full_name=settings.INITIAL_ADMIN_NAME,
                role=UserRole.ADMIN.value,
                is_active=True
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print(f"[+] Admin user created: {settings.SEED_ADMIN_EMAIL}")
        else:
            admin.full_name = settings.INITIAL_ADMIN_NAME
            admin.is_active = True
            db.commit()
            db.refresh(admin)
            print(f"[-] Admin user verified: {settings.SEED_ADMIN_EMAIL}")

        # ======================================================================
        # 2. Seed Faculty Members (2 Faculty)
        # ======================================================================
        # Faculty 1: Prof. Rajesh Sharma (Mathematics & Physics)
        prof_sharma_email = settings.SEED_TEACHER_EMAIL  # teacher@facemark.local
        prof_sharma = db.query(User).filter(User.email == prof_sharma_email).first()
        if not prof_sharma:
            prof_sharma = User(
                email=prof_sharma_email,
                hashed_password=get_password_hash(settings.SEED_TEACHER_PASSWORD),
                full_name="Prof. Rajesh Sharma",
                role=UserRole.TEACHER.value,
                is_active=True
            )
            db.add(prof_sharma)
            db.commit()
            db.refresh(prof_sharma)
            print(f"[+] Faculty created: Prof. Rajesh Sharma ({prof_sharma_email})")
        else:
            prof_sharma.full_name = "Prof. Rajesh Sharma"
            prof_sharma.is_active = True
            db.commit()
            db.refresh(prof_sharma)
            print(f"[-] Faculty updated/verified: Prof. Rajesh Sharma ({prof_sharma_email})")

        # Faculty 2: Dr. Neha Kapoor (Chemistry & Biology)
        dr_kapoor_email = "neha.kapoor@facemark.local"
        dr_kapoor = db.query(User).filter(User.email == dr_kapoor_email).first()
        if not dr_kapoor:
            dr_kapoor = User(
                email=dr_kapoor_email,
                hashed_password=get_password_hash("teacher123"),
                full_name="Dr. Neha Kapoor",
                role=UserRole.TEACHER.value,
                is_active=True
            )
            db.add(dr_kapoor)
            db.commit()
            db.refresh(dr_kapoor)
            print(f"[+] Faculty created: Dr. Neha Kapoor ({dr_kapoor_email})")
        else:
            dr_kapoor.full_name = "Dr. Neha Kapoor"
            dr_kapoor.is_active = True
            db.commit()
            db.refresh(dr_kapoor)
            print(f"[-] Faculty updated/verified: Dr. Neha Kapoor ({dr_kapoor_email})")

        # ======================================================================
        # 3. Seed 5 Realistic Coaching Batches
        # ======================================================================
        batch_definitions = [
            {
                "name": "Class 10 CBSE - Mathematics Booster",
                "legacy_name": "Class 10 - Mathematics Morning",
                "subject": "Mathematics",
                "description": "Intensive CBSE Class 10 Board preparation covering Trigonometry, Real Numbers, and Coordinate Geometry.",
                "teacher_id": prof_sharma.id
            },
            {
                "name": "Class 12 JEE - Advanced Physics",
                "legacy_name": "Class 12 - Advanced Physics",
                "subject": "Physics",
                "description": "Rigorous problem solving for JEE Advanced covering Mechanics, Electromagnetism, and Modern Physics.",
                "teacher_id": prof_sharma.id
            },
            {
                "name": "Class 11 NEET - Medical Chemistry",
                "legacy_name": None,
                "subject": "Chemistry",
                "description": "NEET-focused curriculum covering Organic mechanisms, Chemical Bonding, and Thermodynamics.",
                "teacher_id": dr_kapoor.id
            },
            {
                "name": "Class 9 ICSE - Foundation Science",
                "legacy_name": "Class 9 - Foundation Science",
                "subject": "Science",
                "description": "Foundation concepts in Physics, Chemistry, and Biology with experimental problem-solving.",
                "teacher_id": dr_kapoor.id
            },
            {
                "name": "Class 12 Board - Mathematics Morning",
                "legacy_name": None,
                "subject": "Mathematics",
                "description": "Comprehensive Class 12 Board revision covering Calculus, Matrices, Vectors, and 3D Geometry.",
                "teacher_id": prof_sharma.id
            }
        ]

        batch_map = {}
        for b_info in batch_definitions:
            b_obj = db.query(Batch).filter(Batch.name == b_info["name"]).first()
            if not b_obj and b_info["legacy_name"]:
                b_obj = db.query(Batch).filter(Batch.name == b_info["legacy_name"]).first()

            if not b_obj:
                b_obj = Batch(
                    name=b_info["name"],
                    subject=b_info["subject"],
                    description=b_info["description"],
                    teacher_id=b_info["teacher_id"]
                )
                db.add(b_obj)
                db.commit()
                db.refresh(b_obj)
                print(f"[+] Batch created: '{b_obj.name}' -> Teacher ID {b_obj.teacher_id}")
            else:
                b_obj.name = b_info["name"]
                b_obj.subject = b_info["subject"]
                b_obj.description = b_info["description"]
                b_obj.teacher_id = b_info["teacher_id"]
                db.commit()
                db.refresh(b_obj)
                print(f"[-] Batch updated: '{b_obj.name}' -> Teacher ID {b_obj.teacher_id}")

            batch_map[b_info["name"]] = b_obj

        # ======================================================================
        # 4. Seed 20 Realistic Students (STU-101 to STU-120)
        # ======================================================================
        student_data = [
            {"roll_number": "STU-101", "full_name": "Aarav Sharma", "email": "aarav.sharma@example.com", "phone": "+91 9811100101"},
            {"roll_number": "STU-102", "full_name": "Diya Patel", "email": "diya.patel@example.com", "phone": "+91 9811100102"},
            {"roll_number": "STU-103", "full_name": "Rohan Verma", "email": "rohan.verma@example.com", "phone": "+91 9811100103"},
            {"roll_number": "STU-104", "full_name": "Ananya Gupta", "email": "ananya.gupta@example.com", "phone": "+91 9811100104"},
            {"roll_number": "STU-105", "full_name": "Kabir Singh", "email": "kabir.singh@example.com", "phone": "+91 9811100105"},
            {"roll_number": "STU-106", "full_name": "Ishaan Malhotra", "email": "ishaan.malhotra@example.com", "phone": "+91 9811100106"},
            {"roll_number": "STU-107", "full_name": "Meera Nair", "email": "meera.nair@example.com", "phone": "+91 9811100107"},
            {"roll_number": "STU-108", "full_name": "Aditya Joshi", "email": "aditya.joshi@example.com", "phone": "+91 9811100108"},
            {"roll_number": "STU-109", "full_name": "Riya Sen", "email": "riya.sen@example.com", "phone": "+91 9811100109"},
            {"roll_number": "STU-110", "full_name": "Siddharth Rao", "email": "siddharth.rao@example.com", "phone": "+91 9811100110"},
            {"roll_number": "STU-111", "full_name": "Tanvi Deshmukh", "email": "tanvi.deshmukh@example.com", "phone": "+91 9811100111"},
            {"roll_number": "STU-112", "full_name": "Vivaan Kapoor", "email": "vivaan.kapoor@example.com", "phone": "+91 9811100112"},
            {"roll_number": "STU-113", "full_name": "Pooja Bhattacharya", "email": "pooja.b@example.com", "phone": "+91 9811100113"},
            {"roll_number": "STU-114", "full_name": "Aryan Kulkarni", "email": "aryan.kulkarni@example.com", "phone": "+91 9811100114"},
            {"roll_number": "STU-115", "full_name": "Sneha Reddy", "email": "sneha.reddy@example.com", "phone": "+91 9811100115"},
            {"roll_number": "STU-116", "full_name": "Harsh Vardhan", "email": "harsh.vardhan@example.com", "phone": "+91 9811100116"},
            {"roll_number": "STU-117", "full_name": "Kavya Iyer", "email": "kavya.iyer@example.com", "phone": "+91 9811100117"},
            {"roll_number": "STU-118", "full_name": "Devansh Saxena", "email": "devansh.saxena@example.com", "phone": "+91 9811100118"},
            {"roll_number": "STU-119", "full_name": "Nandini Choudhury", "email": "nandini.c@example.com", "phone": "+91 9811100119"},
            {"roll_number": "STU-120", "full_name": "Yash Singhal", "email": "yash.singhal@example.com", "phone": "+91 9811100120"},
        ]

        student_map = {}
        for s_info in student_data:
            s_obj = db.query(Student).filter(Student.roll_number == s_info["roll_number"]).first()
            if not s_obj:
                s_obj = Student(
                    roll_number=s_info["roll_number"],
                    full_name=s_info["full_name"],
                    email=s_info["email"],
                    phone=s_info["phone"],
                    is_active=True,
                    consent_given=True,
                    consent_at=datetime.now(timezone.utc)
                )
                db.add(s_obj)
                db.commit()
                db.refresh(s_obj)
                print(f"[+] Student registered: {s_obj.roll_number} - {s_obj.full_name}")
            else:
                s_obj.full_name = s_info["full_name"]
                s_obj.email = s_info["email"]
                s_obj.phone = s_info["phone"]
                s_obj.is_active = True
                s_obj.consent_given = True
                db.commit()
                db.refresh(s_obj)
            student_map[s_info["roll_number"]] = s_obj

        # ======================================================================
        # 5. Enroll Students into Batches
        # ======================================================================
        enrollment_matrix = {
            "Class 10 CBSE - Mathematics Booster": [
                "STU-101", "STU-102", "STU-103", "STU-104", "STU-105", "STU-106", "STU-107", "STU-108"
            ],
            "Class 12 JEE - Advanced Physics": [
                "STU-108", "STU-109", "STU-110", "STU-111", "STU-112", "STU-113", "STU-114", "STU-115"
            ],
            "Class 11 NEET - Medical Chemistry": [
                "STU-113", "STU-114", "STU-115", "STU-116", "STU-117", "STU-118", "STU-119", "STU-120"
            ],
            "Class 9 ICSE - Foundation Science": [
                "STU-101", "STU-102", "STU-104", "STU-106", "STU-107", "STU-111", "STU-112"
            ],
            "Class 12 Board - Mathematics Morning": [
                "STU-108", "STU-109", "STU-110", "STU-114", "STU-116", "STU-118", "STU-119", "STU-120"
            ]
        }

        total_enrollments = 0
        for batch_name, roll_list in enrollment_matrix.items():
            b = batch_map[batch_name]
            for roll in roll_list:
                s = student_map[roll]
                enr = db.query(Enrollment).filter(
                    Enrollment.batch_id == b.id,
                    Enrollment.student_id == s.id
                ).first()
                if not enr:
                    enr = Enrollment(batch_id=b.id, student_id=s.id)
                    db.add(enr)
                    total_enrollments += 1
            db.commit()
        print(f"[+] Verified student enrollments across all 5 coaching batches.")

        # ======================================================================
        # 6. Seed 14 Days of Attendance Sessions & Records (13 Past + Today)
        # ======================================================================
        session_dates = get_session_dates(num_days=14)
        print(f"[*] Simulating 14 session dates from {session_dates[0]} to {session_dates[-1]} (Today)...")

        # Attendance Distribution Specification:
        # Star Students (13/14 = 92.86% attendance)
        # Average Students (11/14 = 78.57% or 12/14 = 85.71% attendance)
        # Flagged Students (9/14 = 64.29% or 10/14 = 71.43% attendance -> strictly < 75%)
        absence_indices = {
            # Star Students (1 absence in 14 days -> 92.86%)
            "STU-101": {4},
            "STU-102": {7},
            "STU-106": {2},
            "STU-109": {8},
            "STU-110": {5},
            "STU-113": {3},
            "STU-117": {9},
            "STU-119": {6},

            # Average Students (2-3 absences in 14 days -> 78.57% to 85.71%)
            "STU-103": {3, 9},
            "STU-104": {1, 6, 11},
            "STU-108": {2, 7, 10},
            "STU-111": {4, 8},
            "STU-114": {3, 7, 11},
            "STU-115": {2, 8, 13},  # Absent today
            "STU-118": {1, 9},

            # Flagged Students (4-5 absences in 14 days -> 64.29% or 71.43% -> Alert < 75%)
            "STU-105": {2, 4, 7, 10, 13},  # Absent today, 64.29%
            "STU-107": {1, 3, 6, 8, 11},   # 64.29%
            "STU-112": {2, 5, 8, 11},       # 71.43%
            "STU-116": {0, 4, 6, 9, 12},   # 64.29%
            "STU-120": {1, 5, 7, 10},       # 71.43%
        }

        # Specific session indices where student was marked 'late'
        late_indices = {
            "STU-103": {5},
            "STU-108": {1},
            "STU-114": {6},
            "STU-107": {0},
        }

        total_sessions_created = 0
        total_records_created = 0

        for batch_name, roll_list in enrollment_matrix.items():
            b = batch_map[batch_name]

            for s_idx, s_date in enumerate(session_dates):
                # Unrecognized guest/unmapped face count for realism
                unrec_count = 1 if s_idx in [2, 7, 11] else 0

                session = db.query(AttendanceSession).filter(
                    AttendanceSession.batch_id == b.id,
                    AttendanceSession.session_date == s_date
                ).first()

                if not session:
                    session = AttendanceSession(
                        batch_id=b.id,
                        taken_by_user_id=b.teacher_id,
                        session_date=s_date,
                        status="completed",
                        unrecognized_count=unrec_count,
                        created_at=datetime.combine(s_date, time(9, 30), tzinfo=timezone.utc)
                    )
                    db.add(session)
                    db.commit()
                    db.refresh(session)
                    total_sessions_created += 1
                else:
                    session.taken_by_user_id = b.teacher_id
                    session.status = "completed"
                    session.unrecognized_count = unrec_count
                    db.commit()

                # Attendance records for each enrolled student
                for roll in roll_list:
                    s = student_map[roll]

                    if s_idx in absence_indices.get(roll, set()):
                        rec_status = "absent"
                        rec_method = "manual" if s_idx % 2 == 0 else "face"
                        conf = None
                    elif s_idx in late_indices.get(roll, set()):
                        rec_status = "late"
                        rec_method = "face"
                        conf = 0.91
                    else:
                        rec_status = "present"
                        # 85% face recognition with high confidence, 15% manual verification
                        is_face = ((s_idx + s.id) % 6 != 0)
                        rec_method = "face" if is_face else "manual"
                        conf = round(0.88 + ((hash(roll + str(s_idx)) % 10) / 100.0), 2) if is_face else None

                    rec = db.query(AttendanceRecord).filter(
                        AttendanceRecord.session_id == session.id,
                        AttendanceRecord.student_id == s.id
                    ).first()

                    if not rec:
                        rec = AttendanceRecord(
                            session_id=session.id,
                            student_id=s.id,
                            status=rec_status,
                            method=rec_method,
                            is_confirmed=True,
                            confidence_score=conf,
                            marked_at=datetime.combine(s_date, time(9, 35, s.id % 60), tzinfo=timezone.utc)
                        )
                        db.add(rec)
                        total_records_created += 1
                    else:
                        rec.status = rec_status
                        rec.method = rec_method
                        rec.is_confirmed = True
                        rec.confidence_score = conf
                db.commit()

        print(f"[OK] Seeding completed: {len(batch_map)} batches, {len(student_data)} students.")
        print(f"[OK] Total Attendance Sessions verified: {db.query(AttendanceSession).count()} (14 per batch).")
        print(f"[OK] Total Attendance Records verified: {db.query(AttendanceRecord).count()}.")
        print(f"[+] Dashboard & Reports are now fully populated with 14-day history & active Today session!")

    except Exception as e:
        db.rollback()
        print(f"[!] Error seeding database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
