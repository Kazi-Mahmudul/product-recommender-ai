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


def parse_and_validate_slugs(slugs_string: str) -> List[str]:
    """
    Parse and validate comma-separated phone slugs string.
    
    Args:
        slugs_string: Comma-separated string of phone slugs (e.g., "samsung-galaxy-a15,realme-narzo-70")
    
    Returns:
        List[str]: List of validated phone slugs with duplicates removed
    
    Raises:
        HTTPException: For various validation errors
    """
    if not slugs_string or not slugs_string.strip():
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "VALIDATION_ERROR",
                "message": "No phone slugs provided"
            }
        )
    
    # Split by comma and clean whitespace
    slug_parts = [part.strip() for part in slugs_string.split(',') if part.strip()]
    
    if not slug_parts:
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "VALIDATION_ERROR", 
                "message": "No valid phone slugs found"
            }
        )
    
    # Check rate limiting (max 50 slugs)
    if len(slug_parts) > 50:
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "RATE_LIMIT_ERROR",
                "message": "Maximum 50 slugs allowed per request",
                "provided_count": len(slug_parts)
            }
        )
    
    # Validate slug format
    phone_slugs = []
    invalid_slugs = []
    
    for slug_part in slug_parts:
        # Basic slug validation: should contain only lowercase letters, numbers, and hyphens
        # Should not start or end with hyphen, should not have consecutive hyphens
        if (slug_part and 
            len(slug_part) >= 2 and 
            slug_part.replace('-', '').replace('_', '').isalnum() and
            not slug_part.startswith('-') and 
            not slug_part.endswith('-') and
            '--' not in slug_part):
            phone_slugs.append(slug_part)
        else:
            invalid_slugs.append(slug_part)
    
    if invalid_slugs:
        raise HTTPException(
            status_code=422,
            detail={
                "error_code": "VALIDATION_ERROR",
                "message": "Invalid phone slugs provided",
                "invalid_slugs": invalid_slugs
            }
        )
    
    # Remove duplicates while preserving order
    seen = set()
    unique_slugs = []
    for phone_slug in phone_slugs:
        if phone_slug not in seen:
            seen.add(phone_slug)
            unique_slugs.append(phone_slug)
    
    return unique_slugs