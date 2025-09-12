"""
Enhanced Database Service - Provides advanced database functionality with caching and connection management.

This service adds query result caching, connection health monitoring, and enhanced error handling
on top of the basic database functionality.
"""

import logging
import time
import hashlib
from typing import Dict, Any, Optional, List, Callable
from sqlalchemy.orm import Session
from sqlalchemy import text
from contextlib import contextmanager
import threading
from functools import wraps

from app.core.database import get_db, engine, current_db_type

logger = logging.getLogger(__name__)


class DatabaseService:
    """
    Enhanced database service with caching and connection management.
    """
    
    def __init__(self):
        self.query_cache = {}
        self.cache_ttl = 300  # 5 minutes default TTL
        self.cache_lock = threading.RLock()
        self.connection_stats = {
            "total_queries": 0,
            "cached_queries": 0,
            "failed_queries": 0,
            "avg_query_time": 0.0
        }
        
    def _get_cache_key(self, query: str, params: Dict[str, Any] = None) -> str:
        """Generate cache key for query and parameters."""
        cache_data = query
        if params:
            # Sort params for consistent cache keys
            sorted_params = sorted(params.items())
            cache_data += str(sorted_params)
        
        return hashlib.md5(cache_data.encode()).hexdigest()
    
    def _get_cached_result(self, cache_key: str) -> Optional[Any]:
        """Get cached result if available and not expired."""
        with self.cache_lock:
            if cache_key in self.query_cache:
                cached_data = self.query_cache[cache_key]
                if time.time() - cached_data["timestamp"] < self.cache_ttl:
                    self.connection_stats["cached_queries"] += 1
                    logger.debug("Returning cached query result")
                    return cached_data["result"]
                else:
                    # Remove expired cache entry
                    del self.query_cache[cache_key]
        
        return None
    
    def _cache_result(self, cache_key: str, result: Any, ttl: Optional[int] = None):
        """Cache query result."""
        with self.cache_lock:
            self.query_cache[cache_key] = {
                "result": result,
                "timestamp": time.time(),
                "ttl": ttl or self.cache_ttl
            }
            
            # Simple cache cleanup - remove oldest entries if cache gets too large
            if len(self.query_cache) > 1000:
                oldest_key = min(self.query_cache.keys(), 
                               key=lambda k: self.query_cache[k]["timestamp"])
                del self.query_cache[oldest_key]
    
    def clear_cache(self, pattern: Optional[str] = None):
        """Clear cache entries, optionally matching a pattern."""
        with self.cache_lock:
            if pattern:
                # Clear entries matching pattern
                keys_to_remove = [k for k in self.query_cache.keys() if pattern in k]
                for key in keys_to_remove:
                    del self.query_cache[key]
                logger.info(f"Cleared {len(keys_to_remove)} cache entries matching '{pattern}'")
            else:
                # Clear all cache
                cache_size = len(self.query_cache)
                self.query_cache.clear()
                logger.info(f"Cleared all {cache_size} cache entries")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache and connection statistics."""
        with self.cache_lock:
            cache_stats = {
                "cache_size": len(self.query_cache),
                "cache_hit_rate": (
                    self.connection_stats["cached_queries"] / 
                    max(self.connection_stats["total_queries"], 1) * 100
                ),
                **self.connection_stats
            }
        
        return cache_stats
    
    @contextmanager
    def get_db_session(self):
        """Get database session with enhanced error handling."""
        db_gen = get_db()
        db = next(db_gen)
        
        try:
            yield db
        except Exception as e:
            logger.error(f"Database session error: {str(e)}")
            db.rollback()
            raise
        finally:
            try:
                db.close()
            except Exception as close_error:
                logger.warning(f"Error closing database session: {str(close_error)}")
    
    def execute_cached_query(
        self, 
        query: str, 
        params: Dict[str, Any] = None,
        cache_ttl: Optional[int] = None,
        use_cache: bool = True
    ) -> Any:
        """
        Execute query with caching support.
        
        Args:
            query: SQL query string
            params: Query parameters
            cache_ttl: Cache time-to-live in seconds
            use_cache: Whether to use caching
            
        Returns:
            Query result
        """
        start_time = time.time()
        self.connection_stats["total_queries"] += 1
        
        # Check cache first if enabled
        cache_key = None
        if use_cache:
            cache_key = self._get_cache_key(query, params)
            cached_result = self._get_cached_result(cache_key)
            if cached_result is not None:
                return cached_result
        
        try:
            with self.get_db_session() as db:
                if params:
                    result = db.execute(text(query), params)
                else:
                    result = db.execute(text(query))
                
                # Convert result to appropriate format
                if result.returns_rows:
                    query_result = [dict(row._mapping) for row in result]
                else:
                    query_result = result.rowcount
                
                # Cache result if caching is enabled
                if use_cache and cache_key:
                    self._cache_result(cache_key, query_result, cache_ttl)
                
                # Update stats
                query_time = time.time() - start_time
                self._update_query_stats(query_time)
                
                return query_result
                
        except Exception as e:
            self.connection_stats["failed_queries"] += 1
            logger.error(f"Query execution failed: {str(e)}")
            logger.error(f"Query: {query}")
            if params:
                logger.error(f"Params: {params}")
            raise
    
    def _update_query_stats(self, query_time: float):
        """Update query performance statistics."""
        # Update average query time using exponential moving average
        alpha = 0.1  # Smoothing factor
        if self.connection_stats["avg_query_time"] == 0:
            self.connection_stats["avg_query_time"] = query_time
        else:
            self.connection_stats["avg_query_time"] = (
                alpha * query_time + 
                (1 - alpha) * self.connection_stats["avg_query_time"]
            )
    
    def health_check(self) -> Dict[str, Any]:
        """
        Perform comprehensive database health check.
        
        Returns:
            Dict containing health status and metrics
        """
        health_info = {
            "status": "unknown",
            "database_type": current_db_type,
            "connection_pool": {},
            "query_stats": self.get_cache_stats(),
            "tables": {}
        }
        
        try:
            with self.get_db_session() as db:
                # Test basic connectivity
                start_time = time.time()
                db.execute(text("SELECT 1"))
                response_time = time.time() - start_time
                
                health_info["status"] = "healthy"
                health_info["response_time"] = response_time
                
                # Get connection pool info if available
                try:
                    if hasattr(engine.pool, 'size'):
                        pool_info = {
                            "pool_size": engine.pool.size(),
                            "checked_in": engine.pool.checkedin(),
                            "checked_out": engine.pool.checkedout(),
                        }
                        
                        # Add optional attributes if they exist
                        if hasattr(engine.pool, 'overflow'):
                            pool_info["overflow"] = engine.pool.overflow()
                        if hasattr(engine.pool, 'invalid'):
                            pool_info["invalid"] = engine.pool.invalid()
                        
                        health_info["connection_pool"] = pool_info
                except Exception as pool_error:
                    logger.debug(f"Could not get pool info: {str(pool_error)}")
                    health_info["connection_pool"] = {"error": "Pool info unavailable"}
                
                # Check critical tables
                tables_to_check = ["phones", "comparison_sessions", "comparison_items"]
                for table_name in tables_to_check:
                    try:
                        result = db.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                        count = result.scalar()
                        health_info["tables"][table_name] = {
                            "exists": True,
                            "row_count": count
                        }
                    except Exception as table_error:
                        health_info["tables"][table_name] = {
                            "exists": False,
                            "error": str(table_error)
                        }
                
        except Exception as e:
            health_info["status"] = "unhealthy"
            health_info["error"] = str(e)
            logger.error(f"Database health check failed: {str(e)}")
        
        return health_info
    
    def optimize_queries(self):
        """
        Perform query optimization tasks.
        This could include analyzing slow queries, updating statistics, etc.
        """
        try:
            with self.get_db_session() as db:
                # Update table statistics (PostgreSQL specific)
                if current_db_type in ["supabase", "local"]:
                    db.execute(text("ANALYZE phones"))
                    logger.info("Updated table statistics for phones")
                
        except Exception as e:
            logger.warning(f"Query optimization failed: {str(e)}")


# Global database service instance
db_service = DatabaseService()


def cached_query(cache_ttl: int = 300, use_cache: bool = True):
    """
    Decorator for caching database queries.
    
    Args:
        cache_ttl: Cache time-to-live in seconds
        use_cache: Whether to use caching
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_key = f"{func.__name__}_{str(args)}_{str(sorted(kwargs.items()))}"
            cache_key = hashlib.md5(cache_key.encode()).hexdigest()
            
            if use_cache:
                cached_result = db_service._get_cached_result(cache_key)
                if cached_result is not None:
                    return cached_result
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Cache result
            if use_cache:
                db_service._cache_result(cache_key, result, cache_ttl)
            
            return result
        
        return wrapper
    return decorator