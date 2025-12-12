"""
GEMINI RAG Service - Wrapper for the existing GEMINI service with RAG-specific functionality.

This service wraps the existing GEMINI service to provide enhanced query parsing
with conversation context and RAG-specific features.
"""

from typing import List, Dict, Any, Optional
import httpx
import logging
import asyncio
import time
from app.core.config import settings

logger = logging.getLogger(__name__)


class GeminiRAGService:
    """
    Wrapper service for GEMINI with RAG-specific enhancements.
    Includes circuit breaker pattern and comprehensive error handling.
    """
    
    def __init__(self):
        self.gemini_service_url = settings.GEMINI_SERVICE_URL_SECURE
        self.timeout = 30.0
        self.max_retries = 3
        self.base_delay = 1.0  # Base delay for exponential backoff
        
        # Circuit breaker state
        self.failure_count = 0
        self.last_failure_time = 0
        self.circuit_breaker_threshold = 5  # Open circuit after 5 failures
        self.circuit_breaker_timeout = 300  # 5 minutes
        self.circuit_state = "closed"  # closed, open, half-open
        
        # Request caching
        self._cache = {}
        self._cache_ttl = 300  # 5 minutes cache TTL
        
    def _is_circuit_open(self) -> bool:
        """Check if circuit breaker is open."""
        if self.circuit_state == "open":
            # Check if timeout has passed
            if time.time() - self.last_failure_time > self.circuit_breaker_timeout:
                self.circuit_state = "half-open"
                logger.info("Circuit breaker moved to half-open state")
                return False
            return True
        return False
    
    def _record_success(self):
        """Record successful request."""
        self.failure_count = 0
        if self.circuit_state == "half-open":
            self.circuit_state = "closed"
            logger.info("Circuit breaker closed after successful request")
    
    def _record_failure(self):
        """Record failed request."""
        import time
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.circuit_breaker_threshold:
            self.circuit_state = "open"
            logger.warning(f"Circuit breaker opened after {self.failure_count} failures")
    
    def _get_cache_key(self, query: str, conversation_history: List[Dict[str, str]] = None) -> str:
        """Generate cache key for request."""
        import hashlib
        
        # Create a simple hash of query and recent history
        cache_data = query
        if conversation_history:
            # Only use last 2 messages for cache key
            recent_history = conversation_history[-2:]
            cache_data += str(recent_history)
        
        return hashlib.md5(cache_data.encode()).hexdigest()
    
    def _get_cached_response(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached response if available and not expired."""
        import time
        
        if cache_key in self._cache:
            cached_data = self._cache[cache_key]
            if time.time() - cached_data["timestamp"] < self._cache_ttl:
                logger.info("Returning cached response")
                return cached_data["response"]
            else:
                # Remove expired cache entry
                del self._cache[cache_key]
        
        return None
    
    def _cache_response(self, cache_key: str, response: Dict[str, Any]):
        """Cache response."""
        import time
        
        self._cache[cache_key] = {
            "response": response,
            "timestamp": time.time()
        }
        
        # Simple cache cleanup - remove oldest entries if cache gets too large
        if len(self._cache) > 100:
            oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k]["timestamp"])
            del self._cache[oldest_key]

    async def parse_query_with_context(
        self,
        query: str,
        conversation_history: List[Dict[str, str]] = None,
        retry_count: int = 0
    ) -> Dict[str, Any]:
        """
        Enhanced query parsing with conversation context, retry logic, and circuit breaker.
        
        Args:
            query: User's query string
            conversation_history: Previous conversation messages for context
            retry_count: Current retry attempt number
            
        Returns:
            Dict containing parsed query response from GEMINI
        """
        # Check circuit breaker
        if self._is_circuit_open():
            logger.warning("Circuit breaker is open, returning fallback response")
            return self._create_fallback_response(query, "AI service temporarily unavailable")
        
        # Check cache first
        cache_key = self._get_cache_key(query, conversation_history)
        cached_response = self._get_cached_response(cache_key)
        if cached_response:
            return cached_response
        
        try:
            # Enhance query with conversation context if available
            enhanced_query = self._enhance_query_with_context(query, conversation_history or [])
            
            # Call existing GEMINI service with retry logic
            # Use shorter timeout and no retries for localhost to avoid hanging
            if "localhost" in self.gemini_service_url:
                logger.warning("Skipping Gemini RAG call for localhost - returning fallback")
                return self._create_fallback_response(query, "AI service skipped for local dev")
            
            request_timeout = self.timeout
            effective_retries = self.max_retries

            async with httpx.AsyncClient(timeout=request_timeout) as client:
                response = await client.post(
                    f"{self.gemini_service_url}/parse-query",
                    json={"query": enhanced_query},
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"GEMINI response received: {result.get('type', 'unknown')}")
                    
                    # Record success and cache response
                    self._record_success()
                    self._cache_response(cache_key, result)
                    
                    return result
                elif response.status_code == 429:
                    # Rate limiting - implement exponential backoff
                    if retry_count < effective_retries:
                        delay = self._calculate_backoff_delay(retry_count)
                        logger.warning(f"Rate limited, retrying in {delay}s (attempt {retry_count + 1})")
                        await asyncio.sleep(delay)
                        return await self.parse_query_with_context(query, conversation_history, retry_count + 1)
                    else:
                        logger.error("Max retries exceeded for rate limiting")
                        return self._create_fallback_response(query, "Service temporarily overloaded")
                elif response.status_code >= 500:
                    # Server error - retry with exponential backoff
                    if retry_count < effective_retries:
                        delay = self._calculate_backoff_delay(retry_count)
                        logger.warning(f"Server error {response.status_code}, retrying in {delay}s")
                        await asyncio.sleep(delay)
                        return await self.parse_query_with_context(query, conversation_history, retry_count + 1)
                    else:
                        logger.error(f"Max retries exceeded for server error: {response.status_code}")
                        return self._create_fallback_response(query, "AI service temporarily unavailable")
                else:
                    logger.error(f"GEMINI service error: {response.status_code} - {response.text}")
                    self._record_failure()
                    return self._create_fallback_response(query, f"AI service error: {response.status_code}")
                    
        except httpx.TimeoutException:
            self._record_failure()
            if retry_count < effective_retries:
                delay = self._calculate_backoff_delay(retry_count)
                logger.warning(f"Request timeout, retrying in {delay}s (attempt {retry_count + 1})")
                await asyncio.sleep(delay)
                return await self.parse_query_with_context(query, conversation_history, retry_count + 1)
            else:
                logger.error("GEMINI service timeout after max retries")
                return self._create_fallback_response(query, "AI service timeout")
        except httpx.ConnectError:
            self._record_failure()
            logger.error("Failed to connect to GEMINI service")
            return self._create_fallback_response(query, "AI service unavailable")
        except Exception as e:
            self._record_failure()
            logger.error(f"Unexpected error calling GEMINI service: {str(e)}", exc_info=True)
            return self._create_fallback_response(query, "Unexpected AI service error")
    
    def _enhance_query_with_context(
        self,
        query: str,
        conversation_history: List[Dict[str, str]]
    ) -> str:
        """
        Enhance query with conversation context for better understanding.
        
        Args:
            query: Current user query
            conversation_history: Previous conversation messages
            
        Returns:
            Enhanced query string with context
        """
        if not conversation_history:
            return query
            
        # Extract relevant context from recent messages (last 3 exchanges)
        recent_history = conversation_history[-6:]  # Last 3 user-assistant pairs
        
        context_parts = []
        for msg in recent_history:
            if msg.get("type") == "user":
                context_parts.append(f"User previously asked: {msg.get('content', '')}")
            elif msg.get("type") == "assistant":
                # Extract key information from assistant responses
                content = msg.get("content", "")
                if isinstance(content, dict):
                    if content.get("phones"):
                        phone_names = [p.get("name", "") for p in content.get("phones", [])]
                        context_parts.append(f"Previously discussed phones: {', '.join(phone_names)}")
                    elif content.get("text"):
                        # Extract phone names or key topics from text
                        text = content.get("text", "")[:100]  # First 100 chars
                        context_parts.append(f"Previous context: {text}")
        
        if context_parts:
            context_str = " | ".join(context_parts[-2:])  # Last 2 context items
            enhanced_query = f"Context: {context_str} | Current question: {query}"
            logger.info(f"Enhanced query with context: {enhanced_query[:200]}...")
            return enhanced_query
        
        return query
    
    def _calculate_backoff_delay(self, retry_count: int) -> float:
        """
        Calculate exponential backoff delay.
        
        Args:
            retry_count: Current retry attempt number
            
        Returns:
            Delay in seconds
        """
        return min(self.base_delay * (2 ** retry_count), 30.0)  # Max 30 seconds
    
    def _create_fallback_response(self, query: str, error_context: str = None) -> Dict[str, Any]:
        """
        Create a fallback response when GEMINI service is unavailable.
        
        Args:
            query: Original user query
            error_context: Additional context about the error
            
        Returns:
            Fallback response dict
        """
        # Simple keyword-based fallback logic
        query_lower = query.lower()
        
        base_message = "I'm having trouble with my AI service"
        if error_context:
            base_message += f" ({error_context})"
        
        if any(word in query_lower for word in ["recommend", "suggest", "best", "good"]):
            return {
                "type": "recommendation",
                "filters": {"price_category": "mid-range", "is_popular_brand": True},
                "reasoning": f"{base_message}, but I can show you some popular mid-range phones that are generally well-regarded."
            }
        elif any(word in query_lower for word in ["vs", "versus", "compare", "comparison"]):
            return {
                "type": "comparison",
                "data": [],
                "reasoning": f"I'd like to help you compare phones, but {base_message.lower()}. Please try again in a moment or be more specific about which phones you'd like to compare."
            }
        elif any(word in query_lower for word in ["specs", "specifications", "details"]):
            return {
                "type": "drill_down",
                "data": [],
                "reasoning": f"I can help you find phone specifications, but {base_message.lower()}. Please try again or search for a specific phone model."
            }
        elif any(word in query_lower for word in ["price", "cost", "budget", "cheap", "expensive"]):
            return {
                "type": "recommendation",
                "filters": {"price_category": "budget"},
                "reasoning": f"{base_message}, but I can show you some budget-friendly options that offer good value."
            }
        else:
            return {
                "type": "chat",
                "data": f"{base_message}. Please try asking about phone recommendations, comparisons, or specifications. You can also try rephrasing your question.",
                "reasoning": error_context or "Service temporarily unavailable"
            }
    
    async def extract_phone_entities(self, query: str) -> List[str]:
        """
        Extract phone names and entities from query.
        
        Args:
            query: User query string
            
        Returns:
            List of extracted phone names/entities
        """
        # This could be enhanced with NLP libraries, but for now use simple regex
        import re
        
        # Common phone brand patterns
        phone_patterns = [
            r'\b(iPhone\s+\d+(?:\s+Pro(?:\s+Max)?)?)\b',
            r'\b(Samsung\s+Galaxy\s+[A-Z]\d+(?:\s+\w+)*)\b',
            r'\b(Galaxy\s+[A-Z]\d+(?:\s+\w+)*)\b',
            r'\b(Xiaomi\s+\w+(?:\s+\w+)*)\b',
            r'\b(OnePlus\s+\w+(?:\s+\w+)*)\b',
            r'\b(Google\s+Pixel\s+\d+(?:\s+\w+)*)\b',
            r'\b(Pixel\s+\d+(?:\s+\w+)*)\b'
        ]
        
        extracted_phones = []
        for pattern in phone_patterns:
            matches = re.findall(pattern, query, re.IGNORECASE)
            extracted_phones.extend(matches)
        
        return list(set(extracted_phones))  # Remove duplicates
    
    async def determine_response_type(self, query: str) -> str:
        """
        Classify query type for appropriate response handling.
        
        Args:
            query: User query string
            
        Returns:
            Response type classification
        """
        query_lower = query.lower()
        
        # Check for comparison keywords
        if any(word in query_lower for word in ["vs", "versus", "compare", "comparison", "against", "difference"]):
            return "comparison"
        
        # Check for recommendation keywords
        if any(word in query_lower for word in ["recommend", "suggest", "best", "top", "good", "should i buy"]):
            return "recommendation"
        
        # Check for specification keywords
        if any(word in query_lower for word in ["specs", "specifications", "details", "features", "what is"]):
            return "drill_down"
        
        # Check for Q&A keywords
        if any(word in query_lower for word in ["how", "why", "when", "where", "what", "does", "is", "are"]):
            return "qa"
        
        # Default to chat
        return "chat"
    
    def get_circuit_breaker_status(self) -> Dict[str, Any]:
        """
        Get current circuit breaker status.
        
        Returns:
            Dict containing circuit breaker information
        """
        import time
        
        return {
            "state": self.circuit_state,
            "failure_count": self.failure_count,
            "last_failure_time": self.last_failure_time,
            "time_since_last_failure": time.time() - self.last_failure_time if self.last_failure_time > 0 else 0,
            "cache_size": len(self._cache)
        }

    async def health_check(self) -> str:
        """
        Check if GEMINI service is available.
        
        Returns:
            Service status string
        """
        # If circuit is open, return status without making request
        if self._is_circuit_open():
            return f"circuit_open_failures_{self.failure_count}"
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.gemini_service_url}/health")
                if response.status_code == 200:
                    self._record_success()
                    return "available"
                else:
                    self._record_failure()
                    return f"error_status_{response.status_code}"
        except Exception as e:
            self._record_failure()
            logger.error(f"GEMINI health check failed: {str(e)}")
            return f"unavailable_{str(e)[:50]}"