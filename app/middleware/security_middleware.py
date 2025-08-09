"""
Security Middleware for Contextual Query API Endpoints
"""

import logging
import time
from typing import Callable, Dict, Any, Optional
from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime
import json

from app.services.security_validator import (
    input_validator, rate_limiter, session_security, data_privacy_manager,
    SecurityContext, ValidationResult
)
from app.services.monitoring_analytics import monitoring_analytics, MetricType

logger = logging.getLogger(__name__)

class SecurityMiddleware(BaseHTTPMiddleware):
    """Security middleware for contextual query endpoints"""
    
    def __init__(self, app, protected_paths: list = None):
        """Initialize security middleware"""
        super().__init__(app)
        self.protected_paths = protected_paths or [
            "/api/v1/contextual-query",
            "/api/v1/query",
            "/api/v1/parse-intent",
            "/api/v1/resolve-phones",
            "/api/v1/context/"
        ]
        
        # Security headers
        self.security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        }
        
        logger.info(f"Security middleware initialized for paths: {self.protected_paths}")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request through security middleware"""
        start_time = time.time()
        
        # Check if path needs protection
        needs_protection = any(request.url.path.startswith(path) for path in self.protected_paths)
        
        if needs_protection:
            # Create security context
            security_context = self._create_security_context(request)
            
            # Apply security checks
            security_result = await self._apply_security_checks(request, security_context)
            
            if not security_result['allowed']:
                # Security check failed
                processing_time = time.time() - start_time
                
                # Record security violation
                monitoring_analytics.record_metric(
                    f"security_violation_{security_result['reason']}", 
                    1, 
                    MetricType.COUNTER
                )
                
                monitoring_analytics.record_metric(
                    "security_check_time", 
                    processing_time, 
                    MetricType.TIMER
                )
                
                return JSONResponse(
                    status_code=security_result['status_code'],
                    content={
                        "error": security_result['message'],
                        "code": security_result['reason'],
                        "timestamp": datetime.now().isoformat()
                    }
                )
        
        # Process request
        try:
            response = await call_next(request)
            
            # Add security headers
            for header, value in self.security_headers.items():
                response.headers[header] = value
            
            # Record successful request
            if needs_protection:
                processing_time = time.time() - start_time
                monitoring_analytics.record_metric(
                    "security_check_success", 
                    1, 
                    MetricType.COUNTER
                )
                monitoring_analytics.record_metric(
                    "security_check_time", 
                    processing_time, 
                    MetricType.TIMER
                )
            
            return response
            
        except Exception as e:
            logger.error(f"Error in security middleware: {e}")
            
            # Record error
            monitoring_analytics.record_metric(
                "security_middleware_error", 
                1, 
                MetricType.COUNTER
            )
            
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "error": "Internal security error",
                    "timestamp": datetime.now().isoformat()
                }
            )
    
    def _create_security_context(self, request: Request) -> SecurityContext:
        """Create security context from request"""
        # Extract client IP
        client_ip = self._get_client_ip(request)
        
        # Extract user agent
        user_agent = request.headers.get("user-agent", "")
        
        # Extract session ID from headers or query params
        session_id = (
            request.headers.get("x-session-id") or
            request.query_params.get("session_id") or
            ""
        )
        
        # Extract user ID if available
        user_id = request.headers.get("x-user-id")
        
        return SecurityContext(
            session_id=session_id,
            user_id=user_id,
            ip_address=client_ip,
            user_agent=user_agent,
            timestamp=datetime.now()
        )
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request"""
        # Check for forwarded headers (reverse proxy)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first IP in the chain
            return forwarded_for.split(",")[0].strip()
        
        # Check for real IP header
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to client host
        if hasattr(request, "client") and request.client:
            return request.client.host
        
        return "unknown"
    
    async def _apply_security_checks(self, request: Request, context: SecurityContext) -> Dict[str, Any]:
        """Apply comprehensive security checks"""
        
        # 1. Rate limiting check
        rate_limit_result = rate_limiter.is_allowed(
            context.ip_address, 
            endpoint=request.url.path
        )
        
        if not rate_limit_result[0]:
            return {
                'allowed': False,
                'reason': 'rate_limited',
                'message': 'Rate limit exceeded. Please try again later.',
                'status_code': status.HTTP_429_TOO_MANY_REQUESTS,
                'details': rate_limit_result[1]
            }
        
        # 2. Input validation for POST requests
        if request.method == "POST":
            try:
                # Read request body
                body = await request.body()
                if body:
                    try:
                        request_data = json.loads(body.decode())
                        
                        # Validate query input if present
                        if 'query' in request_data:
                            validation_result = input_validator.validate_query_input(
                                request_data['query'], 
                                context
                            )
                            
                            if not validation_result.is_valid:
                                return {
                                    'allowed': False,
                                    'reason': 'invalid_input',
                                    'message': 'Invalid or potentially malicious input detected.',
                                    'status_code': status.HTTP_400_BAD_REQUEST,
                                    'details': {
                                        'violations': validation_result.violations,
                                        'risk_level': validation_result.risk_level
                                    }
                                }
                        
                        # Validate session ID if present
                        if 'session_id' in request_data:
                            session_validation = input_validator.validate_session_id(
                                request_data['session_id']
                            )
                            
                            if not session_validation.is_valid:
                                return {
                                    'allowed': False,
                                    'reason': 'invalid_session',
                                    'message': 'Invalid session ID format.',
                                    'status_code': status.HTTP_400_BAD_REQUEST,
                                    'details': session_validation.violations
                                }
                    
                    except json.JSONDecodeError:
                        return {
                            'allowed': False,
                            'reason': 'invalid_json',
                            'message': 'Invalid JSON in request body.',
                            'status_code': status.HTTP_400_BAD_REQUEST
                        }
                    
            except Exception as e:
                logger.error(f"Error reading request body: {e}")
                return {
                    'allowed': False,
                    'reason': 'body_read_error',
                    'message': 'Error processing request.',
                    'status_code': status.HTTP_400_BAD_REQUEST
                }
        
        # 3. Session validation for context endpoints
        if "/context/" in request.url.path and context.session_id:
            session_valid, session_details = session_security.validate_session_access(
                context.session_id, 
                context
            )
            
            if not session_valid:
                return {
                    'allowed': False,
                    'reason': 'session_invalid',
                    'message': 'Invalid or expired session.',
                    'status_code': status.HTTP_401_UNAUTHORIZED,
                    'details': session_details
                }
        
        # 4. Check for suspicious user agents
        if self._is_suspicious_user_agent(context.user_agent):
            return {
                'allowed': False,
                'reason': 'suspicious_user_agent',
                'message': 'Request blocked due to suspicious client.',
                'status_code': status.HTTP_403_FORBIDDEN
            }
        
        # 5. Check request size limits
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                size = int(content_length)
                if size > 1024 * 1024:  # 1MB limit
                    return {
                        'allowed': False,
                        'reason': 'request_too_large',
                        'message': 'Request body too large.',
                        'status_code': status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
                    }
            except ValueError:
                pass
        
        # All checks passed
        return {
            'allowed': True,
            'rate_limit_info': rate_limit_result[1]
        }
    
    def _is_suspicious_user_agent(self, user_agent: str) -> bool:
        """Check if user agent is suspicious"""
        if not user_agent:
            return True  # Empty user agent is suspicious
        
        suspicious_patterns = [
            r'bot',
            r'crawler',
            r'spider',
            r'scraper',
            r'curl',
            r'wget',
            r'python-requests',
            r'postman',
            r'insomnia'
        ]
        
        user_agent_lower = user_agent.lower()
        
        # Check for suspicious patterns
        for pattern in suspicious_patterns:
            if pattern in user_agent_lower:
                return True
        
        # Check for very short user agents
        if len(user_agent) < 10:
            return True
        
        return False

class InputSanitizationMiddleware(BaseHTTPMiddleware):
    """Middleware for input sanitization"""
    
    def __init__(self, app):
        """Initialize input sanitization middleware"""
        super().__init__(app)
        logger.info("Input sanitization middleware initialized")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Sanitize request inputs"""
        
        # For POST requests, sanitize JSON body
        if request.method == "POST":
            try:
                body = await request.body()
                if body:
                    try:
                        request_data = json.loads(body.decode())
                        sanitized_data = self._sanitize_request_data(request_data)
                        
                        # Replace request body with sanitized data
                        sanitized_body = json.dumps(sanitized_data).encode()
                        
                        # Create new request with sanitized body
                        async def receive():
                            return {
                                "type": "http.request",
                                "body": sanitized_body,
                                "more_body": False
                            }
                        
                        request._receive = receive
                        
                    except json.JSONDecodeError:
                        # Invalid JSON, let it pass through for proper error handling
                        pass
                        
            except Exception as e:
                logger.error(f"Error in input sanitization: {e}")
        
        # Process request
        response = await call_next(request)
        return response
    
    def _sanitize_request_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively sanitize request data"""
        if isinstance(data, dict):
            sanitized = {}
            for key, value in data.items():
                sanitized_key = self._sanitize_string(key) if isinstance(key, str) else key
                sanitized[sanitized_key] = self._sanitize_request_data(value)
            return sanitized
        
        elif isinstance(data, list):
            return [self._sanitize_request_data(item) for item in data]
        
        elif isinstance(data, str):
            return self._sanitize_string(data)
        
        else:
            return data
    
    def _sanitize_string(self, text: str) -> str:
        """Sanitize string input"""
        if not text:
            return text
        
        # Use the input validator's sanitization
        return input_validator._sanitize_text(text)

class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """CSRF protection middleware"""
    
    def __init__(self, app, exempt_paths: list = None):
        """Initialize CSRF protection middleware"""
        super().__init__(app)
        self.exempt_paths = exempt_paths or [
            "/api/v1/health",
            "/api/v1/metrics"
        ]
        logger.info("CSRF protection middleware initialized")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Apply CSRF protection"""
        
        # Skip CSRF check for exempt paths
        if any(request.url.path.startswith(path) for path in self.exempt_paths):
            return await call_next(request)
        
        # Skip CSRF check for GET requests
        if request.method == "GET":
            return await call_next(request)
        
        # Check for CSRF token in headers
        csrf_token = request.headers.get("x-csrf-token")
        
        if not csrf_token:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "error": "CSRF token required",
                    "code": "csrf_token_missing"
                }
            )
        
        # Validate CSRF token (simple validation - in production, use proper CSRF tokens)
        if not self._validate_csrf_token(csrf_token, request):
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "error": "Invalid CSRF token",
                    "code": "csrf_token_invalid"
                }
            )
        
        return await call_next(request)
    
    def _validate_csrf_token(self, token: str, request: Request) -> bool:
        """Validate CSRF token"""
        # Simple validation - in production, implement proper CSRF token validation
        # This could involve checking against a session-based token or signed token
        
        if not token or len(token) < 16:
            return False
        
        # For now, accept any token that looks valid
        # In production, implement proper token validation
        return True