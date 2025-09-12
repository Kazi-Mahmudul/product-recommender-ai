"""
RAG Pipeline Controller for AI Chat functionality.

This module implements the main orchestrator for the RAG pipeline that coordinates
between GEMINI service and database retrieval to provide grounded, accurate responses
about phones.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
import logging
import time
import uuid
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.config import settings
from app.services.gemini_rag_service import GeminiRAGService
from app.services.knowledge_retrieval import KnowledgeRetrievalService
from app.services.response_formatter import ResponseFormatterService

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services
gemini_rag_service = GeminiRAGService()
knowledge_retrieval_service = KnowledgeRetrievalService()
response_formatter_service = ResponseFormatterService()


class ChatQueryRequest(BaseModel):
    """Request model for chat queries."""
    query: str = Field(..., min_length=1, max_length=2000, description="User's chat query")
    conversation_history: Optional[List[Dict[str, str]]] = Field(
        default=None, 
        description="Previous conversation messages for context"
    )
    session_id: Optional[str] = Field(
        default=None, 
        description="Session identifier for tracking (frontend only)"
    )


class ChatResponse(BaseModel):
    """Response model for chat queries."""
    response_type: str = Field(..., description="Type of response: text, recommendations, comparison, specs")
    content: Dict[str, Any] = Field(..., description="Main response content")
    suggestions: Optional[List[str]] = Field(default=None, description="Follow-up suggestions")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")
    session_id: Optional[str] = Field(default=None, description="Session identifier")
    processing_time: Optional[float] = Field(default=None, description="Processing time in seconds")


@router.post("/query", response_model=ChatResponse)
async def process_chat_query(
    request: ChatQueryRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> ChatResponse:
    """
    Main entry point for chat queries. Processes user queries through the RAG pipeline.
    
    Args:
        request: Chat query request with user query and optional context
        background_tasks: FastAPI background tasks for async operations
        db: Database session
        
    Returns:
        ChatResponse: Structured response with content and metadata
        
    Raises:
        HTTPException: For validation errors or service failures
    """
    start_time = time.time()
    request_id = str(uuid.uuid4())[:8]
    
    logger.info(f"[{request_id}] Processing chat query: '{request.query[:100]}...'")
    
    try:
        # Validate input
        if not request.query or not request.query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        # Generate session ID if not provided
        session_id = request.session_id or str(uuid.uuid4())
        
        # Step 1: Parse query with GEMINI service
        logger.info(f"[{request_id}] Step 1: Parsing query with GEMINI service")
        gemini_response = await gemini_rag_service.parse_query_with_context(
            query=request.query,
            conversation_history=request.conversation_history or []
        )
        
        # Step 2: Enhance with knowledge from database
        logger.info(f"[{request_id}] Step 2: Enhancing with database knowledge")
        enhanced_response = await enhance_with_knowledge(
            gemini_response=gemini_response,
            db=db,
            request_id=request_id
        )
        
        # Step 3: Format response for frontend
        logger.info(f"[{request_id}] Step 3: Formatting response")
        formatted_response = await format_response(
            enhanced_response=enhanced_response,
            original_query=request.query,
            request_id=request_id
        )
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Create final response
        chat_response = ChatResponse(
            response_type=formatted_response.get("response_type", "text"),
            content=formatted_response.get("content", {}),
            suggestions=formatted_response.get("suggestions"),
            metadata={
                "request_id": request_id,
                "gemini_response_type": gemini_response.get("type"),
                "data_sources": formatted_response.get("metadata", {}).get("data_sources", []),
                "confidence_score": formatted_response.get("metadata", {}).get("confidence_score")
            },
            session_id=session_id,
            processing_time=processing_time
        )
        
        logger.info(f"[{request_id}] Successfully processed query in {processing_time:.2f}s")
        
        # Log analytics in background
        background_tasks.add_task(
            log_chat_analytics,
            request_id=request_id,
            query=request.query,
            response_type=chat_response.response_type,
            processing_time=processing_time
        )
        
        return chat_response
        
    except HTTPException:
        raise
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"[{request_id}] Error processing chat query: {str(e)}", exc_info=True)
        
        # Return graceful error response
        return ChatResponse(
            response_type="text",
            content={
                "text": "I'm having trouble processing your request right now. Please try rephrasing your question or try again in a moment.",
                "error": True
            },
            suggestions=[
                "Try asking about a specific phone model",
                "Ask for phone recommendations with your budget",
                "Compare two phones directly"
            ],
            metadata={
                "request_id": request_id,
                "error": str(e) if settings.DEBUG else "Internal error"
            },
            processing_time=processing_time
        )


async def enhance_with_knowledge(
    gemini_response: Dict[str, Any],
    db: Session,
    request_id: str
) -> Dict[str, Any]:
    """
    Combines GEMINI response with database knowledge.
    
    Args:
        gemini_response: Response from GEMINI service
        db: Database session
        request_id: Request identifier for logging
        
    Returns:
        Dict containing enhanced response with database knowledge
    """
    try:
        response_type = gemini_response.get("type", "chat")
        
        if response_type == "recommendation":
            # Get phone recommendations based on GEMINI filters
            filters = gemini_response.get("filters", {})
            phones = await knowledge_retrieval_service.find_similar_phones(db, filters)
            
            return {
                "type": "recommendations",
                "phones": phones,
                "reasoning": gemini_response.get("reasoning", ""),
                "filters_applied": filters
            }
            
        elif response_type == "comparison":
            # Get comparison data for specified phones
            phone_names = gemini_response.get("data", [])
            comparison_data = await knowledge_retrieval_service.get_comparison_data(db, phone_names)
            
            return {
                "type": "comparison",
                "comparison_data": comparison_data,
                "reasoning": gemini_response.get("reasoning", "")
            }
            
        elif response_type == "drill_down":
            # Get detailed specifications for a specific phone
            phone_names = gemini_response.get("data", [])
            if phone_names:
                phone_specs = await knowledge_retrieval_service.retrieve_phone_specs(db, phone_names[0])
                return {
                    "type": "specs",
                    "phone_specs": phone_specs,
                    "reasoning": gemini_response.get("reasoning", "")
                }
            
        elif response_type == "qa":
            # Handle Q&A with potential database lookup
            query_data = gemini_response.get("data", "")
            # Try to enhance with relevant phone data if applicable
            enhanced_data = await knowledge_retrieval_service.search_by_features(
                db, 
                query_data, 
                limit=3
            )
            
            return {
                "type": "text",
                "text": query_data,
                "related_phones": enhanced_data if enhanced_data else None,
                "reasoning": gemini_response.get("reasoning", "")
            }
        
        # Default: return as conversational response
        return {
            "type": "text",
            "text": gemini_response.get("data", gemini_response.get("reasoning", "")),
            "reasoning": gemini_response.get("reasoning", "")
        }
        
    except Exception as e:
        logger.error(f"[{request_id}] Error enhancing with knowledge: {str(e)}")
        # Fallback to original GEMINI response
        return {
            "type": "text",
            "text": gemini_response.get("data", gemini_response.get("reasoning", "I'm having trouble accessing the phone database right now.")),
            "error": True
        }


async def format_response(
    enhanced_response: Dict[str, Any],
    original_query: str,
    request_id: str
) -> Dict[str, Any]:
    """
    Structures response for frontend consumption.
    
    Args:
        enhanced_response: Enhanced response with database knowledge
        original_query: Original user query
        request_id: Request identifier for logging
        
    Returns:
        Dict containing formatted response for frontend
    """
    try:
        response_type = enhanced_response.get("type", "text")
        
        if response_type == "recommendations":
            return await response_formatter_service.format_recommendations(
                phones=enhanced_response.get("phones", []),
                reasoning=enhanced_response.get("reasoning", ""),
                filters=enhanced_response.get("filters_applied", {}),
                original_query=original_query
            )
            
        elif response_type == "comparison":
            return await response_formatter_service.format_comparison(
                comparison_data=enhanced_response.get("comparison_data", {}),
                reasoning=enhanced_response.get("reasoning", ""),
                original_query=original_query
            )
            
        elif response_type == "specs":
            return await response_formatter_service.format_specifications(
                phone_specs=enhanced_response.get("phone_specs", {}),
                reasoning=enhanced_response.get("reasoning", ""),
                original_query=original_query
            )
            
        else:
            # Text/conversational response
            return await response_formatter_service.format_conversational(
                text=enhanced_response.get("text", ""),
                related_phones=enhanced_response.get("related_phones"),
                reasoning=enhanced_response.get("reasoning", ""),
                original_query=original_query
            )
            
    except Exception as e:
        logger.error(f"[{request_id}] Error formatting response: {str(e)}")
        # Fallback response
        return {
            "response_type": "text",
            "content": {
                "text": "I understand your question but I'm having trouble formatting the response. Please try asking again.",
                "error": True
            },
            "suggestions": [
                "Try rephrasing your question",
                "Ask about a specific phone model",
                "Request phone recommendations"
            ]
        }


async def log_chat_analytics(
    request_id: str,
    query: str,
    response_type: str,
    processing_time: float
) -> None:
    """
    Log chat analytics for monitoring and improvement.
    
    Args:
        request_id: Request identifier
        query: User query
        response_type: Type of response generated
        processing_time: Time taken to process the request
    """
    try:
        # Log analytics data (could be sent to monitoring service)
        analytics_data = {
            "request_id": request_id,
            "query_length": len(query),
            "response_type": response_type,
            "processing_time": processing_time,
            "timestamp": time.time()
        }
        
        logger.info(f"Chat analytics: {analytics_data}")
        
        # TODO: Send to analytics service if configured
        
    except Exception as e:
        logger.error(f"Error logging chat analytics: {str(e)}")


@router.get("/health")
async def chat_health_check():
    """Health check endpoint for chat service."""
    try:
        # Check if services are available
        gemini_status = await gemini_rag_service.health_check()
        
        return {
            "status": "healthy",
            "services": {
                "gemini_rag": gemini_status,
                "knowledge_retrieval": "available",
                "response_formatter": "available"
            },
            "timestamp": time.time()
        }
    except Exception as e:
        logger.error(f"Chat health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": time.time()
        }