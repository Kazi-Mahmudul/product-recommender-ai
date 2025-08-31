"""
AI Service Integration Layer

This module provides a robust client for communicating with the intelligent AI service endpoint.
It handles request/response processing, error handling, retry logic, and timeout management.
"""

import httpx
import asyncio
import json
import time
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from enum import Enum
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class AIServiceResponseType(str, Enum):
    """Enumeration of possible AI service response types"""
    RECOMMENDATION = "recommendation"
    QA = "qa"
    COMPARISON = "comparison"
    CHAT = "chat"
    DRILL_DOWN = "drill_down"
    UNKNOWN = "unknown"

class AIServiceRequest(BaseModel):
    """Request model for AI service communication"""
    query: str
    context: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None
    conversation_history: Optional[List[Dict[str, str]]] = None

class AIServiceResponse(BaseModel):
    """Response model from AI service"""
    type: str
    content: Any = None
    data: Any = None
    filters: Optional[Dict[str, Any]] = None
    reasoning: Optional[str] = None
    confidence: Optional[float] = None
    suggestions: Optional[List[str]] = None
    context_requirements: Optional[List[str]] = None
    command: Optional[str] = None
    target: Optional[str] = None

class AIServiceError(Exception):
    """Custom exception for AI service errors"""
    def __init__(self, message: str, status_code: Optional[int] = None, retry_after: Optional[int] = None):
        self.message = message
        self.status_code = status_code
        self.retry_after = retry_after
        super().__init__(self.message)

class AIServiceClient:
    """
    Intelligent client for communicating with the AI service endpoint.
    Provides robust error handling, retry logic, and response processing.
    """
    
    def __init__(self):
        self.base_url = settings.GEMINI_SERVICE_URL_SECURE or settings.GEMINI_SERVICE_URL
        self.timeout = 30.0
        self.max_retries = 3
        self.retry_delay = 1.0
        self.max_retry_delay = 10.0
        
    async def call_ai_service(
        self, 
        request: AIServiceRequest,
        include_context: bool = True
    ) -> AIServiceResponse:
        """
        Main method to call the AI service with intelligent error handling and retry logic.
        
        Args:
            request: The request to send to the AI service
            include_context: Whether to include conversation context in the request
            
        Returns:
            AIServiceResponse: Parsed response from the AI service
            
        Raises:
            AIServiceError: If the service call fails after all retries
        """
        # Prepare the request payload
        payload = self._prepare_request_payload(request, include_context)
        
        # Attempt the request with retry logic
        for attempt in range(self.max_retries + 1):
            try:
                response = await self._make_request(payload)
                parsed_response = self._parse_response(response)
                
                logger.info(f"AI service call successful on attempt {attempt + 1}")
                return parsed_response
                
            except AIServiceError as e:
                if attempt == self.max_retries:
                    logger.error(f"AI service call failed after {self.max_retries + 1} attempts: {e.message}")
                    raise e
                
                # Calculate retry delay with exponential backoff
                delay = min(self.retry_delay * (2 ** attempt), self.max_retry_delay)
                if e.retry_after:
                    delay = max(delay, e.retry_after)
                
                logger.warning(f"AI service call failed on attempt {attempt + 1}, retrying in {delay}s: {e.message}")
                await asyncio.sleep(delay)
                
            except Exception as e:
                if attempt == self.max_retries:
                    logger.error(f"Unexpected error in AI service call: {str(e)}")
                    raise AIServiceError(f"Unexpected error: {str(e)}")
                
                delay = min(self.retry_delay * (2 ** attempt), self.max_retry_delay)
                logger.warning(f"Unexpected error on attempt {attempt + 1}, retrying in {delay}s: {str(e)}")
                await asyncio.sleep(delay)
    
    def _prepare_request_payload(self, request: AIServiceRequest, include_context: bool) -> Dict[str, Any]:
        """Prepare the request payload for the AI service"""
        payload = {"query": request.query}
        
        if include_context and request.context:
            payload["context"] = request.context
            
        if request.session_id:
            payload["session_id"] = request.session_id
            
        if include_context and request.conversation_history:
            # Include recent conversation history for context
            payload["conversation_history"] = request.conversation_history[-5:]  # Last 5 exchanges
            
        return payload
    
    async def _make_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Make the actual HTTP request to the AI service"""
        start_time = time.time()
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/parse-query",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                
                request_time = time.time() - start_time
                logger.info(f"AI service request completed in {request_time:.2f}s")
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:  # Rate limited
                    retry_after = int(response.headers.get("Retry-After", 60))
                    raise AIServiceError(
                        "AI service rate limit exceeded", 
                        status_code=429, 
                        retry_after=retry_after
                    )
                elif response.status_code >= 500:  # Server error
                    error_text = response.text
                    raise AIServiceError(
                        f"AI service server error: {error_text}", 
                        status_code=response.status_code
                    )
                else:  # Client error
                    error_text = response.text
                    raise AIServiceError(
                        f"AI service client error: {error_text}", 
                        status_code=response.status_code
                    )
                    
            except httpx.ConnectError as e:
                raise AIServiceError(f"Failed to connect to AI service: {str(e)}")
            except httpx.TimeoutException as e:
                raise AIServiceError(f"AI service request timed out: {str(e)}")
            except httpx.RequestError as e:
                raise AIServiceError(f"AI service request error: {str(e)}")
    
    def _parse_response(self, response_data: Dict[str, Any]) -> AIServiceResponse:
        """Parse and validate the AI service response"""
        try:
            # Handle different response formats from the AI service
            response_type = response_data.get("type", "unknown")
            
            parsed_response = AIServiceResponse(
                type=response_type,
                content=response_data.get("content"),
                data=response_data.get("data"),
                filters=response_data.get("filters"),
                reasoning=response_data.get("reasoning"),
                confidence=response_data.get("confidence"),
                suggestions=response_data.get("suggestions"),
                context_requirements=response_data.get("context_requirements"),
                command=response_data.get("command"),
                target=response_data.get("target")
            )
            
            logger.debug(f"Parsed AI service response: type={response_type}")
            return parsed_response
            
        except Exception as e:
            logger.error(f"Failed to parse AI service response: {str(e)}")
            raise AIServiceError(f"Invalid response format from AI service: {str(e)}")
    
    def enhance_query_with_context(
        self, 
        query: str, 
        conversation_history: Optional[List[Dict[str, str]]] = None,
        user_preferences: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Enhance a query with relevant context information.
        
        Args:
            query: The original user query
            conversation_history: Recent conversation history
            user_preferences: User preferences and past interactions
            
        Returns:
            str: Enhanced query with context
        """
        enhanced_query = query
        
        # Add conversation context if available and relevant
        if conversation_history and len(conversation_history) > 0:
            # Check if the query seems to reference previous conversation
            contextual_indicators = [
                "that", "those", "them", "it", "this", "these",
                "also", "too", "as well", "compare", "versus", "vs",
                "better", "worse", "similar", "different"
            ]
            
            query_lower = query.lower()
            if any(indicator in query_lower for indicator in contextual_indicators):
                # Add context from recent conversation
                recent_context = self._extract_relevant_context(conversation_history)
                if recent_context:
                    enhanced_query = f"{query}\n\nContext: {recent_context}"
        
        # Add user preferences if they're relevant to the query
        if user_preferences:
            preference_context = self._extract_preference_context(query, user_preferences)
            if preference_context:
                enhanced_query = f"{enhanced_query}\n\nUser preferences: {preference_context}"
        
        return enhanced_query
    
    def _extract_relevant_context(self, conversation_history: List[Dict[str, str]]) -> Optional[str]:
        """Extract relevant context from conversation history"""
        if not conversation_history:
            return None
            
        # Get the most recent exchange
        recent_exchange = conversation_history[-1]
        
        # Extract phone names and key topics from recent conversation
        context_parts = []
        
        if "bot" in recent_exchange:
            bot_response = recent_exchange["bot"]
            # Look for phone names or recommendations in the bot response
            if "recommend" in bot_response.lower() or "suggest" in bot_response.lower():
                context_parts.append(f"Previously discussed: {bot_response[:200]}...")
        
        return " ".join(context_parts) if context_parts else None
    
    def _extract_preference_context(self, query: str, user_preferences: Dict[str, Any]) -> Optional[str]:
        """Extract relevant user preferences for the query"""
        # This could be enhanced based on user preference schema
        preference_parts = []
        
        # Add budget preferences if query is about recommendations
        if "recommend" in query.lower() or "suggest" in query.lower():
            if "budget_range" in user_preferences:
                budget = user_preferences["budget_range"]
                preference_parts.append(f"Budget: {budget}")
        
        return ", ".join(preference_parts) if preference_parts else None
    
    async def health_check(self) -> bool:
        """Check if the AI service is available and responding"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/health")
                return response.status_code == 200
        except Exception:
            return False

# Global instance for use throughout the application
ai_service_client = AIServiceClient()