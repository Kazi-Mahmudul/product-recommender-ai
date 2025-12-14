"""
Usage tracking middleware for tracking user searches and comparisons.
"""
from fastapi import Request
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)

def track_search_if_authenticated(request: Request, db: Session):
    """
    Track search for authenticated users.
    Call this from search endpoints when a search query is present.
    """
    try:
        # Check if user is authenticated
        user = getattr(request.state, 'user', None)
        if not user:
            return
        
        # Check if this is a search request
        search_query = request.query_params.get('search') or request.query_params.get('q')
        if not search_query:
            return
        
        # Track the search
        from app.crud.auth import track_user_search
        track_user_search(db, user.id)
        logger.info(f"Tracked search for user {user.id}")
    except Exception as e:
        logger.warning(f"Failed to track search: {str(e)}")

def track_comparison_if_authenticated(request: Request, db: Session):
    """
    Track comparison for authenticated users.
    Call this from comparison endpoints.
    """
    try:
        # Check if user is authenticated
        user = getattr(request.state, 'user', None)
        if not user:
            return
        
        # Track the comparison
        from app.crud.auth import track_user_comparison
        track_user_comparison(db, user.id)
        logger.info(f"Tracked comparison for user {user.id}")
    except Exception as e:
        logger.warning(f"Failed to track comparison: {str(e)}")
