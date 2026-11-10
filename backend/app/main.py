from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.limiter import limiter, HAS_SLOWAPI, RateLimitExceeded, _rate_limit_exceeded_handler
from app.api.v1 import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
    ## FaceMark Backend API (Phase 1, 2, 3 & 4)
    
    A tuition center management & attendance backend system built with FastAPI, PostgreSQL, and SQLAlchemy.
    
    ### Features:
    * **Role-Based Access Control**: Admin and Teacher permissions via secure JWT Bearer tokens.
    * **Student & Batch Management**: Full CRUD operations with cascade constraints and roll numbers.
    * **Biometric Face Engine**: Zero-raw-photo storage face recognition pipeline powered by InsightFace.
    * **Attendance Review & Reports**: Interactive review flow, duplicate date protection, Recharts data, and CSV export.
    * **DevOps & Security Hardening**: Rate limiting, dynamic CORS, multi-stage production containerization.
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Attach rate limiter to app state and register 429 handler if slowapi is installed
if HAS_SLOWAPI and RateLimitExceeded and _rate_limit_exceeded_handler:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure Cross-Origin Resource Sharing (CORS) dynamically from settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.on_event("startup")
def startup_event():
    """
    Application startup event handler:
    1. Validates production security credentials (passwords, secret keys).
    2. Pre-loads (warms up) the InsightFace recognition model weights into memory on startup
       to prevent cold-start latency on the first request.
    """
    settings.validate_production_security()
    from app.services.face_engine import face_engine
    face_engine.initialize()


@app.get("/health", tags=["Health"])
def health_check():
    """
    Service health check endpoint to confirm backend is operational.
    """
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }


@app.get("/", tags=["Root"])
def root():
    """
    Root endpoint redirect/greeting.
    """
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs": "/docs",
        "health": "/health"
    }
