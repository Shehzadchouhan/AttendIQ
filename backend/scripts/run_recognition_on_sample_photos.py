"""
Test face detection and cosine similarity between person_1..5 portraits and group_photos.
"""
import os
import sys
from pathlib import Path
import numpy as np

# Add backend to path
sys.path.insert(0, "/app")

from app.services.face_engine import face_engine, compute_cosine_similarity
from app.core.config import settings

def test_photos():
    face_engine.initialize()

    base_dir = Path("/app/test_photos")
    if not base_dir.exists():
        base_dir = Path("test_photos")

    print(f"[*] Checking test_photos directory at: {base_dir.resolve()}")
    if not base_dir.exists():
        print(f"[!] Directory not found: {base_dir}")
        return

    # 1. Detect faces in portraits for person_1 .. person_5
    enrolled_persons = {}
    for person_dir in sorted(base_dir.iterdir()):
        if person_dir.is_dir() and person_dir.name.startswith("person_"):
            person_name = person_dir.name
            embeddings = []
            for img_file in person_dir.glob("*.png"):
                content = img_file.read_bytes()
                faces, w, h = face_engine.get_faces(content, filename=img_file.name, det_size=640)
                print(f"  Portrait {person_name}/{img_file.name} ({w}x{h}): detected {len(faces)} face(s)")
                for f in faces:
                    embeddings.append(f["embedding"])
            enrolled_persons[person_name] = embeddings
            print(f"[+] {person_name}: extracted {len(embeddings)} reference embedding(s)")

    # 2. Test group photos
    group_dir = base_dir / "group_photos"
    if not group_dir.exists():
        print("[!] No group_photos directory found.")
        return

    for group_img in sorted(group_dir.glob("*.png")):
        content = group_img.read_bytes()
        faces, w, h = face_engine.get_faces(content, filename=group_img.name, det_size=1280)
        print(f"\n=======================================================")
        print(f"[*] Group Photo: {group_img.name} ({w}x{h}) - detected {len(faces)} face(s)")
        print(f"=======================================================")

        for idx, face in enumerate(faces):
            f_vec = np.array(face["embedding"], dtype=np.float32)
            bbox = face["bbox"]
            det_score = face["det_score"]

            # Compare against each enrolled person
            best_person = None
            best_score = -1.0
            for person_name, emb_list in enrolled_persons.items():
                scores = [compute_cosine_similarity(f_vec, np.array(e, dtype=np.float32)) for e in emb_list]
                max_s = max(scores) if scores else 0.0
                if max_s > best_score:
                    best_score = max_s
                    best_person = person_name

            status = "matched" if best_score >= settings.MATCH_THRESHOLD else ("review" if best_score >= settings.REVIEW_THRESHOLD else "unknown")
            print(f"  Face #{idx+1} bbox={bbox} det_score={det_score:.3f} -> Best Match: {best_person} (Score: {best_score:.4f}) => STATUS: {status}")

if __name__ == "__main__":
    test_photos()
