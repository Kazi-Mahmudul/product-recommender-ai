"""
Performance and Load Tests for Contextual Query System
"""

import pytest
import asyncio
import time
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from unittest.mock import Mock, patch, AsyncMock
import uuid
from datetime import datetime, timedelta

from app.services.contextual_query_processor import ContextualQueryProcessor
from app.services.redis_cache import RedisCache
from app.services.performance_optimizer import DatabaseOptimizer
from app.services.monitoring_analytics import monitoring_analytics
from app.models.phone import Phone

class TestPerformanceRequirements:
    """Test performance requirements for contextual queries"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.query_processor = ContextualQueryProcessor()
        self.mock_db = Mock()
        self.performance_metrics = []
        
        # Create mock phones for testing
        self.mock_phones = self._create_mock_phones()
        self._setup_mock_responses()
    
    def _create_mock_phones(self):
        """Create mock phone objects"""
        phones = []
        for i in range(100):  # Create 100 mock phones for testing
            phone = Mock(spec=Phone)
            phone.id = i + 1
            phone.name = f"Phone {i + 1}"
            phone.brand = f"Brand {(i % 10) + 1}"
            phone.price_original = 20000 + (i * 1000)
            phone.overall_device_score = 7.0 + (i % 3)
            phones.append(phone)
        return phones
    
    def _setup_mock_responses(self):
        """Set up mock responses for services"""
        # Mock database queries
        mock_query = Mock()
        mock_query.filter.return_value.all.return_value = self.mock_phones[:10]
        mock_query.filter.return_value.limit.return_value.all.return_value = self.mock_phones[:5]
        self.mock_db.query.return_value = mock_query
    
    @pytest.mark.asyncio
    async def test_single_query_response_time(self):
        """Test that single queries respond within 2 seconds"""
        query = "Show me the best phones under 50000 taka"
        
        with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
            mock_ai.return_value = {
                'intent_type': 'recommendation',
                'confidence': 0.9,
                'phone_references': [],
                'comparison_criteria': [],
                'contextual_terms': [],
                'price_range': {'min': None, 'max': 50000},
                'specific_features': [],
                'query_focus': 'Best phones under budget'
            }
            
            # Measure response time
            start_time = time.time()
            
            result = await self.query_processor.process_contextual_query(
                query=query,
                session_id="perf_test_session",
                db=self.mock_db
            )
            
            end_time = time.time()
            response_time = end_time - start_time
            
            # Verify performance requirement
            assert response_time < 2.0, f"Query took {response_time:.3f}s, should be under 2s"
            assert result is not None
            
            # Record metric
            self.performance_metrics.append({
                'query_type': 'single_query',
                'response_time': response_time,
                'success': True
            })
    
    @pytest.mark.asyncio
    async def test_complex_comparison_query_performance(self):
        """Test performance of complex comparison queries"""
        query = "Compare iPhone 14 Pro, Samsung Galaxy S23 Ultra, and Xiaomi 13 Pro in terms of camera, battery, and performance"
        
        with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
            mock_ai.return_value = {
                'intent_type': 'comparison',
                'confidence': 0.85,
                'phone_references': [
                    {'text': 'iPhone 14 Pro', 'type': 'explicit', 'context_index': None},
                    {'text': 'Samsung Galaxy S23 Ultra', 'type': 'explicit', 'context_index': None},
                    {'text': 'Xiaomi 13 Pro', 'type': 'explicit', 'context_index': None}
                ],
                'comparison_criteria': ['camera', 'battery', 'performance'],
                'contextual_terms': [],
                'price_range': {'min': None, 'max': None},
                'specific_features': ['camera', 'battery', 'performance'],
                'query_focus': 'Multi-phone comparison'
            }
            
            start_time = time.time()
            
            result = await self.query_processor.process_contextual_query(
                query=query,
                session_id="complex_perf_test",
                db=self.mock_db
            )
            
            end_time = time.time()
            response_time = end_time - start_time
            
            # Complex queries should still be under 2 seconds
            assert response_time < 2.0, f"Complex query took {response_time:.3f}s, should be under 2s"
            assert result is not None
            
            self.performance_metrics.append({
                'query_type': 'complex_comparison',
                'response_time': response_time,
                'success': True
            })
    
    @pytest.mark.asyncio
    async def test_contextual_query_performance(self):
        """Test performance of contextual queries with conversation history"""
        session_id = "contextual_perf_test"
        
        # First query to establish context
        context_query = "Tell me about iPhone 14 Pro"
        
        with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
            mock_ai.return_value = {
                'intent_type': 'specification',
                'confidence': 0.9,
                'phone_references': [
                    {'text': 'iPhone 14 Pro', 'type': 'explicit', 'context_index': None}
                ],
                'comparison_criteria': [],
                'contextual_terms': [],
                'price_range': {'min': None, 'max': None},
                'specific_features': [],
                'query_focus': 'iPhone specifications'
            }
            
            # Establish context
            await self.query_processor.process_contextual_query(
                query=context_query,
                session_id=session_id,
                db=self.mock_db
            )
            
            # Now test contextual query performance
            contextual_query = "Show me alternatives to that phone under 80000"
            
            mock_ai.return_value = {
                'intent_type': 'alternative',
                'confidence': 0.88,
                'phone_references': [
                    {'text': 'that phone', 'type': 'contextual', 'context_index': 0}
                ],
                'comparison_criteria': ['price'],
                'contextual_terms': ['that phone', 'alternatives'],
                'price_range': {'min': None, 'max': 80000},
                'specific_features': [],
                'query_focus': 'Contextual alternatives'
            }
            
            start_time = time.time()
            
            result = await self.query_processor.process_contextual_query(
                query=contextual_query,
                session_id=session_id,
                db=self.mock_db
            )
            
            end_time = time.time()
            response_time = end_time - start_time
            
            # Contextual queries should also be under 2 seconds
            assert response_time < 2.0, f"Contextual query took {response_time:.3f}s, should be under 2s"
            assert result is not None
            
            self.performance_metrics.append({
                'query_type': 'contextual_query',
                'response_time': response_time,
                'success': True
            })
    
    @pytest.mark.asyncio
    async def test_batch_query_performance(self):
        """Test performance of processing multiple queries in sequence"""
        queries = [
            "What's the best camera phone?",
            "Show me phones under 30000",
            "Compare iPhone with Samsung",
            "Tell me about Xiaomi phones",
            "What are the latest releases?"
        ]
        
        session_id = "batch_perf_test"
        response_times = []
        
        with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
            mock_ai.return_value = {
                'intent_type': 'recommendation',
                'confidence': 0.8,
                'phone_references': [],
                'comparison_criteria': [],
                'contextual_terms': [],
                'price_range': {'min': None, 'max': None},
                'specific_features': [],
                'query_focus': 'Test query'
            }
            
            total_start_time = time.time()
            
            for i, query in enumerate(queries):
                start_time = time.time()
                
                result = await self.query_processor.process_contextual_query(
                    query=query,
                    session_id=f"{session_id}_{i}",
                    db=self.mock_db
                )
                
                end_time = time.time()
                response_time = end_time - start_time
                response_times.append(response_time)
                
                assert result is not None
                assert response_time < 2.0, f"Query {i} took {response_time:.3f}s"
            
            total_end_time = time.time()
            total_time = total_end_time - total_start_time
            
            # Calculate statistics
            avg_response_time = statistics.mean(response_times)
            max_response_time = max(response_times)
            min_response_time = min(response_times)
            
            # Verify batch performance
            assert avg_response_time < 1.5, f"Average response time {avg_response_time:.3f}s too high"
            assert max_response_time < 2.0, f"Max response time {max_response_time:.3f}s too high"
            
            self.performance_metrics.append({
                'query_type': 'batch_queries',
                'total_time': total_time,
                'avg_response_time': avg_response_time,
                'max_response_time': max_response_time,
                'min_response_time': min_response_time,
                'query_count': len(queries)
            })

class TestLoadTesting:
    """Load testing for concurrent user scenarios"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.query_processor = ContextualQueryProcessor()
        self.mock_db = Mock()
        self.load_test_results = []
        
        # Mock responses
        self._setup_mock_responses()
    
    def _setup_mock_responses(self):
        """Set up mock responses"""
        mock_query = Mock()
        mock_query.filter.return_value.all.return_value = []
        mock_query.filter.return_value.limit.return_value.all.return_value = []
        self.mock_db.query.return_value = mock_query
    
    @pytest.mark.asyncio
    async def test_concurrent_users_load(self):
        """Test system under concurrent user load"""
        concurrent_users = 10
        queries_per_user = 5
        
        async def simulate_user(user_id: int):
            """Simulate a single user's queries"""
            session_id = f"load_test_user_{user_id}"
            user_queries = [
                f"User {user_id}: Show me best phones",
                f"User {user_id}: Compare iPhone with Samsung",
                f"User {user_id}: What about battery life?",
                f"User {user_id}: Show alternatives",
                f"User {user_id}: Price under 50000"
            ]
            
            user_results = []
            
            with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                mock_ai.return_value = {
                    'intent_type': 'recommendation',
                    'confidence': 0.8,
                    'phone_references': [],
                    'comparison_criteria': [],
                    'contextual_terms': [],
                    'price_range': {'min': None, 'max': None},
                    'specific_features': [],
                    'query_focus': f'User {user_id} query'
                }
                
                for query in user_queries:
                    start_time = time.time()
                    
                    try:
                        result = await self.query_processor.process_contextual_query(
                            query=query,
                            session_id=session_id,
                            db=self.mock_db
                        )
                        
                        end_time = time.time()
                        response_time = end_time - start_time
                        
                        user_results.append({
                            'user_id': user_id,
                            'query': query,
                            'response_time': response_time,
                            'success': result is not None,
                            'error': None
                        })
                        
                    except Exception as e:
                        end_time = time.time()
                        response_time = end_time - start_time
                        
                        user_results.append({
                            'user_id': user_id,
                            'query': query,
                            'response_time': response_time,
                            'success': False,
                            'error': str(e)
                        })
            
            return user_results
        
        # Run concurrent user simulations
        start_time = time.time()
        
        tasks = [simulate_user(i) for i in range(concurrent_users)]
        user_results_list = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = time.time()
        total_load_time = end_time - start_time
        
        # Analyze results
        all_results = []
        successful_results = []
        failed_results = []
        
        for user_results in user_results_list:
            if isinstance(user_results, Exception):
                continue
            
            for result in user_results:
                all_results.append(result)
                if result['success']:
                    successful_results.append(result)
                else:
                    failed_results.append(result)
        
        # Calculate metrics
        total_queries = len(all_results)
        success_rate = len(successful_results) / total_queries * 100 if total_queries > 0 else 0
        avg_response_time = statistics.mean([r['response_time'] for r in successful_results]) if successful_results else 0
        max_response_time = max([r['response_time'] for r in successful_results]) if successful_results else 0
        
        # Verify load test requirements
        assert success_rate >= 95.0, f"Success rate {success_rate:.1f}% too low, should be >= 95%"
        assert avg_response_time < 2.0, f"Average response time {avg_response_time:.3f}s too high"
        assert max_response_time < 5.0, f"Max response time {max_response_time:.3f}s too high"
        
        self.load_test_results.append({
            'test_type': 'concurrent_users',
            'concurrent_users': concurrent_users,
            'queries_per_user': queries_per_user,
            'total_queries': total_queries,
            'success_rate': success_rate,
            'avg_response_time': avg_response_time,
            'max_response_time': max_response_time,
            'total_load_time': total_load_time,
            'failed_queries': len(failed_results)
        })
    
    @pytest.mark.asyncio
    async def test_sustained_load(self):
        """Test system under sustained load over time"""
        duration_seconds = 30  # 30 second sustained load test
        queries_per_second = 2
        
        async def generate_sustained_load():
            """Generate sustained load"""
            results = []
            start_time = time.time()
            query_count = 0
            
            with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                mock_ai.return_value = {
                    'intent_type': 'recommendation',
                    'confidence': 0.8,
                    'phone_references': [],
                    'comparison_criteria': [],
                    'contextual_terms': [],
                    'price_range': {'min': None, 'max': None},
                    'specific_features': [],
                    'query_focus': 'Sustained load query'
                }
                
                while time.time() - start_time < duration_seconds:
                    query_start = time.time()
                    
                    try:
                        result = await self.query_processor.process_contextual_query(
                            query=f"Sustained load query {query_count}",
                            session_id=f"sustained_load_{query_count}",
                            db=self.mock_db
                        )
                        
                        query_end = time.time()
                        response_time = query_end - query_start
                        
                        results.append({
                            'query_id': query_count,
                            'response_time': response_time,
                            'success': result is not None,
                            'timestamp': query_start
                        })
                        
                    except Exception as e:
                        query_end = time.time()
                        response_time = query_end - query_start
                        
                        results.append({
                            'query_id': query_count,
                            'response_time': response_time,
                            'success': False,
                            'error': str(e),
                            'timestamp': query_start
                        })
                    
                    query_count += 1
                    
                    # Wait to maintain queries per second rate
                    sleep_time = (1.0 / queries_per_second) - (query_end - query_start)
                    if sleep_time > 0:
                        await asyncio.sleep(sleep_time)
            
            return results
        
        # Run sustained load test
        results = await generate_sustained_load()
        
        # Analyze results
        successful_results = [r for r in results if r['success']]
        failed_results = [r for r in results if not r['success']]
        
        total_queries = len(results)
        success_rate = len(successful_results) / total_queries * 100 if total_queries > 0 else 0
        avg_response_time = statistics.mean([r['response_time'] for r in successful_results]) if successful_results else 0
        
        # Check for performance degradation over time
        first_half = successful_results[:len(successful_results)//2]
        second_half = successful_results[len(successful_results)//2:]
        
        first_half_avg = statistics.mean([r['response_time'] for r in first_half]) if first_half else 0
        second_half_avg = statistics.mean([r['response_time'] for r in second_half]) if second_half else 0
        
        performance_degradation = (second_half_avg - first_half_avg) / first_half_avg * 100 if first_half_avg > 0 else 0
        
        # Verify sustained load requirements
        assert success_rate >= 95.0, f"Success rate {success_rate:.1f}% too low during sustained load"
        assert avg_response_time < 2.0, f"Average response time {avg_response_time:.3f}s too high during sustained load"
        assert performance_degradation < 50.0, f"Performance degraded by {performance_degradation:.1f}% over time"
        
        self.load_test_results.append({
            'test_type': 'sustained_load',
            'duration_seconds': duration_seconds,
            'target_qps': queries_per_second,
            'actual_queries': total_queries,
            'success_rate': success_rate,
            'avg_response_time': avg_response_time,
            'performance_degradation': performance_degradation,
            'failed_queries': len(failed_results)
        })
    
    def test_memory_usage_under_load(self):
        """Test memory usage doesn't grow excessively under load"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Simulate memory-intensive operations
        cache = RedisCache()
        
        # Fill cache with test data
        for i in range(1000):
            cache.set(f"test_key_{i}", {"data": f"test_data_{i}" * 100}, ttl=3600)
        
        # Check memory after cache operations
        after_cache_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = after_cache_memory - initial_memory
        
        # Memory increase should be reasonable (less than 100MB for this test)
        assert memory_increase < 100, f"Memory increased by {memory_increase:.1f}MB, should be less than 100MB"
        
        # Clean up cache
        cache.clear_all()
        
        # Memory should be released (allow some overhead)
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_after_cleanup = final_memory - initial_memory
        
        assert memory_after_cleanup < memory_increase * 0.5, "Memory not properly released after cleanup"

class TestAccuracyUnderLoad:
    """Test that accuracy is maintained under load conditions"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.query_processor = ContextualQueryProcessor()
        self.mock_db = Mock()
        self.accuracy_results = []
    
    @pytest.mark.asyncio
    async def test_intent_classification_accuracy_under_load(self):
        """Test that intent classification accuracy is maintained under load"""
        test_queries = [
            ("Compare iPhone 14 with Samsung S23", "comparison"),
            ("What's the best camera phone?", "recommendation"),
            ("Tell me about iPhone 14 Pro specs", "specification"),
            ("Show me alternatives to iPhone", "alternative"),
            ("How does wireless charging work?", "qa")
        ] * 10  # Repeat to create load
        
        correct_classifications = 0
        total_classifications = 0
        
        with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
            def mock_ai_response(query, **kwargs):
                # Simulate correct intent classification based on query content
                query_lower = query.lower()
                if any(word in query_lower for word in ['compare', 'vs', 'versus']):
                    intent_type = 'comparison'
                elif any(word in query_lower for word in ['best', 'recommend', 'suggest']):
                    intent_type = 'recommendation'
                elif any(word in query_lower for word in ['specs', 'specification', 'tell me about']):
                    intent_type = 'specification'
                elif any(word in query_lower for word in ['alternative', 'similar']):
                    intent_type = 'alternative'
                elif any(word in query_lower for word in ['how', 'what', 'why']):
                    intent_type = 'qa'
                else:
                    intent_type = 'unknown'
                
                return {
                    'intent_type': intent_type,
                    'confidence': 0.85,
                    'phone_references': [],
                    'comparison_criteria': [],
                    'contextual_terms': [],
                    'price_range': {'min': None, 'max': None},
                    'specific_features': [],
                    'query_focus': 'Test query'
                }
            
            mock_ai.side_effect = lambda query, **kwargs: mock_ai_response(query, **kwargs)
            
            # Process all queries concurrently
            tasks = []
            for query, expected_intent in test_queries:
                task = self.query_processor.process_contextual_query(
                    query=query,
                    session_id=f"accuracy_test_{len(tasks)}",
                    db=self.mock_db
                )
                tasks.append((task, expected_intent))
            
            # Wait for all tasks to complete
            for task, expected_intent in tasks:
                try:
                    result = await task
                    actual_intent = result['intent']['type']
                    
                    if actual_intent == expected_intent:
                        correct_classifications += 1
                    
                    total_classifications += 1
                    
                except Exception as e:
                    total_classifications += 1
                    # Failed classifications count as incorrect
        
        # Calculate accuracy
        accuracy = correct_classifications / total_classifications * 100 if total_classifications > 0 else 0
        
        # Accuracy should remain high even under load
        assert accuracy >= 80.0, f"Intent classification accuracy {accuracy:.1f}% too low under load"
        
        self.accuracy_results.append({
            'test_type': 'intent_classification_accuracy',
            'total_queries': total_classifications,
            'correct_classifications': correct_classifications,
            'accuracy': accuracy
        })
    
    def teardown_method(self):
        """Clean up after tests"""
        # Print performance summary
        if hasattr(self, 'performance_metrics') and self.performance_metrics:
            print("\n=== Performance Test Summary ===")
            for metric in self.performance_metrics:
                print(f"Test: {metric['query_type']}")
                if 'response_time' in metric:
                    print(f"  Response Time: {metric['response_time']:.3f}s")
                if 'avg_response_time' in metric:
                    print(f"  Avg Response Time: {metric['avg_response_time']:.3f}s")
                if 'max_response_time' in metric:
                    print(f"  Max Response Time: {metric['max_response_time']:.3f}s")
                print()
        
        if hasattr(self, 'load_test_results') and self.load_test_results:
            print("\n=== Load Test Summary ===")
            for result in self.load_test_results:
                print(f"Test: {result['test_type']}")
                print(f"  Success Rate: {result['success_rate']:.1f}%")
                print(f"  Avg Response Time: {result['avg_response_time']:.3f}s")
                if 'concurrent_users' in result:
                    print(f"  Concurrent Users: {result['concurrent_users']}")
                if 'total_queries' in result:
                    print(f"  Total Queries: {result['total_queries']}")
                print()
        
        if hasattr(self, 'accuracy_results') and self.accuracy_results:
            print("\n=== Accuracy Test Summary ===")
            for result in self.accuracy_results:
                print(f"Test: {result['test_type']}")
                print(f"  Accuracy: {result['accuracy']:.1f}%")
                print(f"  Total Queries: {result['total_queries']}")
                print()