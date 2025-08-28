"""
Error handling utilities for API endpoints.
"""

from typing import Dict, Any, Optional
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError, OperationalError, DatabaseError
import logging

logger = logging.getLogger(__name__)

class APIErrorHandler:
    """Centralized error handling for API endpoints."""
    
    @staticmethod
    def handle_database_error(e: Exception, operation: str = "database operation") -> HTTPException:
        """
        Handle database-related errors and return appropriate HTTP exceptions.
        
        Args:
            e: The exception that occurred
            operation: Description of the operation that failed
            
        Returns:
            HTTPException with appropriate status code and message
        """
        error_message = str(e)
        
        if isinstance(e, OperationalError):
            # Database connection or operational issues
            logger.error(f"Database operational error during {operation}: {error_message}")
            return HTTPException(
                status_code=503,
                detail={
                    "error_code": "DATABASE_UNAVAILABLE",
                    "message": "Database service is temporarily unavailable. Please try again later.",
                    "operation": operation
                }
            )
        
        elif isinstance(e, DatabaseError):
            # General database errors
            logger.error(f"Database error during {operation}: {error_message}")
            return HTTPException(
                status_code=500,
                detail={
                    "error_code": "DATABASE_ERROR",
                    "message": "A database error occurred while processing your request.",
                    "operation": operation
                }
            )
        
        elif isinstance(e, SQLAlchemyError):
            # Other SQLAlchemy errors
            logger.error(f"SQLAlchemy error during {operation}: {error_message}")
            return HTTPException(
                status_code=500,
                detail={
                    "error_code": "QUERY_ERROR",
                    "message": "An error occurred while querying the database.",
                    "operation": operation
                }
            )
        
        else:
            # Generic errors
            logger.error(f"Unexpected error during {operation}: {error_message}", exc_info=True)
            return HTTPException(
                status_code=500,
                detail={
                    "error_code": "INTERNAL_ERROR",
                    "message": "An unexpected error occurred while processing your request.",
                    "operation": operation
                }
            )
    
    @staticmethod
    def handle_validation_error(field: str, value: Any, message: str) -> HTTPException:
        """
        Handle validation errors for request parameters.
        
        Args:
            field: The field that failed validation
            value: The invalid value
            message: Description of the validation error
            
        Returns:
            HTTPException with 422 status code
        """
        logger.warning(f"Validation error for field '{field}' with value '{value}': {message}")
        return HTTPException(
            status_code=422,
            detail={
                "error_code": "VALIDATION_ERROR",
                "message": f"Invalid value for parameter '{field}': {message}",
                "field": field,
                "value": str(value)
            }
        )
    
    @staticmethod
    def handle_not_found_error(resource: str, identifier: Any) -> HTTPException:
        """
        Handle resource not found errors.
        
        Args:
            resource: The type of resource that was not found
            identifier: The identifier used to search for the resource
            
        Returns:
            HTTPException with 404 status code
        """
        logger.info(f"{resource} not found with identifier: {identifier}")
        return HTTPException(
            status_code=404,
            detail={
                "error_code": "RESOURCE_NOT_FOUND",
                "message": f"{resource} not found.",
                "resource": resource,
                "identifier": str(identifier)
            }
        )
    
    @staticmethod
    def create_success_response(data: Any, message: str = "Success") -> Dict[str, Any]:
        """
        Create a standardized success response.
        
        Args:
            data: The response data
            message: Success message
            
        Returns:
            Standardized success response dictionary
        """
        return {
            "success": True,
            "message": message,
            "data": data
        }
    
    @staticmethod
    def log_request_info(endpoint: str, params: Dict[str, Any]):
        """
        Log request information for debugging.
        
        Args:
            endpoint: The endpoint being called
            params: Request parameters
        """
        logger.info(f"API request to {endpoint} with params: {params}")
    
    @staticmethod
    def validate_pagination_params(skip: int, limit: int) -> Optional[HTTPException]:
        """
        Validate pagination parameters.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            HTTPException if validation fails, None otherwise
        """
        if skip < 0:
            return APIErrorHandler.handle_validation_error(
                "skip", skip, "Skip parameter must be non-negative"
            )
        
        if limit <= 0:
            return APIErrorHandler.handle_validation_error(
                "limit", limit, "Limit parameter must be positive"
            )
        
        if limit > 1000:
            return APIErrorHandler.handle_validation_error(
                "limit", limit, "Limit parameter cannot exceed 1000"
            )
        
        return None