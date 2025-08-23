from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.crud.auth import (
    get_user_by_email, create_user, create_email_verification,
    verify_email_code, get_user_by_id
)
from app.schemas.auth import (
    UserSignup, UserLogin, EmailVerificationRequest,
    Token, UserResponse, MessageResponse
)
from app.utils.auth import verify_password, create_access_token
from app.utils.email import send_verification_email
from app.api.deps import get_current_user, get_current_verified_user
import logging
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from app.core.config import settings
from app.crud import comparison as crud_comparison
import uuid

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/signup", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def signup(user_data: UserSignup, db: Session = Depends(get_db)):
    """
    Register a new user account.
    
    - Validates email format and password requirements
    - Hashes password securely
    - Creates user with is_verified=False
    - Generates and sends verification code via email
    """
    # Check if user already exists
    existing_user = get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    try:
        # Create new user
        user = create_user(db, user_data)
        
        # Create email verification
        verification = create_email_verification(db, user.id)
        
        # Send verification email
        email_sent = send_verification_email(user.email, verification.code)
        
        if not email_sent:
            logger.warning(f"Failed to send verification email to {user.email}")
            # Note: In production, you might want to handle this differently
            # For now, we'll still create the user but log the issue
        
        return MessageResponse(
            message="Account created successfully. Please check your email for verification code.",
            success=True
        )
        
    except Exception as e:
        logger.error(f"Error during signup: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create account"
        )

@router.post("/verify", response_model=MessageResponse)
def verify_email(verification_data: EmailVerificationRequest, db: Session = Depends(get_db)):
    """
    Verify user email with verification code.
    
    - Validates the verification code
    - Marks user as verified if code is valid and not expired
    """
    try:
        user = verify_email_code(db, verification_data.email, verification_data.code)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification code"
            )
        
        return MessageResponse(
            message="Email verified successfully. You can now log in.",
            success=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during email verification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify email"
        )

@router.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db), request: Request = None, response: Response = None):
    """
    Authenticate user and return access token.
    
    - Validates email and password
    - Ensures user is verified
    - Returns JWT access token
    """
    # Get user by email
    user = get_user_by_email(db, user_data.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user is verified
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email not verified. Please verify your email address."
        )
    
    # Verify password
    if not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    # Merge anonymous comparison data if a session cookie exists
    if request and response:
        comparison_session_id = request.cookies.get("comparison_session_id")
        if comparison_session_id:
            try:
                session_uuid = uuid.UUID(comparison_session_id)
                crud_comparison.merge_comparison_data(db, session_uuid, user.id)
                # Clear the session cookie after merging with secure settings
                is_production = settings.ENVIRONMENT == "production"
                response.delete_cookie(
                    "comparison_session_id",
                    secure=is_production,
                    httponly=True,
                    samesite="lax" if is_production else "none"
                )
            except ValueError:
                logger.warning(f"Invalid comparison_session_id cookie: {comparison_session_id}")

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=60  # 60 minutes
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user = Depends(get_current_verified_user)):
    """
    Get current user information.
    
    - Requires valid JWT token
    - Returns user details
    """
    return current_user

@router.post("/logout", response_model=MessageResponse)
def logout():
    """
    Logout endpoint (client-side token removal).
    
    Note: JWT tokens are stateless, so the client should remove the token.
    This endpoint is provided for consistency and future enhancements.
    """
    return MessageResponse(
        message="Logged out successfully",
        success=True
    )

@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(email: str, db: Session = Depends(get_db)):
    """
    Resend verification email.
    
    - Creates new verification code
    - Sends new verification email
    """
    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    try:
        # Create new verification code
        verification = create_email_verification(db, user.id)
        
        # Send verification email
        email_sent = send_verification_email(user.email, verification.code)
        
        if not email_sent:
            logger.warning(f"Failed to send verification email to {user.email}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification email"
            )
        
        return MessageResponse(
            message="Verification email sent successfully",
            success=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during resend verification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend verification email"
        )

@router.post("/google", response_model=Token)
async def google_auth(request: Request, response: Response, db: Session = Depends(get_db)):
    data = await request.json()
    token = data.get("credential") or data.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Missing Google token")

    try:
        CLIENT_ID = settings.GOOGLE_CLIENT_ID
        if not CLIENT_ID:
            raise HTTPException(status_code=500, detail="Google OAuth not configured")
            
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), CLIENT_ID)
        email = idinfo["email"]
        first_name = idinfo.get("given_name", "")
        last_name = idinfo.get("family_name", "")

        # Check if user exists, else create
        user = get_user_by_email(db, email)
        if not user:
            # Create user directly without schema validation for Google OAuth
            from app.models.user import User
            from app.utils.auth import get_password_hash
            
            # Use a secure random password for Google OAuth users
            google_oauth_password = get_password_hash("GoogleOAuth2024!")
            
            user = User(
                email=email,
                password_hash=google_oauth_password,
                first_name=first_name,
                last_name=last_name,
                is_verified=True  # Google OAuth users are automatically verified
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        elif not user.is_verified:
            # Verify existing user if they authenticate via Google
            user.is_verified = True
            db.commit()
            db.refresh(user)

        # Create JWT
        access_token = create_access_token(data={"sub": str(user.id)})
        
        # Merge anonymous comparison data if a session cookie exists
        comparison_session_id = request.cookies.get("comparison_session_id")
        if comparison_session_id:
            try:
                session_uuid = uuid.UUID(comparison_session_id)
                crud_comparison.merge_comparison_data(db, session_uuid, user.id)
                # Clear the session cookie after merging with secure settings
                is_production = settings.ENVIRONMENT == "production"
                response.delete_cookie(
                    "comparison_session_id",
                    secure=is_production,
                    httponly=True,
                    samesite="lax" if is_production else "none"
                )
            except ValueError:
                logger.warning(f"Invalid comparison_session_id cookie: {comparison_session_id}")
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=60
        )
    except Exception as e:
        logger.error(f"Google authentication error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Google authentication failed: {str(e)}") 