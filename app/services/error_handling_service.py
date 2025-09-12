"""
Error Handling Service - Comprehensive error handling and logging for the chat system.

This service provides structured error handling, request tracking, and performance monitoring
for all chat system components.
"""

import logging
import time
import uuid
import traceback
from typing import Dict, Any, Optional, List
from functools import wraps
from contextlib import contextmanager
import threading
from collections import defaultdict, deque

logger = logging.getLogger(__name__)


class ErrorHandlingService:
    """
    Comprehensive error handling and monitoring service.
    """
    
    def __init__(self):
        self.request_metrics = defaultdict(lambda: {
            "count": 0,
            "total_time": 0.0,
            "error_count": 0,
            "last_error": None,
            "recent_times": deque(maxlen=100)  # Keep last 100 response times
        })
        self.error_history = deque(maxlen=1000)  # Keep last 1000 errors
        self.active_requests = {}
        self.metrics_lock = threading.RLock()
        
    def generate_request_id(self) -> str:
        """Generate unique request ID for tracking."""
        return str(uuid.uuid4())[:8]
    
    @contextmanager
    def track_request(self, request_id: str, operation: str, **context):
        """
        Context manager for tracking request performance and errors.
        
        Args:
            request_id: Unique request identifier
            operation: Name of the operation being tracked
            **context: Additional context information
        """
        start_time = time.time()
        
        # Record active request
        with self.metrics_lock:
            self.active_requests[request_id] = {
                "operation": operation,
                "start_time": start_time,
                "context": context
            }
        
        try:
            logger.info(f"[{request_id}] Starting {operation}")
            yield request_id
            
            # Record successful completion
            duration = time.time() - start_time
            self._record_success(operation, duration)
            logger.info(f"[{request_id}] Completed {operation} in {duration:.3f}s")
            
        except Exception as e:
            # Record error
            duration = time.time() - start_time
            error_info = self._record_error(request_id, operation, e, duration, context)
            
            logger.error(f"[{request_id}] Error in {operation} after {duration:.3f}s: {str(e)}")
            raise
            
        finally:
            # Remove from active requests
            with self.metrics_lock:
                self.active_requests.pop(request_id, None)
    
    def _record_success(self, operation: str, duration: float):
        """Record successful operation metrics."""
        with self.metrics_lock:
            metrics = self.request_metrics[operation]
            metrics["count"] += 1
            metrics["total_time"] += duration
            metrics["recent_times"].append(duration)
    
    def _record_error(self, request_id: str, operation: str, error: Exception, 
                     duration: float, context: Dict[str, Any]) -> Dict[str, Any]:
        """Record error information and metrics."""
        error_info = {
            "request_id": request_id,
            "operation": operation,
            "error_type": type(error).__name__,
            "error_message": str(error),
            "duration": duration,
            "timestamp": time.time(),
            "context": context,
            "traceback": traceback.format_exc()
        }
        
        with self.metrics_lock:
            # Update operation metrics
            metrics = self.request_metrics[operation]
            metrics["error_count"] += 1
            metrics["last_error"] = error_info
            
            # Add to error history
            self.error_history.append(error_info)
        
        return error_info
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get comprehensive metrics for all operations."""
        with self.metrics_lock:
            metrics_summary = {}
            
            for operation, metrics in self.request_metrics.items():
                recent_times = list(metrics["recent_times"])
                avg_time = metrics["total_time"] / max(metrics["count"], 1)
                
                # Calculate percentiles if we have recent data
                percentiles = {}
                if recent_times:
                    sorted_times = sorted(recent_times)
                    percentiles = {
                        "p50": sorted_times[len(sorted_times) // 2],
                        "p95": sorted_times[int(len(sorted_times) * 0.95)],
                        "p99": sorted_times[int(len(sorted_times) * 0.99)]
                    }
                
                metrics_summary[operation] = {
                    "total_requests": metrics["count"],
                    "error_count": metrics["error_count"],
                    "error_rate": metrics["error_count"] / max(metrics["count"], 1) * 100,
                    "avg_response_time": avg_time,
                    "recent_response_times": percentiles,
                    "last_error": metrics["last_error"]["error_message"] if metrics["last_error"] else None
                }
            
            return {
                "operations": metrics_summary,
                "active_requests": len(self.active_requests),
                "total_errors": len(self.error_history),
                "summary": {
                    "total_requests": sum(m["count"] for m in self.request_metrics.values()),
                    "total_errors": sum(m["error_count"] for m in self.request_metrics.values())
                }
            }
    
    def get_recent_errors(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent errors for debugging."""
        with self.metrics_lock:
            recent_errors = list(self.error_history)[-limit:]
            
            # Remove traceback for summary view
            summary_errors = []
            for error in recent_errors:
                summary_error = error.copy()
                summary_error.pop("traceback", None)
                summary_errors.append(summary_error)
            
            return summary_errors
    
    def get_error_details(self, request_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed error information for a specific request."""
        with self.metrics_lock:
            for error in self.error_history:
                if error["request_id"] == request_id:
                    return error
        return None
    
    def clear_metrics(self):
        """Clear all metrics and error history."""
        with self.metrics_lock:
            self.request_metrics.clear()
            self.error_history.clear()
            logger.info("Cleared all error handling metrics")


# Global error handling service instance
error_service = ErrorHandlingService()


def track_performance(operation: str = None):
    """
    Decorator for tracking function performance and errors.
    
    Args:
        operation: Name of the operation (defaults to function name)
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            op_name = operation or f"{func.__module__}.{func.__name__}"
            request_id = error_service.generate_request_id()
            
            with error_service.track_request(request_id, op_name, 
                                           function=func.__name__, 
                                           args_count=len(args),
                                           kwargs_keys=list(kwargs.keys())):
                return await func(*args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            op_name = operation or f"{func.__module__}.{func.__name__}"
            request_id = error_service.generate_request_id()
            
            with error_service.track_request(request_id, op_name,
                                           function=func.__name__,
                                           args_count=len(args),
                                           kwargs_keys=list(kwargs.keys())):
                return func(*args, **kwargs)
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


class ChatErrorHandler:
    """
    Specialized error handler for chat system operations.
    """
    
    @staticmethod
    def handle_gemini_service_error(error: Exception, query: str, request_id: str) -> Dict[str, Any]:
        """Handle errors from Gemini AI service."""
        error_type = type(error).__name__
        
        if "timeout" in str(error).lower():
            return {
                "response_type": "text",
                "content": {
                    "text": "I'm taking a bit longer to process your request. Please try rephrasing your question or try again in a moment.",
                    "error": True
                },
                "suggestions": [
                    "Try a simpler question",
                    "Ask about specific phone models",
                    "Try again in a moment"
                ],
                "metadata": {
                    "error_type": "timeout",
                    "request_id": request_id
                }
            }
        
        elif "connection" in str(error).lower():
            return {
                "response_type": "text",
                "content": {
                    "text": "I'm having trouble connecting to my AI service. Let me try to help you with a basic response.",
                    "error": True
                },
                "suggestions": [
                    "Ask for phone recommendations",
                    "Compare specific phone models",
                    "Try again in a few minutes"
                ],
                "metadata": {
                    "error_type": "connection",
                    "request_id": request_id
                }
            }
        
        else:
            return {
                "response_type": "text",
                "content": {
                    "text": "I encountered an issue while processing your request. Please try rephrasing your question.",
                    "error": True
                },
                "suggestions": [
                    "Try rephrasing your question",
                    "Ask about phone recommendations",
                    "Be more specific about what you're looking for"
                ],
                "metadata": {
                    "error_type": error_type,
                    "request_id": request_id
                }
            }
    
    @staticmethod
    def handle_database_error(error: Exception, operation: str, request_id: str) -> Dict[str, Any]:
        """Handle database-related errors."""
        error_type = type(error).__name__
        
        if "timeout" in str(error).lower():
            return {
                "response_type": "text",
                "content": {
                    "text": "The phone database is taking longer than usual to respond. Please try again in a moment.",
                    "error": True
                },
                "suggestions": [
                    "Try again in a moment",
                    "Ask for popular phone recommendations",
                    "Try a simpler search"
                ],
                "metadata": {
                    "error_type": "database_timeout",
                    "request_id": request_id
                }
            }
        
        elif "connection" in str(error).lower():
            return {
                "response_type": "text",
                "content": {
                    "text": "I'm having trouble accessing the phone database right now. Please try again shortly.",
                    "error": True
                },
                "suggestions": [
                    "Try again in a few minutes",
                    "Ask general questions about phones",
                    "Check back later"
                ],
                "metadata": {
                    "error_type": "database_connection",
                    "request_id": request_id
                }
            }
        
        else:
            return {
                "response_type": "text",
                "content": {
                    "text": "I encountered an issue while searching the phone database. Please try a different search.",
                    "error": True
                },
                "suggestions": [
                    "Try different search terms",
                    "Ask for phone recommendations",
                    "Be more specific about your requirements"
                ],
                "metadata": {
                    "error_type": f"database_{error_type}",
                    "request_id": request_id
                }
            }
    
    @staticmethod
    def handle_validation_error(error: Exception, data_type: str, request_id: str) -> Dict[str, Any]:
        """Handle data validation errors."""
        return {
            "response_type": "text",
            "content": {
                "text": f"I received some invalid {data_type} data. Please check your input and try again.",
                "error": True
            },
            "suggestions": [
                "Check your input format",
                "Try with different parameters",
                "Ask for help with the correct format"
            ],
            "metadata": {
                "error_type": "validation_error",
                "data_type": data_type,
                "request_id": request_id
            }
        }
    
    @staticmethod
    def handle_generic_error(error: Exception, operation: str, request_id: str) -> Dict[str, Any]:
        """Handle generic errors with graceful fallback."""
        return {
            "response_type": "text",
            "content": {
                "text": "I encountered an unexpected issue while processing your request. Please try again or rephrase your question.",
                "error": True
            },
            "suggestions": [
                "Try rephrasing your question",
                "Ask for phone recommendations",
                "Try a different type of query",
                "Contact support if the issue persists"
            ],
            "metadata": {
                "error_type": "generic_error",
                "operation": operation,
                "request_id": request_id
            }
        }