from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import logging

from app.core.database import get_db
from app.crud.auth import get_user_by_id
from app.utils.auth import verify_token

# Security scheme for JWT tokens
security = HTTPBearer()

logger = logging.getLogger(__name__)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Get the current authenticated user from JWT token.
    
    Args:
        credentials: JWT token from Authorization header
        db: Database session
        
    Returns:
        User: Current authenticated user
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Verify and decode the token
        payload = verify_token(credentials.credentials)
        if payload is None:
            logger.warning("Invalid token provided")
            raise credentials_exception
        
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.warning("Token missing user ID")
            raise credentials_exception
            
        # Convert user_id to integer
        try:
            user_id_int = int(user_id)
        except ValueError:
            logger.warning(f"Invalid user ID in token: {user_id}")
            raise credentials_exception
            
    except Exception as e:
        logger.error(f"Error processing token: {str(e)}")
        raise credentials_exception
    
    # Get user from database
    user = get_user_by_id(db, user_id=user_id_int)
    if user is None:
        logger.warning(f"User not found for ID: {user_id_int}")
        raise credentials_exception
    
    return user

def get_current_verified_user(current_user = Depends(get_current_user)):
    """
    Get the current authenticated user and ensure they are verified.
    
    Args:
        current_user: Current authenticated user from get_current_user
        
    Returns:
        User: Current verified user
        
    Raises:
        HTTPException: If user is not verified
    """
    if not current_user.is_verified:
        logger.warning(f"Unverified user attempted access: {current_user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please verify your email address."
        )
    
    return current_user