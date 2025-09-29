"""
Admin dependencies for checking admin access.
"""
from fastapi import Depends, HTTPException, status
from app.api.deps import get_current_verified_user
from app.models.user import User

def get_current_admin_user(current_user: User = Depends(get_current_verified_user)):
    """
    Dependency to check if the current user is an admin.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user