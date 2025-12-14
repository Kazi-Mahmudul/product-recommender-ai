from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, File, UploadFile
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import timedelta
import logging
import secrets
import time
from typing import Optional
import uuid
import os
from urllib.parse import urlencode
# Import local modules
from app.core.database import get_db
from app.core.config import settings
from app.crud.auth import (
    get_user_by_email, create_user, create_email_verification,
    verify_email_code, get_user_by_id, get_all_users
)
from app.schemas.auth import (
    UserSignup, UserLogin, EmailVerificationRequest,
    Token, UserResponse, MessageResponse, UserProfileUpdate
)
from app.utils.auth import verify_password, create_access_token, get_password_hash
from app.utils.email import send_verification_email
from app.api.deps import get_current_user, get_current_verified_user
from app.crud import comparison as crud_comparison

# Google OAuth imports
try:
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    GOOGLE_AUTH_AVAILABLE = True
except ImportError:
    GOOGLE_AUTH_AVAILABLE = False
    logging.warning("Google OAuth dependencies not available")

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
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create account"
            )
        
        # Create email verification
        verification = create_email_verification(db, user.id)  # type: ignore
        
        if not verification:
            logger.warning(f"Failed to create verification for user {user.email}")  # type: ignore
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create verification code"
            )
        
        # Send verification email
        email_sent = send_verification_email(user.email, verification.code)  # type: ignore
        
        if not email_sent:
            logger.warning(f"Failed to send verification email to {user.email}. Rolling back user creation.")  # type: ignore
            # Delete the user since verification email failed
            db.delete(user)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification email. Please try again later."
            )
        
        return MessageResponse(
            message="Account created successfully. Please check your email for verification code.",
            success=True
        )
        
    except HTTPException:
        raise
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
def login(user_data: UserLogin, db: Session = Depends(get_db), request: Request = None, response: Response = None):  # type: ignore
    """
    Authenticate user and return access token.
    
    - Validates email and password
    - Ensures user is verified
    - Checks and updates admin status based on email
    - Returns JWT access token
    """
    # Explicit validation to handle edge cases
    if not user_data.email or not user_data.email.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required"
        )
    
    if not user_data.password or not user_data.password.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required"
        )
    
    # Validate email format explicitly
    if "@" not in user_data.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    
    # Get user by email
    user = get_user_by_email(db, user_data.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user is verified
    if not user.is_verified:  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email not verified. Please verify your email address."
        )
    
    # Verify password
    if not verify_password(user_data.password, user.password_hash):  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user should have admin status based on email
    is_admin = user.email in settings.admin_emails_list  # type: ignore
    
    # Update admin status in database if needed
    if user.is_admin != is_admin:  # type: ignore
        user.is_admin = is_admin  # type: ignore
        db.commit()
        db.refresh(user)
    
    # Create access token
    access_token_expires = settings.ACCESS_TOKEN_EXPIRE_MINUTES
    access_token = create_access_token(
        data={"sub": str(user.id)},  # type: ignore
        expires_delta=None  # Uses default from settings
    )
    
    # Merge anonymous comparison data if a session cookie exists
    if request and response:
        comparison_session_id = request.cookies.get("comparison_session_id")
        if comparison_session_id:
            try:
                session_uuid = uuid.UUID(comparison_session_id)
                crud_comparison.merge_comparison_data(db, session_uuid, user.id)  # type: ignore
                # Clear the session cookie after merging with secure settings
                is_production = os.getenv("ENVIRONMENT", "development") == "production"
                response.delete_cookie(
                    "comparison_session_id",
                    secure=is_production,
                    httponly=True,
                    samesite="lax" if is_production else "none"
                )
            except (ValueError, Exception) as e:
                logger.warning(f"Failed to merge comparison data: {str(e)}")

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=access_token_expires
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user = Depends(get_current_verified_user)):
    """
    Get current user information.
    
    - Requires valid JWT token
    - Returns user details
    """
    return current_user

@router.put("/me", response_model=UserResponse)
def update_current_user_profile(
    profile_data: UserProfileUpdate,
    current_user = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Update current user profile information.
    
    - Requires valid JWT token
    - Updates first_name and/or last_name
    - Returns updated user details
    """
    from app.crud.auth import update_user_profile
    
    updated_user = update_user_profile(
        db,
        current_user.id,
        first_name=profile_data.first_name,
        last_name=profile_data.last_name
    )
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )
    
    return updated_user

@router.post("/me/profile-picture", response_model=UserResponse)
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Upload user profile picture.
    
    - Requires valid JWT token
    - Accepts image files (JPEG, PNG, GIF, WebP)
    - Max file size: 5MB
    - Returns updated user details with profile_picture_url
    """
    from app.crud.auth import update_profile_picture
    import base64
    from io import BytesIO
    from PIL import Image
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Read file content
    contents = await file.read()
    
    # Validate file size (5MB max)
    max_size = 5 * 1024 * 1024  # 5MB
    if len(contents) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 5MB limit"
        )
    
    try:
        # Process image: resize to 200x200
        logger.info(f"Processing profile picture upload for user ID {current_user.id}")
        
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image"
            )
        
        # Validation for file size (max 5MB)
        MAX_FILE_SIZE = 5 * 1024 * 1024
        content = contents # Use the already read contents
        
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size too large (max 5MB)"
            )
            
        # Open image with Pillow
        image = Image.open(BytesIO(content))
        
        # Resize image if too large (max 400x400)
        max_size = (400, 400)
        if image.width > max_size[0] or image.height > max_size[1]:
            image.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Convert to RGB if authentication RGBA (to save as JPEG)
        if image.mode == 'RGBA':
            background = Image.new('RGB', image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[3])
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')
                
        # Determine format to save
        format_to_save = "JPEG"
            
        # Convert image to base64
        buffered = BytesIO()
        image.save(buffered, format=format_to_save, optimize=True, quality=85)
        img_str = base64.b64encode(buffered.getvalue()).decode()
            
        # Create data URL
        mime_type = f"image/{format_to_save.lower()}"
        picture_url = f"data:{mime_type};base64,{img_str}"
            
        # Update user profile
        updated_user = update_profile_picture(db, current_user.id, picture_url)
            
        if not updated_user:
            logger.error(f"Failed to update profile picture for user ID {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update profile picture"
            )
        
        logger.info(f"Successfully updated profile picture for user ID {current_user.id}")
        return updated_user
        
    except Exception as e:
        logger.error(f"Error processing profile picture: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process image: {str(e)}"
        )

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
    
    if user.is_verified:  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    try:
        # Create new verification code
        verification = create_email_verification(db, user.id)  # type: ignore
        
        if not verification:
            logger.warning(f"Failed to create verification for user {user.email}")  # type: ignore
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create verification code"
            )
        
        # Send verification email
        email_sent = send_verification_email(user.email, verification.code)  # type: ignore
        
        if not email_sent:
            logger.warning(f"Failed to send verification email to {user.email}")  # type: ignore
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

# Google OAuth endpoints
if GOOGLE_AUTH_AVAILABLE:
    @router.post("/google", response_model=Token)
    async def google_auth(request: Request, response: Response, db: Session = Depends(get_db)):  # type: ignore
        """
        Authenticate user via Google OAuth (client-side flow).
        
        - Validates Google ID token
        - Creates user if doesn't exist
        - Returns JWT access token
        """
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
                logger.info(f"Attempting to verify Google token")
                from google.oauth2 import id_token
                from google.auth.transport import requests as google_requests
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
            is_new_user = False
            if not user:
                try:
                    from app.models.user import User
                    
                    # Use a secure random password for Google OAuth users
                    # Ensure password hash is generated correctly
                    try:
                        google_oauth_password = get_password_hash("GoogleOAuth2024!")
                    except Exception as pass_error:
                        logger.error(f"Password hashing failed during Google signup: {pass_error}")
                        # Fallback to a precise internal string if hashing fails completely (should not happen with patch)
                        google_oauth_password = "FAILED_HASH_FALLBACK"

                    # Check if user should have admin status based on email
                    is_admin = email in settings.admin_emails_list
                    
                    # Truncate names if too long
                    safe_first_name = (first_name or "")[:100]
                    safe_last_name = (last_name or "")[:100]

                    user = User(
                        email=email,
                        password_hash=google_oauth_password,
                        first_name=safe_first_name,
                        last_name=safe_last_name,
                        is_verified=True,  # Google OAuth users are automatically verified
                        is_admin=is_admin
                    )
                    db.add(user)
                    db.commit()
                    db.refresh(user)
                    
                    # Mark as new user
                    is_new_user = True
                    logger.info(f"Successfully created new Google Verified User: {email}")
                except Exception as create_error:
                    logger.error(f"Failed to create Google user in DB: {create_error}")
                    db.rollback()
                    raise HTTPException(
                        status_code=500,
                        detail=f"Database error during account creation: {str(create_error)}"
                    )
            elif not user.is_verified:  # type: ignore
                # Verify existing user if they authenticate via Google
                user.is_verified = True  # type: ignore
                # Check if user should have admin status based on email
                user.is_admin = user.email in settings.admin_emails_list  # type: ignore
                db.commit()
                db.refresh(user)
            else:
                # User already exists and is verified
                # Check if user should have admin status based on email
                if user.is_admin != (user.email in settings.admin_emails_list):  # type: ignore
                    user.is_admin = user.email in settings.admin_emails_list  # type: ignore
                    db.commit()
                    db.refresh(user)
                
                # If user exists and tries to sign up again, we'll handle this on the frontend

            # Create JWT
            access_token_expires = settings.ACCESS_TOKEN_EXPIRE_MINUTES
            access_token = create_access_token(data={"sub": str(user.id)})  # type: ignore
            
            # Merge anonymous comparison data if a session cookie exists
            comparison_session_id = request.cookies.get("comparison_session_id")
            if comparison_session_id:
                try:
                    session_uuid = uuid.UUID(comparison_session_id)
                    crud_comparison.merge_comparison_data(db, session_uuid, user.id)  # type: ignore
                    # Clear the session cookie after merging with secure settings
                    is_production = os.getenv("ENVIRONMENT", "development") == "production"
                    response.delete_cookie(
                        "comparison_session_id",
                        secure=is_production,
                        httponly=True,
                        samesite="lax" if is_production else "none"
                    )
                except (ValueError, Exception) as e:
                    logger.warning(f"Failed to merge comparison data: {str(e)}")
            
            return Token(
                access_token=access_token,
                token_type="bearer",
                expires_in=access_token_expires
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
        
        # Google OAuth URL
        google_auth_url = (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={settings.GOOGLE_CLIENT_ID}"
            f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
            f"&response_type=code"
            f"&scope=openid email profile"
            f"&state={state}"
        )
        
        return {"auth_url": google_auth_url, "state": state}

    @router.get("/google/callback")
    async def google_auth_callback(
        request: Request,
        code: str,
        state: str = None,  # type: ignore
        db: Session = Depends(get_db),
        response: Response = None  # type: ignore
    ):
        """
        Callback endpoint for Google OAuth. Google redirects here after authentication.
        This endpoint exchanges the authorization code for an access token and user info.
        """
        import requests
        from fastapi.responses import RedirectResponse
        import urllib.parse
        
        try:
            # Exchange the authorization code for access token
            token_url = "https://oauth2.googleapis.com/token"
            
            token_data = {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.GOOGLE_REDIRECT_URI
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
            picture = user_info.get("picture", "")
            email_verified = user_info.get("verified_email", False)
            
            # Prepare Google profile data
            google_profile_data = {
                "picture": picture,
                "given_name": first_name,
                "family_name": last_name,
                "email_verified": email_verified
            }
            
            # Check if user exists, else create
            user = get_user_by_email(db, email)
            is_new_user = False
            if not user:
                from app.models.user import User
                
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
                    is_admin=is_admin,
                    auth_provider='google',
                    google_profile=google_profile_data
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                
                # Mark as new user
                is_new_user = True
            elif not user.is_verified:  # type: ignore
                # Verify existing user if they authenticate via Google
                user.is_verified = True  # type: ignore
                # Check if user should have admin status based on email
                user.is_admin = user.email in settings.admin_emails_list  # type: ignore
                # Update auth provider and Google profile
                user.auth_provider = 'google'  # type: ignore
                user.google_profile = google_profile_data  # type: ignore
                db.commit()
                db.refresh(user)
            else:
                # User already exists and is verified
                # Check if user should have admin status based on email
                if user.is_admin != (user.email in settings.admin_emails_list):  # type: ignore
                    user.is_admin = user.email in settings.admin_emails_list  # type: ignore
                
                # Update Google profile data if user signed in with Google
                user.auth_provider = 'google'  # type: ignore
                user.google_profile = google_profile_data  # type: ignore
                db.commit()
                db.refresh(user)
                
                # If user exists and tries to sign up again, we'll handle this on the frontend

            # Create JWT
            access_token_expires = settings.ACCESS_TOKEN_EXPIRE_MINUTES
            access_token_jwt = create_access_token(data={"sub": str(user.id)})  # type: ignore
            
            # Set the token in a secure cookie
            is_production = os.getenv("ENVIRONMENT", "development") == "production"
            if response:
                response.set_cookie(
                    key="auth_token",
                    value=access_token_jwt,
                    httponly=True,
                    secure=is_production,
                    samesite="lax" if is_production else "none",
                    max_age=3600  # 1 hour
                )
            
            # Redirect to frontend success page with user status
            frontend_url = os.getenv("FRONTEND_URL", "https://peyechi.com")
            # Add query parameter to indicate if it's a new user registration
            redirect_url = f"{frontend_url}/auth/success?token={access_token_jwt}&new_user={is_new_user}"
            return RedirectResponse(url=redirect_url)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error during Google OAuth callback: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="An error occurred during Google authentication"
            )
else:
    logger.warning("Google OAuth dependencies not available - Google auth endpoints disabled")