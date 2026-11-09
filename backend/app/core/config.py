from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """
    Application Settings configuration.
    Uses Pydantic BaseSettings to automatically read configuration from environment
    variables or fallback to defaults. This ensures typed, validated configurations.
    """
    PROJECT_NAME: str = "FaceMark Attendance API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database Configuration
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/facemark_db"

    # JWT Authentication Configuration
    # SECRET_KEY is used to cryptographically sign JWT tokens
    SECRET_KEY: str = "supersecretkeyforfacemarkphase1jwtsecurityreplaceinprod!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Seed User Credentials (Used by seed.py)
    SEED_ADMIN_EMAIL: str = "admin@facemark.local"
    SEED_ADMIN_PASSWORD: str = "admin123"
    INITIAL_ADMIN_NAME: str = "System Administrator"

    SEED_TEACHER_EMAIL: str = "teacher@facemark.local"
    SEED_TEACHER_PASSWORD: str = "teacher123"
    INITIAL_TEACHER_NAME: str = "Prof. Sharma"

    # Face Recognition & InsightFace Settings (Phase 2)
    MODEL_NAME: str = "buffalo_l"
    DETECTION_SIZE: int = 640                # Input size for student enrollment
    RECOGNITION_DET_SIZE: int = 1280         # Larger size for wide classroom photos
    MATCH_THRESHOLD: float = 0.45            # Cosine similarity >= 0.45 is 'matched'
    REVIEW_THRESHOLD: float = 0.35           # Cosine similarity >= 0.35 is 'review'
    MIN_FACE_WIDTH: int = 80                 # Minimum face width in pixels
    MIN_DET_SCORE: float = 0.6               # Minimum detection confidence
    MAX_UPLOAD_MB: int = 10                  # Max upload size in megabytes
    MAX_IMAGE_MEGAPIXELS: int = 40           # Max allowed megapixels (prevents DoS)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
