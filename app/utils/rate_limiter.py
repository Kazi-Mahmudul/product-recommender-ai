"""
Simple rate limiter to prevent cost spikes from abuse
"""
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Tuple
import logging

logger = logging.getLogger(__name__)

# Rate limit configuration
AI_REQUESTS_PER_MINUTE = 10
API_REQUESTS_PER_MINUTE = 100

# In-memory storage (use Redis in production for distributed systems)
_request_counts: Dict[str, list] = defaultdict(list)


def is_rate_limited(identifier: str, limit: int = API_REQUESTS_PER_MINUTE) -> Tuple[bool, int]:
    """
    Check if identifier (user_id or IP) is rate limited.
    
    Args:
        identifier: User ID or IP address
        limit: Requests allowed per minute
        
    Returns:
        Tuple of (is_limited, remaining_requests)
    """
    now = datetime.now()
    one_minute_ago = now - timedelta(minutes=1)
    
    # Clean old requests
    _request_counts[identifier] = [
        req_time for req_time in _request_counts[identifier]
        if req_time > one_minute_ago
    ]
    
    current_count = len(_request_counts[identifier])
    
    if current_count >= limit:
        return True, 0
    
    # Record this request
    _request_counts[identifier].append(now)
    
    remaining = limit - current_count - 1
    return False, remaining


def is_ai_rate_limited(identifier: str) -> Tuple[bool, int]:
    """
    Check if identifier is rate limited for AI requests.
    More restrictive than general API.
    """
    return is_rate_limited(f"ai_{identifier}", AI_REQUESTS_PER_MINUTE)


def get_rate_limit_stats() -> dict:
    """Get current rate limit statistics"""
    return {
        "total_tracked_identifiers": len(_request_counts),
        "ai_requests_per_minute_limit": AI_REQUESTS_PER_MINUTE,
        "api_requests_per_minute_limit": API_REQUESTS_PER_MINUTE
    }


def clear_rate_limits():
    """Clear all rate limit data (for testing)"""
    _request_counts.clear()
    logger.info("Rate limit data cleared")
