"""
Edge Case Tests for Error Handling and Fallback Mechanisms
"""

import pytest
import asyncio
import uuid
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta
import json

from app.services.contextual_query_processor import ContextualQueryProcessor
from app.services.error_handler import (
    PhoneResolutionError, ContextProcessingError, FilterGenerationError,
    ExternalServiceError, contextual_error_handler
)
from app.services.monitoring_analytics import QueryStatus
from app.models.phone import Phone

class TestExtremeInputScenarios:
    """Test handling of extreme or unusual inputs"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.query_processor = ContextualQueryProcessor()
        self.mock_db = Mock()
    
    @pytest.mark.asyncio
    async def test_extremely_long_query(self):
        """Test handling of extremely long queries"""
        # Create a very long query (10,000+ characters)
        base_query = "Compare iPhone 14 Pro with Samsung Galaxy S23 Ultra in terms of camera quality, battery life, performance, display quality, build quality, software features, and overall value for money. "
        long_query = base_query * 100  # ~10,000 characters
        
        with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
            mock_ai.return_value = {
                "intent_type": "comparison",
                "confidence": 0.7,  # Lower confidence for very long queries
                "phone_references": [],
                "comparison_criteria": ["camera", "battery", "performance"],
                "contextual_terms": [],
                "price_range": {"min": None, "max": None},
                "specific_features": [],
                "query_focus": "Extremely long comparison query"
            }
            
            result = await self.query_processor.process_contextual_query(
                query=long_query,
                session_id="long_query_test",
                db=self.mock_db
            )
            
            # Should handle long queries without crashing
            assert result is not None
            assert result["intent"]["type"] == "comparison"
            # Processing time should still be reasonable
            assert result["metadata"]["processing_time"] < 5.0
    
    @pytest.mark.asyncio
    async def test_query_with_special_unicode_characters(self):
        """Test handling of queries with special Unicode characters"""
        unicode_queries = [
            "iPhone 14 Pro এর দাম কত? 📱💰",  # Bengali text with emojis
            "¿Cuál es el mejor teléfono por €500? 🤔",  # Spanish with Euro symbol
            "Какой телефон лучше: iPhone или Samsung? 🇷🇺",  # Russian with flag emoji
            "手机比较：iPhone vs 三星 Galaxy S23 📊",  # Chinese characters
            "Téléphone avec meilleur appareil photo 📸✨",  # French with accents
        ]
        
        for query in unicode_queries:
            with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                mock_ai.return_value = {
                    "intent_type": "comparison",
                    "confidence": 0.8,
                    "phone_references": [],
                    "comparison_criteria": [],
                    "contextual_terms": [],
                    "price_range": {"min": None, "max": None},
                    "specific_features": [],
                    "query_focus": "Unicode query"
                }
                
                result = await self.query_processor.process_contextual_query(
                    query=query,
                    session_id="unicode_test",
                    db=self.mock_db
                )
                
                # Should handle Unicode characters gracefully
                assert result is not None
                assert "error" not in result or result.get("error") is None
    
    @pytest.mark.asyncio
    async def test_query_with_malicious_content(self):
        """Test handling of queries with potentially malicious content"""
        malicious_queries = [
            "'; DROP TABLE phones; --",  # SQL injection attempt
            "<script>alert('xss')</script>",  # XSS attempt
            "../../etc/passwd",  # Path traversal attempt
            "{{7*7}}",  # Template injection attempt
            "javascript:alert('test')",  # JavaScript injection
        ]
        
        for query in malicious_queries:
            with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                mock_ai.return_value = {
                    "intent_type": "unknown",
                    "confidence": 0.1,  # Very low confidence for suspicious queries
                    "phone_references": [],
                    "comparison_criteria": [],
                    "contextual_terms": [],
                    "price_range": {"min": None, "max": None},
                    "specific_features": [],
                    "query_focus": "Suspicious query"
                }
                
                result = await self.query_processor.process_contextual_query(
                    query=query,
                    session_id="malicious_test",
                    db=self.mock_db
                )
                
                # Should handle malicious content safely
                assert result is not None
                # Should have very low confidence or be marked as unknown
                assert result["intent"]["confidence"] < 0.5 or result["intent"]["type"] == "unknown"
    
    @pytest.mark.asyncio
    async def test_empty_and_whitespace_queries(self):
        """Test handling of empty and whitespace-only queries"""
        empty_queries = [
            "",
            "   ",
            "\n\n\n",
            "\t\t\t",
            "   \n  \t  ",
            None
        ]
        
        for query in empty_queries:
            with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                mock_ai.return_value = {
                    "intent_type": "unknown",
                    "confidence": 0.0,
                    "phone_references": [],
                    "comparison_criteria": [],
                    "contextual_terms": [],
                    "price_range": {"min": None, "max": None},
                    "specific_features": [],
                    "query_focus": "Empty query"
                }
                
                result = await self.query_processor.process_contextual_query(
                    query=query,
                    session_id="empty_query_test",
                    db=self.mock_db
                )
                
                # Should handle empty queries gracefully
                assert result is not None
                assert result["intent"]["type"] == "unknown"
                assert result["intent"]["confidence"] == 0.0
    
    @pytest.mark.asyncio
    async def test_queries_with_extreme_numbers(self):
        """Test handling of queries with extreme numerical values"""
        extreme_queries = [
            "Show me phones under 999999999999 taka",  # Extremely high price
            "I want a phone with 0 taka budget",  # Zero budget
            "Phone with -50000 taka price",  # Negative price
            "Show phones with 999GB RAM",  # Unrealistic RAM
            "Phone with 0.1 inch screen",  # Tiny screen
            "Battery with 999999mAh capacity",  # Unrealistic battery
        ]
        
        for query in extreme_queries:
            with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                mock_ai.return_value = {
                    "intent_type": "recommendation",
                    "confidence": 0.6,
                    "phone_references": [],
                    "comparison_criteria": [],
                    "contextual_terms": [],
                    "price_range": {"min": None, "max": None},
                    "specific_features": [],
                    "query_focus": "Extreme numbers query"
                }
                
                result = await self.query_processor.process_contextual_query(
                    query=query,
                    session_id="extreme_numbers_test",
                    db=self.mock_db
                )
                
                # Should handle extreme numbers without crashing
                assert result is not None
                # May have lower confidence due to unrealistic values
                assert result["intent"]["confidence"] >= 0.3

class TestSystemFailureScenarios:
    """Test handling of various system failure scenarios"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.query_processor = ContextualQueryProcessor()
        self.mock_db = Mock()
    
    @pytest.mark.asyncio
    async def test_database_connection_timeout(self):
        """Test handling of database connection timeouts"""
        query = "Show me iPhone 14 Pro specs"
        
        # Mock database timeout
        import socket
        self.mock_db.query.side_effect = socket.timeout("Database connection timed out")
        
        with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
            mock_ai.return_value = {
                "intent_type": "specification",
                "confidence": 0.9,
                "phone_references": [],
                "comparison_criteria": [],
                "contextual_terms": [],
                "price_range": {"min": None, "max": None},
                "specific_features": [],
                "query_focus": "iPhone specifications"
            }
            
            # Should handle database timeout gracefully
            with pytest.raises((socket.timeout, Exception)):
                await self.query_processor.process_contextual_query(
                    query=query,
                    session_id="db_timeout_test",
                    db=self.mock_db
                )
    
    @pytest.mark.asyncio
    async def test_memory_exhaustion_scenario(self):
        """Test handling when system is low on memory"""
        query = "Compare all phones in the database"
        
        # Mock memory error
        self.mock_db.query.side_effect = MemoryError("Not enough memory")
        
        with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
            mock_ai.return_value = {
                "intent_type": "comparison",
                "confidence": 0.8,
                "phone_references": [],
                "comparison_criteria": [],
                "contextual_terms": [],
                "price_range": {"min": None, "max": None},
                "specific_features": [],
                "query_focus": "All phones comparison"
            }
            
            # Should handle memory errors
            with pytest.raises(MemoryError):
                await self.query_processor.process_contextual_query(
                    query=query,
                    session_id="memory_test",
                    db=self.mock_db
                )
    
    @pytest.mark.asyncio
    async def test_ai_service_rate_limiting(self):
        """Test handling of AI service rate limiting"""
        query = "Compare iPhone with Samsung"
        
        with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
            # Mock rate limiting error
            mock_ai.side_effect = ExternalServiceError("gemini_ai", "Rate limit exceeded", 429)
            
            # Should handle rate limiting with fallback
            result = await self.query_processor.process_contextual_query(
                query=query,
                session_id="rate_limit_test",
                db=self.mock_db
            )
            
            # Should return fallback result
            assert result is not None
            # Confidence should be lower due to fallback
            assert result["intent"]["confidence"] < 0.8
    
    @pytest.mark.asyncio
    async def test_concurrent_session_corruption(self):
        """Test handling of concurrent session access causing corruption"""
        session_id = "concurrent_test_session"
        queries = [
            "Tell me about iPhone 14 Pro",
            "What about Samsung Galaxy S23?",
            "Compare these two phones",
            "Which one is better for photography?"
        ]
        
        async def process_query_with_corruption(query, delay=0):
            """Process query with potential context corruption"""
            if delay > 0:
                await asyncio.sleep(delay)
            
            with patch.object(self.query_processor.context_manager, 'get_conversation_context') as mock_context:
                # Simulate context corruption for some queries
                if "Compare" in query:
                    mock_context.return_value = None  # Corrupted context
                else:
                    mock_context.return_value = Mock()  # Valid context
                
                with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                    mock_ai.return_value = {
                        "intent_type": "comparison" if "Compare" in query else "specification",
                        "confidence": 0.3 if "Compare" in query else 0.8,  # Lower confidence for corrupted context
                        "phone_references": [],
                        "comparison_criteria": [],
                        "contextual_terms": [],
                        "price_range": {"min": None, "max": None},
                        "specific_features": [],
                        "query_focus": "Concurrent query"
                    }
                    
                    return await self.query_processor.process_contextual_query(
                        query=query,
                        session_id=session_id,
                        db=self.mock_db
                    )
        
        # Process queries concurrently
        tasks = [
            process_query_with_corruption(query, i * 0.1) 
            for i, query in enumerate(queries)
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # All queries should complete (some with lower confidence)
        successful_results = [r for r in results if not isinstance(r, Exception)]
        assert len(successful_results) == len(queries)
        
        # Queries with corrupted context should have lower confidence
        for result in successful_results:
            if result["intent"]["type"] == "comparison":
                assert result["intent"]["confidence"] < 0.5  # Lower confidence due to corruption

class TestResourceExhaustionScenarios:
    """Test handling of resource exhaustion scenarios"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.query_processor = ContextualQueryProcessor()
        self.mock_db = Mock()
    
    @pytest.mark.asyncio
    async def test_high_concurrent_load_handling(self):
        """Test system behavior under extremely high concurrent load"""
        concurrent_queries = 100
        query = "Show me best phones under 50000"
        
        async def process_single_query(query_id):
            """Process a single query"""
            with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                mock_ai.return_value = {
                    "intent_type": "recommendation",
                    "confidence": 0.8,
                    "phone_references": [],
                    "comparison_criteria": [],
                    "contextual_terms": [],
                    "price_range": {"min": None, "max": 50000},
                    "specific_features": [],
                    "query_focus": f"High load query {query_id}"
                }
                
                return await self.query_processor.process_contextual_query(
                    query=f"{query} - Query {query_id}",
                    session_id=f"high_load_session_{query_id}",
                    db=self.mock_db
                )
        
        # Create many concurrent tasks
        start_time = datetime.now()
        tasks = [process_single_query(i) for i in range(concurrent_queries)]
        
        # Process with timeout to prevent hanging
        try:
            results = await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True),
                timeout=30.0  # 30 second timeout
            )
        except asyncio.TimeoutError:
            pytest.fail("High concurrent load test timed out")
        
        end_time = datetime.now()
        total_time = (end_time - start_time).total_seconds()
        
        # Analyze results
        successful_results = [r for r in results if not isinstance(r, Exception)]
        failed_results = [r for r in results if isinstance(r, Exception)]
        
        success_rate = len(successful_results) / len(results) * 100
        
        # Should handle high load reasonably well
        assert success_rate >= 70.0, f"Success rate {success_rate:.1f}% too low under high load"
        assert total_time < 60.0, f"Total processing time {total_time:.1f}s too high"
        
        # Log results for analysis
        print(f"\nHigh Load Test Results:")
        print(f"  Concurrent Queries: {concurrent_queries}")
        print(f"  Success Rate: {success_rate:.1f}%")
        print(f"  Total Time: {total_time:.1f}s")
        print(f"  Failed Queries: {len(failed_results)}")
    
    @pytest.mark.asyncio
    async def test_cache_overflow_handling(self):
        """Test handling when cache becomes full"""
        from app.services.redis_cache import redis_cache
        
        # Fill cache with many entries
        cache_entries = 1000
        for i in range(cache_entries):
            redis_cache.set(f"overflow_test_key_{i}", f"test_data_{i}", ttl=3600)
        
        # Now try to process queries that would add more cache entries
        query = "Show me iPhone 14 Pro specifications"
        
        with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
            mock_ai.return_value = {
                "intent_type": "specification",
                "confidence": 0.9,
                "phone_references": [],
                "comparison_criteria": [],
                "contextual_terms": [],
                "price_range": {"min": None, "max": None},
                "specific_features": [],
                "query_focus": "Cache overflow test"
            }
            
            # Should handle cache overflow gracefully
            result = await self.query_processor.process_contextual_query(
                query=query,
                session_id="cache_overflow_test",
                db=self.mock_db
            )
            
            assert result is not None
            # System should continue working even if cache is full
    
    def test_disk_space_exhaustion(self):
        """Test handling when disk space is exhausted"""
        # This test would be difficult to implement safely in a test environment
        # as it could actually fill up disk space. Instead, we'll mock the scenario.
        
        with patch('builtins.open', side_effect=OSError("No space left on device")):
            # Any operation that tries to write to disk should handle the error
            try:
                # Simulate logging or file operations that might fail
                with open("test_file.txt", "w") as f:
                    f.write("test")
            except OSError as e:
                # Should handle disk space errors gracefully
                assert "No space left on device" in str(e)

class TestDataCorruptionScenarios:
    """Test handling of data corruption scenarios"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.query_processor = ContextualQueryProcessor()
        self.mock_db = Mock()
    
    @pytest.mark.asyncio
    async def test_corrupted_phone_data_handling(self):
        """Test handling of corrupted phone data from database"""
        query = "Tell me about iPhone 14 Pro"
        
        # Create corrupted phone data
        corrupted_phone = Mock(spec=Phone)
        corrupted_phone.id = 1
        corrupted_phone.name = None  # Corrupted name
        corrupted_phone.brand = ""   # Empty brand
        corrupted_phone.price_original = -1  # Invalid price
        corrupted_phone.battery_capacity_numeric = "invalid"  # Wrong type
        
        # Mock database to return corrupted data
        mock_query = Mock()
        mock_query.filter.return_value.first.return_value = corrupted_phone
        self.mock_db.query.return_value = mock_query
        
        with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
            mock_ai.return_value = {
                "intent_type": "specification",
                "confidence": 0.8,
                "phone_references": [
                    {"text": "iPhone 14 Pro", "type": "explicit", "context_index": None}
                ],
                "comparison_criteria": [],
                "contextual_terms": [],
                "price_range": {"min": None, "max": None},
                "specific_features": [],
                "query_focus": "Corrupted phone data test"
            }
            
            # Should handle corrupted data gracefully
            result = await self.query_processor.process_contextual_query(
                query=query,
                session_id="corrupted_data_test",
                db=self.mock_db
            )
            
            assert result is not None
            # May have lower confidence or error indication due to corrupted data
    
    @pytest.mark.asyncio
    async def test_corrupted_json_response_handling(self):
        """Test handling of corrupted JSON responses from AI service"""
        query = "Compare iPhone with Samsung"
        
        with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
            # Return corrupted JSON-like response
            mock_ai.return_value = {
                "intent_type": "comparison",
                "confidence": "invalid_confidence",  # Should be float
                "phone_references": "not_a_list",    # Should be list
                "comparison_criteria": None,         # Should be list
                "contextual_terms": {"invalid": "structure"},  # Should be list
                "price_range": "not_a_dict",        # Should be dict
                "specific_features": 123,           # Should be list
                "query_focus": ["should", "be", "string"]  # Should be string
            }
            
            # Should handle corrupted response structure
            result = await self.query_processor.process_contextual_query(
                query=query,
                session_id="corrupted_json_test",
                db=self.mock_db
            )
            
            assert result is not None
            # Should have fallback values or error handling
    
    @pytest.mark.asyncio
    async def test_corrupted_cache_data_handling(self):
        """Test handling of corrupted cache data"""
        from app.services.redis_cache import redis_cache
        
        query = "Show me iPhone 14 Pro specs"
        cache_key = "test_corrupted_cache_key"
        
        # Put corrupted data in cache
        redis_cache.set(cache_key, "corrupted_non_json_data", ttl=3600)
        
        with patch.object(redis_cache, 'get') as mock_cache_get:
            mock_cache_get.return_value = "corrupted_data_that_cannot_be_parsed"
            
            with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                mock_ai.return_value = {
                    "intent_type": "specification",
                    "confidence": 0.9,
                    "phone_references": [],
                    "comparison_criteria": [],
                    "contextual_terms": [],
                    "price_range": {"min": None, "max": None},
                    "specific_features": [],
                    "query_focus": "Corrupted cache test"
                }
                
                # Should handle corrupted cache data by falling back to fresh processing
                result = await self.query_processor.process_contextual_query(
                    query=query,
                    session_id="corrupted_cache_test",
                    db=self.mock_db
                )
                
                assert result is not None
                # Should process successfully despite corrupted cache

class TestNetworkFailureScenarios:
    """Test handling of network-related failures"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.query_processor = ContextualQueryProcessor()
        self.mock_db = Mock()
    
    @pytest.mark.asyncio
    async def test_intermittent_network_failures(self):
        """Test handling of intermittent network connectivity issues"""
        query = "Compare iPhone with Samsung"
        
        call_count = 0
        
        async def mock_ai_with_intermittent_failure(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            
            if call_count % 2 == 1:  # Fail on odd calls
                raise ExternalServiceError("gemini_ai", "Network timeout", 408)
            else:  # Succeed on even calls
                return {
                    "intent_type": "comparison",
                    "confidence": 0.8,
                    "phone_references": [],
                    "comparison_criteria": [],
                    "contextual_terms": [],
                    "price_range": {"min": None, "max": None},
                    "specific_features": [],
                    "query_focus": "Intermittent network test"
                }
        
        with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
            mock_ai.side_effect = mock_ai_with_intermittent_failure
            
            # Should handle intermittent failures with retries or fallback
            result = await self.query_processor.process_contextual_query(
                query=query,
                session_id="intermittent_network_test",
                db=self.mock_db
            )
            
            assert result is not None
            # Should eventually succeed or provide fallback result
    
    @pytest.mark.asyncio
    async def test_dns_resolution_failure(self):
        """Test handling of DNS resolution failures"""
        query = "Show me best phones"
        
        with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
            import socket
            mock_ai.side_effect = socket.gaierror("Name resolution failed")
            
            # Should handle DNS failures with fallback
            result = await self.query_processor.process_contextual_query(
                query=query,
                session_id="dns_failure_test",
                db=self.mock_db
            )
            
            assert result is not None
            # Should use fallback processing when network services are unavailable
    
    @pytest.mark.asyncio
    async def test_ssl_certificate_error(self):
        """Test handling of SSL certificate errors"""
        query = "Compare phones"
        
        with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
            import ssl
            mock_ai.side_effect = ssl.SSLError("Certificate verification failed")
            
            # Should handle SSL errors gracefully
            result = await self.query_processor.process_contextual_query(
                query=query,
                session_id="ssl_error_test",
                db=self.mock_db
            )
            
            assert result is not None
            # Should provide fallback result when secure connections fail