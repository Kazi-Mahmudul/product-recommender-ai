"""
Unit tests for Comprehensive Error Handling System
"""

import pytest
from datetime import datetime, timedelta
from app.services.error_handler import (
    ContextualErrorHandler, ContextualError, PhoneResolutionError,
    ContextProcessingError, FilterGenerationError, ExternalServiceError,
    DatabaseError, ValidationError, RateLimitError, ErrorCategory,
    ErrorSeverity, ErrorContext, handle_contextual_error, create_error_response
)

class TestContextualErrors:
    """Test cases for contextual error classes"""
    
    def test_phone_resolution_error(self):
        """Test PhoneResolutionError creation"""
        error = PhoneResolutionError("Phone not found", phone_name="iPhone 15")
        
        assert error.category == ErrorCategory.PHONE_RESOLUTION
        assert error.severity == ErrorSeverity.LOW
        assert "iPhone 15" in error.user_message
        assert error.recoverable is True
        assert len(error.suggestions) > 0
        assert error.metadata["phone_name"] == "iPhone 15"
    
    def test_context_processing_error(self):
        """Test ContextProcessingError creation"""
        error = ContextProcessingError("Context expired", session_id="test_session", context_operation="retrieve")
        
        assert error.category == ErrorCategory.CONTEXT_PROCESSING
        assert error.severity == ErrorSeverity.MEDIUM
        assert error.metadata["session_id"] == "test_session"
        assert error.metadata["context_operation"] == "retrieve"
        assert error.recoverable is True
    
    def test_filter_generation_error(self):
        """Test FilterGenerationError creation"""
        error = FilterGenerationError("Invalid filter", filter_type="better_than", reference_phone="iPhone 14")
        
        assert error.category == ErrorCategory.FILTER_GENERATION
        assert error.severity == ErrorSeverity.MEDIUM
        assert error.metadata["filter_type"] == "better_than"
        assert error.metadata["reference_phone"] == "iPhone 14"
    
    def test_external_service_error(self):
        """Test ExternalServiceError creation"""
        error = ExternalServiceError("Service unavailable", service_name="Gemini", status_code=503)
        
        assert error.category == ErrorCategory.EXTERNAL_SERVICE
        assert error.severity == ErrorSeverity.HIGH
        assert error.metadata["service_name"] == "Gemini"
        assert error.metadata["status_code"] == 503
    
    def test_database_error(self):
        """Test DatabaseError creation"""
        error = DatabaseError("Connection failed", operation="SELECT", table="phones")
        
        assert error.category == ErrorCategory.DATABASE
        assert error.severity == ErrorSeverity.HIGH
        assert error.metadata["operation"] == "SELECT"
        assert error.metadata["table"] == "phones"
    
    def test_validation_error(self):
        """Test ValidationError creation"""
        error = ValidationError("Invalid input", field="query", value="")
        
        assert error.category == ErrorCategory.VALIDATION
        assert error.severity == ErrorSeverity.LOW
        assert error.metadata["field"] == "query"
        assert error.metadata["value"] == ""
    
    def test_rate_limit_error(self):
        """Test RateLimitError creation"""
        error = RateLimitError("Rate limit exceeded", limit=100, window="1 hour")
        
        assert error.category == ErrorCategory.RATE_LIMITING
        assert error.severity == ErrorSeverity.MEDIUM
        assert error.metadata["limit"] == 100
        assert error.metadata["window"] == "1 hour"

class TestContextualErrorHandler:
    """Test cases for ContextualErrorHandler"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.handler = ContextualErrorHandler()
    
    def test_handle_contextual_error(self):
        """Test handling of contextual errors"""
        error = PhoneResolutionError("Phone not found", phone_name="iPhone 15")
        context = {"query": "iPhone 15 specs"}
        
        error_context = self.handler.handle_error(error, context, attempt_recovery=False)
        
        assert error_context.error_id == error.error_id
        assert error_context.category == ErrorCategory.PHONE_RESOLUTION
        assert error_context.severity == ErrorSeverity.LOW
        assert "iPhone 15" in error_context.user_message
        assert len(error_context.suggestions) > 0
    
    def test_handle_generic_error(self):
        """Test handling of generic Python errors"""
        error = ValueError("Invalid value")
        context = {"field": "price"}
        
        error_context = self.handler.handle_error(error, context, attempt_recovery=False)
        
        assert error_context.category == ErrorCategory.VALIDATION
        assert error_context.severity == ErrorSeverity.LOW
        assert error_context.message == "Invalid value"
        assert error_context.recoverable is True
    
    def test_handle_database_error(self):
        """Test handling of database-related errors"""
        error = Exception("DatabaseError: Connection failed")
        
        error_context = self.handler.handle_error(error, attempt_recovery=False)
        
        assert error_context.category == ErrorCategory.DATABASE
        assert error_context.severity == ErrorSeverity.HIGH
        assert "database" in error_context.user_message.lower()
    
    def test_handle_connection_error(self):
        """Test handling of connection errors"""
        error = Exception("ConnectionError: Timeout")
        
        error_context = self.handler.handle_error(error, attempt_recovery=False)
        
        assert error_context.category == ErrorCategory.EXTERNAL_SERVICE
        assert error_context.severity == ErrorSeverity.HIGH
        assert "connection" in error_context.user_message.lower()
    
    def test_error_logging(self):
        """Test that errors are logged properly"""
        initial_log_size = len(self.handler.error_log)
        
        error = PhoneResolutionError("Phone not found")
        self.handler.handle_error(error, attempt_recovery=False)
        
        assert len(self.handler.error_log) == initial_log_size + 1
        logged_error = self.handler.error_log[-1]
        assert logged_error.category == ErrorCategory.PHONE_RESOLUTION
    
    def test_error_recovery_phone_resolution(self):
        """Test error recovery for phone resolution errors"""
        error = PhoneResolutionError("Phone not found", phone_name="iPhone 15")
        
        error_context = self.handler.handle_error(error, attempt_recovery=True)
        
        assert error_context.metadata.get("recovery_attempted") is True
        assert "recovery_result" in error_context.metadata
        recovery_result = error_context.metadata["recovery_result"]
        assert recovery_result["strategy"] == "fuzzy_matching"
        assert recovery_result["original_phone"] == "iPhone 15"
    
    def test_error_recovery_context_processing(self):
        """Test error recovery for context processing errors"""
        error = ContextProcessingError("Context corrupted", session_id="test_session")
        
        error_context = self.handler.handle_error(error, attempt_recovery=True)
        
        recovery_result = error_context.metadata.get("recovery_result")
        assert recovery_result is not None
        assert recovery_result["strategy"] == "context_reset"
        assert recovery_result["session_id"] == "test_session"
    
    def test_error_recovery_filter_generation(self):
        """Test error recovery for filter generation errors"""
        error = FilterGenerationError("Invalid filter")
        
        error_context = self.handler.handle_error(error, attempt_recovery=True)
        
        recovery_result = error_context.metadata.get("recovery_result")
        assert recovery_result is not None
        assert recovery_result["strategy"] == "fallback_to_basic_filters"
    
    def test_error_recovery_external_service(self):
        """Test error recovery for external service errors"""
        error = ExternalServiceError("Service down", service_name="Gemini")
        
        error_context = self.handler.handle_error(error, attempt_recovery=True)
        
        recovery_result = error_context.metadata.get("recovery_result")
        assert recovery_result is not None
        assert recovery_result["strategy"] == "fallback_to_local_processing"
        assert recovery_result["service_name"] == "Gemini"
    
    def test_error_recovery_database(self):
        """Test error recovery for database errors"""
        error = DatabaseError("Connection failed")
        
        error_context = self.handler.handle_error(error, attempt_recovery=True)
        
        recovery_result = error_context.metadata.get("recovery_result")
        assert recovery_result is not None
        assert recovery_result["strategy"] == "retry_with_backoff"
    
    def test_get_error_statistics(self):
        """Test error statistics generation"""
        # Add some test errors
        errors = [
            PhoneResolutionError("Phone not found"),
            ContextProcessingError("Context error"),
            FilterGenerationError("Filter error"),
            ExternalServiceError("Service error")
        ]
        
        for error in errors:
            self.handler.handle_error(error, attempt_recovery=False)
        
        stats = self.handler.get_error_statistics()
        
        assert stats["total_errors"] >= 4
        assert "by_category" in stats
        assert "by_severity" in stats
        assert "recent_errors" in stats
        assert len(stats["recent_errors"]) <= 10
        
        # Check category counts
        assert stats["by_category"]["phone_resolution"] >= 1
        assert stats["by_category"]["context_processing"] >= 1
        assert stats["by_category"]["filter_generation"] >= 1
        assert stats["by_category"]["external_service"] >= 1
    
    def test_get_error_by_id(self):
        """Test retrieving specific error by ID"""
        error = PhoneResolutionError("Phone not found")
        error_context = self.handler.handle_error(error, attempt_recovery=False)
        
        retrieved_error = self.handler.get_error_by_id(error_context.error_id)
        
        assert retrieved_error is not None
        assert retrieved_error.error_id == error_context.error_id
        assert retrieved_error.category == ErrorCategory.PHONE_RESOLUTION
    
    def test_get_nonexistent_error_by_id(self):
        """Test retrieving non-existent error by ID"""
        retrieved_error = self.handler.get_error_by_id("nonexistent-id")
        
        assert retrieved_error is None
    
    def test_clear_error_log(self):
        """Test clearing the error log"""
        # Add some errors
        for i in range(5):
            error = PhoneResolutionError(f"Error {i}")
            self.handler.handle_error(error, attempt_recovery=False)
        
        initial_count = len(self.handler.error_log)
        cleared_count = self.handler.clear_error_log()
        
        assert cleared_count == initial_count
        assert len(self.handler.error_log) == 0
    
    def test_error_log_size_limit(self):
        """Test that error log respects size limit"""
        # Set a small limit for testing
        self.handler.max_log_size = 5
        
        # Add more errors than the limit
        for i in range(10):
            error = PhoneResolutionError(f"Error {i}")
            self.handler.handle_error(error, attempt_recovery=False)
        
        # Should not exceed the limit
        assert len(self.handler.error_log) <= 5
    
    def test_critical_error_handling(self):
        """Test handling of critical errors in error handler"""
        # Simulate an error in the error handler itself
        original_log_error = self.handler._log_error
        
        def failing_log_error(error_context):
            raise Exception("Logging failed")
        
        self.handler._log_error = failing_log_error
        
        try:
            error = PhoneResolutionError("Test error")
            error_context = self.handler.handle_error(error)
            
            # Should return a critical error context
            assert error_context.severity == ErrorSeverity.CRITICAL
            assert error_context.category == ErrorCategory.SYSTEM
            assert error_context.recoverable is False
        finally:
            # Restore original method
            self.handler._log_error = original_log_error

class TestUtilityFunctions:
    """Test cases for utility functions"""
    
    def test_handle_contextual_error_function(self):
        """Test the convenience handle_contextual_error function"""
        error = PhoneResolutionError("Phone not found")
        context = {"query": "test"}
        
        error_context = handle_contextual_error(error, context)
        
        assert isinstance(error_context, ErrorContext)
        assert error_context.category == ErrorCategory.PHONE_RESOLUTION
    
    def test_create_error_response(self):
        """Test creating standardized error response"""
        error_context = ErrorContext(
            error_id="test-id",
            category=ErrorCategory.PHONE_RESOLUTION,
            severity=ErrorSeverity.LOW,
            message="Test error",
            user_message="User friendly message",
            suggestions=["Try again"],
            recoverable=True
        )
        
        response = create_error_response(error_context)
        
        assert response["error"] is True
        assert response["error_id"] == "test-id"
        assert response["error_type"] == "phone_resolution"
        assert response["message"] == "User friendly message"
        assert response["suggestions"] == ["Try again"]
        assert response["recoverable"] is True
        assert "timestamp" in response
        assert response["metadata"]["severity"] == "low"
        assert response["metadata"]["category"] == "phone_resolution"

class TestErrorContext:
    """Test cases for ErrorContext dataclass"""
    
    def test_error_context_creation(self):
        """Test ErrorContext creation with all fields"""
        error_context = ErrorContext(
            error_id="test-id",
            category=ErrorCategory.PHONE_RESOLUTION,
            severity=ErrorSeverity.MEDIUM,
            message="Test message",
            user_message="User message",
            suggestions=["Suggestion 1", "Suggestion 2"],
            metadata={"key": "value"},
            recoverable=True
        )
        
        assert error_context.error_id == "test-id"
        assert error_context.category == ErrorCategory.PHONE_RESOLUTION
        assert error_context.severity == ErrorSeverity.MEDIUM
        assert error_context.message == "Test message"
        assert error_context.user_message == "User message"
        assert len(error_context.suggestions) == 2
        assert error_context.metadata["key"] == "value"
        assert error_context.recoverable is True
        assert isinstance(error_context.timestamp, datetime)
    
    def test_error_context_defaults(self):
        """Test ErrorContext creation with default values"""
        error_context = ErrorContext(
            error_id="test-id",
            category=ErrorCategory.SYSTEM,
            severity=ErrorSeverity.LOW,
            message="Test message",
            user_message="User message"
        )
        
        assert error_context.suggestions == []
        assert error_context.metadata == {}
        assert error_context.stack_trace is None
        assert error_context.recoverable is True