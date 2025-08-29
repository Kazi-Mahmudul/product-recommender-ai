"""
Optimized logging middleware for API request tracking.
Structured JSON logs for better observability in production.
"""

import time
import logging
import json
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("api_logger")
logger.setLevel(logging.INFO)

# Stream handler with JSON formatter (can be ingested by GCP/Datadog/ELK)
handler = logging.StreamHandler()
formatter = logging.Formatter('%(message)s')
handler.setFormatter(formatter)
if not logger.handlers:
    logger.addHandler(handler)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log incoming API requests and responses."""

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        # Collect request info
        request_info = {
            "method": request.method,
            "path": request.url.path,
            "query": dict(request.query_params),
            "client_ip": request.client.host if request.client else None,
        }

        # Mask sensitive headers
        headers = dict(request.headers)
        sensitive = {"authorization", "cookie", "x-api-key"}
        request_info["headers"] = {
            k: ("[REDACTED]" if k.lower() in sensitive else v)
            for k, v in headers.items()
        }

        # Log request
        logger.info(json.dumps({
            "event": "request",
            **request_info
        }))

        try:
            response: Response = await call_next(request)
            process_time = round((time.time() - start_time) * 1000, 2)

            response_info = {
                "status_code": response.status_code,
                "process_time_ms": process_time,
            }

            # Log response (different levels depending on status code)
            level = (
                logging.ERROR if response.status_code >= 500 else
                logging.WARNING if response.status_code >= 400 else
                logging.INFO
            )

            logger.log(level, json.dumps({
                "event": "response",
                "method": request.method,
                "path": request.url.path,
                **response_info
            }))

            # Add custom header
            response.headers["X-Process-Time"] = str(process_time)
            return response

        except Exception as e:
            process_time = round((time.time() - start_time) * 1000, 2)
            logger.error(json.dumps({
                "event": "exception",
                "method": request.method,
                "path": request.url.path,
                "error": str(e),
                "process_time_ms": process_time
            }), exc_info=True)
            raise