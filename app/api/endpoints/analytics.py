from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.analytics import PageView
from typing import Optional
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/track")
async def track_page_view(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Track a page view (public endpoint)
    Accepts JSON body with { path: str, session_id: str }
    """
    try:
        # Parse JSON body
        body = await request.json()
        path = body.get("path", "/")
        session_id = body.get("session_id")
        
        # Get or create session ID
        if not session_id:
            session_id = str(uuid.uuid4())
        
        # Get user agent and IP
        user_agent = request.headers.get("user-agent", "")
        # In production, use X-Forwarded-For if behind proxy
        ip_address = request.client.host if request.client else "unknown"
        
        # Create page view record
        page_view = PageView(
            session_id=session_id,
            path=path,
            user_agent=user_agent,
            ip_address=ip_address,
            user_id=None  # Can be set if user is authenticated
        )
        
        db.add(page_view)
        db.commit()
        
        return {"success": True, "session_id": session_id}
        
    except Exception as e:
        logger.error(f"Error tracking page view: {str(e)}")
        db.rollback()
        # Don't fail the request if tracking fails
        return {"success": False, "error": str(e)}

@router.post("/track-search")
def track_search(
    current_user=Depends(lambda: None),  # Will be replaced with proper import
    db: Session = Depends(get_db)
):
    """
    Track a user search.
    
    - Requires valid JWT token
    - Increments total_searches in usage_stats
    - Updates last_activity timestamp
    """
    from app.api.deps import get_current_verified_user
    from app.crud.auth import track_user_search
    from fastapi import HTTPException, status
    
    # Get current user (will raise 401 if not authenticated)
    current_user = get_current_verified_user()
    
    try:
        result = track_user_search(db, current_user.id)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to track search"
            )
        
        return {"success": True, "message": "Search tracked successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking search: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to track search"
        )

@router.post("/track-comparison")
def track_comparison(
    current_user=Depends(lambda: None),  # Will be replaced with proper import
    db: Session = Depends(get_db)
):
    """
    Track a user comparison.
    
    - Requires valid JWT token
    - Increments total_comparisons in usage_stats
    - Updates last_activity timestamp
    """
    from app.api.deps import get_current_verified_user
    from app.crud.auth import track_user_comparison
    from fastapi import HTTPException, status
    
    # Get current user (will raise 401 if not authenticated)
    current_user = get_current_verified_user()
    
    try:
        result = track_user_comparison(db, current_user.id)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to track comparison"
            )
        
        return {"success": True, "message": "Comparison tracked successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking comparison: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to track comparison"
        )
