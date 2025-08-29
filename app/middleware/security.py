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
            is_health_check = request.url.path.startswith("/health")
            is_docs_endpoint = (request.url.path.startswith("/api/v1/docs") or 
                               request.url.path.startswith("/api/v1/redoc") or
                               request.url.path.startswith("/api/v1/openapi.json"))
            
            # Check if request is already HTTPS (considering proxies)
            is_https = (request.url.scheme == "https" or 
                       request.headers.get("x-forwarded-proto") == "https")
            
            # Redirect to HTTPS if not already HTTPS and not a special endpoint
            if request.url.scheme == "http" and not is_health_check and not is_docs_endpoint and not is_https:
                # Build HTTPS URL preserving the original host and path
                https_url = str(request.url).replace("http://", "https://", 1)
                return RedirectResponse(url=https_url, status_code=301)
        
        response = await call_next(request)
        
        # Ensure all redirect responses also use HTTPS in production
        if (os.getenv("ENVIRONMENT") == "production" and 
            isinstance(response, RedirectResponse) and 
            response.headers.get("location", "").startswith("http://")):
            
            # Replace HTTP with HTTPS in the location header
            location = response.headers["location"]
            secure_location = location.replace("http://", "https://", 1)
            response.headers["location"] = secure_location
        
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers for HTTPS.
    """
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Add security headers for production
        if os.getenv("ENVIRONMENT") == "production":
            # Check if this is a documentation endpoint
            is_docs_endpoint = (request.url.path.startswith("/api/v1/docs") or 
                              request.url.path.startswith("/api/v1/redoc") or
                              request.url.path.startswith("/api/v1/openapi.json"))
            
            # Force HTTPS
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            
            # Prevent MIME type sniffing
            response.headers["X-Content-Type-Options"] = "nosniff"
            
            # Referrer policy
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            
            if is_docs_endpoint:
                # Relaxed security for API documentation
                response.headers["X-Frame-Options"] = "SAMEORIGIN"  # Allow framing for docs
                response.headers["X-XSS-Protection"] = "0"  # Disable for docs (can interfere)
                
                # Relaxed CSP for API documentation
                response.headers["Content-Security-Policy"] = (
                    "default-src 'self'; "
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
                    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                    "img-src 'self' data: https: https://cdn.jsdelivr.net; "
                    "connect-src 'self' https:; "
                    "font-src 'self' https: https://cdn.jsdelivr.net; "
                    "frame-ancestors 'self';"
                )
            else:
                # Strict security for other endpoints
                response.headers["X-Frame-Options"] = "DENY"
                response.headers["X-XSS-Protection"] = "1; mode=block"
                
                # Strict CSP for other endpoints
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