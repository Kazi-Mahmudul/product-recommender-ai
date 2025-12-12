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
    path: str,
    session_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Track a page view (public endpoint)
    """
    try:
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
        return {"success": False, "session_id": session_id}
