"""
FaceMark Database Seed Script
Creates initial Admin, Teacher, Batches, and Students for instant testing & viva presentation.
Idempotent: Safe to run multiple times without duplicating entries.
"""
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.student import Student
from app.models.batch import Batch, Enrollment


def seed_database():
    db = SessionLocal()
    try:
        print("[*] Starting FaceMark database seeding...")

        # 1. Seed Admin User
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
            print(f"[+] Admin user created: {settings.SEED_ADMIN_EMAIL} (Password: {settings.SEED_ADMIN_PASSWORD})")
        else:
            print(f"[-] Admin user already exists: {settings.SEED_ADMIN_EMAIL}")

        # 2. Seed Teacher User
        teacher = db.query(User).filter(User.email == settings.SEED_TEACHER_EMAIL).first()
        if not teacher:
            teacher = User(
                email=settings.SEED_TEACHER_EMAIL,
                hashed_password=get_password_hash(settings.SEED_TEACHER_PASSWORD),
                full_name=settings.INITIAL_TEACHER_NAME,
                role=UserRole.TEACHER.value,
                is_active=True
            )
            db.add(teacher)
            db.commit()
            db.refresh(teacher)
            print(f"[+] Teacher user created: {settings.SEED_TEACHER_EMAIL} (Password: {settings.SEED_TEACHER_PASSWORD})")
        else:
            print(f"[-] Teacher user already exists: {settings.SEED_TEACHER_EMAIL}")

        # 3. Seed Batches (Assigned to the demo teacher)
        batch_data = [
            {
                "name": "Class 10 - Mathematics Morning",
                "subject": "Mathematics",
                "description": "Covers trigonometry, coordinate geometry, and quadratic equations.",
                "teacher_id": teacher.id
            },
            {
                "name": "Class 12 - Advanced Physics",
                "subject": "Physics",
                "description": "Mechanics, electromagnetism, and optics for board & entrance preparation.",
                "teacher_id": teacher.id
            },
            {
                "name": "Class 9 - Foundation Science",
                "subject": "Science",
                "description": "Integrated physics, chemistry, and biology fundamentals.",
                "teacher_id": teacher.id
            }
        ]

        created_batches = []
        for b_info in batch_data:
            existing_batch = db.query(Batch).filter(Batch.name == b_info["name"]).first()
            if not existing_batch:
                b = Batch(**b_info)
                db.add(b)
                db.commit()
                db.refresh(b)
                created_batches.append(b)
                print(f"[+] Batch created: {b.name} (Assigned to Teacher ID: {teacher.id})")
            else:
                if existing_batch.teacher_id is None:
                    existing_batch.teacher_id = teacher.id
                    db.commit()
                    db.refresh(existing_batch)
                created_batches.append(existing_batch)

        # 4. Seed Demo Students
        student_data = [
            {"roll_number": "STU-101", "full_name": "Aarav Sharma", "email": "aarav.sharma@example.com", "phone": "+91 9811100001"},
            {"roll_number": "STU-102", "full_name": "Diya Patel", "email": "diya.patel@example.com", "phone": "+91 9811100002"},
            {"roll_number": "STU-103", "full_name": "Rohan Verma", "email": "rohan.verma@example.com", "phone": "+91 9811100003"},
            {"roll_number": "STU-104", "full_name": "Ananya Gupta", "email": "ananya.gupta@example.com", "phone": "+91 9811100004"},
            {"roll_number": "STU-105", "full_name": "Kabir Singh", "email": "kabir.singh@example.com", "phone": "+91 9811100005"}
        ]

        created_students = []
        for s_info in student_data:
            existing_student = db.query(Student).filter(Student.roll_number == s_info["roll_number"]).first()
            if not existing_student:
                s = Student(**s_info)
                db.add(s)
                db.commit()
                db.refresh(s)
                created_students.append(s)
                print(f"[+] Student created: {s.roll_number} - {s.full_name}")
            else:
                created_students.append(existing_student)

        # 5. Enroll Students into Batches
        if created_batches and created_students:
            math_batch = created_batches[0]
            for stu in created_students[:3]:
                already_enrolled = db.query(Enrollment).filter(
                    Enrollment.batch_id == math_batch.id,
                    Enrollment.student_id == stu.id
                ).first()
                if not already_enrolled:
                    enrollment = Enrollment(batch_id=math_batch.id, student_id=stu.id)
                    db.add(enrollment)
            db.commit()
            print(f"[+] Enrolled {min(3, len(created_students))} students into '{math_batch.name}'")

        print("[✓] FaceMark database seeding completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"[!] Error seeding database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
