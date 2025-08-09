"""
Performance Optimization Service for Contextual Query System
"""

import time
import logging
import asyncio
from typing import Dict, List, Any, Optional, Callable, Union
from datetime import datetime, timedelta
from dataclasses import dataclass
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
from functools import wraps

from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import text, Index, and_, or_
from sqlalchemy.pool import QueuePool

from app.models.phone import Phone
from app.services.redis_cache import redis_cache, cache_result
from app.services.monitoring_analytics import monitoring_analytics, MetricType
from app.core.database import get_db

logger = logging.getLogger(__name__)

@dataclass
class QueryPerformanceMetrics:
    """Performance metrics for database queries"""
    query_type: str
    execution_time: float
    rows_returned: int
    cache_hit: bool
    timestamp: datetime
    
class DatabaseOptimizer:
    """Database query optimization and connection management"""
    
    def __init__(self):
        """Initialize database optimizer"""
        self.query_cache = {}
        self.performance_metrics = []
        self.connection_pool_stats = {
            'active_connections': 0,
            'total_connections': 0,
            'pool_hits': 0,
            'pool_misses': 0
        }
        
        # Thread pool for concurrent operations
        self.thread_pool = ThreadPoolExecutor(max_workers=10, thread_name_prefix="db_optimizer")
        
        logger.info("Database optimizer initialized")
    
    def optimize_phone_search_query(
        self, 
        db: Session, 
        search_terms: List[str],
        fuzzy_threshold: float = 0.8,
        limit: int = 50
    ) -> List[Phone]:
        """Optimized phone search with caching and indexing"""
        start_time = time.time()
        
        # Generate cache key
        cache_key = f"phone_search:{':'.join(sorted(search_terms))}:{fuzzy_threshold}:{limit}"
        
        # Try cache first
        cached_result = redis_cache.get(cache_key)
        if cached_result:
            execution_time = time.time() - start_time
            self._record_query_metrics("phone_search", execution_time, len(cached_result), True)
            return cached_result
        
        try:
            # Build optimized query with proper indexing
            query = db.query(Phone)
            
            # Use LIKE with wildcards for better index usage
            conditions = []
            for term in search_terms:
                term_lower = term.lower()
                conditions.extend([
                    Phone.name.ilike(f'%{term_lower}%'),
                    Phone.brand.ilike(f'%{term_lower}%'),
                    Phone.model.ilike(f'%{term_lower}%')
                ])
            
            # Combine conditions with OR
            if conditions:
                query = query.filter(or_(*conditions))
            
            # Order by relevance (exact matches first, then partial)
            query = query.order_by(
                Phone.name.asc(),
                Phone.brand.asc(),
                Phone.price_original.desc()
            )
            
            # Apply limit
            query = query.limit(limit)
            
            # Execute query
            results = query.all()
            
            # Cache results for 30 minutes
            redis_cache.set(cache_key, results, ttl=1800)
            
            execution_time = time.time() - start_time
            self._record_query_metrics("phone_search", execution_time, len(results), False)
            
            logger.debug(f"Phone search query executed in {execution_time:.3f}s, returned {len(results)} results")
            
            return results
            
        except Exception as e:
            execution_time = time.time() - start_time
            self._record_query_metrics("phone_search", execution_time, 0, False)
            logger.error(f"Error in optimized phone search: {e}")
            raise
    
    def get_phone_by_id_cached(self, db: Session, phone_id: int) -> Optional[Phone]:
        """Get phone by ID with caching"""
        cache_key = f"phone_by_id:{phone_id}"
        
        # Try cache first
        cached_phone = redis_cache.get(cache_key)
        if cached_phone:
            return cached_phone
        
        # Query database
        phone = db.query(Phone).filter(Phone.id == phone_id).first()
        
        if phone:
            # Cache for 1 hour
            redis_cache.set(cache_key, phone, ttl=3600)
        
        return phone
    
    def get_phones_by_ids_batch(self, db: Session, phone_ids: List[int]) -> List[Phone]:
        """Get multiple phones by IDs with batch optimization"""
        if not phone_ids:
            return []
        
        start_time = time.time()
        
        # Try to get from cache first
        cache_keys = [f"phone_by_id:{phone_id}" for phone_id in phone_ids]
        cached_phones = redis_cache.get_many(cache_keys)
        
        # Find missing phone IDs
        cached_phone_ids = set()
        phones = []
        
        for phone_id, cache_key in zip(phone_ids, cache_keys):
            if cache_key in cached_phones:
                phones.append(cached_phones[cache_key])
                cached_phone_ids.add(phone_id)
        
        missing_ids = [pid for pid in phone_ids if pid not in cached_phone_ids]
        
        # Batch query for missing phones
        if missing_ids:
            try:
                missing_phones = db.query(Phone).filter(Phone.id.in_(missing_ids)).all()
                
                # Cache the missing phones
                cache_mapping = {}
                for phone in missing_phones:
                    cache_key = f"phone_by_id:{phone.id}"
                    cache_mapping[cache_key] = phone
                    phones.append(phone)
                
                if cache_mapping:
                    redis_cache.set_many(cache_mapping, ttl=3600)
                
            except Exception as e:
                logger.error(f"Error in batch phone query: {e}")
        
        execution_time = time.time() - start_time
        self._record_query_metrics("batch_phone_fetch", execution_time, len(phones), len(cached_phones) > 0)
        
        return phones
    
    def optimize_comparison_query(
        self, 
        db: Session, 
        phone_ids: List[int],
        comparison_criteria: List[str]
    ) -> List[Phone]:
        """Optimized query for phone comparisons"""
        cache_key = f"comparison:{':'.join(map(str, sorted(phone_ids)))}:{':'.join(sorted(comparison_criteria))}"
        
        # Try cache first
        cached_result = redis_cache.get(cache_key)
        if cached_result:
            return cached_result
        
        start_time = time.time()
        
        try:
            # Use batch query for better performance
            phones = self.get_phones_by_ids_batch(db, phone_ids)
            
            # Cache comparison result for 15 minutes
            redis_cache.set(cache_key, phones, ttl=900)
            
            execution_time = time.time() - start_time
            self._record_query_metrics("comparison_query", execution_time, len(phones), False)
            
            return phones
            
        except Exception as e:
            execution_time = time.time() - start_time
            self._record_query_metrics("comparison_query", execution_time, 0, False)
            logger.error(f"Error in comparison query optimization: {e}")
            raise
    
    def create_database_indexes(self, db: Session) -> Dict[str, bool]:
        """Create database indexes for better performance"""
        indexes_created = {}
        
        try:
            # Index for phone name searches
            name_index = Index('idx_phone_name_search', Phone.name)
            brand_index = Index('idx_phone_brand_search', Phone.brand)
            model_index = Index('idx_phone_model_search', Phone.model)
            price_index = Index('idx_phone_price', Phone.price_original)
            
            # Composite indexes for common queries
            brand_name_index = Index('idx_phone_brand_name', Phone.brand, Phone.name)
            price_brand_index = Index('idx_phone_price_brand', Phone.price_original, Phone.brand)
            
            indexes = [
                ('name_search', name_index),
                ('brand_search', brand_index),
                ('model_search', model_index),
                ('price', price_index),
                ('brand_name', brand_name_index),
                ('price_brand', price_brand_index)
            ]
            
            for index_name, index in indexes:
                try:
                    # Check if index exists
                    result = db.execute(text(f"""
                        SELECT COUNT(*) 
                        FROM information_schema.statistics 
                        WHERE table_name = 'phones' 
                        AND index_name = '{index.name}'
                    """)).scalar()
                    
                    if result == 0:
                        index.create(db.bind)
                        indexes_created[index_name] = True
                        logger.info(f"Created database index: {index.name}")
                    else:
                        indexes_created[index_name] = False
                        logger.debug(f"Index already exists: {index.name}")
                        
                except Exception as e:
                    indexes_created[index_name] = False
                    logger.error(f"Error creating index {index_name}: {e}")
            
            db.commit()
            
        except Exception as e:
            logger.error(f"Error creating database indexes: {e}")
            db.rollback()
        
        return indexes_created
    
    def _record_query_metrics(
        self, 
        query_type: str, 
        execution_time: float, 
        rows_returned: int, 
        cache_hit: bool
    ) -> None:
        """Record query performance metrics"""
        metrics = QueryPerformanceMetrics(
            query_type=query_type,
            execution_time=execution_time,
            rows_returned=rows_returned,
            cache_hit=cache_hit,
            timestamp=datetime.now()
        )
        
        self.performance_metrics.append(metrics)
        
        # Keep only last 1000 metrics
        if len(self.performance_metrics) > 1000:
            self.performance_metrics = self.performance_metrics[-1000:]
        
        # Record in monitoring system
        monitoring_analytics.record_metric(
            f"db_query_{query_type}_time", 
            execution_time, 
            MetricType.TIMER
        )
        
        monitoring_analytics.record_metric(
            f"db_query_{query_type}_rows", 
            rows_returned, 
            MetricType.HISTOGRAM
        )
        
        if cache_hit:
            monitoring_analytics.record_metric(
                f"db_query_{query_type}_cache_hits", 
                1, 
                MetricType.COUNTER
            )
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get database performance summary"""
        if not self.performance_metrics:
            return {
                'total_queries': 0,
                'average_execution_time': 0,
                'cache_hit_rate': 0,
                'query_types': {}
            }
        
        total_queries = len(self.performance_metrics)
        total_execution_time = sum(m.execution_time for m in self.performance_metrics)
        cache_hits = sum(1 for m in self.performance_metrics if m.cache_hit)
        
        # Group by query type
        query_types = {}
        for metric in self.performance_metrics:
            if metric.query_type not in query_types:
                query_types[metric.query_type] = {
                    'count': 0,
                    'total_time': 0,
                    'cache_hits': 0,
                    'total_rows': 0
                }
            
            query_types[metric.query_type]['count'] += 1
            query_types[metric.query_type]['total_time'] += metric.execution_time
            query_types[metric.query_type]['total_rows'] += metric.rows_returned
            if metric.cache_hit:
                query_types[metric.query_type]['cache_hits'] += 1
        
        # Calculate averages for each query type
        for qtype, stats in query_types.items():
            stats['avg_time'] = stats['total_time'] / stats['count']
            stats['cache_hit_rate'] = (stats['cache_hits'] / stats['count']) * 100
            stats['avg_rows'] = stats['total_rows'] / stats['count']
        
        return {
            'total_queries': total_queries,
            'average_execution_time': total_execution_time / total_queries,
            'cache_hit_rate': (cache_hits / total_queries) * 100,
            'query_types': query_types,
            'connection_pool_stats': self.connection_pool_stats
        }

class LazyLoader:
    """Lazy loading utility for phone specifications"""
    
    def __init__(self):
        """Initialize lazy loader"""
        self.loaded_specs = {}
        self.loading_lock = threading.Lock()
    
    def load_phone_specs(self, db: Session, phone_id: int, spec_fields: List[str]) -> Dict[str, Any]:
        """Lazy load specific phone specification fields"""
        cache_key = f"phone_specs:{phone_id}:{':'.join(sorted(spec_fields))}"
        
        # Try cache first
        cached_specs = redis_cache.get(cache_key)
        if cached_specs:
            return cached_specs
        
        with self.loading_lock:
            # Double-check cache after acquiring lock
            cached_specs = redis_cache.get(cache_key)
            if cached_specs:
                return cached_specs
            
            try:
                # Query only requested fields
                phone = db.query(Phone).filter(Phone.id == phone_id).first()
                
                if not phone:
                    return {}
                
                # Extract requested specifications
                specs = {}
                for field in spec_fields:
                    if hasattr(phone, field):
                        specs[field] = getattr(phone, field)
                
                # Cache for 2 hours
                redis_cache.set(cache_key, specs, ttl=7200)
                
                return specs
                
            except Exception as e:
                logger.error(f"Error lazy loading phone specs: {e}")
                return {}
    
    def preload_popular_phones(self, db: Session, phone_ids: List[int]) -> None:
        """Preload specifications for popular phones"""
        try:
            # Common specification fields
            common_fields = [
                'name', 'brand', 'model', 'price_original', 'battery_capacity_numeric',
                'primary_camera_mp', 'selfie_camera_mp', 'ram_gb', 'storage_gb',
                'screen_size_numeric', 'overall_device_score', 'camera_score',
                'battery_score', 'performance_score', 'display_score'
            ]
            
            # Batch load phones
            phones = db.query(Phone).filter(Phone.id.in_(phone_ids)).all()
            
            # Cache specifications
            cache_mapping = {}
            for phone in phones:
                cache_key = f"phone_specs:{phone.id}:{':'.join(sorted(common_fields))}"
                specs = {}
                for field in common_fields:
                    if hasattr(phone, field):
                        specs[field] = getattr(phone, field)
                cache_mapping[cache_key] = specs
            
            if cache_mapping:
                redis_cache.set_many(cache_mapping, ttl=7200)
                logger.info(f"Preloaded specifications for {len(phones)} popular phones")
                
        except Exception as e:
            logger.error(f"Error preloading popular phones: {e}")

class ConcurrentQueryProcessor:
    """Process multiple queries concurrently for better performance"""
    
    def __init__(self, max_workers: int = 5):
        """Initialize concurrent query processor"""
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="query_processor")
    
    async def process_queries_concurrently(
        self, 
        queries: List[Callable],
        timeout: float = 10.0
    ) -> List[Any]:
        """Process multiple queries concurrently"""
        if not queries:
            return []
        
        start_time = time.time()
        
        try:
            # Submit all queries to thread pool
            future_to_query = {
                self.executor.submit(query): i 
                for i, query in enumerate(queries)
            }
            
            results = [None] * len(queries)
            completed_count = 0
            
            # Collect results as they complete
            for future in as_completed(future_to_query, timeout=timeout):
                query_index = future_to_query[future]
                try:
                    result = future.result()
                    results[query_index] = result
                    completed_count += 1
                except Exception as e:
                    logger.error(f"Query {query_index} failed: {e}")
                    results[query_index] = None
            
            execution_time = time.time() - start_time
            
            # Record performance metrics
            monitoring_analytics.record_metric(
                "concurrent_queries_time", 
                execution_time, 
                MetricType.TIMER
            )
            
            monitoring_analytics.record_metric(
                "concurrent_queries_completed", 
                completed_count, 
                MetricType.COUNTER
            )
            
            logger.debug(f"Processed {completed_count}/{len(queries)} queries concurrently in {execution_time:.3f}s")
            
            return results
            
        except Exception as e:
            logger.error(f"Error in concurrent query processing: {e}")
            return [None] * len(queries)
    
    def close(self) -> None:
        """Close the thread pool executor"""
        self.executor.shutdown(wait=True)

# Global instances
db_optimizer = DatabaseOptimizer()
lazy_loader = LazyLoader()
concurrent_processor = ConcurrentQueryProcessor()

# Performance monitoring decorator
def monitor_performance(operation_name: str):
    """Decorator to monitor operation performance"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                # Record success metrics
                monitoring_analytics.record_metric(
                    f"{operation_name}_time", 
                    execution_time, 
                    MetricType.TIMER
                )
                
                monitoring_analytics.record_metric(
                    f"{operation_name}_success", 
                    1, 
                    MetricType.COUNTER
                )
                
                return result
                
            except Exception as e:
                execution_time = time.time() - start_time
                
                # Record error metrics
                monitoring_analytics.record_metric(
                    f"{operation_name}_error", 
                    1, 
                    MetricType.COUNTER
                )
                
                monitoring_analytics.record_metric(
                    f"{operation_name}_error_time", 
                    execution_time, 
                    MetricType.TIMER
                )
                
                raise
        
        return wrapper
    return decorator

async def async_monitor_performance(operation_name: str):
    """Async decorator to monitor operation performance"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                # Record success metrics
                monitoring_analytics.record_metric(
                    f"{operation_name}_time", 
                    execution_time, 
                    MetricType.TIMER
                )
                
                monitoring_analytics.record_metric(
                    f"{operation_name}_success", 
                    1, 
                    MetricType.COUNTER
                )
                
                return result
                
            except Exception as e:
                execution_time = time.time() - start_time
                
                # Record error metrics
                monitoring_analytics.record_metric(
                    f"{operation_name}_error", 
                    1, 
                    MetricType.COUNTER
                )
                
                monitoring_analytics.record_metric(
                    f"{operation_name}_error_time", 
                    execution_time, 
                    MetricType.TIMER
                )
                
                raise
        
        return wrapper
    return decorator