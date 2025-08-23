"""
Production-ready session management utility
Handles both cookie-based and header-based session tracking
"""

import uuid
import os
import logging
from typing import Optional, Tuple, Dict, Any
from fastapi import Response, Cookie, Header

logger = logging.getLogger(__name__)

class SessionManager:
    """Manages comparison sessions with fallback strategies"""
    
    @staticmethod
    def get_session_id(
        cookie_session_id: Optional[uuid.UUID] = None,
        header_session_id: Optional[str] = None
    ) -> Optional[uuid.UUID]:
        """
        Get session ID from cookie or header with proper validation
        
        Args:
            cookie_session_id: Session ID from cookie
            header_session_id: Session ID from X-Session-ID header
            
        Returns:
            Valid UUID session ID or None
        """
        # Try cookie first (preferred method)
        if cookie_session_id:
            logger.debug(f"Using session ID from cookie: {cookie_session_id}")
            return cookie_session_id
        
        # Fallback to header
        if header_session_id:
            try:
                session_id = uuid.UUID(header_session_id)
                logger.debug(f"Using session ID from header: {session_id}")
                return session_id
            except ValueError:
                logger.warning(f"Invalid session ID in header: {header_session_id}")
        
        logger.debug("No valid session ID found in cookie or header")
        return None
    
    @staticmethod
    def set_session_cookie(response: Response, session_id: uuid.UUID) -> None:
        """
        Set session cookie with production-appropriate settings
        
        Args:
            response: FastAPI Response object
            session_id: Session UUID to store
        """
        is_production = os.getenv("ENVIRONMENT", "development") == "production"
        is_https = os.getenv("HTTPS_ENABLED", "false").lower() == "true"
        
        # Production settings
        if is_production:
            response.set_cookie(
                key="comparison_session_id",
                value=str(session_id),
                httponly=True,
                secure=is_https,  # HTTPS only if available
                samesite="lax",   # Allow cross-origin with some restrictions
                max_age=86400,    # 24 hours
                path="/",         # Available for all paths
            )
        else:
            # Development settings - more permissive
            response.set_cookie(
                key="comparison_session_id",
                value=str(session_id),
                httponly=True,
                secure=False,     # Allow HTTP for local development
                samesite="lax",   # More permissive for cross-origin
                max_age=86400,    # 24 hours
                path="/",
            )
        
        logger.info(f"Set session cookie: {session_id} (production: {is_production})")
    
    @staticmethod
    def create_session_response(session_id: uuid.UUID) -> Dict[str, Any]:
        """
        Create standardized session response
        
        Args:
            session_id: Session UUID
            
        Returns:
            Dictionary with session information
        """
        return {
            "session_id": str(session_id),
            "expires_in": 86400,  # 24 hours in seconds
            "created_at": "now"   # Will be replaced by actual timestamp
        }