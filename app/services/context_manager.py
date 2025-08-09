"""
Context Manager for Conversation Memory
"""

import json
import time
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import redis
from app.core.config import settings

logger = logging.getLogger(__name__)

@dataclass
class ConversationContext:
    """Represents conversation context for a user session"""
    session_id: str
    recent_phones: List[Dict[str, Any]]
    recent_queries: List[str]
    user_preferences: Dict[str, Any]
    last_updated: datetime
    expires_at: datetime
    query_count: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'session_id': self.session_id,
            'recent_phones': self.recent_phones,
            'recent_queries': self.recent_queries,
            'user_preferences': self.user_preferences,
            'last_updated': self.last_updated.isoformat(),
            'expires_at': self.expires_at.isoformat(),
            'query_count': self.query_count
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ConversationContext':
        """Create from dictionary"""
        return cls(
            session_id=data['session_id'],
            recent_phones=data['recent_phones'],
            recent_queries=data['recent_queries'],
            user_preferences=data['user_preferences'],
            last_updated=datetime.fromisoformat(data['last_updated']),
            expires_at=datetime.fromisoformat(data['expires_at']),
            query_count=data.get('query_count', 0)
        )

class ContextStorage:
    """Abstract base class for context storage"""
    
    def store_context(self, context: ConversationContext) -> None:
        """Store conversation context"""
        raise NotImplementedError
    
    def get_context(self, session_id: str) -> Optional[ConversationContext]:
        """Retrieve conversation context"""
        raise NotImplementedError
    
    def delete_context(self, session_id: str) -> None:
        """Delete conversation context"""
        raise NotImplementedError
    
    def cleanup_expired_contexts(self) -> int:
        """Clean up expired contexts and return count of cleaned contexts"""
        raise NotImplementedError

class RedisContextStorage(ContextStorage):
    """Redis-based context storage implementation"""
    
    def __init__(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = redis.Redis(
                host=getattr(settings, 'REDIS_HOST', 'localhost'),
                port=getattr(settings, 'REDIS_PORT', 6379),
                db=getattr(settings, 'REDIS_DB', 0),
                decode_responses=True
            )
            # Test connection
            self.redis_client.ping()
            logger.info("Connected to Redis for context storage")
        except Exception as e:
            logger.warning(f"Redis connection failed, falling back to memory storage: {e}")
            self.redis_client = None
    
    def _get_key(self, session_id: str) -> str:
        """Get Redis key for session"""
        return f"context:{session_id}"
    
    def store_context(self, context: ConversationContext) -> None:
        """Store conversation context in Redis"""
        if not self.redis_client:
            return
        
        try:
            key = self._get_key(context.session_id)
            data = json.dumps(context.to_dict())
            
            # Calculate TTL in seconds
            ttl = int((context.expires_at - datetime.now()).total_seconds())
            if ttl > 0:
                self.redis_client.setex(key, ttl, data)
                logger.debug(f"Stored context for session {context.session_id} with TTL {ttl}s")
        except Exception as e:
            logger.error(f"Failed to store context in Redis: {e}")
    
    def get_context(self, session_id: str) -> Optional[ConversationContext]:
        """Retrieve conversation context from Redis"""
        if not self.redis_client:
            return None
        
        try:
            key = self._get_key(session_id)
            data = self.redis_client.get(key)
            
            if data:
                context_dict = json.loads(data)
                context = ConversationContext.from_dict(context_dict)
                
                # Check if context has expired
                if datetime.now() > context.expires_at:
                    self.delete_context(session_id)
                    return None
                
                return context
        except Exception as e:
            logger.error(f"Failed to retrieve context from Redis: {e}")
        
        return None
    
    def delete_context(self, session_id: str) -> None:
        """Delete conversation context from Redis"""
        if not self.redis_client:
            return
        
        try:
            key = self._get_key(session_id)
            self.redis_client.delete(key)
            logger.debug(f"Deleted context for session {session_id}")
        except Exception as e:
            logger.error(f"Failed to delete context from Redis: {e}")
    
    def cleanup_expired_contexts(self) -> int:
        """Clean up expired contexts"""
        # Redis handles TTL automatically, so this is mainly for logging
        return 0

class MemoryContextStorage(ContextStorage):
    """In-memory context storage implementation (fallback)"""
    
    def __init__(self):
        """Initialize memory storage"""
        self.contexts: Dict[str, ConversationContext] = {}
        logger.info("Using in-memory context storage")
    
    def store_context(self, context: ConversationContext) -> None:
        """Store conversation context in memory"""
        self.contexts[context.session_id] = context
        logger.debug(f"Stored context for session {context.session_id} in memory")
    
    def get_context(self, session_id: str) -> Optional[ConversationContext]:
        """Retrieve conversation context from memory"""
        context = self.contexts.get(session_id)
        
        if context and datetime.now() > context.expires_at:
            # Context has expired
            del self.contexts[session_id]
            return None
        
        return context
    
    def delete_context(self, session_id: str) -> None:
        """Delete conversation context from memory"""
        if session_id in self.contexts:
            del self.contexts[session_id]
            logger.debug(f"Deleted context for session {session_id} from memory")
    
    def cleanup_expired_contexts(self) -> int:
        """Clean up expired contexts from memory"""
        now = datetime.now()
        expired_sessions = [
            session_id for session_id, context in self.contexts.items()
            if now > context.expires_at
        ]
        
        for session_id in expired_sessions:
            del self.contexts[session_id]
        
        if expired_sessions:
            logger.info(f"Cleaned up {len(expired_sessions)} expired contexts")
        
        return len(expired_sessions)

class ContextManager:
    """Manages conversation context and maintains memory of recent interactions"""
    
    def __init__(self, context_ttl: int = 1800):  # 30 minutes default
        """
        Initialize context manager
        
        Args:
            context_ttl: Context time-to-live in seconds
        """
        self.context_ttl = context_ttl
        self.max_recent_phones = 10
        self.max_recent_queries = 20
        
        # Initialize storage (try Redis first, fallback to memory)
        try:
            self.storage = RedisContextStorage()
            if not self.storage.redis_client:
                self.storage = MemoryContextStorage()
        except Exception:
            self.storage = MemoryContextStorage()
    
    def update_context(
        self, 
        session_id: str, 
        phones: List[Dict[str, Any]] = None, 
        query: str = None,
        query_type: str = None,
        user_preferences: Dict[str, Any] = None
    ) -> None:
        """
        Update conversation context with new information
        
        Args:
            session_id: User session identifier
            phones: List of phones to add to context
            query: Query to add to recent queries
            query_type: Type of query (comparison, recommendation, etc.)
            user_preferences: User preferences to update
        """
        try:
            # Get existing context or create new one
            context = self.get_context(session_id)
            if not context:
                context = self._create_new_context(session_id)
            
            # Update phones
            if phones:
                self._update_recent_phones(context, phones)
            
            # Update queries
            if query:
                self._update_recent_queries(context, query, query_type)
            
            # Update preferences
            if user_preferences:
                context.user_preferences.update(user_preferences)
            
            # Update timestamps
            context.last_updated = datetime.now()
            context.expires_at = datetime.now() + timedelta(seconds=self.context_ttl)
            context.query_count += 1
            
            # Store updated context
            self.storage.store_context(context)
            
            logger.debug(f"Updated context for session {session_id}")
            
        except Exception as e:
            logger.error(f"Failed to update context for session {session_id}: {e}")
    
    def get_context(self, session_id: str) -> Optional[ConversationContext]:
        """
        Retrieve conversation context for a session
        
        Args:
            session_id: User session identifier
            
        Returns:
            ConversationContext or None if not found/expired
        """
        try:
            return self.storage.get_context(session_id)
        except Exception as e:
            logger.error(f"Failed to get context for session {session_id}: {e}")
            return None
    
    def resolve_contextual_references(self, query: str, context: ConversationContext) -> str:
        """
        Resolve contextual references in query using conversation context
        
        Args:
            query: Original query with potential contextual references
            context: Conversation context
            
        Returns:
            Enhanced query with resolved references
        """
        if not context or not context.recent_phones:
            return query
        
        enhanced_query = query
        query_lower = query.lower()
        
        # Resolve phone references
        contextual_terms = [
            "these phones", "those phones", "the phones", "them",
            "the phones we discussed", "the phones mentioned",
            "the previous phones", "the recommended phones"
        ]
        
        for term in contextual_terms:
            if term in query_lower:
                phone_names = [phone.get('name', '') for phone in context.recent_phones[:5]]
                phone_names_str = ', '.join(phone_names)
                enhanced_query = enhanced_query.replace(
                    term, 
                    f"the phones: {phone_names_str}",
                    1  # Replace only first occurrence
                )
                break
        
        # Resolve comparison references
        comparison_terms = ["compare them", "which is better", "between them"]
        for term in comparison_terms:
            if term in query_lower and len(context.recent_phones) >= 2:
                phone_names = [phone.get('name', '') for phone in context.recent_phones[:2]]
                enhanced_query = enhanced_query.replace(
                    term,
                    f"compare {phone_names[0]} vs {phone_names[1]}"
                )
                break
        
        if enhanced_query != query:
            logger.debug(f"Enhanced query: '{query}' -> '{enhanced_query}'")
        
        return enhanced_query
    
    def cleanup_expired_contexts(self) -> int:
        """
        Clean up expired contexts
        
        Returns:
            Number of contexts cleaned up
        """
        try:
            return self.storage.cleanup_expired_contexts()
        except Exception as e:
            logger.error(f"Failed to cleanup expired contexts: {e}")
            return 0
    
    def delete_context(self, session_id: str) -> None:
        """
        Delete context for a specific session
        
        Args:
            session_id: Session to delete context for
        """
        try:
            self.storage.delete_context(session_id)
        except Exception as e:
            logger.error(f"Failed to delete context for session {session_id}: {e}")
    
    def get_context_summary(self, session_id: str) -> Dict[str, Any]:
        """
        Get a summary of the context for debugging/monitoring
        
        Args:
            session_id: Session identifier
            
        Returns:
            Context summary dictionary
        """
        context = self.get_context(session_id)
        if not context:
            return {"exists": False}
        
        return {
            "exists": True,
            "session_id": context.session_id,
            "phone_count": len(context.recent_phones),
            "query_count": context.query_count,
            "last_updated": context.last_updated.isoformat(),
            "expires_at": context.expires_at.isoformat(),
            "recent_phone_names": [phone.get('name', '') for phone in context.recent_phones[:3]],
            "recent_queries": context.recent_queries[-3:] if context.recent_queries else []
        }
    
    def _create_new_context(self, session_id: str) -> ConversationContext:
        """Create a new conversation context"""
        now = datetime.now()
        return ConversationContext(
            session_id=session_id,
            recent_phones=[],
            recent_queries=[],
            user_preferences={},
            last_updated=now,
            expires_at=now + timedelta(seconds=self.context_ttl),
            query_count=0
        )
    
    def _update_recent_phones(self, context: ConversationContext, phones: List[Dict[str, Any]]) -> None:
        """Update recent phones in context"""
        # Add new phones to the beginning of the list
        for phone in reversed(phones):  # Reverse to maintain order
            # Remove if already exists to avoid duplicates
            context.recent_phones = [p for p in context.recent_phones if p.get('id') != phone.get('id')]
            context.recent_phones.insert(0, phone)
        
        # Limit to max recent phones
        context.recent_phones = context.recent_phones[:self.max_recent_phones]
    
    def _update_recent_queries(self, context: ConversationContext, query: str, query_type: str = None) -> None:
        """Update recent queries in context"""
        query_entry = {
            "query": query,
            "type": query_type,
            "timestamp": datetime.now().isoformat()
        }
        
        # Add to beginning of list
        context.recent_queries.insert(0, query_entry)
        
        # Limit to max recent queries
        context.recent_queries = context.recent_queries[:self.max_recent_queries]