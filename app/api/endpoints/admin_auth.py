"""
Admin authentication endpoints.
"""

from datetime import timedelta
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.schemas.admin import AdminLogin, AdminCreate, AdminResponse, AdminToken, MessageResponse
from app.crud.admin import admin_crud, activity_log_crud
from app.utils.admin_auth import create_admin_access_token, get_current_active_admin, require_super_admin
from app.models.admin import AdminUser
from app.schemas.admin import ActivityLogCreate

router = APIRouter()

@router.post("/login", response_model=AdminToken)
async def admin_login(
    admin_data: AdminLogin,
    request: Request,
    db: Session = Depends(get_db)
):
    """Authenticate admin user and return access token."""
    admin = admin_crud.authenticate_admin(db, admin_data.email, admin_data.password)
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is deactivated"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_admin_access_token(
        data={"sub": str(admin.id)}, 
        expires_delta=access_token_expires
    )
    
    # Log the login activity
    await log_admin_activity(
        db=db,
        admin_id=admin.id,
        action="admin_login",
        request=request
    )
    
    return AdminToken(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        admin_role=admin.role
    )

@router.post("/create", response_model=AdminResponse)
async def create_admin(
    admin_data: AdminCreate,
    request: Request,
    current_admin: AdminUser = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Create a new admin user (Super Admin only)."""
    
    # Check if admin with email already exists
    existing_admin = admin_crud.get_admin_by_email(db, admin_data.email)
    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin with this email already exists"
        )
    
    # Create the admin
    new_admin = admin_crud.create_admin(db, admin_data, created_by_id=current_admin.id)
    
    # Log the activity
    await log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        action="admin_create",
        resource_type="admin",
        resource_id=str(new_admin.id),
        details={"created_email": new_admin.email, "role": new_admin.role.value},
        request=request
    )
    
    return AdminResponse.from_orm(new_admin)

@router.get("/me", response_model=AdminResponse)
async def get_current_admin_info(
    current_admin: AdminUser = Depends(get_current_active_admin)
):
    """Get current admin user information."""
    return AdminResponse.from_orm(current_admin)

@router.get("/list", response_model=list[AdminResponse])
async def list_admins(
    skip: int = 0,
    limit: int = 100,
    current_admin: AdminUser = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """List all admin users (Super Admin only)."""
    admins = admin_crud.get_all_admins(db, skip=skip, limit=limit)
    return [AdminResponse.from_orm(admin) for admin in admins]

@router.put("/{admin_id}/deactivate", response_model=MessageResponse)
async def deactivate_admin(
    admin_id: int,
    request: Request,
    current_admin: AdminUser = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Deactivate an admin user (Super Admin only)."""
    
    if admin_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    target_admin = admin_crud.get_admin_by_id(db, admin_id)
    if not target_admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found"
        )
    
    deactivated_admin = admin_crud.deactivate_admin(db, admin_id)
    
    # Log the activity
    await log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        action="admin_deactivate",
        resource_type="admin",
        resource_id=str(admin_id),
        details={"deactivated_email": target_admin.email},
        request=request
    )
    
    return MessageResponse(
        message=f"Admin {target_admin.email} has been deactivated",
        success=True
    )

@router.put("/{admin_id}/activate", response_model=MessageResponse)
async def activate_admin(
    admin_id: int,
    request: Request,
    current_admin: AdminUser = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Activate an admin user (Super Admin only)."""
    
    target_admin = admin_crud.get_admin_by_id(db, admin_id)
    if not target_admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found"
        )
    
    activated_admin = admin_crud.update_admin(db, admin_id, is_active=True)
    
    # Log the activity
    await log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        action="admin_activate",
        resource_type="admin",
        resource_id=str(admin_id),
        details={"activated_email": target_admin.email},
        request=request
    )
    
    return MessageResponse(
        message=f"Admin {target_admin.email} has been activated",
        success=True
    )

@router.post("/logout", response_model=MessageResponse)
async def admin_logout(
    request: Request,
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Admin logout (client-side token removal)."""
    
    # Log the logout activity
    await log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        action="admin_logout",
        request=request
    )
    
    return MessageResponse(
        message="Logged out successfully",
        success=True
    )

# Helper function for logging activities
async def log_admin_activity(
    db: Session,
    admin_id: int,
    action: str,
    request: Request,
    resource_type: str = None,
    resource_id: str = None,
    details: dict = None
):
    """Helper function to log admin activities."""
    # Get client IP
    client_ip = request.client.host
    if "x-forwarded-for" in request.headers:
        client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()
    elif "x-real-ip" in request.headers:
        client_ip = request.headers["x-real-ip"]
    
    # Get user agent
    user_agent = request.headers.get("user-agent", "")
    
    # Create activity log
    log_data = ActivityLogCreate(
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details
    )
    
    activity_log_crud.log_activity(
        db=db,
        admin_id=admin_id,
        log_data=log_data,
        ip_address=client_ip,
        user_agent=user_agent
    )