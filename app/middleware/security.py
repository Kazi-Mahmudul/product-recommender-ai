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
        # Skip HTTPS redirect for OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            response = await call_next(request)
            return response
            
        if os.getenv("ENVIRONMENT") == "production":
            # Skip redirect for local development even in production mode
            # Check if we're running locally by checking the host
            host = request.headers.get("host", "")
            if host.startswith("localhost") or host.startswith("127.0.0.1"):
                # Local development, don't redirect
                response = await call_next(request)
                return response
                
            is_health_check = request.url.path.startswith("/health")
            is_docs_endpoint = (
                request.url.path.startswith("/api/v1/docs")
                or request.url.path.startswith("/api/v1/redoc")
                or request.url.path.startswith("/api/v1/openapi.json")
            )

            # TRUST Cloud Run proxy headers
            forwarded_proto = request.headers.get("x-forwarded-proto", "http")
            is_https = forwarded_proto == "https"
            
            # Also check if the request is actually coming over HTTPS
            # by checking the scheme directly
            is_request_https = str(request.url).startswith("https://")

            # Only redirect if truly plain http (no proxy saying https)
            # and the request itself is not already HTTPS
            if not is_https and not is_request_https and not is_health_check and not is_docs_endpoint:
                https_url = str(request.url).replace("http://", "https://", 1)
                return RedirectResponse(url=https_url, status_code=301)

        response = await call_next(request)

        # Fix redirect responses to always be https
        if (
            os.getenv("ENVIRONMENT") == "production"
            and isinstance(response, RedirectResponse)
            and response.headers.get("location", "").startswith("http://")
        ):
            location = response.headers["location"]
            response.headers["location"] = location.replace("http://", "https://", 1)

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
            
            # Allow popups for Google OAuth
            response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
        
        return response