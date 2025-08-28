"""
Logging middleware for API request tracking.
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import time
import logging
import json

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log API requests and responses for debugging."""
    
    async def dispatch(self, request: Request, call_next):
        # Start timing
        start_time = time.time()
        
        # Log request details
        request_info = {
            "method": request.method,
            "url": str(request.url),
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "headers": dict(request.headers),
            "client_ip": request.client.host if request.client else "unknown"
        }
        
        # Don't log sensitive headers
        sensitive_headers = ["authorization", "cookie", "x-api-key"]
        for header in sensitive_headers:
            if header in request_info["headers"]:
                request_info["headers"][header] = "[REDACTED]"
        
        logger.info(f"API Request: {request.method} {request.url.path}")
        logger.debug(f"Request details: {json.dumps(request_info, indent=2)}")
        
        # Process request
        try:
            response = await call_next(request)
            
            # Calculate processing time
            process_time = time.time() - start_time
            
            # Log response details
            response_info = {
                "status_code": response.status_code,
                "processing_time_ms": round(process_time * 1000, 2),
                "response_headers": dict(response.headers)
            }
            
            # Log based on status code
            if response.status_code >= 500:
                logger.error(f"API Response: {response.status_code} for {request.method} {request.url.path} ({process_time:.3f}s)")
            elif response.status_code >= 400:
                logger.warning(f"API Response: {response.status_code} for {request.method} {request.url.path} ({process_time:.3f}s)")
            else:
                logger.info(f"API Response: {response.status_code} for {request.method} {request.url.path} ({process_time:.3f}s)")
            
            logger.debug(f"Response details: {json.dumps(response_info, indent=2)}")
            
            # Add processing time header
            response.headers["X-Process-Time"] = str(process_time)
            
            return response
            
        except Exception as e:
            # Log exceptions
            process_time = time.time() - start_time
            logger.error(f"API Exception: {str(e)} for {request.method} {request.url.path} ({process_time:.3f}s)", exc_info=True)
            raise