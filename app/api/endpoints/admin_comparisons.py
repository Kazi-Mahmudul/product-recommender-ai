from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.deps.admin_deps import get_current_admin_user
from app.models.comparison import ComparisonItem, ComparisonSession
from app.models.phone import Phone
from app.models.user import User

router = APIRouter()

@router.get("/stats")
def get_comparison_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Get overall comparison statistics
    """
    total_comparisons = db.query(ComparisonItem).count()
    total_sessions = db.query(ComparisonSession).count()
    
    # Comparisons in last 7 days
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_comparisons = db.query(ComparisonItem).filter(
        ComparisonItem.added_at >= week_ago
    ).count()
    
    # Unique phones compared
    unique_phones = db.query(func.count(func.distinct(ComparisonItem.slug))).scalar()
    
    return {
        "total_comparisons": total_comparisons,
        "total_sessions": total_sessions,
        "recent_comparisons_7d": recent_comparisons,
        "unique_phones_compared": unique_phones
    }

@router.get("/most-compared")
def get_most_compared_phones(
    limit: int = Query(default=10, le=50),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Get most compared phones
    """
    # Count comparisons per phone slug
    results = db.query(
        ComparisonItem.slug,
        func.count(ComparisonItem.id).label('comparison_count')
    ).group_by(
        ComparisonItem.slug
    ).order_by(
        desc('comparison_count')
    ).limit(limit).all()
    
    # Get phone details
    phone_data = []
    for slug, count in results:
        phone = db.query(Phone).filter(Phone.slug == slug).first()
        if phone:
            phone_data.append({
                "slug": slug,
                "name": phone.name,
                "brand": phone.brand,
                "model": phone.model,
                "img_url": phone.img_url,
                "comparison_count": count
            })
    
    return phone_data

@router.get("/recent")
def get_recent_comparisons(
    limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Get recent comparison activities
    """
    recent = db.query(ComparisonItem).order_by(
        desc(ComparisonItem.added_at)
    ).limit(limit).all()
    
    results = []
    for item in recent:
        phone = db.query(Phone).filter(Phone.slug == item.slug).first()
        user = None
        if item.user_id:
            user = db.query(User).filter(User.id == item.user_id).first()
        
        results.append({
            "id": item.id,
            "phone_name": phone.name if phone else item.slug,
            "phone_slug": item.slug,
            "user_email": user.email if user else "Anonymous",
            "added_at": item.added_at.isoformat() if item.added_at else None,
            "session_id": str(item.session_id) if item.session_id else None
        })
    
    return results

@router.get("/pairs")
def get_comparison_pairs(
    limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Get most common phone comparison pairs
    """
    # Get sessions with exactly 2 phones
    sessions = db.query(ComparisonItem.session_id).group_by(
        ComparisonItem.session_id
    ).having(
        func.count(ComparisonItem.id) == 2
    ).all()
    
    session_ids = [s[0] for s in sessions]
    
    # Get pairs
    pairs_count: Dict[tuple, int] = {}
    for session_id in session_ids:
        items = db.query(ComparisonItem).filter(
            ComparisonItem.session_id == session_id
        ).all()
        
        if len(items) == 2:
            slugs = tuple(sorted([items[0].slug, items[1].slug]))
            pairs_count[slugs] = pairs_count.get(slugs, 0) + 1
    
    # Sort by count
    sorted_pairs = sorted(pairs_count.items(), key=lambda x: x[1], reverse=True)[:limit]
    
    # Get phone details
    results = []
    for (slug1, slug2), count in sorted_pairs:
        phone1 = db.query(Phone).filter(Phone.slug == slug1).first()
        phone2 = db.query(Phone).filter(Phone.slug == slug2).first()
        
        if phone1 and phone2:
            results.append({
                "phone1": {
                    "slug": slug1,
                    "name": phone1.name,
                    "brand": phone1.brand,
                    "img_url": phone1.img_url
                },
                "phone2": {
                    "slug": slug2,
                    "name": phone2.name,
                    "brand": phone2.brand,
                    "img_url": phone2.img_url
                },
                "comparison_count": count
            })
    
    return results
