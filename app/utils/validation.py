"""
Validation utilities for API input processing
"""
from typing import List
from fastapi import HTTPException


def parse_and_validate_ids(ids_string: str) -> List[int]:
    """
    Parse and validate comma-separated phone IDs string.
    
    Args:
        ids_string: Comma-separated string of phone IDs (e.g., "1,2,3,4")
    
    Returns:
        List[int]: List of validated phone IDs with duplicates removed
    
    Raises:
        HTTPException: For various validation errors
    """
    if not ids_string or not ids_string.strip():
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "VALIDATION_ERROR",
                "message": "No phone IDs provided"
            }
        )
    
    # Split by comma and clean whitespace
    id_parts = [part.strip() for part in ids_string.split(',') if part.strip()]
    
    if not id_parts:
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "VALIDATION_ERROR", 
                "message": "No valid phone IDs found"
            }
        )
    
    # Check rate limiting (max 50 IDs)
    if len(id_parts) > 50:
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "RATE_LIMIT_ERROR",
                "message": "Maximum 50 IDs allowed per request",
                "provided_count": len(id_parts)
            }
        )
    
    # Convert to integers and validate
    phone_ids = []
    invalid_ids = []
    
    for id_part in id_parts:
        try:
            phone_id = int(id_part)
            if phone_id <= 0:
                invalid_ids.append(id_part)
            else:
                phone_ids.append(phone_id)
        except ValueError:
            invalid_ids.append(id_part)
    
    if invalid_ids:
        raise HTTPException(
            status_code=422,
            detail={
                "error_code": "VALIDATION_ERROR",
                "message": "Invalid phone IDs provided",
                "invalid_ids": invalid_ids
            }
        )
    
    # Remove duplicates while preserving order
    seen = set()
    unique_ids = []
    for phone_id in phone_ids:
        if phone_id not in seen:
            seen.add(phone_id)
            unique_ids.append(phone_id)
    
    return unique_ids