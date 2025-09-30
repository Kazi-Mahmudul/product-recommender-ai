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
    - Checks and updates admin status based on email
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
    
    # Check if user should have admin status based on email
    from app.core.config import settings
    is_admin = user.email in settings.admin_emails_list
    
    # Update admin status in database if needed
    if user.is_admin != is_admin:
        user.is_admin = is_admin
        db.commit()
        db.refresh(user)
    
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
    try:
        # Parse request data
        data = await request.json()
        token = data.get("credential") or data.get("token")
        if not token:
            raise HTTPException(status_code=400, detail="Missing Google token")

        # Validate Google OAuth configuration
        CLIENT_ID = settings.GOOGLE_CLIENT_ID
        if not CLIENT_ID or CLIENT_ID.strip() == "":
            logger.error("Google OAuth is not configured: GOOGLE_CLIENT_ID is missing")
            raise HTTPException(
                status_code=500, 
                detail="Google OAuth is not properly configured on the server. Please contact the administrator."
            )
            
        # Verify the Google token
        try:
            logger.info(f"Attempting to verify Google token: {token[:30]}...") # Log first 30 chars
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), CLIENT_ID)
            logger.info("Google token verified successfully")
        except ValueError as e:
            logger.error(f"Google token verification failed: {str(e)}")
            if "Invalid Value" in str(e) or "Wrong recipient" in str(e):
                raise HTTPException(
                    status_code=400, 
                    detail="Invalid Google token. This may be due to incorrect client ID configuration or unauthorized origin."
                )
            else:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Google token verification failed: {str(e)}"
                )
        
        # Extract user information from the token
        email = idinfo.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Email not found in Google token")
        
        first_name = idinfo.get("given_name", "")
        last_name = idinfo.get("family_name", "")
        
        # Validate email format
        if "@" not in email:
            raise HTTPException(status_code=400, detail="Invalid email format from Google")

        # Check if user exists, else create
        user = get_user_by_email(db, email)
        if not user:
            # Create user directly without schema validation for Google OAuth
            from app.models.user import User
            from app.utils.auth import get_password_hash
            
            # Use a secure random password for Google OAuth users
            google_oauth_password = get_password_hash("GoogleOAuth2024!")
            
            # Check if user should have admin status based on email
            from app.core.config import settings
            is_admin = email in settings.admin_emails_list

            user = User(
                email=email,
                password_hash=google_oauth_password,
                first_name=first_name,
                last_name=last_name,
                is_verified=True,  # Google OAuth users are automatically verified
                is_admin=is_admin
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        elif not user.is_verified:
            # Verify existing user if they authenticate via Google
            user.is_verified = True
            # Check if user should have admin status based on email
            from app.core.config import settings
            user.is_admin = user.email in settings.admin_emails_list
            db.commit()
            db.refresh(user)
        else:
            # Update admin status if needed
            from app.core.config import settings
            if user.is_admin != (user.email in settings.admin_emails_list):
                user.is_admin = user.email in settings.admin_emails_list
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
    except HTTPException:
        # Re-raise HTTP exceptions as they are
        raise
    except Exception as e:
        logger.error(f"Unexpected error during Google authentication: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="An unexpected error occurred during Google authentication. Please try again later."
        )


# Server-side OAuth flow endpoints
@router.get("/google/login")
async def google_login():
    """
    Initiates Google OAuth flow by redirecting to Google's OAuth endpoint.
    This endpoint is called from the frontend to start the OAuth process.
    """
    from urllib.parse import urlencode
    import secrets
    
    # Generate a state parameter to prevent CSRF
    state = secrets.token_urlsafe(32)
    
    # Google OAuth URL - adjust scopes as needed
    # Using the path that matches your Google Cloud Console configuration
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.GOOGLE_REDIRECT_URI or 'https://peyechi.com/auth/google/callback'}"
        f"&response_type=code"
        f"&scope=openid email profile"
        f"&state={state}"
    )
    
    return {"auth_url": google_auth_url, "state": state}


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str,
    state: str = None,
    db: Session = Depends(get_db),
    response: Response = None
):
    """
    Callback endpoint for Google OAuth. Google redirects here after authentication.
    This endpoint exchanges the authorization code for an access token and user info.
    """
    import requests
    import json
    
    # Exchange the authorization code for access token
    token_url = "https://oauth2.googleapis.com/token"
    
    token_data = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": settings.GOOGLE_REDIRECT_URI or "https://peyechi.com/auth/google/callback"
    }
    
    token_response = requests.post(token_url, data=token_data)
    
    if token_response.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to exchange authorization code for access token: {token_response.text}"
        )
    
    token_json = token_response.json()
    access_token = token_json.get("access_token")
    
    if not access_token:
        raise HTTPException(
            status_code=400,
            detail="Access token not found in Google response"
        )
    
    # Get user info from Google
    user_info_response = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    if user_info_response.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail="Failed to get user info from Google"
        )
    
    user_info = user_info_response.json()
    
    # Extract user information
    email = user_info.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email not found in Google response")
    
    first_name = user_info.get("given_name", "")
    last_name = user_info.get("family_name", "")
    
    # Check if user exists, else create
    user = get_user_by_email(db, email)
    if not user:
        from app.models.user import User
        from app.utils.auth import get_password_hash
        
        # Use a secure random password for Google OAuth users
        google_oauth_password = get_password_hash("GoogleOAuth2024!")
        
        # Check if user should have admin status based on email
        is_admin = email in settings.admin_emails_list

        user = User(
            email=email,
            password_hash=google_oauth_password,
            first_name=first_name,
            last_name=last_name,
            is_verified=True,  # Google OAuth users are automatically verified
            is_admin=is_admin
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not user.is_verified:
        # Verify existing user if they authenticate via Google
        user.is_verified = True
        # Check if user should have admin status based on email
        user.is_admin = user.email in settings.admin_emails_list
        db.commit()
        db.refresh(user)
    else:
        # Update admin status if needed
        if user.is_admin != (user.email in settings.admin_emails_list):
            user.is_admin = user.email in settings.admin_emails_list
            db.commit()
            db.refresh(user)

    # Create JWT
    access_token_jwt = create_access_token(data={"sub": str(user.id)})
    
    # For the server-side flow, we can set the token in a cookie
    # or redirect to the frontend with the token as a query parameter
    from fastapi.responses import RedirectResponse
    frontend_url = os.getenv("FRONTEND_URL", "https://peyechi.com")
    
    # Set the token in a secure cookie
    is_production = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key="auth_token",
        value=access_token_jwt,
        httponly=True,
        secure=is_production,
        samesite="lax" if is_production else "none",
        max_age=3600  # 1 hour
    )
    
    # Redirect to frontend success page
    redirect_url = f"{frontend_url}/auth/success"
    return RedirectResponse(url=redirect_url)


# Alternative callback endpoint to match Google Cloud Console configuration
@router.get("/auth/google/callback")
async def google_auth_callback(
    request: Request,
    code: str,
    state: str = None,
    db: Session = Depends(get_db),
    response: Response = None
):
    """
    Alternative callback endpoint to match Google Cloud Console configuration.
    This endpoint has the exact path registered in Google Cloud Console.
    """
    import requests
    import json
    
    # Exchange the authorization code for access token
    token_url = "https://oauth2.googleapis.com/token"
    
    token_data = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": settings.GOOGLE_REDIRECT_URI or "https://peyechi.com/auth/google/callback"
    }
    
    token_response = requests.post(token_url, data=token_data)
    
    if token_response.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to exchange authorization code for access token: {token_response.text}"
        )
    
    token_json = token_response.json()
    access_token = token_json.get("access_token")
    
    if not access_token:
        raise HTTPException(
            status_code=400,
            detail="Access token not found in Google response"
        )
    
    # Get user info from Google
    user_info_response = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    if user_info_response.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail="Failed to get user info from Google"
        )
    
    user_info = user_info_response.json()
    
    # Extract user information
    email = user_info.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email not found in Google response")
    
    first_name = user_info.get("given_name", "")
    last_name = user_info.get("family_name", "")
    
    # Check if user exists, else create
    user = get_user_by_email(db, email)
    if not user:
        from app.models.user import User
        from app.utils.auth import get_password_hash
        
        # Use a secure random password for Google OAuth users
        google_oauth_password = get_password_hash("GoogleOAuth2024!")
        
        # Check if user should have admin status based on email
        is_admin = email in settings.admin_emails_list

        user = User(
            email=email,
            password_hash=google_oauth_password,
            first_name=first_name,
            last_name=last_name,
            is_verified=True,  # Google OAuth users are automatically verified
            is_admin=is_admin
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not user.is_verified:
        # Verify existing user if they authenticate via Google
        user.is_verified = True
        # Check if user should have admin status based on email
        user.is_admin = user.email in settings.admin_emails_list
        db.commit()
        db.refresh(user)
    else:
        # Update admin status if needed
        if user.is_admin != (user.email in settings.admin_emails_list):
            user.is_admin = user.email in settings.admin_emails_list
            db.commit()
            db.refresh(user)

    # Create JWT
    access_token_jwt = create_access_token(data={"sub": str(user.id)})
    
    # Set the token in a secure cookie
    from fastapi.responses import RedirectResponse
    is_production = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key="auth_token",
        value=access_token_jwt,
        httponly=True,
        secure=is_production,
        samesite="lax" if is_production else "none",
        max_age=3600  # 1 hour
    )
    
    # Redirect to frontend success page
    frontend_url = os.getenv("FRONTEND_URL", "https://peyechi.com")
    redirect_url = f"{frontend_url}/auth/success"
    return RedirectResponse(url=redirect_url) 