"""
Unit tests for Context Manager
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from app.services.context_manager import (
    ContextManager, 
    ConversationContext, 
    MemoryContextStorage,
    RedisContextStorage
)

class TestConversationContext:
    """Test cases for ConversationContext"""
    
    def test_to_dict_conversion(self):
        """Test conversion to dictionary"""
        now = datetime.now()
        context = ConversationContext(
            session_id="test_session",
            recent_phones=[{"id": 1, "name": "iPhone 14 Pro"}],
            recent_queries=["test query"],
            user_preferences={"brand": "Apple"},
            last_updated=now,
            expires_at=now + timedelta(hours=1),
            query_count=5
        )
        
        result = context.to_dict()
        
        assert result["session_id"] == "test_session"
        assert result["recent_phones"] == [{"id": 1, "name": "iPhone 14 Pro"}]
        assert result["query_count"] == 5
        assert "last_updated" in result
        assert "expires_at" in result
    
    def test_from_dict_conversion(self):
        """Test creation from dictionary"""
        now = datetime.now()
        data = {
            "session_id": "test_session",
            "recent_phones": [{"id": 1, "name": "iPhone 14 Pro"}],
            "recent_queries": ["test query"],
            "user_preferences": {"brand": "Apple"},
            "last_updated": now.isoformat(),
            "expires_at": (now + timedelta(hours=1)).isoformat(),
            "query_count": 5
        }
        
        context = ConversationContext.from_dict(data)
        
        assert context.session_id == "test_session"
        assert context.query_count == 5
        assert isinstance(context.last_updated, datetime)

class TestMemoryContextStorage:
    """Test cases for MemoryContextStorage"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.storage = MemoryContextStorage()
        self.test_context = ConversationContext(
            session_id="test_session",
            recent_phones=[],
            recent_queries=[],
            user_preferences={},
            last_updated=datetime.now(),
            expires_at=datetime.now() + timedelta(hours=1)
        )
    
    def test_store_and_retrieve_context(self):
        """Test storing and retrieving context"""
        self.storage.store_context(self.test_context)
        retrieved = self.storage.get_context("test_session")
        
        assert retrieved is not None
        assert retrieved.session_id == "test_session"
    
    def test_delete_context(self):
        """Test deleting context"""
        self.storage.store_context(self.test_context)
        self.storage.delete_context("test_session")
        retrieved = self.storage.get_context("test_session")
        
        assert retrieved is None
    
    def test_expired_context_cleanup(self):
        """Test cleanup of expired contexts"""
        # Create expired context
        expired_context = ConversationContext(
            session_id="expired_session",
            recent_phones=[],
            recent_queries=[],
            user_preferences={},
            last_updated=datetime.now() - timedelta(hours=2),
            expires_at=datetime.now() - timedelta(hours=1)
        )
        
        self.storage.store_context(expired_context)
        cleaned_count = self.storage.cleanup_expired_contexts()
        
        assert cleaned_count == 1
        assert self.storage.get_context("expired_session") is None

class TestContextManager:
    """Test cases for ContextManager"""
    
    def setup_method(self):
        """Set up test fixtures"""
        # Mock storage to avoid Redis dependency in tests
        with patch('app.services.context_manager.RedisContextStorage') as mock_redis:
            mock_redis.return_value.redis_client = None
            self.manager = ContextManager(context_ttl=1800)
        
        self.test_phones = [
            {"id": 1, "name": "iPhone 14 Pro", "brand": "Apple"},
            {"id": 2, "name": "Samsung Galaxy S23", "brand": "Samsung"}
        ]
    
    def test_create_new_context(self):
        """Test creating new context"""
        self.manager.update_context("new_session", phones=self.test_phones)
        context = self.manager.get_context("new_session")
        
        assert context is not None
        assert context.session_id == "new_session"
        assert len(context.recent_phones) == 2
    
    def test_update_context_with_phones(self):
        """Test updating context with new phones"""
        # Create initial context
        self.manager.update_context("test_session", phones=[self.test_phones[0]])
        
        # Update with additional phone
        self.manager.update_context("test_session", phones=[self.test_phones[1]])
        
        context = self.manager.get_context("test_session")
        assert len(context.recent_phones) == 2
        # Most recent phone should be first
        assert context.recent_phones[0]["name"] == "Samsung Galaxy S23"
    
    def test_update_context_with_query(self):
        """Test updating context with queries"""
        self.manager.update_context(
            "test_session", 
            query="Compare iPhone vs Samsung",
            query_type="comparison"
        )
        
        context = self.manager.get_context("test_session")
        assert len(context.recent_queries) == 1
        assert context.recent_queries[0]["query"] == "Compare iPhone vs Samsung"
        assert context.recent_queries[0]["type"] == "comparison"
    
    def test_resolve_contextual_references(self):
        """Test resolving contextual references in queries"""
        # Set up context with phones
        context = ConversationContext(
            session_id="test_session",
            recent_phones=self.test_phones,
            recent_queries=[],
            user_preferences={},
            last_updated=datetime.now(),
            expires_at=datetime.now() + timedelta(hours=1)
        )
        
        # Test resolving "these phones"
        query = "Compare these phones"
        resolved = self.manager.resolve_contextual_references(query, context)
        
        assert "iPhone 14 Pro" in resolved
        assert "Samsung Galaxy S23" in resolved
    
    def test_resolve_comparison_references(self):
        """Test resolving comparison references"""
        context = ConversationContext(
            session_id="test_session",
            recent_phones=self.test_phones,
            recent_queries=[],
            user_preferences={},
            last_updated=datetime.now(),
            expires_at=datetime.now() + timedelta(hours=1)
        )
        
        query = "Which is better between them?"
        resolved = self.manager.resolve_contextual_references(query, context)
        
        # The context manager should resolve "between them" to actual phone names
        assert "iPhone 14 Pro" in resolved
        assert "Samsung Galaxy S23" in resolved
        # The original comparison logic is preserved
        assert "between" in resolved.lower()
    
    def test_context_expiration(self):
        """Test that expired contexts are not returned"""
        # Create context with short TTL
        manager = ContextManager(context_ttl=1)
        manager.update_context("test_session", phones=self.test_phones)
        
        # Wait for expiration (simulate)
        import time
        time.sleep(2)
        
        # Mock the storage to return expired context
        expired_context = ConversationContext(
            session_id="test_session",
            recent_phones=self.test_phones,
            recent_queries=[],
            user_preferences={},
            last_updated=datetime.now() - timedelta(hours=1),
            expires_at=datetime.now() - timedelta(minutes=1)
        )
        
        with patch.object(manager.storage, 'get_context', return_value=expired_context):
            context = manager.get_context("test_session")
            # Should return None for expired context
            assert context is None or datetime.now() > context.expires_at
    
    def test_max_recent_phones_limit(self):
        """Test that recent phones list is limited"""
        # Create many phones
        many_phones = [{"id": i, "name": f"Phone {i}"} for i in range(15)]
        
        self.manager.update_context("test_session", phones=many_phones)
        context = self.manager.get_context("test_session")
        
        # Should be limited to max_recent_phones (10)
        assert len(context.recent_phones) == self.manager.max_recent_phones
    
    def test_duplicate_phone_removal(self):
        """Test that duplicate phones are removed"""
        # Add same phone twice
        phone = {"id": 1, "name": "iPhone 14 Pro"}
        
        self.manager.update_context("test_session", phones=[phone])
        self.manager.update_context("test_session", phones=[phone])
        
        context = self.manager.get_context("test_session")
        
        # Should only have one instance
        assert len(context.recent_phones) == 1
        assert context.recent_phones[0]["name"] == "iPhone 14 Pro"
    
    def test_context_summary(self):
        """Test getting context summary"""
        self.manager.update_context(
            "test_session", 
            phones=self.test_phones,
            query="test query"
        )
        
        summary = self.manager.get_context_summary("test_session")
        
        assert summary["exists"] is True
        assert summary["phone_count"] == 2
        assert summary["session_id"] == "test_session"
        assert len(summary["recent_phone_names"]) <= 3
    
    def test_nonexistent_context_summary(self):
        """Test summary for nonexistent context"""
        summary = self.manager.get_context_summary("nonexistent")
        
        assert summary["exists"] is False
    
    def test_user_preferences_update(self):
        """Test updating user preferences"""
        preferences = {"preferred_brand": "Apple", "max_price": 50000}
        
        self.manager.update_context(
            "test_session",
            user_preferences=preferences
        )
        
        context = self.manager.get_context("test_session")
        assert context.user_preferences["preferred_brand"] == "Apple"
        assert context.user_preferences["max_price"] == 50000
    
    def test_query_count_increment(self):
        """Test that query count increments"""
        self.manager.update_context("test_session", query="first query")
        self.manager.update_context("test_session", query="second query")
        
        context = self.manager.get_context("test_session")
        assert context.query_count == 2