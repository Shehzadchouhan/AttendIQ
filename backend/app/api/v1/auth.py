from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.user import User, UserRole
from app.schemas.token import Token
from app.schemas.user import UserLogin, UserResponse, TutorRegisterRequest
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED, summary="Self-Service Tutor Registration")
def register_tutor(
    payload: TutorRegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Open Multi-Tutor Registration:
    Enables any tuition teacher in India to create their private coaching workspace.
    Guarantees private batches, students, biometrics, and parent alert channels.
    """
    clean_email = payload.email.lower().strip()
    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{payload.email}' already exists. Please sign in."
        )

    new_tutor = User(
        email=clean_email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name.strip(),
        institution_name=payload.institution_name.strip() if payload.institution_name else None,
        phone=payload.phone.strip() if payload.phone else None,
        role=UserRole.TEACHER.value,
        is_active=True
    )
    db.add(new_tutor)
    db.commit()
    db.refresh(new_tutor)

    access_token = create_access_token(
        data={
            "sub": new_tutor.email,
            "role": new_tutor.role,
            "user_id": new_tutor.id
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": new_tutor.id,
        "user_role": new_tutor.role,
        "user_name": new_tutor.full_name,
        "user_email": new_tutor.email,
        "institution_name": new_tutor.institution_name,
    }


@router.post("/login", response_model=Token, summary="User Login (JSON)")
@limiter.limit(settings.RATE_LIMIT_LOGIN)
def login_json(
    request: Request,
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Authenticate user via JSON body (used by React Frontend).
    Verifies email and bcrypt password hash, then issues a JWT access token.
    """
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is inactive"
        )

    # Embed user role and subject (email) into token claims
    access_token = create_access_token(
        data={
            "sub": user.email,
            "role": user.role,
            "user_id": user.id
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "user_role": user.role,
        "user_name": user.full_name,
        "user_email": user.email,
        "institution_name": user.institution_name,
    }


@router.post("/login/token", response_model=Token, summary="OAuth2 Form Login (Swagger Docs)")
@limiter.limit(settings.RATE_LIMIT_LOGIN)
def login_form(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Standard OAuth2 password form login.
    Allows the interactive Swagger UI 'Authorize' button to authenticate seamlessly.
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is inactive"
        )

    access_token = create_access_token(
        data={
            "sub": user.email,
            "role": user.role,
            "user_id": user.id
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "user_role": user.role,
        "user_name": user.full_name,
        "user_email": user.email,
        "institution_name": user.institution_name,
    }


@router.get("/me", response_model=UserResponse, summary="Get Current Authenticated User")
def get_authenticated_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Returns profile information for the currently authenticated user.
    """
    return current_user
