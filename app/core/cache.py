import json
import logging
import os
from typing import Any, Optional, Union
import redis
from functools import wraps

from app.core.config import settings
# Import will be resolved when monitoring.py is created
try:
    from app.core.monitoring import track_cache_metrics
except ImportError:
    # Fallback if monitoring module is not available
    def track_cache_metrics(hit, prefix):
        pass

logger = logging.getLogger(__name__)

# Initialize Redis client
try:
    redis_client = redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=settings.REDIS_DB,
        password=settings.REDIS_PASSWORD,
        decode_responses=True,
        socket_timeout=5,
    )
    # Test connection
    redis_client.ping()
    logger.info("Redis cache initialized successfully")
except Exception as e:
    logger.warning(f"Redis connection failed: {str(e)}. Using dummy cache.")
    redis_client = None

class Cache:
    """Redis cache utility for storing and retrieving data"""
    
    # Singleton instance
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Cache, cls).__new__(cls)
        return cls._instance
    
    @staticmethod
    def get(key: str) -> Optional[str]:
        """
        Get a value from the cache
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found
        """
        if not redis_client:
            return None
            
        try:
            return redis_client.get(key)
        except Exception as e:
            logger.error(f"Redis get error: {str(e)}")
            return None
    
    @staticmethod
    def set(key: str, value: str, ttl: int = 86400) -> bool:
        """
        Set a value in the cache
        
        Args:
            key: Cache key
            value: Value to store
            ttl: Time to live in seconds (default: 24 hours)
            
        Returns:
            True if successful, False otherwise
        """
        if not redis_client:
            return False
            
        try:
            return redis_client.set(key, value, ex=ttl)
        except Exception as e:
            logger.error(f"Redis set error: {str(e)}")
            return False
    
    @staticmethod
    def delete(key: str) -> int:
        """
        Delete a value from the cache
        
        Args:
            key: Cache key
            
        Returns:
            Number of keys deleted (1 if successful, 0 if key not found)
        """
        if not redis_client:
            return 0
            
        try:
            return redis_client.delete(key)
        except Exception as e:
            logger.error(f"Redis delete error: {str(e)}")
            return 0
    
    @staticmethod
    def delete_pattern(pattern: str) -> bool:
        """
        Delete all keys matching a pattern
        
        Args:
            pattern: Redis key pattern (e.g., "phone:*:recommendations")
            
        Returns:
            True if successful, False otherwise
        """
        if not redis_client:
            return False
            
        try:
            keys = redis_client.keys(pattern)
            if keys:
                return bool(redis_client.delete(*keys))
            return True
        except Exception as e:
            logger.error(f"Redis delete_pattern error: {str(e)}")
            return False
    
    @staticmethod
    def clear_by_pattern(pattern: str) -> int:
        """
        Delete all keys matching a pattern and return count
        
        Args:
            pattern: Redis key pattern (e.g., "phone:*:recommendations")
            
        Returns:
            Number of keys deleted
        """
        if not redis_client:
            return 0
            
        try:
            keys = redis_client.keys(pattern)
            if keys:
                return redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Redis clear_by_pattern error: {str(e)}")
            return 0
    
    @staticmethod
    def json_get(key: str) -> Optional[Any]:
        """
        Get a JSON value from the cache
        
        Args:
            key: Cache key
            
        Returns:
            Deserialized JSON value or None if not found
        """
        value = Cache.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                logger.error(f"Failed to decode JSON from cache key: {key}")
        return None
    
    @staticmethod
    def json_set(key: str, value: Any, ttl: int = 86400) -> bool:
        """
        Set a JSON value in the cache
        
        Args:
            key: Cache key
            value: Value to store (will be JSON serialized)
            ttl: Time to live in seconds (default: 24 hours)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            json_value = json.dumps(value)
            return Cache.set(key, json_value, ttl)
        except (TypeError, json.JSONEncodeError) as e:
            logger.error(f"Failed to encode value as JSON: {str(e)}")
            return False

def cached(prefix: str, ttl: int = 86400):
    """
    Decorator for caching function results
    
    Args:
        prefix: Cache key prefix
        ttl: Time to live in seconds (default: 24 hours)
        
    Returns:
        Decorated function
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Skip caching if Redis is not available
            if not redis_client:
                return func(*args, **kwargs)
                
            # Generate cache key from function name, args and kwargs
            key_parts = [prefix, func.__name__]
            
            # Add args to key (skip self/cls for methods)
            if args:
                if hasattr(args[0], '__class__') and args[0].__class__.__name__ in ('RecommendationService'):
                    # Skip self/cls for methods
                    key_args = [str(arg) for arg in args[1:]]
                else:
                    key_args = [str(arg) for arg in args]
                if key_args:
                    key_parts.append('_'.join(key_args))
            
            # Add kwargs to key
            if kwargs:
                key_kwargs = [f"{k}:{v}" for k, v in sorted(kwargs.items())]
                key_parts.append('_'.join(key_kwargs))
            
            cache_key = ':'.join(key_parts)
            
            # Try to get from cache
            cached_result = Cache.json_get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for key: {cache_key}")
                track_cache_metrics(hit=True, prefix=prefix)
                return cached_result
            
            # Cache miss - track metrics
            track_cache_metrics(hit=False, prefix=prefix)
            
            # Call the function and cache the result
            result = func(*args, **kwargs)
            if result is not None:
                Cache.json_set(cache_key, result, ttl)
                logger.debug(f"Cached result for key: {cache_key}")
            
            return result
        return wrapper
    return decorator