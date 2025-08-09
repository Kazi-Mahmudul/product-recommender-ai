"""
Unit tests for Enhanced AI Service with Contextual Query Processing
"""

import pytest
import asyncio
import json
from unittest.mock import Mock, patch, AsyncMock
from app.services.ai_service import AIService
from app.models.phone import Phone

class TestEnhancedAIService:
    """Test cases for enhanced AI service contextual features"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.ai_service = AIService(api_url="http://test-api.com", timeout=5)
        
        # Create mock phones for testing
        self.mock_phone1 = Mock(spec=Phone)
        self.mock_phone1.id = 1
        self.mock_phone1.brand = "Apple"
        self.mock_phone1.name = "iPhone 14 Pro"
        self.mock_phone1.price_original = 120000
        
        self.mock_phone2 = Mock(spec=Phone)
        self.mock_phone2.id = 2
        self.mock_phone2.brand = "Samsung"
        self.mock_phone2.name = "Galaxy S23 Ultra"
        self.mock_phone2.price_original = 110000
        
        self.context_phones = [self.mock_phone1, self.mock_phone2]
    
    @pytest.mark.asyncio
    async def test_process_contextual_query_success(self):
        """Test successful contextual query processing"""
        query = "Compare iPhone 14 Pro with Samsung Galaxy S23"
        
        # Mock AI response
        ai_response = json.dumps({
            "intent_type": "comparison",
            "confidence": 0.9,
            "phone_references": [
                {"text": "iPhone 14 Pro", "type": "explicit", "context_index": None},
                {"text": "Samsung Galaxy S23", "type": "explicit", "context_index": None}
            ],
            "comparison_criteria": ["camera", "performance", "price"],
            "contextual_terms": [],
            "price_range": {"min": None, "max": None},
            "specific_features": [],
            "query_focus": "Compare two flagship phones"
        })
        
        with patch.object(self.ai_service, '_call_gemini_api', new_callable=AsyncMock) as mock_api:
            mock_api.return_value = ai_response
            
            result = await self.ai_service.process_contextual_query(
                query=query,
                context_phones=self.context_phones,
                session_id="test_session",
                query_id="test_query_1"
            )
            
            assert result['intent_type'] == 'comparison'
            assert result['confidence'] == 0.9
            assert len(result['phone_references']) == 2
            assert 'camera' in result['comparison_criteria']
            assert mock_api.called
    
    @pytest.mark.asyncio
    async def test_process_contextual_query_with_cache(self):
        """Test contextual query processing with cache hit"""
        query = "Which phone has better camera?"
        
        # Pre-populate cache
        cache_key = self.ai_service._generate_contextual_cache_key(query, self.context_phones)
        cached_result = {
            "intent_type": "comparison",
            "confidence": 0.8,
            "phone_references": [],
            "comparison_criteria": ["camera"]
        }
        self.ai_service._cache.set(cache_key, json.dumps(cached_result))
        
        with patch.object(self.ai_service, '_call_gemini_api', new_callable=AsyncMock) as mock_api:
            result = await self.ai_service.process_contextual_query(
                query=query,
                context_phones=self.context_phones,
                session_id="test_session",
                query_id="test_query_2"
            )
            
            assert result['intent_type'] == 'comparison'
            assert result['confidence'] == 0.8
            assert 'camera' in result['comparison_criteria']
            assert not mock_api.called  # Should not call API due to cache hit
    
    @pytest.mark.asyncio
    async def test_process_contextual_query_fallback(self):
        """Test contextual query processing with AI service failure and fallback"""
        query = "Show me alternatives to iPhone"
        
        with patch.object(self.ai_service, '_call_gemini_api', new_callable=AsyncMock) as mock_api:
            mock_api.return_value = None  # Simulate API failure
            
            result = await self.ai_service.process_contextual_query(
                query=query,
                context_phones=self.context_phones,
                session_id="test_session",
                query_id="test_query_3"
            )
            
            assert result['intent_type'] == 'alternative'
            assert result['confidence'] < 1.0  # Fallback should have lower confidence
            assert mock_api.called
    
    @pytest.mark.asyncio
    async def test_extract_phone_references_success(self):
        """Test successful phone reference extraction"""
        query = "Compare iPhone 14 with Samsung Galaxy S23"
        
        # Mock AI response
        ai_response = json.dumps([
            {
                "extracted_text": "iPhone 14",
                "matched_phone": "Apple iPhone 14 Pro",
                "confidence": 0.9,
                "match_type": "partial"
            },
            {
                "extracted_text": "Samsung Galaxy S23",
                "matched_phone": "Samsung Galaxy S23 Ultra",
                "confidence": 0.8,
                "match_type": "partial"
            }
        ])
        
        with patch.object(self.ai_service, '_call_gemini_api', new_callable=AsyncMock) as mock_api:
            mock_api.return_value = ai_response
            
            result = await self.ai_service.extract_phone_references(
                query=query,
                available_phones=self.context_phones
            )
            
            assert len(result) == 2
            assert result[0]['extracted_text'] == 'iPhone 14'
            assert result[0]['confidence'] == 0.9
            assert result[1]['extracted_text'] == 'Samsung Galaxy S23'
            assert mock_api.called
    
    @pytest.mark.asyncio
    async def test_extract_phone_references_fallback(self):
        """Test phone reference extraction with fallback"""
        query = "How is the iPhone 14 Pro camera?"
        
        with patch.object(self.ai_service, '_call_gemini_api', new_callable=AsyncMock) as mock_api:
            mock_api.return_value = None  # Simulate API failure
            
            result = await self.ai_service.extract_phone_references(
                query=query,
                available_phones=self.context_phones
            )
            
            # Should find iPhone reference using regex fallback
            assert len(result) > 0
            assert any('iphone' in ref['extracted_text'].lower() for ref in result)
            assert mock_api.called
    
    @pytest.mark.asyncio
    async def test_classify_query_intent_success(self):
        """Test successful query intent classification"""
        query = "What are the best phones under 50000 taka?"
        
        # Mock AI response
        ai_response = json.dumps({
            "intent_type": "recommendation",
            "confidence": 0.85,
            "reasoning": "User is asking for phone recommendations with price constraint",
            "sub_intent": "price_based_recommendation"
        })
        
        with patch.object(self.ai_service, '_call_gemini_api', new_callable=AsyncMock) as mock_api:
            mock_api.return_value = ai_response
            
            result = await self.ai_service.classify_query_intent(
                query=query,
                context_phones=self.context_phones
            )
            
            assert result['intent_type'] == 'recommendation'
            assert result['confidence'] == 0.85
            assert 'reasoning' in result
            assert mock_api.called
    
    @pytest.mark.asyncio
    async def test_classify_query_intent_fallback(self):
        """Test query intent classification with fallback"""
        query = "iPhone vs Samsung which is better?"
        
        with patch.object(self.ai_service, '_call_gemini_api', new_callable=AsyncMock) as mock_api:
            mock_api.return_value = None  # Simulate API failure
            
            result = await self.ai_service.classify_query_intent(
                query=query,
                context_phones=self.context_phones
            )
            
            # Should classify as comparison using fallback rules
            assert result['intent_type'] == 'comparison'
            assert result['confidence'] > 0
            assert 'reasoning' in result
            assert mock_api.called
    
    def test_generate_contextual_cache_key(self):
        """Test contextual cache key generation"""
        query = "Test query"
        
        # Test without context phones
        key1 = self.ai_service._generate_contextual_cache_key(query, None)
        assert 'contextual:' in key1
        assert ':context:' not in key1
        
        # Test with context phones
        key2 = self.ai_service._generate_contextual_cache_key(query, self.context_phones)
        assert 'contextual:' in key2
        assert 'context:' in key2
        
        # Keys should be different
        assert key1 != key2
    
    def test_create_contextual_query_prompt(self):
        """Test contextual query prompt creation"""
        query = "Which phone has better camera?"
        
        # Test without context
        prompt1 = self.ai_service._create_contextual_query_prompt(query, None)
        assert query in prompt1
        assert 'CONTEXT PHONES' not in prompt1
        assert 'JSON' in prompt1
        
        # Test with context
        prompt2 = self.ai_service._create_contextual_query_prompt(query, self.context_phones)
        assert query in prompt2
        assert 'CONTEXT PHONES' in prompt2
        assert 'iPhone 14 Pro' in prompt2
        assert 'Galaxy S23 Ultra' in prompt2
    
    def test_create_phone_extraction_prompt(self):
        """Test phone extraction prompt creation"""
        query = "Compare iPhone with Samsung"
        
        # Test without available phones
        prompt1 = self.ai_service._create_phone_extraction_prompt(query, None)
        assert query in prompt1
        assert 'AVAILABLE PHONES' not in prompt1
        
        # Test with available phones
        prompt2 = self.ai_service._create_phone_extraction_prompt(query, self.context_phones)
        assert query in prompt2
        assert 'AVAILABLE PHONES' in prompt2
        assert 'iPhone 14 Pro' in prompt2
    
    def test_create_intent_classification_prompt(self):
        """Test intent classification prompt creation"""
        query = "What's the best camera phone?"
        
        # Test without context
        prompt1 = self.ai_service._create_intent_classification_prompt(query, None)
        assert query in prompt1
        assert 'CONTEXT:' not in prompt1
        
        # Test with context
        prompt2 = self.ai_service._create_intent_classification_prompt(query, self.context_phones)
        assert query in prompt2
        assert 'CONTEXT:' in prompt2
    
    def test_process_contextual_response_valid_json(self):
        """Test processing valid JSON contextual response"""
        response = json.dumps({
            "intent_type": "comparison",
            "confidence": 0.9,
            "phone_references": [{"text": "iPhone", "type": "explicit"}],
            "comparison_criteria": ["camera"]
        })
        
        result = self.ai_service._process_contextual_response(response, "test query", None)
        
        assert result['intent_type'] == 'comparison'
        assert result['confidence'] == 0.9
        assert len(result['phone_references']) == 1
        assert 'camera' in result['comparison_criteria']
    
    def test_process_contextual_response_invalid_json(self):
        """Test processing invalid JSON contextual response"""
        response = "This is not valid JSON"
        
        with patch.object(self.ai_service, '_fallback_contextual_processing') as mock_fallback:
            mock_fallback.return_value = {'intent_type': 'unknown', 'confidence': 0.3}
            
            result = self.ai_service._process_contextual_response(response, "test query", None)
            
            assert mock_fallback.called
            assert result['intent_type'] == 'unknown'
    
    def test_process_phone_extraction_response_valid_json(self):
        """Test processing valid JSON phone extraction response"""
        response = json.dumps([
            {
                "extracted_text": "iPhone 14",
                "matched_phone": "Apple iPhone 14 Pro",
                "confidence": 0.9,
                "match_type": "partial"
            }
        ])
        
        result = self.ai_service._process_phone_extraction_response(response, None)
        
        assert len(result) == 1
        assert result[0]['extracted_text'] == 'iPhone 14'
        assert result[0]['confidence'] == 0.9
    
    def test_process_phone_extraction_response_invalid_json(self):
        """Test processing invalid JSON phone extraction response"""
        response = "Not valid JSON"
        
        with patch.object(self.ai_service, '_fallback_phone_extraction') as mock_fallback:
            mock_fallback.return_value = [{'extracted_text': 'fallback', 'confidence': 0.5}]
            
            result = self.ai_service._process_phone_extraction_response(response, None)
            
            assert mock_fallback.called
            assert len(result) == 1
    
    def test_process_intent_classification_response_valid_json(self):
        """Test processing valid JSON intent classification response"""
        response = json.dumps({
            "intent_type": "recommendation",
            "confidence": 0.8,
            "reasoning": "User asking for recommendations"
        })
        
        result = self.ai_service._process_intent_classification_response(response)
        
        assert result['intent_type'] == 'recommendation'
        assert result['confidence'] == 0.8
        assert 'reasoning' in result
    
    def test_process_intent_classification_response_invalid_json(self):
        """Test processing invalid JSON intent classification response"""
        response = "Invalid JSON response"
        
        with patch.object(self.ai_service, '_fallback_intent_classification') as mock_fallback:
            mock_fallback.return_value = {'intent_type': 'unknown', 'confidence': 0.3}
            
            result = self.ai_service._process_intent_classification_response(response)
            
            assert mock_fallback.called
            assert result['intent_type'] == 'unknown'
    
    def test_fallback_contextual_processing(self):
        """Test fallback contextual processing"""
        # Test comparison query
        query1 = "iPhone vs Samsung which is better?"
        result1 = self.ai_service._fallback_contextual_processing(query1, self.context_phones)
        assert result1['intent_type'] == 'comparison'
        assert result1['confidence'] > 0
        
        # Test alternative query
        query2 = "Show me alternatives to iPhone"
        result2 = self.ai_service._fallback_contextual_processing(query2, self.context_phones)
        assert result2['intent_type'] == 'alternative'
        
        # Test recommendation query
        query3 = "What's the best phone to buy?"
        result3 = self.ai_service._fallback_contextual_processing(query3, self.context_phones)
        assert result3['intent_type'] == 'recommendation'
        
        # Test QA query
        query4 = "What is the camera specification?"
        result4 = self.ai_service._fallback_contextual_processing(query4, self.context_phones)
        assert result4['intent_type'] == 'qa'
    
    def test_fallback_phone_extraction(self):
        """Test fallback phone extraction using regex"""
        # Test iPhone extraction
        query1 = "How is the iPhone 14 Pro camera?"
        result1 = self.ai_service._fallback_phone_extraction(query1, None)
        assert len(result1) > 0
        assert any('iphone' in ref['extracted_text'].lower() for ref in result1)
        
        # Test Samsung extraction
        query2 = "Samsung Galaxy S23 vs iPhone"
        result2 = self.ai_service._fallback_phone_extraction(query2, None)
        assert len(result2) > 0
        
        # Test contextual references
        query3 = "How is that phone's battery?"
        result3 = self.ai_service._fallback_phone_extraction(query3, None)
        assert len(result3) > 0
        assert any(ref['match_type'] == 'contextual' for ref in result3)
    
    def test_fallback_intent_classification(self):
        """Test fallback intent classification"""
        # Test comparison
        result1 = self.ai_service._fallback_intent_classification("iPhone vs Samsung")
        assert result1['intent_type'] == 'comparison'
        assert result1['confidence'] > 0.5
        
        # Test alternative
        result2 = self.ai_service._fallback_intent_classification("alternative to iPhone")
        assert result2['intent_type'] == 'alternative'
        
        # Test recommendation
        result3 = self.ai_service._fallback_intent_classification("recommend best phone")
        assert result3['intent_type'] == 'recommendation'
        
        # Test specification
        result4 = self.ai_service._fallback_intent_classification("what are the specs")
        assert result4['intent_type'] == 'specification'
        
        # Test QA
        result5 = self.ai_service._fallback_intent_classification("what is 5G technology")
        assert result5['intent_type'] == 'qa'
        
        # Test unknown
        result6 = self.ai_service._fallback_intent_classification("random text here")
        assert result6['intent_type'] == 'unknown'
        assert result6['confidence'] < 0.5
    
    @pytest.mark.asyncio
    async def test_contextual_query_error_handling(self):
        """Test error handling in contextual query processing"""
        query = "Test query"
        
        with patch.object(self.ai_service, '_call_gemini_api', new_callable=AsyncMock) as mock_api:
            mock_api.side_effect = Exception("API Error")
            
            # With fallback enabled
            self.ai_service.fallback_enabled = True
            result = await self.ai_service.process_contextual_query(
                query=query,
                session_id="test_session",
                query_id="test_query_error"
            )
            
            # Should return fallback result
            assert 'intent_type' in result
            assert result['confidence'] < 1.0
            
            # With fallback disabled
            self.ai_service.fallback_enabled = False
            with pytest.raises(Exception):
                await self.ai_service.process_contextual_query(
                    query=query,
                    session_id="test_session",
                    query_id="test_query_error_2"
                )
    
    def test_confidence_validation(self):
        """Test confidence score validation"""
        # Test valid confidence scores
        response1 = json.dumps({"intent_type": "comparison", "confidence": 0.5})
        result1 = self.ai_service._process_contextual_response(response1, "test", None)
        assert result1['confidence'] == 0.5
        
        # Test confidence > 1.0 (should be clamped to 1.0)
        response2 = json.dumps({"intent_type": "comparison", "confidence": 1.5})
        result2 = self.ai_service._process_contextual_response(response2, "test", None)
        assert result2['confidence'] == 1.0
        
        # Test confidence < 0.0 (should be clamped to 0.0)
        response3 = json.dumps({"intent_type": "comparison", "confidence": -0.5})
        result3 = self.ai_service._process_contextual_response(response3, "test", None)
        assert result3['confidence'] == 0.0
        
        # Test missing confidence (should default to 0.5)
        response4 = json.dumps({"intent_type": "comparison"})
        result4 = self.ai_service._process_contextual_response(response4, "test", None)
        assert result4['confidence'] == 0.5