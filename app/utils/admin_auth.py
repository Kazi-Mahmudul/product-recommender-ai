"""
Admin authentication utilities and middleware.
"""

from typing import Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.admin import AdminUser, AdminRole
from app.crud.admin import admin_crud
from app.utils.auth import get_password_hash

# Security scheme
admin_security = HTTPBearer()

def create_admin_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT token for admin users."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "admin"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_admin_token(token: str) -> Optional[dict]:
    """Verify and decode admin JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        admin_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if admin_id is None or token_type != "admin":
            return None
        
        return {"admin_id": int(admin_id), "payload": payload}
    except (JWTError, ValueError):
        return None

async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(admin_security),
    db: Session = Depends(get_db)
) -> AdminUser:
    """Get current authenticated admin user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate admin credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = verify_admin_token(credentials.credentials)
    if token_data is None:
        raise credentials_exception
    
    admin = admin_crud.get_admin_by_id(db, admin_id=token_data["admin_id"])
    if admin is None or not admin.is_active:
        raise credentials_exception
    
    return admin

async def get_current_active_admin(
    current_admin: AdminUser = Depends(get_current_admin)
) -> AdminUser:
    """Get current active admin user."""
    if not current_admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is deactivated"
        )
    return current_admin

def require_admin_role(required_roles: list[AdminRole]):
    """Dependency to require specific admin roles."""
    async def role_checker(current_admin: AdminUser = Depends(get_current_active_admin)) -> AdminUser:
        if current_admin.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {[role.value for role in required_roles]}"
            )
        return current_admin
    return role_checker

# Commonly used role dependencies
require_super_admin = require_admin_role([AdminRole.SUPER_ADMIN])
require_admin_or_moderator = require_admin_role([AdminRole.SUPER_ADMIN, AdminRole.MODERATOR])
require_any_admin = require_admin_role([AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.ANALYST])

def init_super_admin(db: Session, email: str, password: str) -> AdminUser:
    """Initialize the first super admin from environment variables."""
    # Check if super admin already exists
    existing_admin = admin_crud.get_admin_by_email(db, email)
    if existing_admin:
        return existing_admin
    
    # Create super admin
    from app.schemas.admin import AdminCreate
    
    admin_data = AdminCreate(
        email=email,
        password=password,
        confirm_password=password,
        role=AdminRole.SUPER_ADMIN,
        first_name="Super",
        last_name="Admin"
    )
    
    return admin_crud.create_admin(db, admin_data)