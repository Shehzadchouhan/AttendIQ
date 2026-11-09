import io
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from PIL import Image, ImageOps
from fastapi import HTTPException, status

from app.core.config import settings

# Supported file extensions for face recognition
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}


def validate_image_file(filename: str, content: bytes) -> Tuple[np.ndarray, int, int]:
    """
    Validates uploaded image file:
    1. Rejects non-jpg/png extensions.
    2. Rejects files larger than MAX_UPLOAD_MB.
    3. Rejects images exceeding MAX_IMAGE_MEGAPIXELS (prevents decompression bomb / DoS).
    4. Decodes image into RGB numpy array in memory (ZERO disk writes).
    """
    # 1. Extension check
    lower_filename = filename.lower()
    if not any(lower_filename.endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type for '{filename}'. Only JPG and PNG images are supported."
        )

    # 2. File size check
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File '{filename}' exceeds maximum allowed size of {settings.MAX_UPLOAD_MB}MB."
        )

    # 3. Read image, apply exif_transpose so phone photos are upright, convert to RGB
    try:
        pil_img = Image.open(io.BytesIO(content))
        # 1. Apply ImageOps.exif_transpose so phone photos are upright
        pil_img = ImageOps.exif_transpose(pil_img)
        # 2. Convert to RGB first
        pil_img = pil_img.convert("RGB")
        # 3. Measure dimensions of corrected upright image
        width, height = pil_img.size
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to decode image '{filename}'. File appears corrupted or invalid."
        )

    # Megapixel limit check (e.g. 40 Megapixels)
    megapixels = (width * height) / 1_000_000.0
    if megapixels > settings.MAX_IMAGE_MEGAPIXELS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image resolution ({width}x{height} = {megapixels:.1f}MP) exceeds maximum allowed limit of {settings.MAX_IMAGE_MEGAPIXELS} megapixels."
        )

    # Convert to RGB numpy array
    rgb_arr = np.array(pil_img)
    # Convert numpy array from RGB to BGR before passing it to InsightFace (OpenCV BGR order)
    bgr_arr = rgb_arr[:, :, ::-1].copy()

    return bgr_arr, width, height


def compute_cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """
    Viva Explanation:
    Cosine similarity measures the angular difference between two feature vectors in multi-dimensional space.
    Formula: cos(theta) = (A . B) / (||A|| * ||B||)

    Since all InsightFace embeddings are pre-normalized to unit vectors (||A|| = 1.0, ||B|| = 1.0),
    the denominator is 1.0, and cosine similarity simplifies directly to the vector dot product: np.dot(A, B).
    Values range from 0.0 (completely dissimilar) to 1.0 (identical facial features).
    """
    return float(np.dot(vec_a, vec_b))


class FaceEngine:
    """
    Singleton service wrapper around InsightFace FaceAnalysis.
    Loaded once at application startup to warm up model weights.
    """
    _instance: Optional["FaceEngine"] = None

    def __init__(self):
        self.app = None
        self.is_initialized = False

    @classmethod
    def get_instance(cls) -> "FaceEngine":
        if cls._instance is None:
            cls._instance = FaceEngine()
        return cls._instance

    def initialize(self):
        """
        Warm up and load the InsightFace model at application startup.
        Uses CPUExecutionProvider as requested.
        """
        if self.is_initialized:
            return

        try:
            import insightface
            from insightface.app import FaceAnalysis

            print(f"[*] Initializing InsightFace model '{settings.MODEL_NAME}' on CPU...")
            self.app = FaceAnalysis(
                name=settings.MODEL_NAME,
                providers=["CPUExecutionProvider"]
            )
            self.app.prepare(
                ctx_id=0,
                det_size=(settings.DETECTION_SIZE, settings.DETECTION_SIZE)
            )
            self.is_initialized = True
            print(f"[✓] InsightFace model '{settings.MODEL_NAME}' successfully loaded into memory.")
        except ImportError:
            print("[!] Warning: insightface is not installed. FaceEngine running in uninitialized/mock mode.")
        except Exception as e:
            print(f"[!] Error initializing InsightFace model: {e}")
            raise e

    def get_faces(
        self,
        image_bytes: bytes,
        filename: str = "upload.jpg",
        det_size: Optional[int] = None
    ) -> Tuple[List[Dict[str, Any]], int, int]:
        """
        Detects faces in memory and extracts L2-normalized 512-dimensional feature embeddings.
        Returns:
            faces: list of dicts with {bbox: [x1, y1, x2, y2], det_score: float, embedding: List[float]}
            image_width: int
            image_height: int
        """
        bgr_img, width, height = validate_image_file(filename, image_bytes)

        if not self.is_initialized:
            self.initialize()

        if self.app is None:
            raise RuntimeError("InsightFace model is not initialized.")

        # Dynamically switch detection resolution if requested (e.g. 1280 for recognition)
        target_det_size = det_size or settings.DETECTION_SIZE
        if hasattr(self.app, "det_model") and self.app.det_model is not None:
            self.app.det_model.det_size = (target_det_size, target_det_size)

        detected_objects = self.app.get(bgr_img)
        faces = []

        for face in detected_objects:
            raw_emb = face.embedding
            # L2 normalization to unit vector
            norm = np.linalg.norm(raw_emb)
            if norm > 0:
                normalized_emb = (raw_emb / norm).tolist()
            else:
                normalized_emb = raw_emb.tolist()

            bbox = [int(v) for v in face.bbox]
            det_score = float(face.det_score)

            faces.append({
                "bbox": bbox,
                "det_score": round(det_score, 4),
                "embedding": normalized_emb
            })

        return faces, width, height

    def match_faces_to_students(
        self,
        detected_faces: List[Dict[str, Any]],
        students_data: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], List[int]]:
        """
        Matches detected faces in a classroom photo against enrolled students.
        - Compares each detected face against ALL embeddings of a student, using the highest score.
        - Enforces ONE-STUDENT-ONE-FACE (each student is assigned at most once to the best matching face).
        - Assigns statuses:
            * 'matched' if score >= MATCH_THRESHOLD (0.45)
            * 'review'  if score >= REVIEW_THRESHOLD (0.35)
            * 'unknown' otherwise
        - Computes absent_student_ids for all enrolled students not matched.
        """
        num_faces = len(detected_faces)
        if num_faces == 0:
            all_student_ids = [s["id"] for s in students_data]
            return [], all_student_ids

        # Build candidate score matrix
        # candidate_scores: list of (similarity_score, face_index, student_id, student_name)
        candidate_matches = []
        best_score_per_face = [0.0] * num_faces

        for face_idx, face in enumerate(detected_faces):
            face_vec = np.array(face["embedding"], dtype=np.float32)

            for student in students_data:
                student_id = student["id"]
                student_name = student["name"]
                embeddings_list = student["embeddings"]  # List of float lists

                if not embeddings_list:
                    continue

                # Compare against ALL embeddings of this student; take the highest score
                student_scores = [
                    compute_cosine_similarity(face_vec, np.array(stored_emb, dtype=np.float32))
                    for stored_emb in embeddings_list
                ]
                max_student_score = max(student_scores) if student_scores else 0.0

                if max_student_score > best_score_per_face[face_idx]:
                    best_score_per_face[face_idx] = max_student_score

                candidate_matches.append((
                    max_student_score,
                    face_idx,
                    student_id,
                    student_name
                ))

        # Sort candidate matches in descending order of similarity score (greedy assignment)
        candidate_matches.sort(key=lambda x: x[0], reverse=True)

        assigned_faces = set()
        matched_students = set()
        face_results = [None] * num_faces

        for score, face_idx, student_id, student_name in candidate_matches:
            if face_idx in assigned_faces or student_id in matched_students:
                continue

            # Only assign if score meets at least the review threshold
            if score >= settings.REVIEW_THRESHOLD:
                status_label = "matched" if score >= settings.MATCH_THRESHOLD else "review"
                face_results[face_idx] = {
                    "bbox": detected_faces[face_idx]["bbox"],
                    "det_score": detected_faces[face_idx]["det_score"],
                    "student_id": student_id,
                    "student_name": student_name,
                    "score": round(score, 4),
                    "status": status_label
                }
                assigned_faces.add(face_idx)
                matched_students.add(student_id)

        # Populate unassigned faces as 'unknown'
        for face_idx in range(num_faces):
            if face_results[face_idx] is None:
                face_results[face_idx] = {
                    "bbox": detected_faces[face_idx]["bbox"],
                    "det_score": detected_faces[face_idx]["det_score"],
                    "student_id": None,
                    "student_name": None,
                    "score": round(best_score_per_face[face_idx], 4),
                    "status": "unknown"
                }

        # Identify absent students (all enrolled students not matched)
        absent_student_ids = [
            s["id"] for s in students_data
            if s["id"] not in matched_students
        ]

        return face_results, absent_student_ids


# Global singleton instance
face_engine = FaceEngine.get_instance()
