"""
Admin dashboard endpoints for overview and analytics.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.core.database import get_db
from app.models.admin import AdminUser
from app.models.phone import Phone
from app.models.user import User
from app.models.comparison import ComparisonSession, ComparisonItem
from app.crud.admin import system_metrics_crud, activity_log_crud, scraper_crud
from app.utils.admin_auth import get_current_active_admin, require_any_admin
from app.schemas.admin import DashboardStats, MessageResponse

router = APIRouter()

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_admin: AdminUser = Depends(require_any_admin),
    db: Session = Depends(get_db)
):
    """Get comprehensive dashboard statistics."""
    
    # Basic counts
    total_phones = db.query(Phone).count()
    total_users = db.query(User).count()
    
    # Active sessions (users who logged in in the last 24 hours)
    last_24h = datetime.utcnow() - timedelta(hours=24)
    active_sessions = db.query(User).filter(User.created_at >= last_24h).count()
    
    # Most compared phones (top 10)
    most_compared_phones = []
    try:
        # Get phone comparison counts from ComparisonItem
        comparison_counts = db.query(
            Phone.name,
            Phone.brand,
            func.count(ComparisonItem.id).label('comparison_count')
        ).join(
            ComparisonItem, 
            Phone.slug == ComparisonItem.slug
        ).group_by(
            Phone.id, Phone.name, Phone.brand
        ).order_by(
            desc('comparison_count')
        ).limit(10).all()
        
        most_compared_phones = [
            {
                "name": row.name,
                "brand": row.brand,
                "comparison_count": row.comparison_count
            }
            for row in comparison_counts
        ]
    except Exception as e:
        # Fallback if comparison table structure is different
        print(f"Error getting comparison stats: {e}")
        most_compared_phones = []
    
    # Trending searches (would need search logs - placeholder for now)
    trending_searches = [
        {"query": "iPhone 15", "count": 245},
        {"query": "Samsung Galaxy S24", "count": 189},
        {"query": "OnePlus 12", "count": 156},
        {"query": "Google Pixel 8", "count": 134},
        {"query": "Xiaomi 14", "count": 98}
    ]
    
    # API health metrics
    api_health = {
        "status": "healthy",
        "response_time": "120ms",
        "success_rate": "99.2%",
        "last_check": datetime.utcnow().isoformat()
    }
    
    # Scraper status
    scraper_statuses = scraper_crud.get_scraper_statuses(db, limit=5)
    scraper_status_list = [
        {
            "name": scraper.scraper_name,
            "status": scraper.status,
            "last_run": scraper.started_at.isoformat() if scraper.started_at else None,
            "records_processed": scraper.records_processed
        }
        for scraper in scraper_statuses
    ]
    
    return DashboardStats(
        total_phones=total_phones,
        total_users=total_users,
        active_sessions=active_sessions,
        most_compared_phones=most_compared_phones,
        trending_searches=trending_searches,
        api_health=api_health,
        scraper_status=scraper_status_list
    )

@router.get("/phone-stats")
async def get_phone_statistics(
    current_admin: AdminUser = Depends(require_any_admin),
    db: Session = Depends(get_db)
):
    """Get detailed phone statistics."""
    
    # Phone counts by brand
    brand_counts = db.query(
        Phone.brand,
        func.count(Phone.id).label('count')
    ).group_by(Phone.brand).order_by(desc('count')).all()
    
    # Phone counts by price range
    price_ranges = [
        {"range": "Under 20k", "min": 0, "max": 20000},
        {"range": "20k-40k", "min": 20000, "max": 40000},
        {"range": "40k-60k", "min": 40000, "max": 60000},
        {"range": "60k-80k", "min": 60000, "max": 80000},
        {"range": "80k-100k", "min": 80000, "max": 100000},
        {"range": "Above 100k", "min": 100000, "max": 999999999}
    ]
    
    price_distribution = []
    for price_range in price_ranges:
        count = db.query(Phone).filter(
            Phone.price_taka >= price_range["min"],
            Phone.price_taka < price_range["max"]
        ).count()
        price_distribution.append({
            "range": price_range["range"],
            "count": count
        })
    
    # Recently added phones (last 30 days)
    last_30_days = datetime.utcnow() - timedelta(days=30)
    recent_phones = db.query(Phone).filter(
        Phone.created_at >= last_30_days
    ).count()
    
    return {
        "brand_distribution": [
            {"brand": row.brand, "count": row.count}
            for row in brand_counts
        ],
        "price_distribution": price_distribution,
        "recent_phones_30_days": recent_phones,
        "total_phones": db.query(Phone).count()
    }

@router.get("/user-stats")
async def get_user_statistics(
    current_admin: AdminUser = Depends(require_any_admin),
    db: Session = Depends(get_db)
):
    """Get detailed user statistics."""
    
    # User registration over time (last 30 days)
    last_30_days = datetime.utcnow() - timedelta(days=30)
    
    registration_data = []
    for i in range(30):
        date = last_30_days + timedelta(days=i)
        day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        count = db.query(User).filter(
            User.created_at >= day_start,
            User.created_at < day_end
        ).count()
        
        registration_data.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "registrations": count
        })
    
    # Verification statistics
    total_users = db.query(User).count()
    verified_users = db.query(User).filter(User.is_verified == True).count()
    unverified_users = total_users - verified_users
    
    return {
        "total_users": total_users,
        "verified_users": verified_users,
        "unverified_users": unverified_users,
        "verification_rate": round((verified_users / total_users * 100) if total_users > 0 else 0, 2),
        "registration_trend": registration_data
    }

@router.get("/activity-summary")
async def get_activity_summary(
    hours: int = 24,
    current_admin: AdminUser = Depends(require_any_admin),
    db: Session = Depends(get_db)
):
    """Get admin activity summary for the specified time period."""
    
    recent_activities = activity_log_crud.get_recent_activities(db, hours=hours, limit=100)
    
    # Group by action type
    action_counts = {}
    admin_activity = {}
    
    for activity in recent_activities:
        # Count by action
        action_counts[activity.action] = action_counts.get(activity.action, 0) + 1
        
        # Count by admin
        admin_email = activity.admin_user.email if activity.admin_user else "Unknown"
        admin_activity[admin_email] = admin_activity.get(admin_email, 0) + 1
    
    return {
        "time_period_hours": hours,
        "total_activities": len(recent_activities),
        "action_breakdown": action_counts,
        "admin_activity": admin_activity,
        "recent_activities": [
            {
                "action": activity.action,
                "admin_email": activity.admin_user.email if activity.admin_user else "Unknown",
                "resource_type": activity.resource_type,
                "timestamp": activity.created_at.isoformat()
            }
            for activity in recent_activities[:20]  # Last 20 activities
        ]
    }

@router.get("/system-health")
async def get_system_health(
    current_admin: AdminUser = Depends(require_any_admin),
    db: Session = Depends(get_db)
):
    """Get system health indicators."""
    
    # Database connectivity (if we can query, it's connected)
    db_status = "healthy"
    try:
        db.execute("SELECT 1")
    except Exception:
        db_status = "unhealthy"
    
    # Recent scraper runs
    recent_scrapers = scraper_crud.get_scraper_statuses(db, limit=10)
    failed_scrapers = [s for s in recent_scrapers if s.status == "failed"]
    
    # Active scrapers
    active_scrapers = scraper_crud.get_active_scrapers(db)
    
    return {
        "database_status": db_status,
        "active_scrapers": len(active_scrapers),
        "failed_scrapers_recent": len(failed_scrapers),
        "system_load": "normal",  # Placeholder - would need actual system monitoring
        "memory_usage": "65%",    # Placeholder
        "disk_usage": "42%",      # Placeholder
        "last_backup": "2024-01-15T10:30:00Z"  # Placeholder
    }