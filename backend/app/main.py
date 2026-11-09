from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
    ## FaceMark Backend API (Phase 1)
    
    A tuition center management & attendance backend system built with FastAPI, PostgreSQL, and SQLAlchemy.
    
    ### Features in Phase 1:
    * **Role-Based Access Control**: Admin and Teacher permissions via secure JWT Bearer tokens.
    * **Student Management**: Full CRUD operations with unique roll numbers.
    * **Batch & Enrollment Management**: Academic groups and student enrollments with cascade constraints.
    * **Phase 2 Ready**: Database schema ready for Face Embeddings and Attendance Sessions/Records.
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Configure Cross-Origin Resource Sharing (CORS)
# Allows the React + Vite frontend (running on localhost:5173 or container network)
# to make asynchronous HTTP requests to this backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, specify exact frontend domain(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)


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
