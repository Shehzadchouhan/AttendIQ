from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.students import router as students_router
from app.api.v1.batches import router as batches_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(students_router, prefix="/students", tags=["Students"])
api_router.include_router(batches_router, prefix="/batches", tags=["Batches & Enrollments"])
