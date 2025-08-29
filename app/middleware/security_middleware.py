# app/middleware/security_middleware.py
import os
import time
import secrets
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Allow disabling CSRF via env var (for Cloud Run / API use)
        if os.getenv("DISABLE_CSRF", "false").lower() == "true":
            return await call_next(request)

        if request.method not in ("GET", "HEAD", "OPTIONS", "TRACE"):
            csrf_token = request.headers.get("x-csrf-token")
            if not csrf_token:
                return JSONResponse(
                    {"detail": "CSRF token missing"},
                    status_code=403
                )

        response = await call_next(request)
        return response


class SecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, config):
        super().__init__(app)
        self.config = config
        self.failed_attempts = {}
        self.max_attempts = 5
        self.block_time = 300  # 5 minutes
        self.session_timeout = 1800  # 30 minutes
        self.protected_paths = [
            "/api/v1/contextual-query",
            "/api/v1/query",
            "/api/v1/parse-intent",
            "/api/v1/resolve-phones",
            "/api/v1/context/"
        ]
        self.exempt_paths = [
            "/health",               # Cloud Run health check
            "/metrics",              # Metrics endpoint
            "/api/v1/docs",          # Swagger docs
            "/api/v1/openapi.json",  # OpenAPI schema
            "/api/v1/redoc"          # ReDoc docs
        ]

        # Updated CSP: allow frontend + Cloud Run
        self.security_headers = {
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "connect-src 'self' https://peyechi.com https://peyechi.vercel.app https://*.run.app; "
                "font-src 'self' https:; "
                "frame-ancestors 'none';"
            ),
        }

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        client_ip = request.client.host if request.client else "unknown"

        # Skip exempt paths
        if path in self.exempt_paths:
            return await call_next(request)

        # Rate limiting
        now = time.time()
        if client_ip in self.failed_attempts:
            attempts, last_attempt = self.failed_attempts[client_ip]
            if attempts >= self.max_attempts and (now - last_attempt) < self.block_time:
                return JSONResponse(
                    {"detail": "Too many failed attempts, please try again later"},
                    status_code=429,
                )
            if (now - last_attempt) >= self.block_time:
                self.failed_attempts[client_ip] = (0, now)

        # Check session (skip for exempt paths)
        if path not in self.exempt_paths:
            session_token = request.cookies.get("session_token")
            session_timestamp = request.cookies.get("session_timestamp")

            if not session_token or not session_timestamp:
                self.failed_attempts[client_ip] = (self.failed_attempts.get(client_ip, (0, 0))[0] + 1, now)
                return JSONResponse({"detail": "Invalid session"}, status_code=401)

            if (now - float(session_timestamp)) > self.session_timeout:
                return JSONResponse({"detail": "Session expired"}, status_code=401)

        # Suspicious User-Agent
        user_agent = request.headers.get("User-Agent", "")
        if not user_agent or "curl" in user_agent.lower() or "wget" in user_agent.lower():
            return JSONResponse({"detail": "Suspicious activity detected"}, status_code=400)

        # Continue request
        response = await call_next(request)

        # Add security headers
        for header, value in self.security_headers.items():
            response.headers[header] = value

        # Set secure session cookies if not present
        if "session_token" not in request.cookies:
            session_token = secrets.token_urlsafe(32)
            response.set_cookie(
                "session_token",
                session_token,
                httponly=True,
                secure=True,
                samesite="strict"
            )
            response.set_cookie(
                "session_timestamp",
                str(now),
                httponly=True,
                secure=True,
                samesite="strict"
            )

        return response


class InputSanitizationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Sanitize query params
        for key, value in request.query_params.items():
            if any(char in value for char in "<>{}[];"):
                return JSONResponse({"detail": "Invalid characters in query"}, status_code=400)

        # Sanitize headers
        for key, value in request.headers.items():
            if any(char in value for char in "<>{}[];"):
                return JSONResponse({"detail": "Invalid characters in headers"}, status_code=400)

        return await call_next(request)