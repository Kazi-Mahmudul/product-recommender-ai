"""
Admin-specific endpoints accessible through the main auth system.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_verified_user
from app.api.deps.admin_deps import get_current_admin_user
from app.models.user import User
from app.schemas.auth import UserResponse

router = APIRouter()

@router.get("/admin/status")
def admin_status(current_user: User = Depends(get_current_admin_user)):
    """
    Check admin status and return admin-specific information.
    """
    return {
        "is_admin": True,
        "message": "Admin access verified",
        "user_id": current_user.id,
        "email": current_user.email
    }

@router.get("/admin/users")
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Admin endpoint: List all users in the system.
    """
    from app.crud.auth import get_all_users
    users = get_all_users(db)
    return {"users": users, "total": len(users)}

@router.get("/admin/users/{user_id}")
def get_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Admin endpoint: Get details for a specific user.
    """
    from app.crud.auth import get_user_by_id
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return {"user": user}