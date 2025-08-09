"""
Integration tests for end-to-end contextual query flows
"""

import pytest
import asyncio
import uuid
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime
from sqlalchemy.orm import Session

from app.services.contextual_query_processor import ContextualQueryProcessor
from app.services.context_manager import ContextManager
from app.services.phone_name_resolver import PhoneNameResolver
from app.services.contextual_filter_generator import ContextualFilterGenerator
from app.services.contextual_response_formatter import ContextualResponseFormatter
from app.services.ai_service import AIService
from app.services.monitoring_analytics import monitoring_analytics, QueryStatus
from app.models.phone import Phone
from app.models.contextual_models import ContextualIntent, ResolvedPhone, ConversationContext

class TestContextualQueryIntegration:
    """Integration tests for complete contextual query processing"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.session_id = str(uuid.uuid4())
        self.query_processor = ContextualQueryProcessor()
        self.context_manager = ContextManager()
        self.phone_resolver = PhoneNameResolver()
        self.filter_generator = ContextualFilterGenerator()
        self.response_formatter = ContextualResponseFormatter()
        self.ai_service = AIService()
        
        # Mock database session
        self.mock_db = Mock(spec=Session)
        
        # Create mock phones
        self.mock_phones = self._create_mock_phones()
        
        # Set up mock database queries
        self._setup_mock_db_queries()
    
    def _create_mock_phones(self):
        """Create mock phone objects for testing"""
        phones = []
        
        # iPhone 14 Pro
        iphone = Mock(spec=Phone)
        iphone.id = 1
        iphone.name = "iPhone 14 Pro"
        iphone.brand = "Apple"
        iphone.model = "14 Pro"
        iphone.price_original = 120000
        iphone.battery_capacity_numeric = 3200
        iphone.primary_camera_mp = 48
        iphone.selfie_camera_mp = 12
        iphone.ram_gb = 6
        iphone.storage_gb = 128
        iphone.overall_device_score = 9.2
        iphone.camera_score = 9.5
        iphone.battery_score = 8.5
        iphone.performance_score = 9.8
        phones.append(iphone)
        
        # Samsung Galaxy S23 Ultra
        samsung = Mock(spec=Phone)
        samsung.id = 2
        samsung.name = "Galaxy S23 Ultra"
        samsung.brand = "Samsung"
        samsung.model = "S23 Ultra"
        samsung.price_original = 110000
        samsung.battery_capacity_numeric = 5000
        samsung.primary_camera_mp = 200
        samsung.selfie_camera_mp = 12
        samsung.ram_gb = 12
        samsung.storage_gb = 256
        samsung.overall_device_score = 9.0
        samsung.camera_score = 9.8
        samsung.battery_score = 9.2
        samsung.performance_score = 9.3
        phones.append(samsung)
        
        # Xiaomi 13 Pro
        xiaomi = Mock(spec=Phone)
        xiaomi.id = 3
        xiaomi.name = "13 Pro"
        xiaomi.brand = "Xiaomi"
        xiaomi.model = "13 Pro"
        xiaomi.price_original = 75000
        xiaomi.battery_capacity_numeric = 4820
        xiaomi.primary_camera_mp = 50
        xiaomi.selfie_camera_mp = 32
        xiaomi.ram_gb = 12
        xiaomi.storage_gb = 256
        xiaomi.overall_device_score = 8.7
        xiaomi.camera_score = 8.9
        xiaomi.battery_score = 8.8
        xiaomi.performance_score = 8.9
        phones.append(xiaomi)
        
        return phones
    
    def _setup_mock_db_queries(self):
        """Set up mock database query responses"""
        # Mock phone queries
        mock_query = Mock()
        mock_query.filter.return_value.all.return_value = self.mock_phones
        mock_query.filter.return_value.first.return_value = self.mock_phones[0]
        mock_query.filter.return_value.limit.return_value.all.return_value = self.mock_phones[:2]
        self.mock_db.query.return_value = mock_query
    
    @pytest.mark.asyncio
    async def test_complete_comparison_query_flow(self):
        """Test complete flow for comparison query"""
        query = "Compare iPhone 14 Pro with Samsung Galaxy S23 Ultra"
        
        with patch.object(self.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
            # Mock AI response
            mock_ai.return_value = {
                'intent_type': 'comparison',
                'confidence': 0.9,
                'phone_references': [
                    {'text': 'iPhone 14 Pro', 'type': 'explicit', 'context_index': None},
                    {'text': 'Samsung Galaxy S23 Ultra', 'type': 'explicit', 'context_index': None}
                ],
                'comparison_criteria': ['camera', 'battery', 'performance'],
                'contextual_terms': [],
                'price_range': {'min': None, 'max': None},
                'specific_features': [],
                'query_focus': 'Compare two flagship phones'
            }
            
            with patch.object(self.phone_resolver, 'resolve_phone_references') as mock_resolver:
                # Mock phone resolution
                mock_resolver.return_value = [
                    ResolvedPhone(
                        original_text="iPhone 14 Pro",
                        resolved_phone=self.mock_phones[0],
                        confidence=0.95,
                        match_type="exact"
                    ),
                    ResolvedPhone(
                        original_text="Samsung Galaxy S23 Ultra",
                        resolved_phone=self.mock_phones[1],
                        confidence=0.92,
                        match_type="exact"
                    )
                ]
                
                with patch.object(self.filter_generator, 'generate_contextual_filters') as mock_filters:
                    # Mock filter generation
                    mock_filters.return_value = {
                        'base_filters': {},
                        'comparison_filters': {
                            'phone_ids': [1, 2]
                        },
                        'sort_criteria': [('overall_device_score', 'desc')]
                    }
                    
                    # Execute the complete flow
                    result = await self.query_processor.process_contextual_query(
                        query=query,
                        session_id=self.session_id,
                        db=self.mock_db
                    )
                    
                    # Verify the result structure
                    assert result is not None
                    assert 'intent' in result
                    assert 'phones' in result
                    assert 'metadata' in result
                    
                    # Verify intent processing
                    assert result['intent']['type'] == 'comparison'
                    assert result['intent']['confidence'] > 0.8
                    
                    # Verify phone resolution
                    assert len(result['phones']) >= 2
                    
                    # Verify metadata
                    assert result['metadata']['session_id'] == self.session_id
                    assert 'processing_time' in result['metadata']
                    assert 'query_id' in result['metadata']
    
    @pytest.mark.asyncio
    async def test_contextual_alternative_query_flow(self):
        """Test complete flow for contextual alternative query"""
        # First, establish context with a phone
        context_query = "Tell me about iPhone 14 Pro"
        
        with patch.object(self.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
            mock_ai.return_value = {
                'intent_type': 'specification',
                'confidence': 0.85,
                'phone_references': [
                    {'text': 'iPhone 14 Pro', 'type': 'explicit', 'context_index': None}
                ],
                'comparison_criteria': [],
                'contextual_terms': [],
                'price_range': {'min': None, 'max': None},
                'specific_features': [],
                'query_focus': 'Get iPhone 14 Pro specifications'
            }
            
            with patch.object(self.phone_resolver, 'resolve_phone_references') as mock_resolver:
                mock_resolver.return_value = [
                    ResolvedPhone(
                        original_text="iPhone 14 Pro",
                        resolved_phone=self.mock_phones[0],
                        confidence=0.95,
                        match_type="exact"
                    )
                ]
                
                # Process context-establishing query
                context_result = await self.query_processor.process_contextual_query(
                    query=context_query,
                    session_id=self.session_id,
                    db=self.mock_db
                )
                
                # Now process contextual alternative query
                alternative_query = "Show me alternatives to that phone under 80000 taka"
                
                mock_ai.return_value = {
                    'intent_type': 'alternative',
                    'confidence': 0.88,
                    'phone_references': [
                        {'text': 'that phone', 'type': 'contextual', 'context_index': 0}
                    ],
                    'comparison_criteria': ['price'],
                    'contextual_terms': ['alternatives', 'that phone'],
                    'price_range': {'min': None, 'max': 80000},
                    'specific_features': [],
                    'query_focus': 'Find alternatives under budget'
                }
                
                with patch.object(self.filter_generator, 'generate_contextual_filters') as mock_filters:
                    mock_filters.return_value = {
                        'base_filters': {
                            'price_max': 80000
                        },
                        'comparison_filters': {
                            'exclude_phone_ids': [1]  # Exclude the reference phone
                        },
                        'sort_criteria': [('overall_device_score', 'desc')]
                    }
                    
                    # Process alternative query
                    alternative_result = await self.query_processor.process_contextual_query(
                        query=alternative_query,
                        session_id=self.session_id,
                        db=self.mock_db
                    )
                    
                    # Verify contextual processing
                    assert alternative_result['intent']['type'] == 'alternative'
                    assert 'contextual_terms' in alternative_result['metadata']
                    assert len(alternative_result['metadata']['contextual_terms']) > 0
                    
                    # Verify price filtering was applied
                    assert alternative_result['metadata']['filters']['price_max'] == 80000
    
    @pytest.mark.asyncio
    async def test_multi_turn_conversation_flow(self):
        """Test multi-turn conversation with context building"""
        queries = [
            "What's the best camera phone under 100000?",
            "How about the battery life of the first one?",
            "Show me something similar but cheaper"
        ]
        
        conversation_results = []
        
        for i, query in enumerate(queries):
            with patch.object(self.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                if i == 0:  # First query - recommendation
                    mock_ai.return_value = {
                        'intent_type': 'recommendation',
                        'confidence': 0.87,
                        'phone_references': [],
                        'comparison_criteria': ['camera'],
                        'contextual_terms': [],
                        'price_range': {'min': None, 'max': 100000},
                        'specific_features': ['camera'],
                        'query_focus': 'Best camera phone under budget'
                    }
                elif i == 1:  # Second query - contextual specification
                    mock_ai.return_value = {
                        'intent_type': 'specification',
                        'confidence': 0.82,
                        'phone_references': [
                            {'text': 'the first one', 'type': 'contextual', 'context_index': 0}
                        ],
                        'comparison_criteria': ['battery'],
                        'contextual_terms': ['the first one'],
                        'price_range': {'min': None, 'max': None},
                        'specific_features': ['battery'],
                        'query_focus': 'Battery life of previously mentioned phone'
                    }
                else:  # Third query - contextual alternative
                    mock_ai.return_value = {
                        'intent_type': 'alternative',
                        'confidence': 0.85,
                        'phone_references': [
                            {'text': 'something similar', 'type': 'contextual', 'context_index': 0}
                        ],
                        'comparison_criteria': ['price'],
                        'contextual_terms': ['similar', 'cheaper'],
                        'price_range': {'min': None, 'max': None},
                        'specific_features': [],
                        'query_focus': 'Similar but cheaper alternatives'
                    }
                
                with patch.object(self.phone_resolver, 'resolve_phone_references') as mock_resolver:
                    if i == 0:
                        mock_resolver.return_value = []
                    else:
                        mock_resolver.return_value = [
                            ResolvedPhone(
                                original_text="contextual reference",
                                resolved_phone=self.mock_phones[0],
                                confidence=0.8,
                                match_type="contextual"
                            )
                        ]
                    
                    with patch.object(self.filter_generator, 'generate_contextual_filters') as mock_filters:
                        if i == 0:
                            mock_filters.return_value = {
                                'base_filters': {'price_max': 100000},
                                'comparison_filters': {},
                                'sort_criteria': [('camera_score', 'desc')]
                            }
                        elif i == 1:
                            mock_filters.return_value = {
                                'base_filters': {'phone_ids': [1]},
                                'comparison_filters': {},
                                'sort_criteria': []
                            }
                        else:
                            mock_filters.return_value = {
                                'base_filters': {'price_max': 120000},
                                'comparison_filters': {'exclude_phone_ids': [1]},
                                'sort_criteria': [('overall_device_score', 'desc')]
                            }
                        
                        # Process query
                        result = await self.query_processor.process_contextual_query(
                            query=query,
                            session_id=self.session_id,
                            db=self.mock_db
                        )
                        
                        conversation_results.append(result)
        
        # Verify conversation flow
        assert len(conversation_results) == 3
        
        # First query should be recommendation
        assert conversation_results[0]['intent']['type'] == 'recommendation'
        
        # Second query should be contextual specification
        assert conversation_results[1]['intent']['type'] == 'specification'
        assert len(conversation_results[1]['metadata']['contextual_terms']) > 0
        
        # Third query should be contextual alternative
        assert conversation_results[2]['intent']['type'] == 'alternative'
        assert 'similar' in conversation_results[2]['metadata']['contextual_terms']
    
    @pytest.mark.asyncio
    async def test_error_handling_and_fallback_flow(self):
        """Test error handling and fallback mechanisms"""
        query = "Compare iPhone with Samsung"
        
        # Test AI service failure with fallback
        with patch.object(self.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
            mock_ai.side_effect = Exception("AI service unavailable")
            
            with patch.object(self.phone_resolver, 'resolve_phone_references') as mock_resolver:
                # Mock fallback phone resolution
                mock_resolver.return_value = [
                    ResolvedPhone(
                        original_text="iPhone",
                        resolved_phone=self.mock_phones[0],
                        confidence=0.7,
                        match_type="partial"
                    ),
                    ResolvedPhone(
                        original_text="Samsung",
                        resolved_phone=self.mock_phones[1],
                        confidence=0.6,
                        match_type="brand"
                    )
                ]
                
                with patch.object(self.filter_generator, 'generate_contextual_filters') as mock_filters:
                    mock_filters.return_value = {
                        'base_filters': {},
                        'comparison_filters': {'phone_ids': [1, 2]},
                        'sort_criteria': [('overall_device_score', 'desc')]
                    }
                    
                    # Process query with AI failure
                    result = await self.query_processor.process_contextual_query(
                        query=query,
                        session_id=self.session_id,
                        db=self.mock_db
                    )
                    
                    # Should still return a result using fallback
                    assert result is not None
                    assert 'intent' in result
                    assert result['intent']['confidence'] < 0.8  # Lower confidence due to fallback
                    assert 'error_handled' in result['metadata']
    
    @pytest.mark.asyncio
    async def test_performance_requirements(self):
        """Test that queries meet performance requirements (sub-2-second)"""
        query = "Show me the best phones under 50000 taka"
        
        with patch.object(self.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
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
            
            with patch.object(self.phone_resolver, 'resolve_phone_references') as mock_resolver:
                mock_resolver.return_value = []
                
                with patch.object(self.filter_generator, 'generate_contextual_filters') as mock_filters:
                    mock_filters.return_value = {
                        'base_filters': {'price_max': 50000},
                        'comparison_filters': {},
                        'sort_criteria': [('overall_device_score', 'desc')]
                    }
                    
                    # Measure processing time
                    start_time = datetime.now()
                    
                    result = await self.query_processor.process_contextual_query(
                        query=query,
                        session_id=self.session_id,
                        db=self.mock_db
                    )
                    
                    end_time = datetime.now()
                    processing_time = (end_time - start_time).total_seconds()
                    
                    # Verify performance requirement
                    assert processing_time < 2.0, f"Query took {processing_time}s, should be under 2s"
                    
                    # Verify result quality
                    assert result is not None
                    assert result['metadata']['processing_time'] < 2.0
    
    @pytest.mark.asyncio
    async def test_concurrent_query_handling(self):
        """Test handling multiple concurrent queries"""
        queries = [
            "Compare iPhone 14 with Samsung S23",
            "What's the best camera phone?",
            "Show me phones under 30000",
            "Tell me about Xiaomi 13 Pro"
        ]
        
        async def process_single_query(query, session_suffix):
            session_id = f"{self.session_id}_{session_suffix}"
            
            with patch.object(self.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                mock_ai.return_value = {
                    'intent_type': 'comparison',
                    'confidence': 0.8,
                    'phone_references': [],
                    'comparison_criteria': [],
                    'contextual_terms': [],
                    'price_range': {'min': None, 'max': None},
                    'specific_features': [],
                    'query_focus': 'Test query'
                }
                
                with patch.object(self.phone_resolver, 'resolve_phone_references') as mock_resolver:
                    mock_resolver.return_value = []
                    
                    with patch.object(self.filter_generator, 'generate_contextual_filters') as mock_filters:
                        mock_filters.return_value = {
                            'base_filters': {},
                            'comparison_filters': {},
                            'sort_criteria': []
                        }
                        
                        return await self.query_processor.process_contextual_query(
                            query=query,
                            session_id=session_id,
                            db=self.mock_db
                        )
        
        # Process queries concurrently
        tasks = [
            process_single_query(query, i) 
            for i, query in enumerate(queries)
        ]
        
        start_time = datetime.now()
        results = await asyncio.gather(*tasks, return_exceptions=True)
        end_time = datetime.now()
        
        # Verify all queries completed successfully
        successful_results = [r for r in results if not isinstance(r, Exception)]
        assert len(successful_results) == len(queries)
        
        # Verify concurrent processing was faster than sequential
        total_time = (end_time - start_time).total_seconds()
        assert total_time < len(queries) * 2.0  # Should be faster than sequential processing
    
    def test_monitoring_integration(self):
        """Test integration with monitoring and analytics system"""
        query = "Test monitoring query"
        query_id = str(uuid.uuid4())
        
        # Mock monitoring system
        with patch.object(monitoring_analytics, 'record_query_metrics') as mock_record:
            with patch.object(self.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                mock_ai.return_value = {
                    'intent_type': 'specification',
                    'confidence': 0.85,
                    'phone_references': [],
                    'comparison_criteria': [],
                    'contextual_terms': [],
                    'price_range': {'min': None, 'max': None},
                    'specific_features': [],
                    'query_focus': 'Test query'
                }
                
                # Process query (synchronous for this test)
                asyncio.run(self.query_processor.process_contextual_query(
                    query=query,
                    session_id=self.session_id,
                    db=self.mock_db,
                    query_id=query_id
                ))
                
                # Verify monitoring was called
                assert mock_record.called
                
                # Verify monitoring parameters
                call_args = mock_record.call_args
                assert call_args[1]['query_id'] == query_id
                assert call_args[1]['session_id'] == self.session_id
                assert call_args[1]['query_text'] == query
                assert call_args[1]['status'] in [QueryStatus.SUCCESS, QueryStatus.ERROR]

class TestEdgeCasesAndErrorScenarios:
    """Test edge cases and error scenarios"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.query_processor = ContextualQueryProcessor()
        self.mock_db = Mock(spec=Session)
    
    @pytest.mark.asyncio
    async def test_empty_query_handling(self):
        """Test handling of empty or whitespace queries"""
        empty_queries = ["", "   ", "\n\t", None]
        
        for query in empty_queries:
            with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                mock_ai.return_value = {
                    'intent_type': 'unknown',
                    'confidence': 0.0,
                    'phone_references': [],
                    'comparison_criteria': [],
                    'contextual_terms': [],
                    'price_range': {'min': None, 'max': None},
                    'specific_features': [],
                    'query_focus': 'Empty query'
                }
                
                result = await self.query_processor.process_contextual_query(
                    query=query,
                    session_id="test_session",
                    db=self.mock_db
                )
                
                # Should handle gracefully
                assert result is not None
                assert result['intent']['type'] == 'unknown'
                assert result['intent']['confidence'] == 0.0
    
    @pytest.mark.asyncio
    async def test_very_long_query_handling(self):
        """Test handling of very long queries"""
        long_query = "Compare " + "iPhone 14 Pro " * 100 + "with Samsung Galaxy S23 Ultra"
        
        with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
            mock_ai.return_value = {
                'intent_type': 'comparison',
                'confidence': 0.7,
                'phone_references': [],
                'comparison_criteria': [],
                'contextual_terms': [],
                'price_range': {'min': None, 'max': None},
                'specific_features': [],
                'query_focus': 'Long comparison query'
            }
            
            result = await self.query_processor.process_contextual_query(
                query=long_query,
                session_id="test_session",
                db=self.mock_db
            )
            
            # Should handle long queries
            assert result is not None
            assert result['intent']['type'] == 'comparison'
    
    @pytest.mark.asyncio
    async def test_special_characters_in_query(self):
        """Test handling of queries with special characters"""
        special_queries = [
            "Compare iPhone 14 Pro & Samsung Galaxy S23!",
            "What's the best phone for $500?",
            "Show me phones with 5G/WiFi-6 support",
            "iPhone vs Samsung: which is better?",
            "Phones under ৳50,000 (fifty thousand taka)"
        ]
        
        for query in special_queries:
            with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                mock_ai.return_value = {
                    'intent_type': 'comparison',
                    'confidence': 0.8,
                    'phone_references': [],
                    'comparison_criteria': [],
                    'contextual_terms': [],
                    'price_range': {'min': None, 'max': None},
                    'specific_features': [],
                    'query_focus': 'Query with special characters'
                }
                
                result = await self.query_processor.process_contextual_query(
                    query=query,
                    session_id="test_session",
                    db=self.mock_db
                )
                
                # Should handle special characters gracefully
                assert result is not None
                assert 'error' not in result
    
    @pytest.mark.asyncio
    async def test_database_connection_failure(self):
        """Test handling of database connection failures"""
        query = "Show me iPhone 14 Pro specs"
        
        # Mock database failure
        self.mock_db.query.side_effect = Exception("Database connection failed")
        
        with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
            mock_ai.return_value = {
                'intent_type': 'specification',
                'confidence': 0.9,
                'phone_references': [],
                'comparison_criteria': [],
                'contextual_terms': [],
                'price_range': {'min': None, 'max': None},
                'specific_features': [],
                'query_focus': 'iPhone specifications'
            }
            
            # Should handle database errors gracefully
            with pytest.raises(Exception):
                await self.query_processor.process_contextual_query(
                    query=query,
                    session_id="test_session",
                    db=self.mock_db
                )
    
    @pytest.mark.asyncio
    async def test_context_corruption_handling(self):
        """Test handling of corrupted conversation context"""
        query = "Tell me more about that phone"
        session_id = "corrupted_session"
        
        # Mock corrupted context
        with patch.object(self.query_processor.context_manager, 'get_conversation_context') as mock_context:
            mock_context.return_value = None  # Corrupted/missing context
            
            with patch.object(self.query_processor.ai_service, 'process_contextual_query', new_callable=AsyncMock) as mock_ai:
                mock_ai.return_value = {
                    'intent_type': 'specification',
                    'confidence': 0.3,  # Lower confidence due to missing context
                    'phone_references': [
                        {'text': 'that phone', 'type': 'contextual', 'context_index': None}
                    ],
                    'comparison_criteria': [],
                    'contextual_terms': ['that phone'],
                    'price_range': {'min': None, 'max': None},
                    'specific_features': [],
                    'query_focus': 'Contextual reference without context'
                }
                
                result = await self.query_processor.process_contextual_query(
                    query=query,
                    session_id=session_id,
                    db=self.mock_db
                )
                
                # Should handle missing context gracefully
                assert result is not None
                assert result['intent']['confidence'] < 0.5  # Lower confidence
                assert 'context_missing' in result['metadata'] or 'error_handled' in result['metadata']