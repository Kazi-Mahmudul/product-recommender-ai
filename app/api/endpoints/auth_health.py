"""
Authentication System Health Check

This module provides health check endpoints for the authentication system.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from app.core.database import get_db
from app.api.deps import get_current_user
from app.crud.auth import get_all_users
from app.utils.auth import get_password_hash, verify_password

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/health")
def auth_health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint for authentication system.
    
    Returns:
        dict: Health status information
    """
    try:
        # Test database connectivity by fetching user count
        user_count = len(get_all_users(db))
        
        # Test password hashing functionality
        test_password = "HealthCheck123"
        hashed_password = get_password_hash(test_password)
        password_verification = verify_password(test_password, hashed_password)
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database": {
                "connected": True,
                "user_count": user_count
            },
            "password_hashing": {
                "working": True,
                "verification": password_verification
            },
            "message": "Authentication system is healthy"
        }
    except Exception as e:
        logger.error(f"Auth health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e),
            "message": "Authentication system health check failed"
        }

@router.get("/protected-health")
def protected_auth_health_check(current_user = Depends(get_current_user)):
    """
    Protected health check endpoint (requires authentication).
    
    Returns:
        dict: Health status information with user info
    """
    try:
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "user": {
                "id": current_user.id,
                "email": current_user.email,
                "is_verified": current_user.is_verified,
                "is_admin": current_user.is_admin
            },
            "message": "Protected authentication system is healthy"
        }
    except Exception as e:
        logger.error(f"Protected auth health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Protected authentication health check failed"
        )