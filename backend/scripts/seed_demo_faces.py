"""
Seed Demo Face Biometrics into FaceMark Database
Extracts 512-d embeddings from test_photos/person_1..5 and enrolls them
for students STU-101..105, ensuring they are enrolled in the demo batches.
"""
import sys
from pathlib import Path
from datetime import datetime, timezone

# Add backend to path
sys.path.insert(0, "/app")

from app.core.database import SessionLocal
from app.models.batch import Batch, Enrollment
from app.models.student import Student, FaceEmbedding
from app.services.face_engine import face_engine

def seed_faces():
    db = SessionLocal()
    try:
        print("[*] Initializing FaceEngine model...")
        face_engine.initialize()

        # Find test_photos directory
        base_dir = Path("/app/test_photos")
        if not base_dir.exists():
            base_dir = Path("test_photos")
        if not base_dir.exists():
            base_dir = Path("../test_photos")

        print(f"[*] Reading portraits from: {base_dir.resolve()}")
        if not base_dir.exists():
            print(f"[!] Directory not found: {base_dir}")
            return

        # Ensure demo batches exist
        batches = db.query(Batch).all()
        if not batches:
            print("[!] No batches found. Run python seed.py first.")
            return

        primary_batch = batches[0]
        print(f"[*] Target batch for enrollment: '{primary_batch.name}' (ID: {primary_batch.id})")

        # Map person_1..5 to student roll numbers STU-101..105
        person_map = {
            "person_1": ("STU-101", "Aarav Sharma"),
            "person_2": ("STU-102", "Diya Patel"),
            "person_3": ("STU-103", "Rohan Verma"),
            "person_4": ("STU-104", "Ananya Gupta"),
            "person_5": ("STU-105", "Kabir Singh"),
        }

        total_enrolled = 0

        for folder_name, (roll, name) in person_map.items():
            folder_path = base_dir / folder_name
            if not folder_path.exists():
                print(f"[-] Folder {folder_name} not found, skipping.")
                continue

            # 1. Fetch or create student
            student = db.query(Student).filter(Student.roll_number == roll).first()
            if not student:
                student = Student(
                    roll_number=roll,
                    full_name=name,
                    consent_given=True,
                    consent_at=datetime.now(timezone.utc),
                    is_active=True
                )
                db.add(student)
                db.commit()
                db.refresh(student)
                print(f"[+] Created student: {roll} - {name}")
            else:
                student.consent_given = True
                student.consent_at = datetime.now(timezone.utc)
                db.commit()

            # 2. Ensure student is enrolled in primary batch
            already_enrolled = db.query(Enrollment).filter(
                Enrollment.batch_id == primary_batch.id,
                Enrollment.student_id == student.id
            ).first()
            if not already_enrolled:
                db.add(Enrollment(batch_id=primary_batch.id, student_id=student.id))
                db.commit()
                print(f"[+] Enrolled {name} ({roll}) into '{primary_batch.name}'")

            # 3. Clear old embeddings for clean re-seed
            db.query(FaceEmbedding).filter(FaceEmbedding.student_id == student.id).delete()
            db.commit()

            # 4. Extract embeddings from portrait photos
            img_files = list(folder_path.glob("*.png")) + list(folder_path.glob("*.jpg"))
            student_embeddings_count = 0

            for img_file in img_files:
                content = img_file.read_bytes()
                faces, w, h = face_engine.get_faces(content, filename=img_file.name, det_size=640)
                if len(faces) >= 1:
                    # Choose the most prominent/largest face in the portrait
                    best_face = max(faces, key=lambda f: (f["bbox"][2] - f["bbox"][0]) * (f["bbox"][3] - f["bbox"][1]))
                    emb = best_face["embedding"]
                    db.add(FaceEmbedding(student_id=student.id, embedding_data=emb))
                    student_embeddings_count += 1
                    total_enrolled += 1
                else:
                    print(f"  [!] {folder_name}/{img_file.name}: no face detected")

            db.commit()
            print(f"[✓] {name} ({roll}): successfully enrolled {student_embeddings_count} face embeddings.")

        print(f"\n[★] Total Face Biometrics Enrolled: {total_enrolled} embeddings across 5 students.")
        print(f"[★] All 5 students are actively enrolled in '{primary_batch.name}'!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_faces()
