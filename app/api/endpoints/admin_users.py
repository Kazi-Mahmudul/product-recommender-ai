from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps.admin_deps import get_current_admin_user
from app.crud.auth import get_all_users, get_user_by_id
from app.models.user import User
from app.schemas.auth import UserResponse

router = APIRouter()

class UserStatusUpdate(BaseModel):
    is_verified: Optional[bool] = None
    is_admin: Optional[bool] = None

@router.get("/", response_model=List[UserResponse])
def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Get all users.
    """
    users = get_all_users(db)
    # Simple pagination hack (since get_all_users returns list)
    # Ideally CRUD should support skip/limit
    return users[skip : skip + limit]

@router.patch("/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: int,
    status_update: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Update user status (verify/ban or promote/demote).
    """
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent self-demotion to avoid locking out admin
    if user.id == current_admin.id and status_update.is_admin is False:
         raise HTTPException(status_code=400, detail="Cannot remove your own admin privileges")

    if status_update.is_verified is not None:
        user.is_verified = status_update.is_verified
    
    if status_update.is_admin is not None:
        user.is_admin = status_update.is_admin
        
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Delete a user.
    """
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}
