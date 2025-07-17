from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security import APIKeyHeader
from typing import Dict, Any

from app.core.config import settings
from app.core.monitoring import get_performance_summary

router = APIRouter()

# API key security for monitoring endpoints
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def get_api_key(api_key: str = Security(api_key_header)):
    """Validate API key for monitoring endpoints"""
    if not settings.MONITORING_API_KEY:
        # If no API key is configured, allow access (for development)
        return True
    
    if api_key == settings.MONITORING_API_KEY:
        return True
    
    raise HTTPException(
        status_code=401,
        detail="Invalid API key",
        headers={"WWW-Authenticate": "ApiKey"},
    )

@router.get("/metrics", response_model=Dict[str, Any])
def get_metrics(api_key: bool = Depends(get_api_key)):
    """
    Get performance metrics for the application
    
    This endpoint returns various performance metrics including:
    - API response times
    - Database query times
    - Cache hit rates
    - Slow query information
    
    Requires API key authentication via X-API-Key header
    """
    return get_performance_summary()