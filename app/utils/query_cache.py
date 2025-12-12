"""
Simple in-memory cache for query results to reduce database load
"""
from functools import lru_cache
from typing import Any, Optional, Dict, List
import hashlib
import json
import time
import logging

logger = logging.getLogger(__name__)

# Cache configuration
CACHE_TTL_SECONDS = 300  # 5 minutes
_cache_timestamps: Dict[str, float] = {}


def generate_cache_key(prefix: str, **kwargs) -> str:
    """Generate a cache key from function arguments"""
    # Sort kwargs for consistent hashing
    sorted_kwargs = sorted(kwargs.items())
    key_string = f"{prefix}:{json.dumps(sorted_kwargs, sort_keys=True)}"
    return hashlib.md5(key_string.encode()).hexdigest()


def is_cache_valid(cache_key: str) -> bool:
    """Check if cached result is still valid"""
    if cache_key not in _cache_timestamps:
        return False
    
    age = time.time() - _cache_timestamps[cache_key]
    return age < CACHE_TTL_SECONDS


def set_cache_timestamp(cache_key: str):
    """Record when a cache entry was created"""
    _cache_timestamps[cache_key] = time.time()


def clear_expired_cache():
    """Clear expired cache entries"""
    current_time = time.time()
    expired_keys = [
        key for key, timestamp in list(_cache_timestamps.items())
        if current_time - timestamp > CACHE_TTL_SECONDS
    ]
    for key in expired_keys:
        if key in _cache_timestamps:
            del _cache_timestamps[key]
    
    if expired_keys:
        logger.debug(f"Cleared {len(expired_keys)} expired cache entries")
    
    return len(expired_keys)


# Cached functions using LRU cache
@lru_cache(maxsize=100)
def get_cached_popular_phones(limit: int = 10) -> str:
    """
    Cache key for popular phones query.
    Returns cache key string - actual data fetched separately.
    """
    return f"popular_phones_{limit}"


@lru_cache(maxsize=200)
def get_cached_filter_result(filter_hash: str, limit: int) -> str:
    """
    Cache key for filter results.
    Returns cache key string - actual data fetched separately.
    """
    return f"filter_{filter_hash}_{limit}"


@lru_cache(maxsize=50)
def get_cached_phone_by_slug(slug: str) -> str:
    """
    Cache key for individual phone lookups.
    Returns cache key string - actual data fetched separately.
    """
    return f"phone_slug_{slug}"


def clear_all_caches():
    """Clear all LRU caches"""
    get_cached_popular_phones.cache_clear()
    get_cached_filter_result.cache_clear()
    get_cached_phone_by_slug.cache_clear()
    _cache_timestamps.clear()
    logger.info("All query caches cleared")


# Cache statistics
def get_cache_stats() -> Dict[str, Any]:
    """Get cache hit/miss statistics"""
    return {
        "popular_phones_cache": get_cached_popular_phones.cache_info()._asdict(),
        "filter_cache": get_cached_filter_result.cache_info()._asdict(),
        "phone_slug_cache": get_cached_phone_by_slug.cache_info()._asdict(),
        "total_cached_timestamps": len(_cache_timestamps)
    }
