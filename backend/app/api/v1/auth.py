from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserLogin, UserResponse
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/login", response_model=Token, summary="User Login (JSON)")
def login_json(
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
        "user_role": user.role,
        "user_name": user.full_name,
        "user_email": user.email,
    }


@router.post("/login/token", response_model=Token, summary="OAuth2 Form Login (Swagger Docs)")
def login_form(
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
        "user_role": user.role,
        "user_name": user.full_name,
        "user_email": user.email,
    }


@router.get("/me", response_model=UserResponse, summary="Get Current Authenticated User")
def get_authenticated_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Returns profile information for the currently authenticated user.
    """
    return current_user
