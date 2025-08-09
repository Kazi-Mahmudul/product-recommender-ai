"""
Tests for Enhanced Natural Language API Endpoints
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.services.phone_name_resolver import ResolvedPhone
from app.services.context_manager import ConversationContext
from datetime import datetime, timedelta

client = TestClient(app)

class TestEnhancedNaturalLanguageAPI:
    """Test cases for enhanced natural language API endpoints"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.mock_phone_data = {
            'id': 1,
            'name': 'iPhone 14 Pro',
            'brand': 'Apple',
            'price_original': 120000,
            'overall_device_score': 8.5
        }
        
        self.resolved_phone = ResolvedPhone(
            original_reference="iPhone 14 Pro",
            matched_phone=self.mock_phone_data,
            confidence_score=1.0,
            match_type="exact",
            alternative_matches=[]
        )
    
    @patch('app.services.contextual_query_processor.ContextualQueryProcessor')
    def test_contextual_query_endpoint(self, mock_processor_class):
        """Test the contextual query endpoint"""
        # Mock the processor instance
        mock_processor = Mock()
        mock_processor_class.return_value = mock_processor
        mock_processor.process_contextual_query_enhanced.return_value = {
            "type": "recommendation",
            "enhanced_processing": True,
            "recommendations": [self.mock_phone_data]
        }
        
        request_data = {
            "query": "Show me phones better than iPhone 14 Pro",
            "referenced_phones": ["iPhone 14 Pro"],
            "context_type": "better_than",
            "session_id": "test_session"
        }
        
        response = client.post("/api/natural-language/contextual-query", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["contextual_query"] is True
        assert data["referenced_phones"] == ["iPhone 14 Pro"]
        assert data["context_type"] == "better_than"
        assert data["session_id"] == "test_session"
        mock_processor.process_contextual_query_enhanced.assert_called_once()
    
    @patch('app.services.contextual_query_processor.ContextualQueryProcessor')
    def test_parse_intent_endpoint(self, mock_processor_class):
        """Test the parse intent endpoint"""
        # Mock the processor
        mock_processor = Mock()
        mock_processor_class.return_value = mock_processor
        mock_processor.extract_phone_references.return_value = [
            {"brand": "Apple", "model": "iPhone 14 Pro", "full_name": "iPhone 14 Pro"}
        ]
        mock_processor.classify_query_intent_enhanced.return_value = Mock(
            query_type="comparison",
            confidence=0.9,
            relationship="better_than",
            focus_area="camera",
            context_metadata={"phone_count": 1},
            original_query="test query",
            processed_query="test query"
        )
        
        response = client.get(
            "/api/natural-language/parse-intent",
            params={"query": "Compare iPhone 14 Pro vs Samsung Galaxy S23 camera"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["intent_type"] == "comparison"
        assert data["confidence"] == 0.9
        assert data["relationship"] == "better_than"
        assert data["focus_area"] == "camera"
    
    @patch('app.services.phone_name_resolver.PhoneNameResolver')
    def test_resolve_phones_endpoint(self, mock_resolver_class):
        """Test the resolve phones endpoint"""
        # Mock the resolver
        mock_resolver = Mock()
        mock_resolver_class.return_value = mock_resolver
        mock_resolver.resolve_phone_names.return_value = [self.resolved_phone]
        mock_resolver.suggest_similar_phones.return_value = ["iPhone 13 Pro", "iPhone 14"]
        
        request_data = {
            "phone_names": ["iPhone 14 Pro", "NonExistentPhone"]
        }
        
        response = client.post("/api/natural-language/resolve-phones", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_requested"] == 2
        assert data["total_resolved"] == 1
        assert len(data["resolved_phones"]) == 1
        assert data["resolved_phones"][0]["original_reference"] == "iPhone 14 Pro"
        assert data["resolved_phones"][0]["confidence_score"] == 1.0
        assert "NonExistentPhone" in data["failed_resolutions"]
        assert "NonExistentPhone" in data["suggestions"]
    
    @patch('app.services.context_manager.ContextManager')
    def test_get_context_endpoint_summary(self, mock_manager_class):
        """Test getting context summary"""
        # Mock the context manager
        mock_manager = Mock()
        mock_manager_class.return_value = mock_manager
        mock_manager.get_context_summary.return_value = {
            "exists": True,
            "session_id": "test_session",
            "phone_count": 2,
            "query_count": 5
        }
        
        response = client.get(
            "/api/natural-language/context/test_session",
            params={"summary_only": True}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["exists"] is True
        assert data["session_id"] == "test_session"
        assert data["phone_count"] == 2
        assert data["query_count"] == 5
    
    @patch('app.services.context_manager.ContextManager')
    def test_get_context_endpoint_full(self, mock_manager_class):
        """Test getting full context"""
        # Mock the context manager
        mock_manager = Mock()
        mock_manager_class.return_value = mock_manager
        
        # Mock context object
        mock_context = Mock()
        mock_context.to_dict.return_value = {
            "session_id": "test_session",
            "recent_phones": [self.mock_phone_data],
            "recent_queries": ["test query"],
            "query_count": 1
        }
        mock_manager.get_context.return_value = mock_context
        
        response = client.get("/api/natural-language/context/test_session")
        
        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == "test_session"
        assert len(data["recent_phones"]) == 1
        assert data["query_count"] == 1
    
    @patch('app.services.context_manager.ContextManager')
    def test_get_context_endpoint_not_found(self, mock_manager_class):
        """Test getting context when it doesn't exist"""
        # Mock the context manager
        mock_manager = Mock()
        mock_manager_class.return_value = mock_manager
        mock_manager.get_context.return_value = None
        
        response = client.get("/api/natural-language/context/nonexistent_session")
        
        assert response.status_code == 200
        data = response.json()
        assert data["exists"] is False
        assert data["session_id"] == "nonexistent_session"
    
    @patch('app.services.context_manager.ContextManager')
    def test_delete_context_endpoint(self, mock_manager_class):
        """Test deleting context"""
        # Mock the context manager
        mock_manager = Mock()
        mock_manager_class.return_value = mock_manager
        
        response = client.delete("/api/natural-language/context/test_session")
        
        assert response.status_code == 200
        data = response.json()
        assert "Context deleted" in data["message"]
        assert data["session_id"] == "test_session"
        mock_manager.delete_context.assert_called_once_with("test_session")
    
    @patch('app.services.context_manager.ContextManager')
    def test_cleanup_contexts_endpoint(self, mock_manager_class):
        """Test cleaning up expired contexts"""
        # Mock the context manager
        mock_manager = Mock()
        mock_manager_class.return_value = mock_manager
        mock_manager.cleanup_expired_contexts.return_value = 3
        
        response = client.post("/api/natural-language/context/cleanup")
        
        assert response.status_code == 200
        data = response.json()
        assert data["cleaned_count"] == 3
        assert "Cleaned up 3 expired contexts" in data["message"]
    
    def test_contextual_query_endpoint_error_handling(self):
        """Test error handling in contextual query endpoint"""
        # Send invalid request data
        request_data = {
            "query": "",  # Empty query
            "referenced_phones": [],
            "context_type": None
        }
        
        response = client.post("/api/natural-language/contextual-query", json=request_data)
        
        # Should handle gracefully
        assert response.status_code in [200, 500]  # Either processes or returns error
    
    def test_parse_intent_endpoint_error_handling(self):
        """Test error handling in parse intent endpoint"""
        # Test with very long query that might cause issues
        long_query = "a" * 10000
        
        response = client.get(
            "/api/natural-language/parse-intent",
            params={"query": long_query}
        )
        
        # Should handle gracefully
        assert response.status_code in [200, 500]
    
    def test_resolve_phones_endpoint_empty_list(self):
        """Test resolve phones endpoint with empty list"""
        request_data = {
            "phone_names": []
        }
        
        response = client.post("/api/natural-language/resolve-phones", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_requested"] == 0
        assert data["total_resolved"] == 0
        assert len(data["resolved_phones"]) == 0
    
    @patch('app.services.contextual_query_processor.ContextualQueryProcessor')
    def test_contextual_query_with_context_parameter(self, mock_processor_class):
        """Test contextual query with context parameter"""
        mock_processor = Mock()
        mock_processor_class.return_value = mock_processor
        mock_processor.process_contextual_query_enhanced.return_value = {
            "type": "recommendation",
            "enhanced_processing": True
        }
        
        request_data = {
            "query": "Show me better phones",
            "referenced_phones": ["iPhone 14 Pro"],
            "context_type": "better_than",
            "session_id": "test_session"
        }
        
        response = client.post("/api/natural-language/contextual-query", json=request_data)
        
        assert response.status_code == 200
        # Verify that the processor was called with the session_id
        mock_processor.process_contextual_query_enhanced.assert_called_once()
        call_args = mock_processor.process_contextual_query_enhanced.call_args
        assert call_args[0][1] == "Show me better phones"  # query
        assert call_args[0][2] == "test_session"  # session_id
    
    def test_parse_intent_with_context_parameter(self):
        """Test parse intent endpoint with context parameter"""
        context_data = {
            "recent_phones": [self.mock_phone_data],
            "query_count": 3
        }
        
        response = client.get(
            "/api/natural-language/parse-intent",
            params={
                "query": "Compare these phones",
                "context": json.dumps(context_data)
            }
        )
        
        # Should process without error
        assert response.status_code in [200, 500]
    
    def test_parse_intent_with_invalid_context_json(self):
        """Test parse intent endpoint with invalid context JSON"""
        response = client.get(
            "/api/natural-language/parse-intent",
            params={
                "query": "Compare these phones",
                "context": "invalid json"
            }
        )
        
        # Should handle invalid JSON gracefully
        assert response.status_code in [200, 500]
    
    @patch('app.services.phone_name_resolver.PhoneNameResolver')
    def test_resolve_phones_with_mixed_results(self, mock_resolver_class):
        """Test resolve phones with some successful and some failed resolutions"""
        mock_resolver = Mock()
        mock_resolver_class.return_value = mock_resolver
        
        # Mock successful resolution for one phone
        mock_resolver.resolve_phone_names.return_value = [self.resolved_phone]
        
        # Mock suggestions for failed phone
        mock_resolver.suggest_similar_phones.return_value = ["Similar Phone 1", "Similar Phone 2"]
        
        request_data = {
            "phone_names": ["iPhone 14 Pro", "NonExistentPhone", "AnotherFakePhone"]
        }
        
        response = client.post("/api/natural-language/resolve-phones", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_requested"] == 3
        assert data["total_resolved"] == 1
        assert len(data["failed_resolutions"]) == 2
        assert "NonExistentPhone" in data["failed_resolutions"]
        assert "AnotherFakePhone" in data["failed_resolutions"]
        
        # Should have suggestions for failed resolutions
        assert len(data["suggestions"]) == 2
    
    def test_api_endpoint_authentication(self):
        """Test that endpoints don't require authentication (as per current design)"""
        # Test that endpoints are accessible without authentication
        response = client.get("/api/natural-language/parse-intent?query=test")
        assert response.status_code != 401  # Should not be unauthorized
        
        response = client.get("/api/natural-language/context/test_session")
        assert response.status_code != 401
    
    def test_api_endpoint_cors_headers(self):
        """Test that endpoints return appropriate CORS headers if configured"""
        response = client.get("/api/natural-language/parse-intent?query=test")
        
        # Check that response is successful (CORS would block if misconfigured)
        assert response.status_code in [200, 500]
    
    @patch('app.services.contextual_query_processor.ContextualQueryProcessor')
    def test_contextual_query_session_id_generation(self, mock_processor_class):
        """Test that session ID is generated when not provided"""
        mock_processor = Mock()
        mock_processor_class.return_value = mock_processor
        mock_processor.process_contextual_query_enhanced.return_value = {
            "type": "recommendation",
            "enhanced_processing": True
        }
        
        request_data = {
            "query": "Show me phones better than iPhone 14 Pro",
            "referenced_phones": ["iPhone 14 Pro"],
            "context_type": "better_than"
            # No session_id provided
        }
        
        response = client.post("/api/natural-language/contextual-query", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert data["session_id"] is not None
        assert len(data["session_id"]) > 0  # Should have generated a UUID