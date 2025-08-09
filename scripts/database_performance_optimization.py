"""
Database Performance Optimization Scripts for Contextual Query System
"""

import logging
from sqlalchemy import text, create_engine
from sqlalchemy.orm import sessionmaker
from typing import Dict, List, Any
import time

from app.core.config import settings
from app.core.database import get_db

logger = logging.getLogger(__name__)

class DatabasePerformanceOptimizer:
    """Database performance optimization utilities"""
    
    def __init__(self, database_url: str = None):
        """Initialize database performance optimizer"""
        self.database_url = database_url or settings.DATABASE_URL
        self.engine = create_engine(self.database_url)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def analyze_query_performance(self) -> Dict[str, Any]:
        """Analyze query performance and identify slow queries"""
        with self.SessionLocal() as db:
            try:
                # Get slow query statistics
                slow_queries = db.execute(text("""
                    SELECT 
                        query,
                        calls,
                        total_time,
                        mean_time,
                        max_time,
                        stddev_time
                    FROM pg_stat_statements 
                    WHERE query LIKE '%phones%'
                    ORDER BY mean_time DESC 
                    LIMIT 10
                """)).fetchall()
                
                # Get table statistics
                table_stats = db.execute(text("""
                    SELECT 
                        schemaname,
                        tablename,
                        n_tup_ins as inserts,
                        n_tup_upd as updates,
                        n_tup_del as deletes,
                        n_tup_hot_upd as hot_updates,
                        n_live_tup as live_tuples,
                        n_dead_tup as dead_tuples,
                        last_vacuum,
                        last_autovacuum,
                        last_analyze,
                        last_autoanalyze
                    FROM pg_stat_user_tables 
                    WHERE tablename IN ('phones', 'phone_aliases', 'conversation_context', 'query_metrics')
                    ORDER BY n_live_tup DESC
                """)).fetchall()
                
                # Get index usage statistics
                index_stats = db.execute(text("""
                    SELECT 
                        schemaname,
                        tablename,
                        indexname,
                        idx_tup_read,
                        idx_tup_fetch,
                        idx_scan
                    FROM pg_stat_user_indexes 
                    WHERE tablename IN ('phones', 'phone_aliases', 'conversation_context', 'query_metrics')
                    ORDER BY idx_scan DESC
                """)).fetchall()
                
                return {
                    'slow_queries': [dict(row._mapping) for row in slow_queries],
                    'table_statistics': [dict(row._mapping) for row in table_stats],
                    'index_usage': [dict(row._mapping) for row in index_stats]
                }
                
            except Exception as e:
                logger.error(f"Error analyzing query performance: {e}")
                return {'error': str(e)}
    
    def optimize_phone_search_indexes(self) -> Dict[str, bool]:
        """Create and optimize indexes for phone search queries"""
        with self.SessionLocal() as db:
            optimizations = {}
            
            try:
                # Create GIN indexes for full-text search
                db.execute(text("""
                    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_fulltext_search 
                    ON phones USING gin(
                        to_tsvector('english', 
                            COALESCE(name, '') || ' ' || 
                            COALESCE(brand, '') || ' ' || 
                            COALESCE(model, '')
                        )
                    )
                """))
                optimizations['fulltext_search_index'] = True
                
                # Create trigram indexes for fuzzy matching
                db.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
                
                db.execute(text("""
                    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_name_trigram 
                    ON phones USING gin(name gin_trgm_ops)
                """))
                optimizations['name_trigram_index'] = True
                
                db.execute(text("""
                    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_brand_trigram 
                    ON phones USING gin(brand gin_trgm_ops)
                """))
                optimizations['brand_trigram_index'] = True
                
                # Create partial indexes for active phones
                db.execute(text("""
                    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_active_price 
                    ON phones (price_original, overall_device_score DESC) 
                    WHERE price_original IS NOT NULL AND price_original > 0
                """))
                optimizations['active_phones_price_index'] = True
                
                # Create expression indexes for common calculations
                db.execute(text("""
                    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_value_score 
                    ON phones ((overall_device_score / NULLIF(price_original, 0))) 
                    WHERE price_original IS NOT NULL AND price_original > 0 AND overall_device_score IS NOT NULL
                """))
                optimizations['value_score_index'] = True
                
                db.commit()
                logger.info("Phone search indexes optimized successfully")
                
            except Exception as e:
                logger.error(f"Error optimizing phone search indexes: {e}")
                optimizations['error'] = str(e)
                db.rollback()
            
            return optimizations
    
    def optimize_context_storage_indexes(self) -> Dict[str, bool]:
        """Optimize indexes for context storage tables"""
        with self.SessionLocal() as db:
            optimizations = {}
            
            try:
                # Optimize conversation context lookups
                db.execute(text("""
                    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_context_session_recent 
                    ON conversation_context (session_id, last_mentioned_at DESC, relevance_score DESC) 
                    WHERE last_mentioned_at > NOW() - INTERVAL '24 hours'
                """))
                optimizations['context_recent_index'] = True
                
                # Optimize query history lookups
                db.execute(text("""
                    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_history_session_recent 
                    ON query_history (session_id, created_at DESC) 
                    WHERE created_at > NOW() - INTERVAL '7 days'
                """))
                optimizations['query_history_recent_index'] = True
                
                # Create hash index for session lookups
                db.execute(text("""
                    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_sessions_session_hash 
                    ON conversation_sessions USING hash(session_id) 
                    WHERE is_active = true
                """))
                optimizations['session_hash_index'] = True
                
                db.commit()
                logger.info("Context storage indexes optimized successfully")
                
            except Exception as e:
                logger.error(f"Error optimizing context storage indexes: {e}")
                optimizations['error'] = str(e)
                db.rollback()
            
            return optimizations
    
    def optimize_analytics_indexes(self) -> Dict[str, bool]:
        """Optimize indexes for analytics tables"""
        with self.SessionLocal() as db:
            optimizations = {}
            
            try:
                # Create time-series indexes for metrics
                db.execute(text("""
                    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_metrics_time_series 
                    ON query_metrics (DATE_TRUNC('hour', created_at), query_type, status)
                """))
                optimizations['metrics_time_series_index'] = True
                
                # Create BRIN indexes for large time-series data
                db.execute(text("""
                    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_brin 
                    ON performance_metrics USING brin(timestamp)
                """))
                optimizations['performance_metrics_brin_index'] = True
                
                # Create partial indexes for error tracking
                db.execute(text("""
                    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_tracking_recent_unresolved 
                    ON error_tracking (severity, error_type, last_occurred DESC) 
                    WHERE resolved = false AND last_occurred > NOW() - INTERVAL '30 days'
                """))
                optimizations['error_tracking_recent_index'] = True
                
                db.commit()
                logger.info("Analytics indexes optimized successfully")
                
            except Exception as e:
                logger.error(f"Error optimizing analytics indexes: {e}")
                optimizations['error'] = str(e)
                db.rollback()
            
            return optimizations
    
    def update_table_statistics(self) -> Dict[str, bool]:
        """Update table statistics for better query planning"""
        with self.SessionLocal() as db:
            results = {}
            
            tables = [
                'phones', 'phone_aliases', 'conversation_sessions', 
                'conversation_context', 'query_history', 'query_metrics',
                'performance_metrics', 'error_tracking'
            ]
            
            for table in tables:
                try:
                    db.execute(text(f"ANALYZE {table}"))
                    results[table] = True
                    logger.info(f"Updated statistics for table: {table}")
                except Exception as e:
                    logger.error(f"Error updating statistics for {table}: {e}")
                    results[table] = False
            
            db.commit()
            return results
    
    def vacuum_and_reindex(self, table_name: str = None) -> Dict[str, Any]:
        """Perform vacuum and reindex operations"""
        with self.SessionLocal() as db:
            results = {}
            
            try:
                if table_name:
                    tables = [table_name]
                else:
                    tables = [
                        'phones', 'phone_aliases', 'conversation_context',
                        'query_history', 'query_metrics'
                    ]
                
                for table in tables:
                    start_time = time.time()
                    
                    # Vacuum the table
                    db.execute(text(f"VACUUM ANALYZE {table}"))
                    
                    vacuum_time = time.time() - start_time
                    
                    # Reindex the table
                    start_time = time.time()
                    db.execute(text(f"REINDEX TABLE {table}"))
                    
                    reindex_time = time.time() - start_time
                    
                    results[table] = {
                        'vacuum_time': vacuum_time,
                        'reindex_time': reindex_time,
                        'total_time': vacuum_time + reindex_time
                    }
                    
                    logger.info(f"Vacuumed and reindexed {table} in {vacuum_time + reindex_time:.2f}s")
                
                db.commit()
                
            except Exception as e:
                logger.error(f"Error during vacuum and reindex: {e}")
                results['error'] = str(e)
                db.rollback()
            
            return results
    
    def get_database_size_info(self) -> Dict[str, Any]:
        """Get database size information"""
        with self.SessionLocal() as db:
            try:
                # Get database size
                db_size = db.execute(text("""
                    SELECT pg_size_pretty(pg_database_size(current_database())) as database_size
                """)).scalar()
                
                # Get table sizes
                table_sizes = db.execute(text("""
                    SELECT 
                        tablename,
                        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
                    FROM pg_tables 
                    WHERE schemaname = 'public'
                    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
                """)).fetchall()
                
                # Get index sizes
                index_sizes = db.execute(text("""
                    SELECT 
                        indexname,
                        tablename,
                        pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) as size,
                        pg_relation_size(schemaname||'.'||indexname) as size_bytes
                    FROM pg_indexes 
                    WHERE schemaname = 'public'
                    ORDER BY pg_relation_size(schemaname||'.'||indexname) DESC
                    LIMIT 20
                """)).fetchall()
                
                return {
                    'database_size': db_size,
                    'table_sizes': [dict(row._mapping) for row in table_sizes],
                    'index_sizes': [dict(row._mapping) for row in index_sizes]
                }
                
            except Exception as e:
                logger.error(f"Error getting database size info: {e}")
                return {'error': str(e)}
    
    def optimize_connection_settings(self) -> Dict[str, Any]:
        """Optimize database connection settings"""
        with self.SessionLocal() as db:
            optimizations = {}
            
            try:
                # Get current settings
                current_settings = db.execute(text("""
                    SELECT name, setting, unit, context 
                    FROM pg_settings 
                    WHERE name IN (
                        'shared_buffers', 'effective_cache_size', 'work_mem', 
                        'maintenance_work_mem', 'max_connections', 'random_page_cost'
                    )
                """)).fetchall()
                
                optimizations['current_settings'] = [dict(row._mapping) for row in current_settings]
                
                # Provide optimization recommendations
                optimizations['recommendations'] = {
                    'shared_buffers': '25% of total RAM',
                    'effective_cache_size': '75% of total RAM',
                    'work_mem': '4MB per connection',
                    'maintenance_work_mem': '256MB',
                    'max_connections': '100-200 for web applications',
                    'random_page_cost': '1.1 for SSD, 4.0 for HDD'
                }
                
                return optimizations
                
            except Exception as e:
                logger.error(f"Error getting connection settings: {e}")
                return {'error': str(e)}
    
    def cleanup_old_data(self, days_to_keep: int = 30) -> Dict[str, int]:
        """Clean up old analytics and context data"""
        with self.SessionLocal() as db:
            cleanup_results = {}
            
            try:
                cutoff_date = text(f"NOW() - INTERVAL '{days_to_keep} days'")
                
                # Clean up old query metrics
                result = db.execute(text(f"""
                    DELETE FROM query_metrics 
                    WHERE created_at < NOW() - INTERVAL '{days_to_keep} days'
                """))
                cleanup_results['query_metrics_deleted'] = result.rowcount
                
                # Clean up old performance metrics
                result = db.execute(text(f"""
                    DELETE FROM performance_metrics 
                    WHERE timestamp < NOW() - INTERVAL '{days_to_keep} days'
                """))
                cleanup_results['performance_metrics_deleted'] = result.rowcount
                
                # Clean up old system health snapshots
                result = db.execute(text(f"""
                    DELETE FROM system_health_snapshots 
                    WHERE timestamp < NOW() - INTERVAL '{days_to_keep} days'
                """))
                cleanup_results['health_snapshots_deleted'] = result.rowcount
                
                # Clean up expired conversation sessions
                result = db.execute(text("""
                    DELETE FROM conversation_sessions 
                    WHERE (expires_at IS NOT NULL AND expires_at < NOW()) 
                    OR (is_active = false AND updated_at < NOW() - INTERVAL '7 days')
                """))
                cleanup_results['expired_sessions_deleted'] = result.rowcount
                
                # Clean up old error tracking (keep unresolved errors longer)
                result = db.execute(text(f"""
                    DELETE FROM error_tracking 
                    WHERE resolved = true AND last_occurred < NOW() - INTERVAL '{days_to_keep} days'
                """))
                cleanup_results['resolved_errors_deleted'] = result.rowcount
                
                db.commit()
                logger.info(f"Cleaned up old data: {cleanup_results}")
                
            except Exception as e:
                logger.error(f"Error cleaning up old data: {e}")
                cleanup_results['error'] = str(e)
                db.rollback()
            
            return cleanup_results

def run_full_optimization():
    """Run full database optimization"""
    optimizer = DatabasePerformanceOptimizer()
    
    print("Starting database performance optimization...")
    
    # Analyze current performance
    print("\n1. Analyzing query performance...")
    performance_analysis = optimizer.analyze_query_performance()
    print(f"Found {len(performance_analysis.get('slow_queries', []))} slow queries")
    
    # Optimize indexes
    print("\n2. Optimizing phone search indexes...")
    phone_optimizations = optimizer.optimize_phone_search_indexes()
    print(f"Phone search optimizations: {phone_optimizations}")
    
    print("\n3. Optimizing context storage indexes...")
    context_optimizations = optimizer.optimize_context_storage_indexes()
    print(f"Context storage optimizations: {context_optimizations}")
    
    print("\n4. Optimizing analytics indexes...")
    analytics_optimizations = optimizer.optimize_analytics_indexes()
    print(f"Analytics optimizations: {analytics_optimizations}")
    
    # Update statistics
    print("\n5. Updating table statistics...")
    stats_results = optimizer.update_table_statistics()
    successful_stats = sum(1 for success in stats_results.values() if success)
    print(f"Updated statistics for {successful_stats}/{len(stats_results)} tables")
    
    # Get size information
    print("\n6. Getting database size information...")
    size_info = optimizer.get_database_size_info()
    print(f"Database size: {size_info.get('database_size', 'Unknown')}")
    
    # Clean up old data
    print("\n7. Cleaning up old data...")
    cleanup_results = optimizer.cleanup_old_data(days_to_keep=30)
    total_deleted = sum(v for k, v in cleanup_results.items() if k.endswith('_deleted'))
    print(f"Deleted {total_deleted} old records")
    
    print("\nDatabase optimization completed!")

if __name__ == "__main__":
    run_full_optimization()