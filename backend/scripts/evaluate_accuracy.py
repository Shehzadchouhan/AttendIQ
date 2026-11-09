"""
FaceMark Accuracy Evaluation Script (Phase 2 Report & Viva Reference)

Evaluates face recognition precision, recall, and F1-score across similarity thresholds.

Layout expected:
  enroll-dir/
    <student_id>/
      photo1.jpg
      photo2.jpg
  test-dir/
    class_photo_1.jpg
    class_photo_2.jpg
    ground_truth.csv  (columns: photo,student_id)

Usage:
  python scripts/evaluate_accuracy.py --enroll-dir path/to/enroll --test-dir path/to/test
"""

import os
import sys
import csv
import argparse
from pathlib import Path
from collections import defaultdict
import numpy as np

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.services.face_engine import face_engine, compute_cosine_similarity


def load_enrolled_embeddings(enroll_dir: Path):
    """
    Reads enrollment portraits from enroll_dir/<student_id>/*.jpg
    Returns: dict of student_id -> list of normalized embeddings
    """
    print(f"[*] Loading enrollment portraits from: {enroll_dir}")
    student_embeddings = {}

    for student_folder in sorted(enroll_dir.iterdir()):
        if not student_folder.is_dir():
            continue

        try:
            student_id = int(student_folder.name)
        except ValueError:
            print(f"[-] Skipping non-integer directory name: {student_folder.name}")
            continue

        embeddings_list = []
        image_files = [
            f for f in student_folder.iterdir()
            if f.suffix.lower() in [".jpg", ".jpeg", ".png"]
        ]

        for img_path in image_files:
            try:
                with open(img_path, "rb") as f:
                    content = f.read()
                faces, _, _ = face_engine.get_faces(
                    content,
                    filename=img_path.name,
                    det_size=settings.DETECTION_SIZE
                )
                if len(faces) == 1:
                    embeddings_list.append(faces[0]["embedding"])
                elif len(faces) == 0:
                    print(f"    [!] Warning: No face detected in {img_path.name} for student {student_id}")
                else:
                    print(f"    [!] Warning: Multiple faces ({len(faces)}) in {img_path.name} for student {student_id}")
            except Exception as e:
                print(f"    [!] Error reading {img_path.name}: {e}")

        if embeddings_list:
            student_embeddings[student_id] = embeddings_list
            print(f"    [+] Student {student_id}: Enrolled {len(embeddings_list)} face embedding(s)")
        else:
            print(f"    [!] Student {student_id}: No valid embeddings enrolled!")

    return student_embeddings


def load_ground_truth(gt_csv_path: Path):
    """
    Reads ground_truth.csv with columns: photo,student_id
    Returns: dict of photo_filename -> set of present student_ids
    """
    print(f"[*] Loading ground truth annotations from: {gt_csv_path}")
    ground_truth = defaultdict(set)

    with open(gt_csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            photo = row["photo"].strip()
            student_id = int(row["student_id"].strip())
            ground_truth[photo].add(student_id)

    print(f"    [✓] Loaded ground truth for {len(ground_truth)} photos.")
    return ground_truth


def evaluate(enroll_dir: Path, test_dir: Path, thresholds: list):
    """
    Runs recognition across test classroom photos and evaluates accuracy metrics across threshold sweep.
    """
    # 1. Warm up face recognition engine
    face_engine.initialize()

    # 2. Extract enrollment features
    student_embeddings = load_enrolled_embeddings(enroll_dir)
    if not student_embeddings:
        print("[!] Error: No student embeddings could be loaded. Exiting.")
        return

    # 3. Read ground truth
    gt_csv = test_dir / "ground_truth.csv"
    if not gt_csv.exists():
        print(f"[!] Error: Ground truth CSV not found at {gt_csv}")
        return

    ground_truth = load_ground_truth(gt_csv)

    # 4. Process test images
    test_photos = [
        f for f in test_dir.iterdir()
        if f.suffix.lower() in [".jpg", ".jpeg", ".png"]
    ]

    print(f"\n[*] Processing {len(test_photos)} test classroom photo(s)...")

    # Store detection and similarity matrix per test photo
    # photo_detections: list of dicts with detected faces and student similarity scores
    processed_photos = []

    for photo_path in test_photos:
        filename = photo_path.name
        expected_ids = ground_truth.get(filename, set())

        with open(photo_path, "rb") as f:
            content = f.read()

        detected_faces, _, _ = face_engine.get_faces(
            content,
            filename=filename,
            det_size=settings.RECOGNITION_DET_SIZE
        )

        # Precompute similarity scores against all enrolled students
        # For each face, for each student: take maximum similarity across all student embeddings
        face_student_similarities = []
        for face in detected_faces:
            face_vec = np.array(face["embedding"], dtype=np.float32)
            similarities = {}
            for s_id, emb_list in student_embeddings.items():
                scores = [compute_cosine_similarity(face_vec, np.array(e, dtype=np.float32)) for e in emb_list]
                similarities[s_id] = max(scores) if scores else 0.0
            face_student_similarities.append(similarities)

        processed_photos.append({
            "filename": filename,
            "expected_ids": expected_ids,
            "detected_faces": detected_faces,
            "similarities": face_student_similarities
        })

    # 5. Evaluate metrics across each threshold
    print("\n=========================================================================================")
    print("                      FACEMARK RECOGNITION BENCHMARK REPORT                              ")
    print("=========================================================================================")
    header = f"{'Threshold':<11} | {'True Pos (TP)':<13} | {'False Pos (FP)':<14} | {'False Neg (FN)':<14} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10}"
    print(header)
    print("-" * len(header))

    results_table = []

    for th in thresholds:
        total_tp = 0
        total_fp = 0
        total_fn = 0

        for photo in processed_photos:
            expected_ids = set(photo["expected_ids"])
            num_faces = len(photo["detected_faces"])

            # Greedy assignment: sort (score, face_idx, student_id)
            candidates = []
            for f_idx in range(num_faces):
                for s_id, score in photo["similarities"][f_idx].items():
                    if score >= th:
                        candidates.append((score, f_idx, s_id))

            candidates.sort(key=lambda x: x[0], reverse=True)

            assigned_faces = set()
            assigned_students = set()

            for score, f_idx, s_id in candidates:
                if f_idx in assigned_faces or s_id in assigned_students:
                    continue
                assigned_faces.add(f_idx)
                assigned_students.add(s_id)

                if s_id in expected_ids:
                    total_tp += 1
                else:
                    total_fp += 1

            # Any expected student that was NOT assigned is a False Negative
            for s_id in expected_ids:
                if s_id not in assigned_students:
                    total_fn += 1

        precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0.0
        recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

        results_table.append((th, total_tp, total_fp, total_fn, precision, recall, f1))
        print(f"{th:<11.2f} | {total_tp:<13} | {total_fp:<14} | {total_fn:<14} | {precision:<10.3f} | {recall:<10.3f} | {f1:<10.3f}")

    print("=========================================================================================\n")
    print("[*] Optimal threshold is typically where F1-score is maximized (balanced precision and recall).")


def main():
    parser = argparse.ArgumentParser(
        description="FaceMark Accuracy & Threshold Sweep Evaluation Tool"
    )
    parser.add_argument(
        "--enroll-dir",
        type=str,
        required=True,
        help="Path to folder containing student enrollment photos: <enroll-dir>/<student_id>/*.jpg"
    )
    parser.add_argument(
        "--test-dir",
        type=str,
        required=True,
        help="Path to folder containing classroom test photos and ground_truth.csv"
    )
    parser.add_argument(
        "--thresholds",
        type=str,
        default="0.30,0.35,0.40,0.45,0.50,0.55,0.60",
        help="Comma-separated cosine similarity thresholds to sweep (default: 0.30 to 0.60)"
    )

    args = parser.parse_args()
    enroll_path = Path(args.enroll_dir)
    test_path = Path(args.test_dir)
    thresholds = [float(t.strip()) for t in args.thresholds.split(",") if t.strip()]

    evaluate(enroll_path, test_path, thresholds)


if __name__ == "__main__":
    main()
