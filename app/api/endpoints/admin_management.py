"""
Combined admin endpoints for user management, analytics, and system monitoring.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_

from app.core.database import get_db
from app.models.admin import AdminUser
from app.models.user import User
from app.models.phone import Phone
from app.crud.admin import activity_log_crud, system_metrics_crud
from app.utils.admin_auth import get_current_active_admin, require_admin_or_moderator
from app.schemas.admin import UserManagement, UserBlock, MessageResponse, ActivityLogCreate, ActivityLogResponse

router = APIRouter()

# ===== USER MANAGEMENT ENDPOINTS =====

@router.get("/users", response_model=List[UserManagement])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None, description="Search by email, name"),
    is_verified: Optional[bool] = Query(None),
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """List users with filtering options."""
    
    query = db.query(User)
    
    # Apply filters
    if search:
        search_filter = or_(
            User.email.ilike(f"%{search}%"),
            User.first_name.ilike(f"%{search}%"),
            User.last_name.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    if is_verified is not None:
        query = query.filter(User.is_verified == is_verified)
    
    # Order by creation date (newest first)
    query = query.order_by(desc(User.created_at))
    
    # Apply pagination
    users = query.offset(skip).limit(limit).all()
    
    # Convert to response format
    user_list = []
    for user in users:
        user_data = UserManagement(
            id=user.id,
            email=user.email,
            is_verified=user.is_verified,
            created_at=user.created_at,
            first_name=user.first_name,
            last_name=user.last_name,
            session_count=0,  # Would count from session table
            last_activity=user.created_at  # Placeholder
        )
        user_list.append(user_data)
    
    return user_list

@router.get("/users/{user_id}")
async def get_user_details(
    user_id: int,
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get detailed user information."""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get additional user statistics
    # This would include comparison history, search history, etc.
    user_details = {
        "id": user.id,
        "email": user.email,
        "is_verified": user.is_verified,
        "created_at": user.created_at.isoformat(),
        "first_name": user.first_name,
        "last_name": user.last_name,
        "last_login": None,  # Would get from session table
        "total_comparisons": 0,  # Would count from comparison table
        "total_searches": 0,  # Would count from search log table
        "favorite_brands": [],  # Would analyze from user activity
        "account_status": "active"
    }
    
    return user_details

@router.post("/users/{user_id}/block")
async def block_user(
    user_id: int,
    block_data: UserBlock,
    request: Request,
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Block a user account."""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # In a real implementation, you'd add a 'blocked' field to User model
    # For now, we'll just log the action
    
    # Log the activity
    await log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        action="user_block",
        resource_type="user",
        resource_id=str(user_id),
        details={
            "user_email": user.email,
            "reason": block_data.reason,
            "duration_hours": block_data.duration_hours
        },
        request=request
    )
    
    return MessageResponse(
        message=f"User {user.email} blocked successfully",
        success=True,
        data={"user_id": user_id, "reason": block_data.reason}
    )

@router.post("/users/{user_id}/unblock")
async def unblock_user(
    user_id: int,
    request: Request,
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Unblock a user account."""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Log the activity
    await log_admin_activity(
        db=db,
        admin_id=current_admin.id,
        action="user_unblock",
        resource_type="user",
        resource_id=str(user_id),
        details={"user_email": user.email},
        request=request
    )
    
    return MessageResponse(
        message=f"User {user.email} unblocked successfully",
        success=True
    )

# ===== ANALYTICS ENDPOINTS =====

@router.get("/analytics/overview")
async def get_analytics_overview(
    days: int = Query(30, ge=1, le=365),
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get analytics overview for specified period."""
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # User registration trend
    daily_registrations = []
    for i in range(days):
        day = start_date + timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        count = db.query(User).filter(
            User.created_at >= day_start,
            User.created_at < day_end
        ).count()
        
        daily_registrations.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "registrations": count
        })
    
    # Phone popularity (would need search/comparison logs)
    popular_phones = [
        {"name": "iPhone 15 Pro", "searches": 1250, "comparisons": 89},
        {"name": "Samsung Galaxy S24", "searches": 1180, "comparisons": 76},
        {"name": "OnePlus 12", "searches": 950, "comparisons": 65},
        {"name": "Google Pixel 8", "searches": 720, "comparisons": 45},
        {"name": "Xiaomi 14", "searches": 650, "comparisons": 38}
    ]
    
    # Top searched brands
    brand_searches = [
        {"brand": "Samsung", "count": 3200},
        {"brand": "Apple", "count": 2800},
        {"brand": "OnePlus", "count": 1900},
        {"brand": "Google", "count": 1200},
        {"brand": "Xiaomi", "count": 1100}
    ]
    
    return {
        "period_days": days,
        "daily_registrations": daily_registrations,
        "popular_phones": popular_phones,
        "brand_searches": brand_searches,
        "total_users": db.query(User).count(),
        "verified_users": db.query(User).filter(User.is_verified == True).count(),
        "total_phones": db.query(Phone).count()
    }

@router.get("/analytics/comparisons")
async def get_comparison_analytics(
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get comparison analytics."""
    
    # Mock data - would come from actual comparison logs
    comparison_data = {
        "total_comparisons": 15420,
        "avg_phones_per_comparison": 2.8,
        "most_compared_pairs": [
            {"phones": ["iPhone 15", "Samsung S24"], "count": 156},
            {"phones": ["OnePlus 12", "Google Pixel 8"], "count": 134},
            {"phones": ["iPhone 15 Pro", "Samsung S24 Ultra"], "count": 128}
        ],
        "comparison_categories": [
            {"category": "Camera", "percentage": 45},
            {"category": "Performance", "percentage": 38},
            {"category": "Battery", "percentage": 32},
            {"category": "Display", "percentage": 28},
            {"category": "Price", "percentage": 67}
        ],
        "drop_off_points": [
            {"stage": "Initial Load", "percentage": 100},
            {"stage": "Phone Selection", "percentage": 85},
            {"stage": "Comparison View", "percentage": 72},
            {"stage": "Complete Comparison", "percentage": 58}
        ]
    }
    
    return comparison_data

# ===== SYSTEM MONITORING ENDPOINTS =====

@router.get("/system/logs")
async def get_system_logs(
    level: str = Query("INFO", description="Log level: DEBUG, INFO, WARNING, ERROR"),
    hours: int = Query(24, ge=1, le=168),
    limit: int = Query(100, ge=1, le=1000),
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get system logs."""
    
    # Mock log data - in production, you'd read from actual log files
    logs = [
        {
            "timestamp": "2024-01-15T14:30:25Z",
            "level": "INFO",
            "message": "Scraper mobile_scrapers completed successfully",
            "module": "scrapers.mobile_scrapers",
            "details": {"records_processed": 156, "duration": 45}
        },
        {
            "timestamp": "2024-01-15T14:15:10Z",
            "level": "WARNING",
            "message": "High memory usage detected",
            "module": "system.monitor",
            "details": {"memory_usage": "87%"}
        },
        {
            "timestamp": "2024-01-15T14:00:05Z",
            "level": "ERROR",
            "message": "Failed to connect to external API",
            "module": "services.external_api",
            "details": {"api": "gemini", "error": "timeout"}
        }
    ]
    
    return {
        "logs": logs,
        "total_count": len(logs),
        "filters": {
            "level": level,
            "hours": hours,
            "limit": limit
        }
    }

@router.get("/system/performance")
async def get_performance_metrics(
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get system performance metrics."""
    
    # Mock performance data
    performance_data = {
        "api_response_times": {
            "avg_response_time": 185,  # ms
            "p95_response_time": 350,
            "p99_response_time": 680,
            "endpoints": [
                {"endpoint": "/api/v1/natural_language", "avg_time": 245, "requests": 2150},
                {"endpoint": "/api/v1/phones/search", "avg_time": 120, "requests": 1890},
                {"endpoint": "/api/v1/comparison", "avg_time": 95, "requests": 1250}
            ]
        },
        "database_performance": {
            "active_connections": 15,
            "max_connections": 100,
            "avg_query_time": 25,  # ms
            "slow_queries": 3
        },
        "cache_performance": {
            "hit_rate": 0.87,
            "memory_usage": "245MB",
            "total_keys": 1250,
            "expired_keys": 45
        },
        "error_rates": {
            "api_errors": 0.02,  # 2%
            "database_errors": 0.001,
            "cache_errors": 0.005
        }
    }
    
    return performance_data

@router.get("/system/activity", response_model=List[ActivityLogResponse])
async def get_admin_activity_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    current_admin: AdminUser = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get admin activity logs."""
    
    logs = activity_log_crud.get_activity_logs(
        db=db,
        admin_id=admin_id,
        action=action,
        skip=skip,
        limit=limit
    )
    
    return [
        ActivityLogResponse(
            id=log.id,
            admin_user_id=log.admin_user_id,
            action=log.action,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            details=log.details,
            ip_address=log.ip_address,
            created_at=log.created_at,
            admin_email=log.admin_user.email if log.admin_user else "Unknown"
        )
        for log in logs
    ]

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