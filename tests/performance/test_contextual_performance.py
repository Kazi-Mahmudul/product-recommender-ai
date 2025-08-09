"""
Performance tests and benchmarks for Contextual Query System
"""
import pytest
import asyncio
import time
import statistics
import psutil
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from unittest.mock import Mock, patch
from app.services.contextual_integration import ContextualIntegrationService
from app.services.context_manager import ContextManager
from app.services.phone_name_resolver import PhoneNameResolver
from app.services.contextual_filter_generator import ContextualFilterGenerator
from app.services.contextual_response_formatter import ContextualResponseFormatter
from app.services.contextual_query_processor import ContextualQueryProcessor
from app.services.ai_service import AIService
from app.models.phone import Phone


class TestContextualQueryPerformance:
    """Performance tests for contextual query processing"""
    
    def setup_method(self):
        """Set up performance test fixtures"""
        self.db_session = Mock()
        
        # Create large dataset of mock phones
        self.mock_phones = []
        brands = ["Apple", "Samsung", "Google", "OnePlus", "Xiaomi", "Oppo", "Vivo", "Realme", "Huawei", "Nokia"]
        for i in range(100):  # 100 phones for performance testing
            brand = brands[i % len(brands)]
            phone = Mock(spec=Phone)
            phone.id = i + 1
            phone.brand = brand
            phone.name = f"{brand} Model {i + 1}"
            phone.price_original = 30000 + (i * 1000)
            phone.processor = f"Processor {i % 10}"
            phone.camera_main = f"{40 + (i % 20)}MP"
            phone.battery_capacity = f"{3000 + (i * 50)}mAh"
            self.mock_phones.append(phone)
        
        # Initialize services
        self.context_manager = ContextManager()
        self.phone_resolver = PhoneNameResolver(self.db_session)
        self.filter_generator = ContextualFilterGenerator()
        self.response_formatter = ContextualResponseFormatter()
        self.query_processor = ContextualQueryProcessor(self.db_session)
        self.ai_service = AIService()
        
        self.integration_service = ContextualIntegrationService(
            context_manager=self.context_manager,
            phone_resolver=self.phone_resolver,
            filter_generator=self.filter_generator,
            response_formatter=self.response_formatter,
            query_processor=self.query_processor,
            ai_service=self.ai_service,
            db_session=self.db_session
        )

    @pytest.mark.asyncio
    async def test_single_query_performance(self):
        """Test performance of a single contextual query"""
        with patch.object(self.phone_resolver, 'resolve_phone_names') as mock_resolve, \
             patch.object(self.query_processor, 'execute_contextual_query') as mock_execute, \
             patch.object(self.ai_service, 'process_contextual_query') as mock_ai:
            
            # Setup mocks
            mock_resolve.return_value = self.mock_phones[:5]
            mock_execute.return_value = self.mock_phones[:10]
            mock_ai.return_value = {
                'intent_type': 'comparison',
                'confidence': 0.9,
                'phone_references': [{'text': 'iPhone', 'type': 'explicit'}],
                'comparison_criteria': ['camera', 'performance'],
                'contextual_terms': [],
                'price_range': {'min': None, 'max': None},
                'specific_features': [],
                'query_focus': 'iPhone comparison'
            }
            
            # Measure performance
            start_time = time.time()
            result = await self.integration_service.process_contextual_query(
                query="Compare iPhone with Samsung Galaxy",
                session_id="perf_test_single",
                user_id="perf_user"
            )
            end_time = time.time()
            processing_time = end_time - start_time
            
            # Performance assertions
            assert processing_time < 0.5  # Should complete within 500ms
            assert result['success'] is True
            print(f"Single query processing time: {processing_time:.3f}s")

    @pytest.mark.asyncio
    async def test_concurrent_query_performance(self):
        """Test performance under concurrent load"""
        num_concurrent = 20
        queries = [f"Test query {i} for concurrent performance" for i in range(num_concurrent)]
        
        with patch.object(self.phone_resolver, 'resolve_phone_names') as mock_resolve, \
             patch.object(self.query_processor, 'execute_contextual_query') as mock_execute, \
             patch.object(self.ai_service, 'process_contextual_query') as mock_ai:
            
            # Setup mocks
            mock_resolve.return_value = self.mock_phones[:5]
            mock_execute.return_value = self.mock_phones[:10]
            mock_ai.return_value = {
                'intent_type': 'specification',
                'confidence': 0.8,
                'phone_references': [],
                'comparison_criteria': [],
                'contextual_terms': [],
                'price_range': {'min': None, 'max': None},
                'specific_features': [],
                'query_focus': 'Concurrent test query'
            }
            
            # Create concurrent tasks
            start_time = time.time()
            tasks = []
            for i in range(num_concurrent):
                task = self.integration_service.process_contextual_query(
                    query=queries[i],
                    session_id=f"perf_concurrent_{i}",
                    user_id="perf_user"
                )
                tasks.append(task)
            
            # Execute all tasks concurrently
            results = await asyncio.gather(*tasks)
            end_time = time.time()
            
            total_time = end_time - start_time
            avg_time = total_time / num_concurrent
            
            # Performance assertions
            assert len(results) == num_concurrent
            assert all(result['success'] for result in results)
            assert total_time < 5.0  # Should complete within 5 seconds
            assert avg_time < 0.5   # Average time should be less than 500ms
            
            print(f"Concurrent processing - {num_concurrent} queries in {total_time:.3f}s (avg: {avg_time:.3f}s per query)")

    def test_memory_usage_performance(self):
        """Test memory usage under load"""
        import gc
        
        # Get initial memory usage
        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Create many contexts to test memory usage
        session_ids = []
        for i in range(100):
            session_id = f"memory_test_{i}"
            session_ids.append(session_id)
            context = self.context_manager.get_or_create_context(session_id, f"user_{i}")
            
            # Add data to each context
            for j in range(10):
                context.add_phone_to_history(self.mock_phones[j % len(self.mock_phones)])
                context.add_query_to_history(f"Query {j}", "specification", 0.8)
        
        # Get memory usage after creating contexts
        peak_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = peak_memory - initial_memory
        
        # Clean up contexts
        for session_id in session_ids:
            self.context_manager.clear_context(session_id)
        
        # Force garbage collection
        gc.collect()
        
        # Get final memory usage
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Memory assertions
        assert memory_increase < 100  # Should not use more than 100MB for 100 contexts
        assert final_memory < peak_memory  # Memory should be freed after cleanup
        
        print(f"Memory usage - Initial: {initial_memory:.1f}MB, Peak: {peak_memory:.1f}MB, Final: {final_memory:.1f}MB")

    @pytest.mark.asyncio
    async def test_context_scaling_performance(self):
        """Test performance with large context history"""
        session_id = "scaling_test"
        context = self.context_manager.get_or_create_context(session_id, "scaling_user")
        
        # Build large context
        for i in range(50):
            context.add_phone_to_history(self.mock_phones[i % len(self.mock_phones)])
            context.add_query_to_history(f"Scaling query {i}", "comparison", 0.8)
        
        with patch.object(self.phone_resolver, 'resolve_phone_names') as mock_resolve, \
             patch.object(self.query_processor, 'execute_contextual_query') as mock_execute, \
             patch.object(self.ai_service, 'process_contextual_query') as mock_ai:
            
            mock_resolve.return_value = self.mock_phones[:5]
            mock_execute.return_value = self.mock_phones[:10]
            mock_ai.return_value = {
                'intent_type': 'contextual_recommendation',
                'confidence': 0.8,
                'phone_references': [{'text': 'it', 'type': 'contextual', 'context_index': 0}],
                'comparison_criteria': ['price'],
                'contextual_terms': ['cheaper'],
                'price_range': {'min': None, 'max': 80000},
                'specific_features': [],
                'query_focus': 'Find alternatives with large context'
            }
            
            # Test query with large context
            start_time = time.time()
            result = await self.integration_service.process_contextual_query(
                query="Show me cheaper alternatives to the phones we discussed",
                session_id=session_id,
                user_id="scaling_user"
            )
            end_time = time.time()
            
            processing_time = end_time - start_time
            
            # Performance assertions
            assert processing_time < 2.0  # Should handle large context within 2 seconds
            assert result['success'] is True
            
            print(f"Large context processing time: {processing_time:.3f}s")


class TestContextualQueryBenchmarks:
    """Benchmark tests for contextual query system"""
    
    def setup_method(self):
        """Set up benchmark fixtures"""
        self.db_session = Mock()
        self.integration_service = ContextualIntegrationService(
            context_manager=ContextManager(),
            phone_resolver=PhoneNameResolver(self.db_session),
            filter_generator=ContextualFilterGenerator(),
            response_formatter=ContextualResponseFormatter(),
            query_processor=ContextualQueryProcessor(self.db_session),
            ai_service=AIService(),
            db_session=self.db_session
        )
    
    @pytest.mark.benchmark
    @pytest.mark.asyncio
    async def test_end_to_end_benchmark(self):
        """Benchmark complete end-to-end query processing"""
        benchmark_queries = [
            "Compare iPhone 14 Pro with Samsung Galaxy S23 Ultra",
            "Show me alternatives to iPhone under 80000",
            "What are the camera specs of Samsung Galaxy S23?",
            "Recommend best phone for photography",
            "Which phone has better battery life?",
            "Show me OnePlus phones with good performance",
            "Compare camera quality between brands",
            "What's the price difference between models?",
            "Show me phones with 5G support",
            "Which phone offers best value for money?"
        ]
        
        with patch.object(self.integration_service.phone_resolver, 'resolve_phone_names') as mock_resolve, \
             patch.object(self.integration_service.query_processor, 'execute_contextual_query') as mock_execute, \
             patch.object(self.integration_service.ai_service, 'process_contextual_query') as mock_ai:
            
            # Setup mocks for consistent benchmarking
            mock_resolve.return_value = []
            mock_execute.return_value = []
            mock_ai.return_value = {
                'intent_type': 'comparison',
                'confidence': 0.8,
                'phone_references': [],
                'comparison_criteria': ['camera'],
                'contextual_terms': [],
                'price_range': {'min': None, 'max': None},
                'specific_features': [],
                'query_focus': 'Benchmark query'
            }
            
            # Run benchmark
            processing_times = []
            for query in benchmark_queries:
                start_time = time.time()
                
                result = await self.integration_service.process_contextual_query(
                    query=query,
                    session_id="benchmark_session",
                    user_id="benchmark_user"
                )
                
                end_time = time.time()
                processing_time = end_time - start_time
                processing_times.append(processing_time)
                
                assert result['success'] is True
            
            # Benchmark results
            avg_time = statistics.mean(processing_times)
            median_time = statistics.median(processing_times)
            p95_time = statistics.quantiles(processing_times, n=20)[18]
            p99_time = statistics.quantiles(processing_times, n=100)[98]
            
            print(f"\n=== End-to-End Benchmark Results ===")
            print(f"Queries processed: {len(benchmark_queries)}")
            print(f"Average time: {avg_time:.3f}s")
            print(f"Median time: {median_time:.3f}s")
            print(f"95th percentile: {p95_time:.3f}s")
            print(f"99th percentile: {p99_time:.3f}s")
            print(f"Min time: {min(processing_times):.3f}s")
            print(f"Max time: {max(processing_times):.3f}s")
            
            # Performance targets
            assert avg_time < 0.5    # Average should be under 500ms
            assert p95_time < 1.0    # 95% should be under 1 second
            assert p99_time < 2.0    # 99% should be under 2 seconds


if __name__ == "__main__":
    # Run performance tests
    pytest.main([__file__, "-v", "--tb=short"])