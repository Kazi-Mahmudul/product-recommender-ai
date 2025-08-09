"""
Integration tests for Enhanced Contextual Query Processor
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from app.services.contextual_query_processor import ContextualQueryProcessor
from app.services.phone_name_resolver import ResolvedPhone
from app.services.contextual_filter_generator import ContextualIntent

class TestEnhancedContextualQueryProcessor:
    """Test cases for enhanced contextual query processor"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.processor = ContextualQueryProcessor(session_id="test_session")
        self.mock_db = Mock()
        
        # Mock phone data
        self.mock_phone_data = {
            'id': 1,
            'name': 'iPhone 14 Pro',
            'brand': 'Apple',
            'price_original': 120000,
            'overall_device_score': 8.5,
            'camera_score': 9.0,
            'battery_score': 7.5
        }
        
        self.resolved_phone = ResolvedPhone(
            original_reference="iPhone 14 Pro",
            matched_phone=self.mock_phone_data,
            confidence_score=1.0,
            match_type="exact",
            alternative_matches=[]
        )
    
    def test_enhanced_phone_reference_extraction(self):
        """Test enhanced phone reference extraction"""
        query = "Compare iPhone 14 Pro vs Samsung Galaxy S23"
        
        with patch.object(self.processor.phone_name_resolver, 'resolve_phone_names') as mock_resolve:
            mock_resolve.return_value = [self.resolved_phone]
            
            result = self.processor.extract_phone_references_enhanced(query, self.mock_db)
            
            assert len(result) == 1
            assert result[0].matched_phone['name'] == 'iPhone 14 Pro'
            mock_resolve.assert_called_once()
    
    def test_enhanced_intent_classification_comparison(self):
        """Test enhanced intent classification for comparison queries"""
        query = "Compare iPhone 14 Pro vs Samsung Galaxy S23 camera"
        resolved_phones = [self.resolved_phone]
        
        intent = self.processor.classify_query_intent_enhanced(query, resolved_phones)
        
        assert intent.query_type == "comparison"
        assert intent.focus_area == "camera"
        assert intent.confidence > 0.5
        assert intent.original_query == query
    
    def test_enhanced_intent_classification_better_than(self):
        """Test enhanced intent classification for better than queries"""
        query = "Show me phones better than iPhone 14 Pro"
        resolved_phones = [self.resolved_phone]
        
        intent = self.processor.classify_query_intent_enhanced(query, resolved_phones)
        
        assert intent.query_type == "contextual_recommendation"
        assert intent.relationship == "better_than"
        assert intent.confidence > 0.5
    
    def test_enhanced_intent_classification_cheaper_than(self):
        """Test enhanced intent classification for cheaper than queries"""
        query = "Find phones cheaper than iPhone 14 Pro with good camera"
        resolved_phones = [self.resolved_phone]
        
        intent = self.processor.classify_query_intent_enhanced(query, resolved_phones)
        
        assert intent.query_type == "contextual_recommendation"
        assert intent.relationship == "cheaper_than"
        assert intent.focus_area == "camera"
    
    def test_enhanced_intent_classification_similar_to(self):
        """Test enhanced intent classification for similar to queries"""
        query = "Show me phones similar to iPhone 14 Pro"
        resolved_phones = [self.resolved_phone]
        
        intent = self.processor.classify_query_intent_enhanced(query, resolved_phones)
        
        assert intent.query_type == "contextual_recommendation"
        assert intent.relationship == "similar_to"
    
    def test_enhanced_intent_classification_alternative(self):
        """Test enhanced intent classification for alternative queries"""
        query = "What are some alternatives to iPhone 14 Pro?"
        resolved_phones = [self.resolved_phone]
        
        intent = self.processor.classify_query_intent_enhanced(query, resolved_phones)
        
        assert intent.query_type == "alternative"
        assert intent.relationship == "alternative_to"
    
    def test_enhanced_intent_classification_specification(self):
        """Test enhanced intent classification for specification queries"""
        query = "What are the detailed specs of iPhone 14 Pro?"
        resolved_phones = [self.resolved_phone]
        
        intent = self.processor.classify_query_intent_enhanced(query, resolved_phones)
        
        assert intent.query_type == "specification"
    
    def test_focus_area_extraction(self):
        """Test focus area extraction from queries"""
        test_cases = [
            ("iPhone 14 Pro camera quality", "camera"),
            ("battery life of Samsung Galaxy S23", "battery"),
            ("performance comparison", "performance"),
            ("display quality", "display"),
            ("price comparison", "price")
        ]
        
        for query, expected_focus in test_cases:
            focus_area = self.processor._extract_focus_area(query.lower())
            assert focus_area == expected_focus
    
    def test_relationship_extraction(self):
        """Test relationship extraction from queries"""
        test_cases = [
            ("phones better than iPhone 14 Pro", "better_than"),
            ("cheaper alternatives", "cheaper_than"),
            ("similar phones", "similar_to"),
            ("more expensive options", "more_expensive_than"),
            ("alternatives to iPhone", "alternative_to")
        ]
        
        for query, expected_relationship in test_cases:
            relationship = self.processor._extract_relationship(query.lower())
            assert relationship == expected_relationship
    
    def test_confidence_calculation(self):
        """Test confidence calculation for intent classification"""
        # High confidence case
        confidence = self.processor._calculate_intent_confidence(
            "comparison", 
            [self.resolved_phone], 
            "better_than", 
            "camera"
        )
        assert confidence > 0.8
        
        # Low confidence case
        confidence = self.processor._calculate_intent_confidence(
            "recommendation", 
            [], 
            None, 
            None
        )
        assert confidence == 0.5
    
    def test_context_metadata_extraction(self):
        """Test context metadata extraction"""
        query = "Compare these phones"
        resolved_phones = [self.resolved_phone]
        context = {"recent_phones": [self.mock_phone_data], "query_count": 5}
        
        metadata = self.processor._extract_context_metadata(query, resolved_phones, context)
        
        assert metadata["phone_count"] == 1
        assert metadata["has_context"] is True
        assert metadata["context_phone_count"] == 1
        assert metadata["context_query_count"] == 5
        assert "iPhone 14 Pro" in metadata["phone_names"]
        assert "Apple" in metadata["phone_brands"]
    
    @patch('app.crud.phone.get_smart_recommendations')
    def test_enhanced_contextual_query_processing(self, mock_get_recommendations):
        """Test complete enhanced contextual query processing"""
        query = "Show me phones better than iPhone 14 Pro"
        mock_get_recommendations.return_value = [self.mock_phone_data]
        
        # Mock the phone name resolver
        with patch.object(self.processor.phone_name_resolver, 'resolve_phone_names') as mock_resolve:
            mock_resolve.return_value = [self.resolved_phone]
            
            # Mock the filter generator
            with patch.object(self.processor.filter_generator, 'generate_filters') as mock_filters:
                mock_filters.return_value = {"min_overall_device_score": 9.0}
                
                result = self.processor.process_contextual_query_enhanced(
                    self.mock_db, 
                    query, 
                    "test_session"
                )
                
                assert result["enhanced_processing"] is True
                assert result["type"] == "recommendation"
                assert result["session_id"] == "test_session"
                assert "recommendations" in result
    
    def test_enhanced_processing_fallback_to_legacy(self):
        """Test fallback to legacy processing when enhanced processing fails"""
        query = "Show me phones under 50000"
        
        # Mock phone name resolver to return empty list
        with patch.object(self.processor.phone_name_resolver, 'resolve_phone_names') as mock_resolve:
            mock_resolve.return_value = []
            
            # Mock legacy method
            with patch.object(self.processor, 'process_contextual_query') as mock_legacy:
                mock_legacy.return_value = {"type": "recommendation", "is_contextual": False}
                
                result = self.processor.process_contextual_query_enhanced(
                    self.mock_db, 
                    query
                )
                
                assert result["enhanced_processing"] is False
                mock_legacy.assert_called_once()
    
    def test_context_integration(self):
        """Test integration with context manager"""
        query = "Compare these phones"
        
        # Mock context manager
        mock_context = {
            "recent_phones": [self.mock_phone_data],
            "recent_queries": [],
            "query_count": 1
        }
        
        with patch.object(self.processor.context_manager, 'get_context') as mock_get_context:
            mock_get_context.return_value = mock_context
            
            with patch.object(self.processor.context_manager, 'resolve_contextual_references') as mock_resolve_refs:
                mock_resolve_refs.return_value = "Compare iPhone 14 Pro vs Samsung Galaxy S23"
                
                with patch.object(self.processor.phone_name_resolver, 'resolve_phone_names') as mock_resolve:
                    mock_resolve.return_value = [self.resolved_phone]
                    
                    with patch.object(self.processor.filter_generator, 'generate_filters') as mock_filters:
                        mock_filters.return_value = {"comparison_mode": True}
                        
                        result = self.processor.process_contextual_query_enhanced(
                            self.mock_db, 
                            query, 
                            "test_session"
                        )
                        
                        mock_resolve_refs.assert_called_once()
                        assert result["enhanced_processing"] is True
    
    def test_generate_comparison_response(self):
        """Test comparison response generation"""
        intent = ContextualIntent(
            query_type="comparison",
            confidence=0.9,
            resolved_phones=[self.resolved_phone],
            relationship=None,
            focus_area="camera",
            filters={"comparison_mode": True},
            context_metadata={},
            original_query="compare phones",
            processed_query="compare phones"
        )
        
        response = self.processor._generate_comparison_response(intent, self.mock_db)
        
        assert response["type"] == "comparison"
        assert response["focus_area"] == "camera"
        assert len(response["phones"]) == 1
        assert "focusing on camera" in response["message"]
    
    @patch('app.crud.phone.get_smart_recommendations')
    def test_generate_alternative_response(self, mock_get_recommendations):
        """Test alternative response generation"""
        mock_get_recommendations.return_value = [self.mock_phone_data]
        
        intent = ContextualIntent(
            query_type="alternative",
            confidence=0.9,
            resolved_phones=[self.resolved_phone],
            relationship="alternative_to",
            focus_area=None,
            filters={"max_price": 100000},
            context_metadata={},
            original_query="alternatives to iPhone",
            processed_query="alternatives to iPhone"
        )
        
        response = self.processor._generate_alternative_response(intent, self.mock_db)
        
        assert response["type"] == "alternative"
        assert response["reference_phone"]["name"] == "iPhone 14 Pro"
        assert len(response["alternatives"]) == 1
        mock_get_recommendations.assert_called_once()
    
    @patch('app.crud.phone.get_smart_recommendations')
    def test_generate_contextual_recommendation_response(self, mock_get_recommendations):
        """Test contextual recommendation response generation"""
        mock_get_recommendations.return_value = [self.mock_phone_data]
        
        intent = ContextualIntent(
            query_type="contextual_recommendation",
            confidence=0.9,
            resolved_phones=[self.resolved_phone],
            relationship="better_than",
            focus_area="camera",
            filters={"min_camera_score": 9.5},
            context_metadata={},
            original_query="better phones",
            processed_query="better phones"
        )
        
        response = self.processor._generate_contextual_recommendation_response(intent, self.mock_db)
        
        assert response["type"] == "recommendation"
        assert response["relationship"] == "better_than"
        assert response["focus_area"] == "camera"
        assert "better than" in response["message"]
        assert "with better camera" in response["message"]
    
    def test_generate_specification_response(self):
        """Test specification response generation"""
        intent = ContextualIntent(
            query_type="specification",
            confidence=0.9,
            resolved_phones=[self.resolved_phone],
            relationship=None,
            focus_area="camera",
            filters={},
            context_metadata={},
            original_query="specs of iPhone",
            processed_query="specs of iPhone"
        )
        
        response = self.processor._generate_specification_response(intent, self.mock_db)
        
        assert response["type"] == "specification"
        assert response["focus_area"] == "camera"
        assert len(response["phones"]) == 1
    
    def test_error_handling_in_enhanced_processing(self):
        """Test error handling in enhanced processing"""
        query = "Show me phones better than iPhone 14 Pro"
        
        # Mock phone name resolver to raise exception
        with patch.object(self.processor.phone_name_resolver, 'resolve_phone_names') as mock_resolve:
            mock_resolve.side_effect = Exception("Test error")
            
            # Mock legacy method
            with patch.object(self.processor, 'process_contextual_query') as mock_legacy:
                mock_legacy.return_value = {"type": "recommendation", "is_contextual": False}
                
                result = self.processor.process_contextual_query_enhanced(
                    self.mock_db, 
                    query
                )
                
                assert result["enhanced_processing"] is False
                assert "error" in result
                mock_legacy.assert_called_once()
    
    def test_error_handling_in_response_generation(self):
        """Test error handling in response generation"""
        intent = ContextualIntent(
            query_type="comparison",
            confidence=0.9,
            resolved_phones=[self.resolved_phone],
            relationship=None,
            focus_area=None,
            filters={},
            context_metadata={},
            original_query="compare phones",
            processed_query="compare phones"
        )
        
        # Mock _generate_comparison_response to raise exception
        with patch.object(self.processor, '_generate_comparison_response') as mock_generate:
            mock_generate.side_effect = Exception("Test error")
            
            response = self.processor._generate_enhanced_response(intent, self.mock_db)
            
            assert response["type"] == "error"
            assert "error" in response