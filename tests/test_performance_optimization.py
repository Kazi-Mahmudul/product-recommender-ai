"""
Unit tests for Performance Optimization System
"""

import pytest
import time
import json
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta

from app.services.redis_cache import RedisCache, cache_result
from app.services.performance_optimizer import (
    DatabaseOptimizer, LazyLoader, ConcurrentQueryProcessor,
    monitor_performance, QueryPerformanceMetrics
)
from app.models.phone import Phone

class TestRedisCache:
    """Test cases for Redis cache service"""
    
    def setup_method(self):
        """Set up test fixtures"""
        # Mock Redis client
        self.mock_redis = Mock()
        self.cache = RedisCache()
        self.cache.redis_client = self.mock_redis
    
    def test_cache_initialization(self):
        """Test cache initialization"""
        cache = RedisCache(host='localhost', port=6379, db=0)
        assert cache.host == 'localhost'
        assert cache.port == 6379
        assert cache.db == 0
        assert cache.stats['hits'] == 0
        assert cache.stats['misses'] == 0
    
    def test_generate_key(self):
        """Test cache key generation"""
        # Test with simple arguments
        key1 = self.cache._generate_key('prefix', 'arg1', 'arg2')
        assert key1 == 'prefix:arg1:arg2'
        
        # Test with dict argument
        key2 = self.cache._generate_key('prefix', {'key': 'value'})
        assert 'prefix:' in key2
        
        # Test with kwargs
        key3 = self.cache._generate_key('prefix', param1='value1', param2='value2')
        assert 'prefix:' in key3
        
        # Keys should be consistent
        key4 = self.cache._generate_key('prefix', param1='value1', param2='value2')
        assert key3 == key4
    
    def test_get_cache_hit(self):
        """Test cache get with hit"""
        test_value = {'data': 'test'}
        self.mock_redis.get.return_value = json.dumps(test_value)
        
        result = self.cache.get('test_key')
        
        assert result == test_value
        assert self.cache.stats['hits'] == 1
        assert self.cache.stats['misses'] == 0
        self.mock_redis.get.assert_called_once_with('test_key')
    
    def test_get_cache_miss(self):
        """Test cache get with miss"""
        self.mock_redis.get.return_value = None
        
        result = self.cache.get('test_key', default='default_value')
        
        assert result == 'default_value'
        assert self.cache.stats['hits'] == 0
        assert self.cache.stats['misses'] == 1
    
    def test_set_cache_json(self):
        """Test cache set with JSON serialization"""
        test_value = {'data': 'test'}
        self.mock_redis.setex.return_value = True
        
        result = self.cache.set('test_key', test_value, ttl=3600)
        
        assert result is True
        assert self.cache.stats['sets'] == 1
        self.mock_redis.setex.assert_called_once()
        
        # Check that JSON was used
        call_args = self.mock_redis.setex.call_args
        assert call_args[0][0] == 'test_key'
        assert call_args[0][1] == 3600
        assert json.loads(call_args[0][2]) == test_value
    
    def test_set_cache_pickle_fallback(self):
        """Test cache set with pickle fallback for complex objects"""
        # Create an object that can't be JSON serialized
        test_value = Mock()
        self.mock_redis.setex.return_value = True
        
        result = self.cache.set('test_key', test_value, ttl=3600, serialize_method='pickle')
        
        assert result is True
        assert self.cache.stats['sets'] == 1
    
    def test_delete_cache(self):
        """Test cache delete"""
        self.mock_redis.delete.return_value = 1
        
        result = self.cache.delete('test_key')
        
        assert result is True
        assert self.cache.stats['deletes'] == 1
        self.mock_redis.delete.assert_called_once_with('test_key')
    
    def test_exists(self):
        """Test cache key existence check"""
        self.mock_redis.exists.return_value = 1
        
        result = self.cache.exists('test_key')
        
        assert result is True
        self.mock_redis.exists.assert_called_once_with('test_key')
    
    def test_get_ttl(self):
        """Test getting TTL for a key"""
        self.mock_redis.ttl.return_value = 3600
        
        result = self.cache.get_ttl('test_key')
        
        assert result == 3600
        self.mock_redis.ttl.assert_called_once_with('test_key')
    
    def test_extend_ttl(self):
        """Test extending TTL for a key"""
        self.mock_redis.expire.return_value = True
        
        result = self.cache.extend_ttl('test_key', 7200)
        
        assert result is True
        self.mock_redis.expire.assert_called_once_with('test_key', 7200)
    
    def test_get_many(self):
        """Test getting multiple keys"""
        keys = ['key1', 'key2', 'key3']
        values = [json.dumps({'data': 1}), json.dumps({'data': 2}), None]
        self.mock_redis.mget.return_value = values
        
        result = self.cache.get_many(keys)
        
        assert len(result) == 2  # Only non-None values
        assert result['key1'] == {'data': 1}
        assert result['key2'] == {'data': 2}
        assert 'key3' not in result
        assert self.cache.stats['hits'] == 2
        assert self.cache.stats['misses'] == 1
    
    def test_set_many(self):
        """Test setting multiple keys"""
        mapping = {
            'key1': {'data': 1},
            'key2': {'data': 2}
        }
        
        # Mock pipeline
        mock_pipeline = Mock()
        mock_pipeline.execute.return_value = [True, True]
        self.mock_redis.pipeline.return_value = mock_pipeline
        
        result = self.cache.set_many(mapping, ttl=3600)
        
        assert result is True
        assert self.cache.stats['sets'] == 2
        self.mock_redis.pipeline.assert_called_once()
        assert mock_pipeline.setex.call_count == 2
    
    def test_delete_pattern(self):
        """Test deleting keys by pattern"""
        self.mock_redis.keys.return_value = ['key1', 'key2', 'key3']
        self.mock_redis.delete.return_value = 3
        
        result = self.cache.delete_pattern('key*')
        
        assert result == 3
        assert self.cache.stats['deletes'] == 3
        self.mock_redis.keys.assert_called_once_with('key*')
        self.mock_redis.delete.assert_called_once_with('key1', 'key2', 'key3')
    
    def test_clear_all(self):
        """Test clearing all cache keys"""
        self.mock_redis.flushdb.return_value = True
        
        result = self.cache.clear_all()
        
        assert result is True
        self.mock_redis.flushdb.assert_called_once()
    
    def test_get_stats(self):
        """Test getting cache statistics"""
        # Set up some stats
        self.cache.stats['hits'] = 80
        self.cache.stats['misses'] = 20
        self.cache.stats['sets'] = 50
        self.cache.stats['deletes'] = 10
        self.cache.stats['errors'] = 2
        
        # Mock Redis info
        self.mock_redis.info.return_value = {
            'used_memory_human': '10MB',
            'connected_clients': 5
        }
        
        stats = self.cache.get_stats()
        
        assert stats['hits'] == 80
        assert stats['misses'] == 20
        assert stats['hit_rate'] == 80.0  # 80/(80+20) * 100
        assert stats['sets'] == 50
        assert stats['deletes'] == 10
        assert stats['errors'] == 2
        assert stats['memory_usage'] == '10MB'
        assert stats['connected_clients'] == 5
        assert stats['total_operations'] == 100
    
    def test_reset_stats(self):
        """Test resetting cache statistics"""
        # Set some stats
        self.cache.stats['hits'] = 10
        self.cache.stats['misses'] = 5
        
        self.cache.reset_stats()
        
        assert self.cache.stats['hits'] == 0
        assert self.cache.stats['misses'] == 0
        assert self.cache.stats['sets'] == 0
        assert self.cache.stats['deletes'] == 0
        assert self.cache.stats['errors'] == 0
    
    def test_health_check_success(self):
        """Test successful health check"""
        self.mock_redis.setex.return_value = True
        self.mock_redis.get.return_value = 'test_value'
        self.mock_redis.delete.return_value = 1
        
        result = self.cache.health_check()
        
        assert result['healthy'] is True
        assert result['connection'] == 'OK'
        assert result['operations']['set'] is True
        assert result['operations']['get'] is True
        assert result['operations']['delete'] is True
    
    def test_health_check_failure(self):
        """Test failed health check"""
        self.mock_redis.setex.side_effect = Exception('Connection failed')
        
        result = self.cache.health_check()
        
        assert result['healthy'] is False
        assert result['connection'] == 'FAILED'
        assert 'error' in result
    
    def test_cache_decorator(self):
        """Test cache result decorator"""
        mock_cache = Mock()
        mock_cache._generate_key.return_value = 'test_key'
        mock_cache.get.return_value = None  # Cache miss
        mock_cache.set.return_value = True
        
        @cache_result('test_prefix', ttl=3600, cache_instance=mock_cache)
        def test_function(arg1, arg2):
            return f"result_{arg1}_{arg2}"
        
        # First call - should execute function and cache result
        result1 = test_function('a', 'b')
        assert result1 == 'result_a_b'
        mock_cache.get.assert_called_once()
        mock_cache.set.assert_called_once()
        
        # Second call - should return cached result
        mock_cache.get.return_value = 'cached_result'
        result2 = test_function('a', 'b')
        assert result2 == 'cached_result'

class TestDatabaseOptimizer:
    """Test cases for database optimizer"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.optimizer = DatabaseOptimizer()
        self.mock_db = Mock()
        
        # Mock phone objects
        self.mock_phone1 = Mock(spec=Phone)
        self.mock_phone1.id = 1
        self.mock_phone1.name = 'iPhone 14 Pro'
        self.mock_phone1.brand = 'Apple'
        self.mock_phone1.price_original = 120000
        
        self.mock_phone2 = Mock(spec=Phone)
        self.mock_phone2.id = 2
        self.mock_phone2.name = 'Galaxy S23 Ultra'
        self.mock_phone2.brand = 'Samsung'
        self.mock_phone2.price_original = 110000
    
    def test_record_query_metrics(self):
        """Test recording query performance metrics"""
        self.optimizer._record_query_metrics('test_query', 1.5, 10, True)
        
        assert len(self.optimizer.performance_metrics) == 1
        metric = self.optimizer.performance_metrics[0]
        assert metric.query_type == 'test_query'
        assert metric.execution_time == 1.5
        assert metric.rows_returned == 10
        assert metric.cache_hit is True
    
    def test_get_performance_summary_empty(self):
        """Test performance summary with no metrics"""
        summary = self.optimizer.get_performance_summary()
        
        assert summary['total_queries'] == 0
        assert summary['average_execution_time'] == 0
        assert summary['cache_hit_rate'] == 0
        assert summary['query_types'] == {}
    
    def test_get_performance_summary_with_data(self):
        """Test performance summary with metrics data"""
        # Add some test metrics
        self.optimizer._record_query_metrics('search', 1.0, 5, True)
        self.optimizer._record_query_metrics('search', 2.0, 10, False)
        self.optimizer._record_query_metrics('comparison', 0.5, 2, True)
        
        summary = self.optimizer.get_performance_summary()
        
        assert summary['total_queries'] == 3
        assert summary['average_execution_time'] == 1.1666666666666667  # (1.0+2.0+0.5)/3
        assert summary['cache_hit_rate'] == 66.66666666666666  # 2/3 * 100
        
        # Check query type breakdown
        assert 'search' in summary['query_types']
        assert 'comparison' in summary['query_types']
        
        search_stats = summary['query_types']['search']
        assert search_stats['count'] == 2
        assert search_stats['avg_time'] == 1.5  # (1.0+2.0)/2
        assert search_stats['cache_hit_rate'] == 50.0  # 1/2 * 100
    
    @patch('app.services.performance_optimizer.redis_cache')
    def test_get_phone_by_id_cached_hit(self, mock_cache):
        """Test getting phone by ID with cache hit"""
        mock_cache.get.return_value = self.mock_phone1
        
        result = self.optimizer.get_phone_by_id_cached(self.mock_db, 1)
        
        assert result == self.mock_phone1
        mock_cache.get.assert_called_once_with('phone_by_id:1')
        # Should not query database
        self.mock_db.query.assert_not_called()
    
    @patch('app.services.performance_optimizer.redis_cache')
    def test_get_phone_by_id_cached_miss(self, mock_cache):
        """Test getting phone by ID with cache miss"""
        mock_cache.get.return_value = None
        
        # Mock database query
        mock_query = Mock()
        mock_query.filter.return_value.first.return_value = self.mock_phone1
        self.mock_db.query.return_value = mock_query
        
        result = self.optimizer.get_phone_by_id_cached(self.mock_db, 1)
        
        assert result == self.mock_phone1
        mock_cache.get.assert_called_once_with('phone_by_id:1')
        mock_cache.set.assert_called_once_with('phone_by_id:1', self.mock_phone1, ttl=3600)
        self.mock_db.query.assert_called_once()
    
    @patch('app.services.performance_optimizer.redis_cache')
    def test_get_phones_by_ids_batch(self, mock_cache):
        """Test batch phone retrieval"""
        phone_ids = [1, 2, 3]
        
        # Mock partial cache hit
        mock_cache.get_many.return_value = {
            'phone_by_id:1': self.mock_phone1
        }
        
        # Mock database query for missing phones
        mock_query = Mock()
        mock_query.filter.return_value.all.return_value = [self.mock_phone2]
        self.mock_db.query.return_value = mock_query
        
        mock_cache.set_many.return_value = True
        
        result = self.optimizer.get_phones_by_ids_batch(self.mock_db, phone_ids)
        
        assert len(result) == 2  # One from cache, one from DB
        assert self.mock_phone1 in result
        assert self.mock_phone2 in result
        
        # Should query database for missing IDs
        self.mock_db.query.assert_called_once()
        mock_cache.set_many.assert_called_once()

class TestLazyLoader:
    """Test cases for lazy loader"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.loader = LazyLoader()
        self.mock_db = Mock()
        
        # Mock phone object
        self.mock_phone = Mock(spec=Phone)
        self.mock_phone.id = 1
        self.mock_phone.name = 'iPhone 14 Pro'
        self.mock_phone.brand = 'Apple'
        self.mock_phone.price_original = 120000
    
    @patch('app.services.performance_optimizer.redis_cache')
    def test_load_phone_specs_cache_hit(self, mock_cache):
        """Test loading phone specs with cache hit"""
        spec_fields = ['name', 'brand', 'price_original']
        cached_specs = {'name': 'iPhone 14 Pro', 'brand': 'Apple', 'price_original': 120000}
        
        mock_cache.get.return_value = cached_specs
        
        result = self.loader.load_phone_specs(self.mock_db, 1, spec_fields)
        
        assert result == cached_specs
        # Should not query database
        self.mock_db.query.assert_not_called()
    
    @patch('app.services.performance_optimizer.redis_cache')
    def test_load_phone_specs_cache_miss(self, mock_cache):
        """Test loading phone specs with cache miss"""
        spec_fields = ['name', 'brand', 'price_original']
        mock_cache.get.return_value = None
        
        # Mock database query
        mock_query = Mock()
        mock_query.filter.return_value.first.return_value = self.mock_phone
        self.mock_db.query.return_value = mock_query
        
        result = self.loader.load_phone_specs(self.mock_db, 1, spec_fields)
        
        expected_specs = {
            'name': 'iPhone 14 Pro',
            'brand': 'Apple',
            'price_original': 120000
        }
        
        assert result == expected_specs
        mock_cache.set.assert_called_once()
        self.mock_db.query.assert_called_once()
    
    @patch('app.services.performance_optimizer.redis_cache')
    def test_preload_popular_phones(self, mock_cache):
        """Test preloading popular phones"""
        phone_ids = [1, 2]
        phones = [self.mock_phone]
        
        # Mock database query
        mock_query = Mock()
        mock_query.filter.return_value.all.return_value = phones
        self.mock_db.query.return_value = mock_query
        
        mock_cache.set_many.return_value = True
        
        self.loader.preload_popular_phones(self.mock_db, phone_ids)
        
        self.mock_db.query.assert_called_once()
        mock_cache.set_many.assert_called_once()

class TestConcurrentQueryProcessor:
    """Test cases for concurrent query processor"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.processor = ConcurrentQueryProcessor(max_workers=2)
    
    def teardown_method(self):
        """Clean up after tests"""
        self.processor.close()
    
    @pytest.mark.asyncio
    async def test_process_queries_concurrently_success(self):
        """Test successful concurrent query processing"""
        def query1():
            time.sleep(0.1)
            return "result1"
        
        def query2():
            time.sleep(0.1)
            return "result2"
        
        queries = [query1, query2]
        
        results = await self.processor.process_queries_concurrently(queries, timeout=5.0)
        
        assert len(results) == 2
        assert "result1" in results
        assert "result2" in results
    
    @pytest.mark.asyncio
    async def test_process_queries_concurrently_with_failure(self):
        """Test concurrent query processing with some failures"""
        def query1():
            return "result1"
        
        def query2():
            raise Exception("Query failed")
        
        def query3():
            return "result3"
        
        queries = [query1, query2, query3]
        
        results = await self.processor.process_queries_concurrently(queries, timeout=5.0)
        
        assert len(results) == 3
        assert results[0] == "result1"
        assert results[1] is None  # Failed query
        assert results[2] == "result3"
    
    @pytest.mark.asyncio
    async def test_process_queries_concurrently_empty(self):
        """Test concurrent processing with empty query list"""
        results = await self.processor.process_queries_concurrently([], timeout=5.0)
        
        assert results == []

class TestPerformanceDecorators:
    """Test cases for performance monitoring decorators"""
    
    def test_monitor_performance_decorator_success(self):
        """Test performance monitoring decorator with successful execution"""
        @monitor_performance('test_operation')
        def test_function(x, y):
            time.sleep(0.1)  # Simulate some work
            return x + y
        
        with patch('app.services.performance_optimizer.monitoring_analytics') as mock_analytics:
            result = test_function(1, 2)
            
            assert result == 3
            
            # Check that metrics were recorded
            assert mock_analytics.record_metric.call_count >= 2
            
            # Check for success metrics
            success_calls = [call for call in mock_analytics.record_metric.call_args_list 
                           if 'success' in str(call)]
            assert len(success_calls) > 0
    
    def test_monitor_performance_decorator_error(self):
        """Test performance monitoring decorator with error"""
        @monitor_performance('test_operation')
        def test_function():
            raise ValueError("Test error")
        
        with patch('app.services.performance_optimizer.monitoring_analytics') as mock_analytics:
            with pytest.raises(ValueError):
                test_function()
            
            # Check that error metrics were recorded
            error_calls = [call for call in mock_analytics.record_metric.call_args_list 
                          if 'error' in str(call)]
            assert len(error_calls) > 0

class TestQueryPerformanceMetrics:
    """Test cases for query performance metrics dataclass"""
    
    def test_query_performance_metrics_creation(self):
        """Test creating QueryPerformanceMetrics instance"""
        timestamp = datetime.now()
        
        metrics = QueryPerformanceMetrics(
            query_type='test_query',
            execution_time=1.5,
            rows_returned=10,
            cache_hit=True,
            timestamp=timestamp
        )
        
        assert metrics.query_type == 'test_query'
        assert metrics.execution_time == 1.5
        assert metrics.rows_returned == 10
        assert metrics.cache_hit is True
        assert metrics.timestamp == timestamp