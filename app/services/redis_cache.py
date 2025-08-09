"""
Redis Cache Service for Performance Optimization
"""

import redis
import json
import pickle
import logging
import hashlib
from typing import Any, Optional, Dict, List, Union
from datetime import datetime, timedelta
from dataclasses import asdict
import asyncio
from contextlib import asynccontextmanager

from app.core.config import settings

logger = logging.getLogger(__name__)

class RedisCache:
    """Redis-based caching service with advanced features"""
    
    def __init__(
        self, 
        host: str = None, 
        port: int = None, 
        db: int = 0,
        password: str = None,
        decode_responses: bool = True,
        max_connections: int = 20
    ):
        """Initialize Redis cache service"""
        self.host = host or getattr(settings, 'REDIS_HOST', 'localhost')
        self.port = port or getattr(settings, 'REDIS_PORT', 6379)
        self.db = db
        self.password = password or getattr(settings, 'REDIS_PASSWORD', None)
        self.decode_responses = decode_responses
        self.max_connections = max_connections
        
        # Connection pool for better performance
        self.pool = redis.ConnectionPool(
            host=self.host,
            port=self.port,
            db=self.db,
            password=self.password,
            decode_responses=self.decode_responses,
            max_connections=self.max_connections,
            retry_on_timeout=True,
            socket_keepalive=True,
            socket_keepalive_options={}
        )
        
        self.redis_client = redis.Redis(connection_pool=self.pool)
        
        # Cache statistics
        self.stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'deletes': 0,
            'errors': 0
        }
        
        logger.info(f"Redis cache initialized: {self.host}:{self.port}/{self.db}")
    
    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate a cache key from prefix and arguments"""
        key_parts = [prefix]
        
        # Add positional arguments
        for arg in args:
            if isinstance(arg, (dict, list)):
                key_parts.append(hashlib.md5(json.dumps(arg, sort_keys=True).encode()).hexdigest())
            else:
                key_parts.append(str(arg))
        
        # Add keyword arguments
        if kwargs:
            sorted_kwargs = sorted(kwargs.items())
            kwargs_str = json.dumps(sorted_kwargs, sort_keys=True)
            key_parts.append(hashlib.md5(kwargs_str.encode()).hexdigest())
        
        return ':'.join(key_parts)
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get value from cache"""
        try:
            value = self.redis_client.get(key)
            if value is None:
                self.stats['misses'] += 1
                return default
            
            self.stats['hits'] += 1
            
            # Try to deserialize as JSON first, then pickle
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                try:
                    return pickle.loads(value)
                except (pickle.PickleError, TypeError):
                    return value
                    
        except Exception as e:
            logger.error(f"Error getting cache key {key}: {e}")
            self.stats['errors'] += 1
            return default
    
    def set(
        self, 
        key: str, 
        value: Any, 
        ttl: int = 3600,
        serialize_method: str = 'json'
    ) -> bool:
        """Set value in cache with TTL"""
        try:
            # Serialize value
            if serialize_method == 'json':
                try:
                    serialized_value = json.dumps(value, default=str)
                except (TypeError, ValueError):
                    # Fallback to pickle for complex objects
                    serialized_value = pickle.dumps(value)
                    serialize_method = 'pickle'
            elif serialize_method == 'pickle':
                serialized_value = pickle.dumps(value)
            else:
                serialized_value = str(value)
            
            # Set with TTL
            result = self.redis_client.setex(key, ttl, serialized_value)
            
            if result:
                self.stats['sets'] += 1
                logger.debug(f"Cached key {key} with TTL {ttl}s using {serialize_method}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error setting cache key {key}: {e}")
            self.stats['errors'] += 1
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        try:
            result = self.redis_client.delete(key)
            if result:
                self.stats['deletes'] += 1
                logger.debug(f"Deleted cache key {key}")
            return bool(result)
            
        except Exception as e:
            logger.error(f"Error deleting cache key {key}: {e}")
            self.stats['errors'] += 1
            return False
    
    def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        try:
            return bool(self.redis_client.exists(key))
        except Exception as e:
            logger.error(f"Error checking cache key existence {key}: {e}")
            self.stats['errors'] += 1
            return False
    
    def get_ttl(self, key: str) -> int:
        """Get TTL for a key"""
        try:
            return self.redis_client.ttl(key)
        except Exception as e:
            logger.error(f"Error getting TTL for key {key}: {e}")
            return -1
    
    def extend_ttl(self, key: str, ttl: int) -> bool:
        """Extend TTL for existing key"""
        try:
            result = self.redis_client.expire(key, ttl)
            if result:
                logger.debug(f"Extended TTL for key {key} to {ttl}s")
            return bool(result)
        except Exception as e:
            logger.error(f"Error extending TTL for key {key}: {e}")
            return False
    
    def get_many(self, keys: List[str]) -> Dict[str, Any]:
        """Get multiple keys at once"""
        try:
            values = self.redis_client.mget(keys)
            result = {}
            
            for key, value in zip(keys, values):
                if value is not None:
                    try:
                        result[key] = json.loads(value)
                    except (json.JSONDecodeError, TypeError):
                        try:
                            result[key] = pickle.loads(value)
                        except (pickle.PickleError, TypeError):
                            result[key] = value
                    self.stats['hits'] += 1
                else:
                    self.stats['misses'] += 1
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting multiple cache keys: {e}")
            self.stats['errors'] += 1
            return {}
    
    def set_many(self, mapping: Dict[str, Any], ttl: int = 3600) -> bool:
        """Set multiple key-value pairs at once"""
        try:
            pipe = self.redis_client.pipeline()
            
            for key, value in mapping.items():
                try:
                    serialized_value = json.dumps(value, default=str)
                except (TypeError, ValueError):
                    serialized_value = pickle.dumps(value)
                
                pipe.setex(key, ttl, serialized_value)
            
            results = pipe.execute()
            success_count = sum(1 for result in results if result)
            self.stats['sets'] += success_count
            
            logger.debug(f"Set {success_count}/{len(mapping)} cache keys")
            return success_count == len(mapping)
            
        except Exception as e:
            logger.error(f"Error setting multiple cache keys: {e}")
            self.stats['errors'] += 1
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching a pattern"""
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                deleted = self.redis_client.delete(*keys)
                self.stats['deletes'] += deleted
                logger.debug(f"Deleted {deleted} keys matching pattern {pattern}")
                return deleted
            return 0
            
        except Exception as e:
            logger.error(f"Error deleting keys with pattern {pattern}: {e}")
            self.stats['errors'] += 1
            return 0
    
    def clear_all(self) -> bool:
        """Clear all keys in the current database"""
        try:
            result = self.redis_client.flushdb()
            if result:
                logger.info("Cleared all cache keys")
            return result
        except Exception as e:
            logger.error(f"Error clearing all cache keys: {e}")
            self.stats['errors'] += 1
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_operations = self.stats['hits'] + self.stats['misses']
        hit_rate = (self.stats['hits'] / total_operations * 100) if total_operations > 0 else 0
        
        try:
            info = self.redis_client.info()
            memory_usage = info.get('used_memory_human', 'Unknown')
            connected_clients = info.get('connected_clients', 0)
        except Exception:
            memory_usage = 'Unknown'
            connected_clients = 0
        
        return {
            'hits': self.stats['hits'],
            'misses': self.stats['misses'],
            'hit_rate': round(hit_rate, 2),
            'sets': self.stats['sets'],
            'deletes': self.stats['deletes'],
            'errors': self.stats['errors'],
            'memory_usage': memory_usage,
            'connected_clients': connected_clients,
            'total_operations': total_operations
        }
    
    def reset_stats(self) -> None:
        """Reset cache statistics"""
        self.stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'deletes': 0,
            'errors': 0
        }
        logger.info("Cache statistics reset")
    
    def health_check(self) -> Dict[str, Any]:
        """Perform health check on Redis connection"""
        try:
            # Test basic operations
            test_key = "health_check_test"
            test_value = "test_value"
            
            # Set test value
            set_result = self.redis_client.setex(test_key, 10, test_value)
            
            # Get test value
            get_result = self.redis_client.get(test_key)
            
            # Delete test value
            delete_result = self.redis_client.delete(test_key)
            
            # Check results
            is_healthy = (
                set_result and 
                get_result == test_value and 
                delete_result == 1
            )
            
            return {
                'healthy': is_healthy,
                'connection': 'OK' if is_healthy else 'FAILED',
                'operations': {
                    'set': bool(set_result),
                    'get': get_result == test_value,
                    'delete': delete_result == 1
                },
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return {
                'healthy': False,
                'connection': 'FAILED',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def close(self) -> None:
        """Close Redis connection"""
        try:
            self.redis_client.close()
            logger.info("Redis connection closed")
        except Exception as e:
            logger.error(f"Error closing Redis connection: {e}")

# Cache decorators for easy use
def cache_result(
    prefix: str, 
    ttl: int = 3600, 
    cache_instance: RedisCache = None
):
    """Decorator to cache function results"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Use global cache instance if not provided
            cache = cache_instance or redis_cache
            
            # Generate cache key
            cache_key = cache._generate_key(prefix, *args, **kwargs)
            
            # Try to get from cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {func.__name__}: {cache_key}")
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            if result is not None:
                cache.set(cache_key, result, ttl)
                logger.debug(f"Cached result for {func.__name__}: {cache_key}")
            
            return result
        return wrapper
    return decorator

async def async_cache_result(
    prefix: str, 
    ttl: int = 3600, 
    cache_instance: RedisCache = None
):
    """Async decorator to cache function results"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Use global cache instance if not provided
            cache = cache_instance or redis_cache
            
            # Generate cache key
            cache_key = cache._generate_key(prefix, *args, **kwargs)
            
            # Try to get from cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {func.__name__}: {cache_key}")
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            if result is not None:
                cache.set(cache_key, result, ttl)
                logger.debug(f"Cached result for {func.__name__}: {cache_key}")
            
            return result
        return wrapper
    return decorator

# Global cache instance
redis_cache = RedisCache()