"""
Diagnostic script to inspect current database enrollment, face embeddings, and batches.
"""
from app.core.database import SessionLocal
from app.models.user import User
from app.models.batch import Batch, Enrollment
from app.models.student import Student, FaceEmbedding
from app.models.attendance import AttendanceSession, AttendanceRecord

def check():
    db = SessionLocal()
    try:
        print("=== 1. USERS ===")
        users = db.query(User).all()
        for u in users:
            print(f"ID: {u.id} | Email: {u.email} | Role: {u.role} | Name: {u.full_name}")

        print("\n=== 2. BATCHES ===")
        batches = db.query(Batch).all()
        for b in batches:
            enr_count = db.query(Enrollment).filter(Enrollment.batch_id == b.id).count()
            teacher_name = b.teacher.full_name if b.teacher else "None"
            print(f"Batch ID: {b.id} | Name: {b.name} | Teacher: {teacher_name} (ID: {b.teacher_id}) | Enrolled: {enr_count}")

        print("\n=== 3. STUDENTS & ENROLLED FACE EMBEDDINGS ===")
        students = db.query(Student).all()
        for s in students:
            emb_count = db.query(FaceEmbedding).filter(FaceEmbedding.student_id == s.id).count()
            enrolled_batches = [enr.batch.name for enr in s.enrollments]
            print(f"Student ID: {s.id} | Roll: {s.roll_number} | Name: {s.full_name} | Consent: {s.consent_given} | Enrolled Face Embeddings: {emb_count} | Batches: {enrolled_batches}")

        print("\n=== 4. RECENT ATTENDANCE SESSIONS ===")
        sessions = db.query(AttendanceSession).all()
        for sess in sessions:
            recs = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == sess.id).count()
            print(f"Session ID: {sess.id} | Batch ID: {sess.batch_id} | Date: {sess.session_date} | Status: {sess.status} | Unrecognized: {sess.unrecognized_count} | Records: {recs}")

    finally:
        db.close()

if __name__ == "__main__":
    check()
