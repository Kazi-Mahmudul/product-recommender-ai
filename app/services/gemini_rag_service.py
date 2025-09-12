"""
GEMINI RAG Service - Wrapper for the existing GEMINI service with RAG-specific functionality.

This service wraps the existing GEMINI service to provide enhanced query parsing
with conversation context and RAG-specific features.
"""

from typing import List, Dict, Any, Optional
import httpx
import logging
import asyncio
from app.core.config import settings

logger = logging.getLogger(__name__)


class GeminiRAGService:
    """
    Wrapper service for GEMINI with RAG-specific enhancements.
    """
    
    def __init__(self):
        self.gemini_service_url = settings.GEMINI_SERVICE_URL_SECURE
        self.timeout = 30.0
        self.max_retries = 3
        self.base_delay = 1.0  # Base delay for exponential backoff
        
    async def parse_query_with_context(
        self,
        query: str,
        conversation_history: List[Dict[str, str]] = None,
        retry_count: int = 0
    ) -> Dict[str, Any]:
        """
        Enhanced query parsing with conversation context and retry logic.
        
        Args:
            query: User's query string
            conversation_history: Previous conversation messages for context
            retry_count: Current retry attempt number
            
        Returns:
            Dict containing parsed query response from GEMINI
        """
        try:
            # Enhance query with conversation context if available
            enhanced_query = self._enhance_query_with_context(query, conversation_history or [])
            
            # Call existing GEMINI service with retry logic
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.gemini_service_url}/parse-query",
                    json={"query": enhanced_query},
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"GEMINI response received: {result.get('type', 'unknown')}")
                    return result
                elif response.status_code == 429:
                    # Rate limiting - implement exponential backoff
                    if retry_count < self.max_retries:
                        delay = self._calculate_backoff_delay(retry_count)
                        logger.warning(f"Rate limited, retrying in {delay}s (attempt {retry_count + 1})")
                        await asyncio.sleep(delay)
                        return await self.parse_query_with_context(query, conversation_history, retry_count + 1)
                    else:
                        logger.error("Max retries exceeded for rate limiting")
                        return self._create_fallback_response(query, "Service temporarily overloaded")
                elif response.status_code >= 500:
                    # Server error - retry with exponential backoff
                    if retry_count < self.max_retries:
                        delay = self._calculate_backoff_delay(retry_count)
                        logger.warning(f"Server error {response.status_code}, retrying in {delay}s")
                        await asyncio.sleep(delay)
                        return await self.parse_query_with_context(query, conversation_history, retry_count + 1)
                    else:
                        logger.error(f"Max retries exceeded for server error: {response.status_code}")
                        return self._create_fallback_response(query, "AI service temporarily unavailable")
                else:
                    logger.error(f"GEMINI service error: {response.status_code} - {response.text}")
                    return self._create_fallback_response(query, f"AI service error: {response.status_code}")
                    
        except httpx.TimeoutException:
            if retry_count < self.max_retries:
                delay = self._calculate_backoff_delay(retry_count)
                logger.warning(f"Request timeout, retrying in {delay}s (attempt {retry_count + 1})")
                await asyncio.sleep(delay)
                return await self.parse_query_with_context(query, conversation_history, retry_count + 1)
            else:
                logger.error("GEMINI service timeout after max retries")
                return self._create_fallback_response(query, "AI service timeout")
        except httpx.ConnectError:
            logger.error("Failed to connect to GEMINI service")
            return self._create_fallback_response(query, "AI service unavailable")
        except Exception as e:
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
    
    async def health_check(self) -> str:
        """
        Check if GEMINI service is available.
        
        Returns:
            Service status string
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.gemini_service_url}/health")
                if response.status_code == 200:
                    return "available"
                else:
                    return f"error_status_{response.status_code}"
        except Exception as e:
            logger.error(f"GEMINI health check failed: {str(e)}")
            return f"unavailable_{str(e)[:50]}"