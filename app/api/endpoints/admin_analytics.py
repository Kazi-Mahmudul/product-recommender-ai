from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.deps.admin_deps import get_current_admin_user
from app.models.analytics import PageView
from app.models.user import User

router = APIRouter()

@router.get("/traffic")
def get_traffic_analytics(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Get traffic analytics for admin dashboard
    """
    now = datetime.utcnow()
    
    # Total traffic (all time)
    total_traffic = db.query(PageView).count()
    
    # Weekly traffic (last 7 days)
    week_ago = now - timedelta(days=7)
    weekly_traffic = db.query(PageView).filter(
        PageView.created_at >= week_ago
    ).count()
    
    # Monthly traffic (last 30 days)
    month_ago = now - timedelta(days=30)
    monthly_traffic = db.query(PageView).filter(
        PageView.created_at >= month_ago
    ).count()
    
    # Current active users (last 5 minutes)
    five_min_ago = now - timedelta(minutes=5)
    active_sessions = db.query(func.count(distinct(PageView.session_id))).filter(
        PageView.created_at >= five_min_ago
    ).scalar()
    
    # Anonymous vs authenticated traffic (last 30 days)
    anonymous_traffic = db.query(PageView).filter(
        PageView.created_at >= month_ago,
        PageView.user_id.is_(None)
    ).count()
    
    authenticated_traffic = db.query(PageView).filter(
        PageView.created_at >= month_ago,
        PageView.user_id.isnot(None)
    ).count()
    
    return {
        "total_traffic": total_traffic,
        "weekly_traffic": weekly_traffic,
        "monthly_traffic": monthly_traffic,
        "current_active": active_sessions,
        "anonymous_traffic_30d": anonymous_traffic,
        "authenticated_traffic_30d": authenticated_traffic
    }

@router.get("/traffic/daily")
def get_daily_traffic(
    days: int = 7,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Get daily traffic breakdown for charts
    """
    from sqlalchemy import cast, Date
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    daily_stats = db.query(
        cast(PageView.created_at, Date).label('date'),
        func.count(PageView.id).label('views'),
        func.count(distinct(PageView.session_id)).label('sessions')
    ).filter(
        PageView.created_at >= start_date
    ).group_by(
        cast(PageView.created_at, Date)
    ).order_by(
        cast(PageView.created_at, Date)
    ).all()
    
    return [
        {
            "date": str(stat.date),
            "views": stat.views,
            "sessions": stat.sessions
        }
        for stat in daily_stats
    ]


@router.get("/ai-usage")
def get_ai_usage_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Get AI usage statistics
    """
    from app.models.analytics import AIUsage
    
    now = datetime.utcnow()
    month_ago = now - timedelta(days=30)
    
    # Total AI requests
    total_requests = db.query(AIUsage).count()
    
    # Monthly requests
    monthly_requests = db.query(AIUsage).filter(
        AIUsage.created_at >= month_ago
    ).count()
    
    # Total tokens used
    total_tokens = db.query(func.sum(AIUsage.total_tokens)).scalar() or 0
    
    # Monthly tokens
    monthly_tokens = db.query(func.sum(AIUsage.total_tokens)).filter(
        AIUsage.created_at >= month_ago
    ).scalar() or 0
    
    # Average response time
    avg_response_time = db.query(func.avg(AIUsage.response_time_ms)).scalar() or 0
    
    # Success rate
    total_with_status = db.query(AIUsage).filter(
        AIUsage.created_at >= month_ago
    ).count()
    successful = db.query(AIUsage).filter(
        AIUsage.created_at >= month_ago,
        AIUsage.success == True
    ).count()
    success_rate = (successful / total_with_status * 100) if total_with_status > 0 else 0
    
    # Top users by AI usage
    top_users = db.query(
        AIUsage.user_id,
        func.count(AIUsage.id).label('request_count'),
        func.sum(AIUsage.total_tokens).label('total_tokens')
    ).filter(
        AIUsage.user_id.isnot(None),
        AIUsage.created_at >= month_ago
    ).group_by(
        AIUsage.user_id
    ).order_by(
        func.sum(AIUsage.total_tokens).desc()
    ).limit(10).all()
    
    return {
        "total_requests": total_requests,
        "monthly_requests": monthly_requests,
        "total_tokens": int(total_tokens),
        "monthly_tokens": int(monthly_tokens),
        "avg_response_time_ms": int(avg_response_time),
        "success_rate": round(success_rate, 2),
        "top_users": [
            {
                "user_id": user_id,
                "request_count": count,
                "total_tokens": int(tokens)
            }
            for user_id, count, tokens in top_users
        ]
    }


@router.get("/user-engagement")
def get_user_engagement_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Get user engagement statistics
    """
    from app.models.analytics import UserSession, UserAction, SearchQuery
    
    now = datetime.utcnow()
    month_ago = now - timedelta(days=30)
    
    # Average session duration
    avg_session_duration = db.query(func.avg(UserSession.duration_seconds)).filter(
        UserSession.started_at >= month_ago,
        UserSession.duration_seconds.isnot(None)
    ).scalar() or 0
    
    # Average pages per session
    avg_pages = db.query(func.avg(UserSession.pages_viewed)).filter(
        UserSession.started_at >= month_ago
    ).scalar() or 0
    
    # Total actions
    total_actions = db.query(UserAction).filter(
        UserAction.created_at >= month_ago
    ).count()
    
    # Total searches
    total_searches = db.query(SearchQuery).filter(
        SearchQuery.created_at >= month_ago
    ).count()
    
    # Most common actions
    top_actions = db.query(
        UserAction.action_type,
        func.count(UserAction.id).label('count')
    ).filter(
        UserAction.created_at >= month_ago
    ).group_by(
        UserAction.action_type
    ).order_by(
        func.count(UserAction.id).desc()
    ).limit(10).all()
    
    return {
        "avg_session_duration_seconds": int(avg_session_duration),
        "avg_pages_per_session": round(avg_pages, 2),
        "total_actions_30d": total_actions,
        "total_searches_30d": total_searches,
        "top_actions": [
            {"action_type": action, "count": count}
            for action, count in top_actions
        ]
    }


@router.get("/popular-phones")
def get_popular_phones_stats(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Get most viewed phones
    """
    from app.models.analytics import PhoneView
    from app.models.phone import Phone
    
    now = datetime.utcnow()
    month_ago = now - timedelta(days=30)
    
    # Most viewed phones
    popular_phones = db.query(
        PhoneView.phone_id,
        func.count(PhoneView.id).label('view_count'),
        func.avg(PhoneView.view_duration_seconds).label('avg_duration')
    ).filter(
        PhoneView.created_at >= month_ago
    ).group_by(
        PhoneView.phone_id
    ).order_by(
        func.count(PhoneView.id).desc()
    ).limit(limit).all()
    
    results = []
    for phone_id, view_count, avg_duration in popular_phones:
        phone = db.query(Phone).filter(Phone.id == phone_id).first()
        if phone:
            results.append({
                "phone_id": phone_id,
                "phone_name": phone.name,
                "brand": phone.brand,
                "view_count": view_count,
                "avg_duration_seconds": int(avg_duration) if avg_duration else 0
            })
    
    return results


@router.get("/conversions")
def get_conversion_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Get conversion statistics
    """
    from app.models.analytics import ConversionEvent
    
    now = datetime.utcnow()
    month_ago = now - timedelta(days=30)
    
    # Total conversions by type
    conversions_by_type = db.query(
        ConversionEvent.event_type,
        func.count(ConversionEvent.id).label('count')
    ).filter(
        ConversionEvent.created_at >= month_ago
    ).group_by(
        ConversionEvent.event_type
    ).all()
    
    return {
        "conversions_30d": [
            {"event_type": event_type, "count": count}
            for event_type, count in conversions_by_type
        ]
    }

