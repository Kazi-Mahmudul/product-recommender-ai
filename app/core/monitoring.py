import time
import logging
import functools
from typing import Dict, List, Any, Callable, Optional
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Global performance metrics storage
performance_metrics = {
    "api_response_times": {},  # Endpoint -> list of response times
    "db_query_times": {},      # Query -> list of execution times
    "slow_queries": [],        # List of slow queries (>100ms)
    "cache_hit_rates": {},     # Cache key prefix -> hit rate
}

# Configuration
SLOW_QUERY_THRESHOLD_MS = 100  # Threshold for slow query logging (milliseconds)
MAX_METRICS_ENTRIES = 1000     # Maximum number of entries to store per metric


def track_execution_time(func_name: str, metric_type: str = "api_response_times"):
    """
    Decorator to track execution time of functions
    
    Args:
        func_name: Name to use for the metric
        metric_type: Type of metric to track (api_response_times or custom)
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            result = func(*args, **kwargs)
            execution_time = (time.time() - start_time) * 1000  # Convert to ms
            
            # Store metric
            if func_name not in performance_metrics[metric_type]:
                performance_metrics[metric_type][func_name] = []
            
            metrics_list = performance_metrics[metric_type][func_name]
            metrics_list.append(execution_time)
            
            # Trim list if it gets too long
            if len(metrics_list) > MAX_METRICS_ENTRIES:
                performance_metrics[metric_type][func_name] = metrics_list[-MAX_METRICS_ENTRIES:]
            
            # Log slow API responses (>500ms)
            if metric_type == "api_response_times" and execution_time > 500:
                logger.warning(f"Slow API response: {func_name} took {execution_time:.2f}ms")
            
            return result
        return wrapper
    return decorator


def track_cache_metrics(hit: bool, prefix: str):
    """
    Track cache hit/miss metrics
    
    Args:
        hit: Whether the cache lookup was a hit
        prefix: Cache key prefix
    """
    if prefix not in performance_metrics["cache_hit_rates"]:
        performance_metrics["cache_hit_rates"][prefix] = {"hits": 0, "misses": 0}
    
    if hit:
        performance_metrics["cache_hit_rates"][prefix]["hits"] += 1
    else:
        performance_metrics["cache_hit_rates"][prefix]["misses"] += 1


def get_cache_hit_rate(prefix: str) -> float:
    """
    Get cache hit rate for a specific prefix
    
    Args:
        prefix: Cache key prefix
        
    Returns:
        Hit rate as a float between 0 and 1
    """
    if prefix not in performance_metrics["cache_hit_rates"]:
        return 0.0
    
    metrics = performance_metrics["cache_hit_rates"][prefix]
    total = metrics["hits"] + metrics["misses"]
    
    if total == 0:
        return 0.0
    
    return metrics["hits"] / total


def get_average_response_time(endpoint: str) -> float:
    """
    Get average response time for an endpoint
    
    Args:
        endpoint: API endpoint name
        
    Returns:
        Average response time in milliseconds
    """
    if endpoint not in performance_metrics["api_response_times"]:
        return 0.0
    
    times = performance_metrics["api_response_times"][endpoint]
    
    if not times:
        return 0.0
    
    return sum(times) / len(times)


def get_performance_summary() -> Dict[str, Any]:
    """
    Get a summary of performance metrics
    
    Returns:
        Dictionary with performance summary
    """
    summary = {
        "api_response_times": {},
        "cache_hit_rates": {},
        "slow_queries_count": len(performance_metrics["slow_queries"]),
        "recent_slow_queries": performance_metrics["slow_queries"][-5:] if performance_metrics["slow_queries"] else []
    }
    
    # Calculate average response times
    for endpoint, times in performance_metrics["api_response_times"].items():
        if times:
            summary["api_response_times"][endpoint] = {
                "avg_ms": sum(times) / len(times),
                "min_ms": min(times),
                "max_ms": max(times),
                "count": len(times)
            }
    
    # Calculate cache hit rates
    for prefix, metrics in performance_metrics["cache_hit_rates"].items():
        total = metrics["hits"] + metrics["misses"]
        if total > 0:
            summary["cache_hit_rates"][prefix] = {
                "hit_rate": metrics["hits"] / total,
                "hits": metrics["hits"],
                "misses": metrics["misses"]
            }
    
    return summary


# SQLAlchemy query performance monitoring
@event.listens_for(Engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    conn.info.setdefault('query_start_time', []).append(time.time())


@event.listens_for(Engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    # Check if query_start_time exists
    if 'query_start_time' not in conn.info or not conn.info['query_start_time']:
        return
        
    total_time = (time.time() - conn.info['query_start_time'].pop()) * 1000  # Convert to ms
    
    # Log and store slow queries
    if total_time > SLOW_QUERY_THRESHOLD_MS:
        query_info = {
            "query": statement,
            "parameters": str(parameters),
            "execution_time_ms": total_time,
            "timestamp": time.time()
        }
        
        performance_metrics["slow_queries"].append(query_info)
        
        # Trim list if it gets too long
        if len(performance_metrics["slow_queries"]) > MAX_METRICS_ENTRIES:
            performance_metrics["slow_queries"] = performance_metrics["slow_queries"][-MAX_METRICS_ENTRIES:]
        
        logger.warning(f"Slow query detected: {total_time:.2f}ms\n{statement}")
    
    # Store query time in metrics
    query_key = statement[:100]  # Use truncated statement as key
    if query_key not in performance_metrics["db_query_times"]:
        performance_metrics["db_query_times"][query_key] = []
    
    performance_metrics["db_query_times"][query_key].append(total_time)
    
    # Trim list if it gets too long
    if len(performance_metrics["db_query_times"][query_key]) > MAX_METRICS_ENTRIES:
        performance_metrics["db_query_times"][query_key] = performance_metrics["db_query_times"][query_key][-MAX_METRICS_ENTRIES:]