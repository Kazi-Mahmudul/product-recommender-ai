"""
Analytics tracking service for automatic page view tracking
"""
from sqlalchemy.orm import Session
from app.models.analytics import PageView
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class AnalyticsService:
    """Service for tracking analytics events"""
    
    @staticmethod
    def track_page_view(
        db: Session,
        path: str,
        session_id: str,
        user_agent: str,
        ip_address: str,
        user_id: Optional[int] = None,
        referrer: Optional[str] = None
    ) -> bool:
        """
        Track a page view
        
        Returns True if successful, False otherwise
        """
        try:
            page_view = PageView(
                user_id=user_id,
                session_id=session_id,
                path=path,
                user_agent=user_agent,
                ip_address=ip_address,
                referrer=referrer,
                created_at=datetime.utcnow()
            )
            
            db.add(page_view)
            db.commit()
            return True
        except Exception as e:
            logger.error(f"Failed to track page view for {path}: {str(e)}")
            db.rollback()
            return False
    
    @staticmethod
    def should_track_path(path: str) -> bool:
        """
        Determine if a path should be tracked
        Exclude health checks, admin endpoints, static assets
        """
        excluded_patterns = [
            '/health',
            '/api/v1/health',
            '/startup-test',
            '/sentry-debug',
            '/_next/',
            '/static/',
            '/favicon.ico',
            '/robots.txt',
            '/sitemap.xml',
            '.js',
            '.css', 
            '.map',
            '/metrics',
            '/api/v1/analytics/track'  # Don't track tracking calls
        ]
        
        path_lower = path.lower()
        return not any(pattern in path_lower for pattern in excluded_patterns)

# Create singleton instance
analytics_service = AnalyticsService()
