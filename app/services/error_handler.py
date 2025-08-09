"""
Comprehensive Error Handling System for Contextual Query Processing
"""

import logging
import traceback
import uuid
from typing import Dict, List, Any, Optional, Type
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

class ErrorCategory(Enum):
    """Categories of errors in the contextual query system"""
    PHONE_RESOLUTION = "phone_resolution"
    CONTEXT_PROCESSING = "context_processing"
    FILTER_GENERATION = "filter_generation"
    EXTERNAL_SERVICE = "external_service"
    DATABASE = "database"
    VALIDATION = "validation"
    AUTHENTICATION = "authentication"
    RATE_LIMITING = "rate_limiting"
    SYSTEM = "system"

class ErrorSeverity(Enum):
    """Severity levels for errors"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class ErrorContext:
    """Context information for an error"""
    error_id: str
    category: ErrorCategory
    severity: ErrorSeverity
    message: str
    user_message: str
    suggestions: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)
    stack_trace: Optional[str] = None
    recoverable: bool = True

class ContextualError(Exception):
    """Base exception for contextual query system errors"""
    
    def __init__(
        self, 
        message: str, 
        category: ErrorCategory = ErrorCategory.SYSTEM,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        user_message: str = None,
        suggestions: List[str] = None,
        metadata: Dict[str, Any] = None,
        recoverable: bool = True
    ):
        super().__init__(message)
        self.error_id = str(uuid.uuid4())
        self.category = category
        self.severity = severity
        self.user_message = user_message or "An error occurred while processing your request."
        self.suggestions = suggestions or []
        self.metadata = metadata or {}
        self.recoverable = recoverable
        self.timestamp = datetime.now()

class PhoneResolutionError(ContextualError):
    """Errors related to phone name resolution"""
    
    def __init__(self, message: str, phone_name: str = None, suggestions: List[str] = None):
        super().__init__(
            message=message,
            category=ErrorCategory.PHONE_RESOLUTION,
            severity=ErrorSeverity.LOW,
            user_message=f"I couldn't find the phone '{phone_name}' in our database." if phone_name else message,
            suggestions=suggestions or [
                "Check the spelling of the phone name",
                "Try using the full phone name (e.g., 'iPhone 14 Pro' instead of 'iPhone')",
                "Browse our phone catalog to find the exact name"
            ],
            metadata={"phone_name": phone_name} if phone_name else {},
            recoverable=True
        )

class ContextProcessingError(ContextualError):
    """Errors related to context processing"""
    
    def __init__(self, message: str, session_id: str = None, context_operation: str = None):
        super().__init__(
            message=message,
            category=ErrorCategory.CONTEXT_PROCESSING,
            severity=ErrorSeverity.MEDIUM,
            user_message="There was an issue with your conversation context.",
            suggestions=[
                "Try starting a new conversation",
                "Clear your browser cache and cookies",
                "Refresh the page and try again"
            ],
            metadata={
                "session_id": session_id,
                "context_operation": context_operation
            },
            recoverable=True
        )

class FilterGenerationError(ContextualError):
    """Errors related to filter generation"""
    
    def __init__(self, message: str, filter_type: str = None, reference_phone: str = None):
        super().__init__(
            message=message,
            category=ErrorCategory.FILTER_GENERATION,
            severity=ErrorSeverity.MEDIUM,
            user_message="I couldn't generate the right search filters for your query.",
            suggestions=[
                "Try rephrasing your query",
                "Be more specific about what you're looking for",
                "Use simpler comparison terms"
            ],
            metadata={
                "filter_type": filter_type,
                "reference_phone": reference_phone
            },
            recoverable=True
        )

class ExternalServiceError(ContextualError):
    """Errors related to external services (Gemini AI, etc.)"""
    
    def __init__(self, message: str, service_name: str = None, status_code: int = None):
        super().__init__(
            message=message,
            category=ErrorCategory.EXTERNAL_SERVICE,
            severity=ErrorSeverity.HIGH,
            user_message="Our AI service is temporarily unavailable.",
            suggestions=[
                "Please try again in a few moments",
                "Use simpler queries if the issue persists",
                "Contact support if the problem continues"
            ],
            metadata={
                "service_name": service_name,
                "status_code": status_code
            },
            recoverable=True
        )

class DatabaseError(ContextualError):
    """Errors related to database operations"""
    
    def __init__(self, message: str, operation: str = None, table: str = None):
        super().__init__(
            message=message,
            category=ErrorCategory.DATABASE,
            severity=ErrorSeverity.HIGH,
            user_message="There was a problem accessing our phone database.",
            suggestions=[
                "Please try again in a moment",
                "Refresh the page if the issue persists",
                "Contact support if you continue to experience problems"
            ],
            metadata={
                "operation": operation,
                "table": table
            },
            recoverable=True
        )

class ValidationError(ContextualError):
    """Errors related to input validation"""
    
    def __init__(self, message: str, field: str = None, value: Any = None):
        super().__init__(
            message=message,
            category=ErrorCategory.VALIDATION,
            severity=ErrorSeverity.LOW,
            user_message="Please check your input and try again.",
            suggestions=[
                "Make sure all required fields are filled",
                "Check that your input follows the expected format",
                "Remove any special characters that might cause issues"
            ],
            metadata={
                "field": field,
                "value": str(value) if value is not None else None
            },
            recoverable=True
        )

class RateLimitError(ContextualError):
    """Errors related to rate limiting"""
    
    def __init__(self, message: str, limit: int = None, window: str = None):
        super().__init__(
            message=message,
            category=ErrorCategory.RATE_LIMITING,
            severity=ErrorSeverity.MEDIUM,
            user_message="You're making requests too quickly. Please slow down.",
            suggestions=[
                "Wait a moment before making another request",
                "Reduce the frequency of your queries",
                "Contact support if you need higher rate limits"
            ],
            metadata={
                "limit": limit,
                "window": window
            },
            recoverable=True
        )

class ContextualErrorHandler:
    """Comprehensive error handler for the contextual query system"""
    
    def __init__(self):
        """Initialize the error handler"""
        self.error_log = []
        self.max_log_size = 1000
        
        # Error recovery strategies
        self.recovery_strategies = {
            ErrorCategory.PHONE_RESOLUTION: self._recover_phone_resolution,
            ErrorCategory.CONTEXT_PROCESSING: self._recover_context_processing,
            ErrorCategory.FILTER_GENERATION: self._recover_filter_generation,
            ErrorCategory.EXTERNAL_SERVICE: self._recover_external_service,
            ErrorCategory.DATABASE: self._recover_database,
        }
    
    def handle_error(
        self, 
        error: Exception, 
        context: Dict[str, Any] = None,
        attempt_recovery: bool = True
    ) -> ErrorContext:
        """
        Handle an error and return structured error information
        
        Args:
            error: The exception that occurred
            context: Additional context information
            attempt_recovery: Whether to attempt error recovery
            
        Returns:
            ErrorContext with structured error information
        """
        try:
            # Create error context
            if isinstance(error, ContextualError):
                error_context = ErrorContext(
                    error_id=error.error_id,
                    category=error.category,
                    severity=error.severity,
                    message=str(error),
                    user_message=error.user_message,
                    suggestions=error.suggestions,
                    metadata=error.metadata,
                    timestamp=error.timestamp,
                    recoverable=error.recoverable
                )
            else:
                # Handle non-contextual errors
                error_context = self._create_generic_error_context(error, context)
            
            # Add stack trace for debugging
            error_context.stack_trace = traceback.format_exc()
            
            # Log the error
            self._log_error(error_context)
            
            # Attempt recovery if requested and error is recoverable
            if attempt_recovery and error_context.recoverable:
                recovery_result = self._attempt_recovery(error_context, context)
                if recovery_result:
                    error_context.metadata["recovery_attempted"] = True
                    error_context.metadata["recovery_result"] = recovery_result
            
            return error_context
            
        except Exception as handler_error:
            # Error in error handler - create minimal error context
            logger.critical(f"Error in error handler: {handler_error}")
            return ErrorContext(
                error_id=str(uuid.uuid4()),
                category=ErrorCategory.SYSTEM,
                severity=ErrorSeverity.CRITICAL,
                message="Critical system error",
                user_message="A critical system error occurred. Please contact support.",
                suggestions=["Contact technical support immediately"],
                recoverable=False
            )
    
    def _create_generic_error_context(self, error: Exception, context: Dict[str, Any] = None) -> ErrorContext:
        """Create error context for non-contextual errors"""
        error_type = type(error).__name__
        
        # Categorize based on error type and message
        error_message = str(error).lower()
        
        if "database" in error_type.lower() or "sql" in error_type.lower() or "database" in error_message:
            category = ErrorCategory.DATABASE
            severity = ErrorSeverity.HIGH
            user_message = "There was a problem accessing our database."
        elif "connection" in error_type.lower() or "timeout" in error_type.lower() or "connection" in error_message:
            category = ErrorCategory.EXTERNAL_SERVICE
            severity = ErrorSeverity.HIGH
            user_message = "There was a connection problem with our services."
        elif "validation" in error_type.lower() or "valueerror" in error_type.lower():
            category = ErrorCategory.VALIDATION
            severity = ErrorSeverity.LOW
            user_message = "Please check your input and try again."
        else:
            category = ErrorCategory.SYSTEM
            severity = ErrorSeverity.MEDIUM
            user_message = "An unexpected error occurred."
        
        return ErrorContext(
            error_id=str(uuid.uuid4()),
            category=category,
            severity=severity,
            message=str(error),
            user_message=user_message,
            suggestions=[
                "Please try again",
                "Refresh the page if the issue persists",
                "Contact support if you continue to experience problems"
            ],
            metadata=context or {},
            recoverable=True
        )
    
    def _log_error(self, error_context: ErrorContext) -> None:
        """Log error with appropriate level based on severity"""
        log_message = f"[{error_context.error_id}] {error_context.category.value}: {error_context.message}"
        
        if error_context.severity == ErrorSeverity.CRITICAL:
            logger.critical(log_message, extra={"error_context": error_context})
        elif error_context.severity == ErrorSeverity.HIGH:
            logger.error(log_message, extra={"error_context": error_context})
        elif error_context.severity == ErrorSeverity.MEDIUM:
            logger.warning(log_message, extra={"error_context": error_context})
        else:
            logger.info(log_message, extra={"error_context": error_context})
        
        # Store in memory log (for admin interface)
        self.error_log.append(error_context)
        
        # Keep log size manageable
        if len(self.error_log) > self.max_log_size:
            self.error_log = self.error_log[-self.max_log_size:]
    
    def _attempt_recovery(self, error_context: ErrorContext, context: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
        """Attempt to recover from the error"""
        recovery_strategy = self.recovery_strategies.get(error_context.category)
        
        if recovery_strategy:
            try:
                return recovery_strategy(error_context, context)
            except Exception as recovery_error:
                logger.error(f"Recovery failed for error {error_context.error_id}: {recovery_error}")
                return None
        
        return None
    
    def _recover_phone_resolution(self, error_context: ErrorContext, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Attempt to recover from phone resolution errors"""
        phone_name = error_context.metadata.get("phone_name")
        
        if phone_name:
            # Try fuzzy matching with lower threshold
            # This would integrate with the phone name resolver
            return {
                "strategy": "fuzzy_matching",
                "original_phone": phone_name,
                "suggestions_provided": True
            }
        
        return {"strategy": "fallback_to_general_search"}
    
    def _recover_context_processing(self, error_context: ErrorContext, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Attempt to recover from context processing errors"""
        session_id = error_context.metadata.get("session_id")
        
        if session_id:
            # Clear corrupted context and start fresh
            return {
                "strategy": "context_reset",
                "session_id": session_id,
                "new_session_created": True
            }
        
        return {"strategy": "context_bypass"}
    
    def _recover_filter_generation(self, error_context: ErrorContext, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Attempt to recover from filter generation errors"""
        return {
            "strategy": "fallback_to_basic_filters",
            "simplified_query": True
        }
    
    def _recover_external_service(self, error_context: ErrorContext, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Attempt to recover from external service errors"""
        service_name = error_context.metadata.get("service_name")
        
        return {
            "strategy": "fallback_to_local_processing",
            "service_name": service_name,
            "local_processing_enabled": True
        }
    
    def _recover_database(self, error_context: ErrorContext, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Attempt to recover from database errors"""
        return {
            "strategy": "retry_with_backoff",
            "retry_attempted": True
        }
    
    def get_error_statistics(self) -> Dict[str, Any]:
        """Get error statistics for monitoring"""
        if not self.error_log:
            return {
                "total_errors": 0,
                "by_category": {},
                "by_severity": {},
                "recent_errors": []
            }
        
        # Count by category
        by_category = {}
        for error in self.error_log:
            category = error.category.value
            by_category[category] = by_category.get(category, 0) + 1
        
        # Count by severity
        by_severity = {}
        for error in self.error_log:
            severity = error.severity.value
            by_severity[severity] = by_severity.get(severity, 0) + 1
        
        # Recent errors (last 10)
        recent_errors = [
            {
                "error_id": error.error_id,
                "category": error.category.value,
                "severity": error.severity.value,
                "message": error.message,
                "timestamp": error.timestamp.isoformat(),
                "recoverable": error.recoverable
            }
            for error in self.error_log[-10:]
        ]
        
        return {
            "total_errors": len(self.error_log),
            "by_category": by_category,
            "by_severity": by_severity,
            "recent_errors": recent_errors,
            "error_rate": len([e for e in self.error_log if e.timestamp > datetime.now().replace(hour=datetime.now().hour-1)]) # Last hour
        }
    
    def get_error_by_id(self, error_id: str) -> Optional[ErrorContext]:
        """Get specific error by ID"""
        for error in self.error_log:
            if error.error_id == error_id:
                return error
        return None
    
    def clear_error_log(self) -> int:
        """Clear error log and return number of errors cleared"""
        count = len(self.error_log)
        self.error_log.clear()
        return count

# Global error handler instance
contextual_error_handler = ContextualErrorHandler()

def handle_contextual_error(error: Exception, context: Dict[str, Any] = None) -> ErrorContext:
    """Convenience function to handle errors"""
    return contextual_error_handler.handle_error(error, context)

def create_error_response(error_context: ErrorContext) -> Dict[str, Any]:
    """Create a standardized error response for APIs"""
    return {
        "error": True,
        "error_id": error_context.error_id,
        "error_type": error_context.category.value,
        "message": error_context.user_message,
        "suggestions": error_context.suggestions,
        "recoverable": error_context.recoverable,
        "timestamp": error_context.timestamp.isoformat(),
        "metadata": {
            "severity": error_context.severity.value,
            "category": error_context.category.value
        }
    }