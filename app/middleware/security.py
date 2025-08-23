"""
Security middleware for HTTPS enforcement and security headers.
"""

from fastapi import Request, Response
from fastapi.responses import RedirectResponse
from starlette.middleware.base import BaseHTTPMiddleware
import os


class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    """
    Middleware to redirect HTTP requests to HTTPS in production.
    """
    
    async def dispatch(self, request: Request, call_next):
        # Only redirect in production environment
        if os.getenv("ENVIRONMENT") == "production":
            # Check if the request is HTTP and not from a health check
            if (request.url.scheme == "http" and 
                not request.url.path.startswith("/health") and
                not request.headers.get("x-forwarded-proto") == "https"):
                
                # Redirect to HTTPS
                https_url = request.url.replace(scheme="https")
                return RedirectResponse(url=str(https_url), status_code=301)
        
        response = await call_next(request)
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers for HTTPS.
    """
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Add security headers for production
        if os.getenv("ENVIRONMENT") == "production":
            # Force HTTPS
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            
            # Prevent clickjacking
            response.headers["X-Frame-Options"] = "DENY"
            
            # Prevent MIME type sniffing
            response.headers["X-Content-Type-Options"] = "nosniff"
            
            # XSS protection
            response.headers["X-XSS-Protection"] = "1; mode=block"
            
            # Referrer policy
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            
            # Content Security Policy
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "connect-src 'self' https:; "
                "font-src 'self' https:; "
                "frame-ancestors 'none';"
            )
        
        return response