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

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
