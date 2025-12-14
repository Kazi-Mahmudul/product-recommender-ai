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
from app.services.response_formatter import ResponseFormatterService
from app.services.error_handling_service import error_service, track_performance, ChatErrorHandler
from app.api import deps
from app.models.user import User
from app.crud import chat_history as chat_history_crud
from app.schemas import chat_history as chat_history_schemas

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
@track_performance("chat_query")
async def process_chat_query(
    request: ChatQueryRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(deps.get_current_user_optional)
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
    request_id = error_service.generate_request_id()
    
    logger.info(f"[{request_id}] Processing chat query: '{request.query[:100]}...'")
    
    try:
        # Validate input
        if not request.query or not request.query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        # Generate session ID if not provided
        session_id = request.session_id
        if not session_id:
            session_id = str(uuid.uuid4())
            is_new_session = True
        else:
            is_new_session = False

        # Handle History Persistence for Logged-in Users
        db_session = None
        if current_user:
            try:
                # Check if session exists or create new
                if not is_new_session:
                    try:
                        session_uuid = uuid.UUID(session_id)
                        db_session = chat_history_crud.get_session(db, session_uuid, current_user.id)
                    except ValueError:
                        # Invalid UUID provided, treat as new session
                        session_id = str(uuid.uuid4())
                        is_new_session = True
                
                if not db_session:
                    # Create title from first few words of query
                    title = " ".join(request.query.split()[:5])
                    if len(title) > 50:
                        title = title[:47] + "..."
                    
                    db_session = chat_history_crud.create_session(db, current_user.id, title=title)
                    session_id = str(db_session.id)
                
                # Save User Message
                chat_history_crud.add_message(
                    db, 
                    db_session.id, 
                    role="user", 
                    content=request.query
                )
            except Exception as e:
                logger.error(f"[{request_id}] Failed to persist user message: {e}")
                # Continue without persistence if DB fails
        
        
        # Step 1: Parse query with GEMINI service
        logger.info(f"[{request_id}] Step 1: Parsing query with GEMINI service")
        try:
            gemini_response = await gemini_rag_service.parse_query_with_context(
                query=request.query,
                conversation_history=request.conversation_history or []
            )
        except Exception as gemini_error:
            logger.error(f"[{request_id}] Gemini service error: {str(gemini_error)}")
            error_response = ChatErrorHandler.handle_gemini_service_error(
                gemini_error, request.query, request_id
            )
            processing_time = time.time() - start_time
            return ChatResponse(
                response_type=error_response["response_type"],
                content=error_response["content"],
                suggestions=error_response["suggestions"],
                metadata=error_response["metadata"],
                session_id=session_id,
                processing_time=processing_time
            )
        
        # Step 2: Enhance with knowledge from database
        logger.info(f"[{request_id}] Step 2: Enhancing with database knowledge")
        try:
            enhanced_response = await enhance_with_knowledge(
                gemini_response=gemini_response,
                db=db,
                request_id=request_id
            )
        except Exception as db_error:
            logger.error(f"[{request_id}] Database error: {str(db_error)}")
            error_response = ChatErrorHandler.handle_database_error(
                db_error, "knowledge_enhancement", request_id
            )
            processing_time = time.time() - start_time
            return ChatResponse(
                response_type=error_response["response_type"],
                content=error_response["content"],
                suggestions=error_response["suggestions"],
                metadata=error_response["metadata"],
                session_id=session_id,
                processing_time=processing_time
            )
        
        # Step 3: Format response for frontend
        logger.info(f"[{request_id}] Step 3: Formatting response")
        try:
            formatted_response = await format_response(
                enhanced_response=enhanced_response,
                original_query=request.query,
                request_id=request_id
            )
        except Exception as format_error:
            logger.error(f"[{request_id}] Formatting error: {str(format_error)}")
            # Use enhanced response directly if formatting fails
            formatted_response = {
                "response_type": "text",
                "content": {
                    "text": enhanced_response.get("text", "I found some information but had trouble formatting it properly."),
                    "error": False
                },
                "suggestions": ["Try rephrasing your question", "Ask for more specific information"]
            }
        
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
        
        # Save Assistant Response for Logged-in Users
        if current_user and db_session:
            try:
                chat_history_crud.add_message(
                    db,
                    db_session.id,
                    role="assistant",
                    content=chat_response.content,
                    metadata={
                        "response_type": chat_response.response_type,
                        "data_sources": chat_response.metadata.get("data_sources"),
                        "suggestions": chat_response.suggestions
                    }
                )
            except Exception as e:
                logger.error(f"[{request_id}] Failed to persist assistant message: {e}")

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
        logger.error(f"[{request_id}] Unexpected error processing chat query: {str(e)}", exc_info=True)
            
        # Use error handler for generic errors
        error_response = ChatErrorHandler.handle_generic_error(e, "chat_query", request_id)
            
        return ChatResponse(
            response_type=error_response["response_type"],
            content=error_response["content"],
            suggestions=error_response["suggestions"],
            metadata=error_response["metadata"],
            session_id=request.session_id or str(uuid.uuid4()),
            processing_time=processing_time
        )


async def enhance_with_knowledge(
    gemini_response: Dict[str, Any],
    db: Session,
    request_id: str
) -> Dict[str, Any]:
    """
    Combines GEMINI response with database knowledge using enhanced filtering.
    
    Args:
        gemini_response: Response from GEMINI service
        db: Database session
        request_id: Request identifier for logging
        
    Returns:
        Dict containing enhanced response with database knowledge
    """
    try:
        from app.crud import phone as phone_crud
        
        response_type = gemini_response.get("type", "chat")
        
        if response_type == "recommendation":
            # Get phone recommendations based on GEMINI filters with enhanced preprocessing
            filters = gemini_response.get("filters", {})
            
            # Extract the requested limit from Gemini response, default to 5 if not specified
            requested_limit = gemini_response.get("limit", None)
            
            # If Gemini didn't extract limit, try to extract it from the original query
            if requested_limit is None:
                import re
                query_lower = gemini_response.get("original_query", "").lower()
                
                # Look for explicit numbers
                number_matches = re.findall(r'\b(\d+)\b', query_lower)
                
                # Check for "best phone" (singular) - should return 1
                if re.search(r'\bbest\s+phone\b(?!s)', query_lower) and 'phones' not in query_lower:
                    requested_limit = 1
                # Check for "top/best X phones" patterns
                match1 = re.search(r'\b(?:top|best)\s+(\d+)\s+phones?\b', query_lower)
                if match1:
                    requested_limit = int(match1.group(1))
                # Check for "show/give me X phones" patterns
                match2 = re.search(r'\b(?:show|give\s+me|find)\s+(\d+)\s+phones?\b', query_lower)
                if match2:
                    requested_limit = int(match2.group(1))
                # Check for single numbers followed by "phones" or similar
                elif number_matches and any(word in query_lower for word in ['phones', 'recommendations', 'options']):
                    # Use the first number found if it seems reasonable (1-20)
                    first_num = int(number_matches[0])
                    if 1 <= first_num <= 20:
                        requested_limit = first_num
                
                # Default to 5 if still not found
                if requested_limit is None:
                    requested_limit = 5
            
            # Ensure limit is reasonable (between 1 and 20)
            limit = max(1, min(requested_limit, 20))
            
            logger.info(f"[{request_id}] Processing recommendation request with limit: {limit}")
            
            # Preprocess filters to match the expected format for get_phones_by_filters
            processed_filters = {}
            
            # Handle nested price filters
            if "price" in filters:
                price_filter = filters["price"]
                if isinstance(price_filter, dict):
                    if "max" in price_filter:
                        processed_filters["max_price"] = price_filter["max"]
                    if "min" in price_filter:
                        processed_filters["min_price"] = price_filter["min"]
                else:
                    # If price is just a number, treat it as max_price
                    processed_filters["max_price"] = price_filter
            
            # Handle nested RAM filters
            if "ram" in filters:
                ram_filter = filters["ram"]
                if isinstance(ram_filter, dict):
                    if "min" in ram_filter:
                        processed_filters["min_ram_gb"] = ram_filter["min"]
                    if "max" in ram_filter:
                        processed_filters["max_ram_gb"] = ram_filter["max"]
                else:
                    processed_filters["min_ram_gb"] = ram_filter
            
            # Handle nested storage filters
            if "storage" in filters:
                storage_filter = filters["storage"]
                if isinstance(storage_filter, dict):
                    if "min" in storage_filter:
                        processed_filters["min_storage_gb"] = storage_filter["min"]
                    if "max" in storage_filter:
                        processed_filters["max_storage_gb"] = storage_filter["max"]
                else:
                    processed_filters["min_storage_gb"] = storage_filter
            
            # Handle nested battery filters
            if "battery" in filters:
                battery_filter = filters["battery"]
                if isinstance(battery_filter, dict):
                    if "min_capacity" in battery_filter:
                        processed_filters["min_battery_capacity"] = battery_filter["min_capacity"]
                    if "max_capacity" in battery_filter:
                        processed_filters["max_battery_capacity"] = battery_filter["max_capacity"]
                else:
                    processed_filters["min_battery_capacity"] = battery_filter
            
            # Handle nested camera filters
            if "camera" in filters:
                camera_filter = filters["camera"]
                if isinstance(camera_filter, dict):
                    if "min_mp" in camera_filter:
                        processed_filters["min_primary_camera_mp"] = camera_filter["min_mp"]
                    if "min_selfie_mp" in camera_filter:
                        processed_filters["min_selfie_camera_mp"] = camera_filter["min_selfie_mp"]
                else:
                    processed_filters["min_primary_camera_mp"] = camera_filter
            
            # Handle nested display filters
            if "display" in filters:
                display_filter = filters["display"]
                if isinstance(display_filter, dict):
                    if "min_size" in display_filter:
                        processed_filters["min_screen_size"] = display_filter["min_size"]
                    if "max_size" in display_filter:
                        processed_filters["max_screen_size"] = display_filter["max_size"]
                    if "min_refresh_rate" in display_filter:
                        processed_filters["min_refresh_rate"] = display_filter["min_refresh_rate"]
                    if "type" in display_filter:
                        processed_filters["display_type"] = display_filter["type"]
            
            # Handle other filters with direct mapping or special processing
            filter_mappings = {
                # Direct mappings
                "brand": "brand",
                "chipset": "chipset",
                "operating_system": "operating_system",
                "network": "network",
                "display_type": "display_type",
                "battery_type": "battery_type",
                "camera_setup": "camera_setup",
                "build": "build",
                "waterproof": "waterproof",
                "ip_rating": "ip_rating",
                "bluetooth": "bluetooth",
                "nfc": "nfc",
                "usb": "usb",
                "fingerprint_sensor": "fingerprint_sensor",
                "face_unlock": "face_unlock",
                "wireless_charging": "wireless_charging",
                "quick_charging": "quick_charging",
                "reverse_charging": "reverse_charging",
                
                # Numeric filters (handled as minimum values)
                "ram_gb": "min_ram_gb",
                "storage_gb": "min_storage_gb",
                "battery_capacity_numeric": "min_battery_capacity",
                "primary_camera_mp": "min_primary_camera_mp",
                "selfie_camera_mp": "min_selfie_camera_mp",
                "screen_size_numeric": "min_screen_size",
                "refresh_rate_numeric": "min_refresh_rate",
                "charging_wattage": "min_charging_wattage",
                
                # Score filters (handled separately)
                "camera_score": "camera_score",
                "performance_score": "performance_score",
                "display_score": "display_score",
                "battery_score": "battery_score",
                "security_score": "security_score",
                "connectivity_score": "connectivity_score",
                "overall_device_score": "overall_device_score",
                
                # Boolean filters
                "has_fast_charging": "has_fast_charging",
                "has_wireless_charging": "has_wireless_charging",
                "is_popular_brand": "is_popular_brand",
                "is_new_release": "is_new_release",
                "is_upcoming": "is_upcoming",
                
                # Special filters
                "price_category": "price_category",
                "age_in_months": "max_age_in_months"
            }
            
            # Apply direct mappings for other filters
            for key, value in filters.items():
                if key not in ["price", "ram", "storage", "battery", "camera", "display"]:  # Skip already processed nested filters
                    if key in filter_mappings:
                        processed_filters[filter_mappings[key]] = value
                    else:
                        # Pass through any unmapped filters
                        processed_filters[key] = value
            
            logger.info(f"[{request_id}] Original filters from Gemini: {filters}")
            logger.info(f"[{request_id}] Processed filters for database query: {processed_filters}")
            
            # Try RAG services first if available, but use processed filters
            phones_data = None
            try:
                logger.info(f"[{request_id}] Attempting RAG service with processed filters")
                phones_data = await knowledge_retrieval_service.find_similar_phones(
                    db=db,
                    filters=processed_filters,  # Use processed filters instead of original filters
                    limit=limit  # Use the extracted limit
                )
                
                if phones_data and len(phones_data) > 0:
                    logger.info(f"[{request_id}] RAG service retrieved {len(phones_data)} phones after filtering")
                    phone_dicts = phones_data
                else:
                    logger.warning(f"[{request_id}] RAG service returned no phones, falling back to direct database query")
                    phones = phone_crud.get_phones_by_filters(db, processed_filters, limit=limit)  # Use the extracted limit
                    phone_dicts = phones
            except Exception as rag_error:
                logger.warning(f"[{request_id}] RAG service failed: {str(rag_error)}. Falling back to direct database query.")
                phones = phone_crud.get_phones_by_filters(db, processed_filters, limit=limit)  # Use the extracted limit
                phone_dicts = phones
            
            # Additional fallback if still no results
            if not phone_dicts or len(phone_dicts) == 0:
                logger.warning(f"[{request_id}] No phones found with processed filters, trying relaxed search")
                # Try with fewer filters
                relaxed_filters = {}
                if 'brand' in processed_filters:
                    relaxed_filters['brand'] = processed_filters['brand']
                if 'max_price' in processed_filters:
                    relaxed_filters['max_price'] = processed_filters['max_price'] * 1.5  # Increase budget by 50%
                
                try:
                    phones = phone_crud.get_phones_by_filters(db, relaxed_filters, limit=limit)  # Use the extracted limit
                    phone_dicts = phones
                    if phone_dicts and len(phone_dicts) > 0:
                        logger.info(f"[{request_id}] Relaxed search found {len(phone_dicts)} phones")
                except Exception as relaxed_error:
                    logger.error(f"[{request_id}] Relaxed search also failed: {str(relaxed_error)}")
                    phone_dicts = []
            
            # Format phones to include all database fields directly (not nested in key_specs)
            formatted_phones = []
            for phone_dict in phone_dicts:
                # Create flattened phone structure with all fields
                formatted_phone = {
                    "id": phone_dict.get("id"),
                    "name": phone_dict.get("name"),
                    "brand": phone_dict.get("brand"),
                    "model": phone_dict.get("model"),
                    "slug": phone_dict.get("slug"),
                    "price": phone_dict.get("price_original") or phone_dict.get("price"),
                    "url": phone_dict.get("url"),
                    "img_url": phone_dict.get("img_url"),
                    
                    # Display fields
                    "display_type": phone_dict.get("display_type"),
                    "screen_size_inches": phone_dict.get("screen_size_inches"),
                    "display_resolution": phone_dict.get("display_resolution"),
                    "pixel_density_ppi": phone_dict.get("pixel_density_ppi"),
                    "refresh_rate_hz": phone_dict.get("refresh_rate_hz"),
                    "screen_protection": phone_dict.get("screen_protection"),
                    "display_brightness": phone_dict.get("display_brightness"),
                    "aspect_ratio": phone_dict.get("aspect_ratio"),
                    "hdr_support": phone_dict.get("hdr_support"),
                    
                    # Performance fields
                    "chipset": phone_dict.get("chipset"),
                    "cpu": phone_dict.get("cpu"),
                    "gpu": phone_dict.get("gpu"),
                    "ram": phone_dict.get("ram"),
                    "ram_type": phone_dict.get("ram_type"),
                    "internal_storage": phone_dict.get("internal_storage"),
                    "storage_type": phone_dict.get("storage_type"),
                    
                    # Camera fields
                    "camera_setup": phone_dict.get("camera_setup"),
                    "primary_camera_resolution": phone_dict.get("primary_camera_resolution"),
                    "selfie_camera_resolution": phone_dict.get("selfie_camera_resolution"),
                    "main_camera": phone_dict.get("main_camera"),
                    "front_camera": phone_dict.get("front_camera"),
                    "camera_features": phone_dict.get("camera_features"),
                    
                    # Battery fields
                    "battery_type": phone_dict.get("battery_type"),
                    "capacity": phone_dict.get("capacity"),
                    "quick_charging": phone_dict.get("quick_charging"),
                    "wireless_charging": phone_dict.get("wireless_charging"),
                    "reverse_charging": phone_dict.get("reverse_charging"),
                    
                    # Design fields
                    "build": phone_dict.get("build"),
                    "weight": phone_dict.get("weight"),
                    "thickness": phone_dict.get("thickness"),
                    "colors": phone_dict.get("colors"),
                    "waterproof": phone_dict.get("waterproof"),
                    "ip_rating": phone_dict.get("ip_rating"),
                    
                    # Connectivity fields
                    "network": phone_dict.get("network"),
                    "bluetooth": phone_dict.get("bluetooth"),
                    "wlan": phone_dict.get("wlan"),
                    "gps": phone_dict.get("gps"),
                    "nfc": phone_dict.get("nfc"),
                    "usb": phone_dict.get("usb"),
                    "fingerprint_sensor": phone_dict.get("fingerprint_sensor"),
                    "face_unlock": phone_dict.get("face_unlock"),
                    
                    # Operating system
                    "operating_system": phone_dict.get("operating_system"),
                    "os_version": phone_dict.get("os_version"),
                    "release_date": phone_dict.get("release_date"),
                    
                    # Derived/numeric fields
                    "storage_gb": phone_dict.get("storage_gb"),
                    "ram_gb": phone_dict.get("ram_gb"),
                    "screen_size_numeric": phone_dict.get("screen_size_numeric"),
                    "primary_camera_mp": phone_dict.get("primary_camera_mp"),
                    "selfie_camera_mp": phone_dict.get("selfie_camera_mp"),
                    "battery_capacity_numeric": phone_dict.get("battery_capacity_numeric"),
                    "has_fast_charging": phone_dict.get("has_fast_charging"),
                    "has_wireless_charging": phone_dict.get("has_wireless_charging"),
                    "charging_wattage": phone_dict.get("charging_wattage"),
                    "refresh_rate_numeric": phone_dict.get("refresh_rate_numeric"),
                    "ppi_numeric": phone_dict.get("ppi_numeric"),
                    
                    # Scores (database stores 0-100, convert to display format for consistency)
                    "overall_device_score": phone_dict.get("overall_device_score"),
                    "performance_score": phone_dict.get("performance_score"),
                    "display_score": phone_dict.get("display_score"),
                    "camera_score": phone_dict.get("camera_score"),
                    "battery_score": phone_dict.get("battery_score"),
                    "security_score": phone_dict.get("security_score"),
                    "connectivity_score": phone_dict.get("connectivity_score"),
                    
                    # Additional metadata and features
                    "is_popular_brand": phone_dict.get("is_popular_brand"),
                    "is_new_release": phone_dict.get("is_new_release"),
                    "is_upcoming": phone_dict.get("is_upcoming"),
                    "age_in_months": phone_dict.get("age_in_months"),
                    "price_category": phone_dict.get("price_category"),
                    
                    # Key specifications (formatted for display)
                    "key_specs": {
                        "display": f"{phone_dict.get('screen_size_inches', 'N/A')} {phone_dict.get('display_type', '')}".strip(),
                        "processor": phone_dict.get("chipset", "N/A"),
                        "memory": phone_dict.get("ram", "N/A"),
                        "storage": phone_dict.get("internal_storage", "N/A"),
                        "camera": phone_dict.get("primary_camera_resolution", "N/A"),
                        "battery": phone_dict.get("capacity", "N/A"),
                        "os": phone_dict.get("operating_system", "N/A")
                    },
                    
                    # Additional metadata if available
                    "relevance_score": phone_dict.get('relevance_score', 0.9),
                    "match_reasons": phone_dict.get('match_reasons', [])
                }
                
                formatted_phones.append(formatted_phone)
            
            # Use the same response formatter as the natural language endpoint
            try:
                formatted_response = await response_formatter_service.format_recommendations(
                    phones=formatted_phones,
                    reasoning=gemini_response.get("reasoning", ""),
                    filters=filters,
                    original_query="chat query"
                )
                
                return {
                    "type": "recommendations",
                    "phones": formatted_phones,
                    "reasoning": gemini_response.get("reasoning", ""),
                    "filters_applied": filters,
                    "total_found": len(formatted_phones),
                    "formatted_response": formatted_response  # Include formatted response for consistency
                }
            except Exception as format_error:
                logger.warning(f"[{request_id}] Response formatting failed: {str(format_error)}. Using basic structure.")
                return {
                    "type": "recommendations",
                    "phones": formatted_phones,
                    "reasoning": gemini_response.get("reasoning", ""),
                    "filters_applied": filters,
                    "total_found": len(formatted_phones)
                }
            
        elif response_type == "comparison":
            # Get comparison data for specified phones with enhanced error handling
            phone_names = gemini_response.get("data", [])
            try:
                logger.info(f"[{request_id}] Attempting comparison for phones: {phone_names}")
                comparison_data = await knowledge_retrieval_service.get_comparison_data(db, phone_names)
                
                if comparison_data:
                    # Format comparison
                    formatted_response = await response_formatter_service.format_comparison(
                        comparison_data=comparison_data,
                        reasoning=gemini_response.get("reasoning", ""),
                        original_query="chat query"
                    )
                    return {
                        "type": "comparison",
                        "comparison_data": formatted_response,
                        "reasoning": gemini_response.get("reasoning", "")
                    }
                else:
                    logger.warning(f"[{request_id}] No comparison data found for phones: {phone_names}")
                    # Fallback to basic phone lookup
                    phones = phone_crud.get_phones_by_filters(db, {}, limit=10)  # Use 10 for comparison choices
                    available_phones = [p.get('name', '') for p in phones if p.get('name')]
                    return {
                        "type": "text",
                        "text": f"I couldn't find comparison data for the requested phones. Here are some available phones you can compare: {', '.join(available_phones[:5])}",
                        "reasoning": gemini_response.get("reasoning", "")
                    }
            except Exception as e:
                logger.warning(f"[{request_id}] RAG comparison failed: {str(e)}. Using fallback response.")
                # Fallback to basic comparison guidance
                return {
                    "type": "text",
                    "text": "I can help you compare phones, but I'm having trouble accessing the comparison data right now. Please specify the exact phone models you'd like to compare, or ask for recommendations instead.",
                    "reasoning": gemini_response.get("reasoning", ""),
                    "suggestions": ["Ask for phone recommendations", "Specify exact phone model names", "Try asking about specific features"]
                }
            
        elif response_type == "drill_down":
            # Get detailed specifications for a specific phone with enhanced error handling
            phone_names = gemini_response.get("data", [])
            if phone_names:
                try:
                    logger.info(f"[{request_id}] Attempting drill down for phone: {phone_names[0]}")
                    phone_specs = await knowledge_retrieval_service.retrieve_phone_specs(db, phone_names[0])
                    
                    if phone_specs:
                        formatted_response = await response_formatter_service.format_specifications(
                            phone_specs=phone_specs,
                            reasoning=gemini_response.get("reasoning", ""),
                            original_query="chat query"
                        )
                        return {
                            "type": "specs",
                            "phone_specs": formatted_response,
                            "reasoning": gemini_response.get("reasoning", "")
                        }
                    else:
                        logger.warning(f"[{request_id}] No specs found for phone: {phone_names[0]}")
                        # Try direct database lookup as fallback
                        phones = phone_crud.get_phones_by_filters(db, {'name': phone_names[0]}, limit=1)
                        if phones and len(phones) > 0:
                            phone = phones[0]
                            return {
                                "type": "specs",
                                "phone_specs": {
                                    "phone": phone,
                                    "specifications": {
                                        "display": phone.get('display_type', 'N/A'),
                                        "processor": phone.get('chipset', 'N/A'),
                                        "memory": phone.get('ram', 'N/A'),
                                        "storage": phone.get('internal_storage', 'N/A'),
                                        "camera": phone.get('primary_camera_resolution', 'N/A'),
                                        "battery": phone.get('capacity', 'N/A'),
                                        "os": phone.get('operating_system', 'N/A')
                                    }
                                },
                                "reasoning": f"Here are the basic specifications for {phone_names[0]}"
                            }
                        else:
                            return {
                                "type": "text",
                                "text": f"I couldn't find detailed information about {phone_names[0]}. Please check the spelling or try asking about a different phone model.",
                                "reasoning": gemini_response.get("reasoning", "")
                            }
                except Exception as e:
                    logger.warning(f"[{request_id}] RAG drill down failed: {str(e)}. Using basic response.")
                    return {
                        "type": "text",
                        "text": f"I'm having trouble getting detailed specifications for {phone_names[0]} right now. Please try asking for general information or phone recommendations instead.",
                        "reasoning": gemini_response.get("reasoning", ""),
                        "suggestions": ["Ask for phone recommendations", "Try a different phone model", "Ask about specific features"]
                    }
            else:
                return {
                    "type": "text",
                    "text": "Please specify which phone you'd like to know more about. I can provide detailed specifications for most smartphone models.",
                    "reasoning": gemini_response.get("reasoning", ""),
                    "suggestions": ["Name a specific phone model", "Ask for phone recommendations first"]
                }
            
        elif response_type == "qa":
            # Handle Q&A with potential database lookup and enhanced error handling
            query_data = gemini_response.get("data", "")
            try:
                logger.info(f"[{request_id}] Attempting QA enhancement with knowledge retrieval")
                # Try to enhance with relevant phone data if applicable
                enhanced_data = await knowledge_retrieval_service.search_by_features(
                    db, 
                    query_data, 
                    limit=3
                )
                
                if enhanced_data and len(enhanced_data) > 0:
                    logger.info(f"[{request_id}] Found {len(enhanced_data)} related phones for QA")
                    
                    formatted_response = await response_formatter_service.format_conversational(
                        text=query_data,
                        related_phones=enhanced_data,
                        reasoning=gemini_response.get("reasoning", ""),
                        original_query="chat query"
                    )
                    
                    return {
                        "type": "text",
                        "text": formatted_response.get("content", {}).get("text", query_data),
                        "related_phones": enhanced_data,
                        "reasoning": gemini_response.get("reasoning", "")
                    }
                else:
                    logger.info(f"[{request_id}] No related phones found, providing direct answer")
                    # No related phones, just format the response
                    formatted_response = await response_formatter_service.format_conversational(
                        text=query_data,
                        related_phones=None,
                        reasoning=gemini_response.get("reasoning", ""),
                        original_query="chat query"
                    )
                    
                    return {
                        "type": "text",
                        "text": formatted_response.get("content", {}).get("text", query_data),
                        "reasoning": gemini_response.get("reasoning", "")
                    }
                    
            except Exception as e:
                logger.warning(f"[{request_id}] RAG QA failed: {str(e)}. Using basic response.")
                # Fallback to basic response
                return {
                    "type": "text",
                    "text": query_data or gemini_response.get("reasoning", "I'm here to help with smartphone questions! Feel free to ask about phone features, specifications, or recommendations."),
                    "reasoning": gemini_response.get("reasoning", ""),
                    "suggestions": ["Ask about specific phone features", "Request phone recommendations", "Compare phone models"]
                }
        
        # Default: return as conversational response with enhanced error handling
        try:
            logger.info(f"[{request_id}] Processing default conversational response")
            formatted_response = await response_formatter_service.format_conversational(
                text=gemini_response.get("data", gemini_response.get("reasoning", "")),
                related_phones=None,
                reasoning=gemini_response.get("reasoning", ""),
                original_query="chat query"
            )
            
            return {
                "type": "text",
                "text": formatted_response.get("content", {}).get("text", gemini_response.get("data", gemini_response.get("reasoning", ""))),
                "reasoning": gemini_response.get("reasoning", "")
            }
        except Exception as e:
            logger.warning(f"[{request_id}] RAG formatting failed: {str(e)}. Using basic response.")
            return {
                "type": "text",
                "text": gemini_response.get("data", gemini_response.get("reasoning", "I'm here to help with smartphone questions! Feel free to ask about phone features, specifications, or recommendations.")),
                "reasoning": gemini_response.get("reasoning", ""),
                "suggestions": ["Ask for phone recommendations", "Compare phone models", "Ask about specific features"]
            }
        
    except Exception as e:
        logger.error(f"[{request_id}] Error enhancing with knowledge: {str(e)}")
        
        # Try a simple fallback - basic phone query without AI processing
        try:
            from app.crud import phone as phone_crud
            import re
            
            logger.info(f"[{request_id}] Attempting basic phone recommendation fallback")
            
            # Extract basic filters from simple query patterns
            query_lower = gemini_response.get("original_query", "").lower()
            fallback_filters = {}
            
            # Simple price extraction
            price_matches = re.findall(r'(\d+)k?', query_lower)
            if price_matches:
                max_price = int(price_matches[0])
                if 'k' in query_lower or max_price < 200:  # Assume it's in thousands
                    max_price *= 1000
                fallback_filters['max_price'] = max_price
            
            # Simple brand extraction
            brands = ['apple', 'samsung', 'xiaomi', 'oneplus', 'google', 'realme', 'oppo', 'vivo']
            for brand in brands:
                if brand in query_lower:
                    fallback_filters['brand'] = brand.title()
                    break
            
            # Get basic recommendations
            phones = phone_crud.get_phones_by_filters(db, fallback_filters, limit=5)
            
            formatted_phones = []
            for phone_dict in phones:
                formatted_phones.append({
                    "id": phone_dict.get("id"),
                    "name": phone_dict.get("name"),
                    "brand": phone_dict.get("brand"),
                    "price": phone_dict.get("price_original") or phone_dict.get("price"),
                    "img_url": phone_dict.get("img_url"),
                    # Add minimal specs for fallback
                    "key_specs": {
                        "display": f"{phone_dict.get('screen_size_inches', 'N/A')} {phone_dict.get('display_type', '')}".strip(),
                        "processor": phone_dict.get("chipset", "N/A"),
                         "camera": phone_dict.get("primary_camera_resolution", "N/A"),
                        "battery": phone_dict.get("capacity", "N/A")
                    }
                })
                
            return {
                "type": "recommendations",
                "phones": formatted_phones,
                "reasoning": "I encountered an issue processing your specific request, but based on your query, here are some popular phones that might interest you.",
                "filters_applied": fallback_filters,
                "total_found": len(formatted_phones)
            }
            
        except Exception as fallback_error:
            logger.error(f"[{request_id}] Fallback failed: {str(fallback_error)}")
            # Ultimate safety net
            return {
                "type": "text",
                "text": "I apologize, but I'm currently unable to access my phone database. Please try again in a few moments.",
                "reasoning": "System error",
                "suggestions": ["Try again later", "Check your connection"]
            }

# -------------------------------------------------------------------------
# Chat History Management Endpoints
# -------------------------------------------------------------------------

@router.get("/history", response_model=chat_history_schemas.ChatHistoryList)
def get_chat_history(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Get all chat sessions for the current logged-in user.
    """
    sessions = chat_history_crud.get_user_sessions(db, current_user.id, limit=limit, offset=offset)
    # Convert to Pydantic models (handled by response_model, but good to check)
    return {
        "sessions": sessions,
        "total_count": len(sessions) # Basic count for now
    }

@router.get("/history/{session_id}", response_model=chat_history_schemas.ChatSession)
def get_chat_session_details(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Get detailed messages for a specific chat session.
    """
    try:
        uuid_id = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    session = chat_history_crud.get_session(db, uuid_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Eager load messages via relationships or separate query? 
    # Relationship is defined, so standard Pydantic serialization works if session.messages is populated.
    # However, for efficiency/pagination we might want to query messages separately in future.
    # For now, let's trust the relationship default (lazy=True usually) but accessing it loads.
    
    return session

@router.delete("/history/{session_id}")
def delete_chat_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Delete a chat session.
    """
    try:
        uuid_id = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID format")
        
    success = chat_history_crud.delete_session(db, uuid_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    return {"status": "success", "message": "Session deleted"}




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
        # Handle raw responses that might not be properly formatted
        if not isinstance(enhanced_response, dict):
            # Convert raw string or other types to chat response
            return {
                "response_type": "text",
                "content": {
                    "text": str(enhanced_response) if enhanced_response else "I'm here to help you find the perfect phone. What would you like to know?",
                    "error": False
                },
                "suggestions": [
                    "Recommend phones for my budget",
                    "Compare popular phones", 
                    "Show me the latest phone releases"
                ]
            }
        
        response_type = enhanced_response.get("type", "text")
        
        # Handle responses with 'response' field (raw JSON responses)
        if "response" in enhanced_response and not response_type:
            return {
                "response_type": "text",
                "content": {
                    "text": enhanced_response["response"],
                    "error": False
                },
                "suggestions": [
                    "Recommend phones for my budget",
                    "Compare popular phones",
                    "Show me the latest phone releases"
                ]
            }
        
        # Handle chat responses with 'data' field
        if response_type in ["chat", "text"] and "data" in enhanced_response:
            return {
                "response_type": "text",
                "content": {
                    "text": enhanced_response["data"],
                    "error": False
                },
                "suggestions": [
                    "Recommend phones for my budget",
                    "Compare popular phones",
                    "Show me the latest phone releases"
                ]
            }
        
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
            text_content = (
                enhanced_response.get("text") or 
                enhanced_response.get("data") or 
                enhanced_response.get("content") or
                enhanced_response.get("response") or
                str(enhanced_response)
            )
            
            return await response_formatter_service.format_conversational(
                text=text_content,
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
        
        # Get error handling metrics
        error_metrics = error_service.get_metrics()
        
        return {
            "status": "healthy",
            "services": {
                "gemini_rag": gemini_status,
                "knowledge_retrieval": "available",
                "response_formatter": "available"
            },
            "performance_metrics": error_metrics,
            "timestamp": time.time()
        }
    except Exception as e:
        logger.error(f"Chat health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": time.time()
        }

@router.get("/metrics")
async def get_chat_metrics():
    """Get detailed chat system metrics."""
    try:
        metrics = error_service.get_metrics()
        recent_errors = error_service.get_recent_errors(limit=5)
        
        return {
            "metrics": metrics,
            "recent_errors": recent_errors,
            "timestamp": time.time()
        }
    except Exception as e:
        logger.error(f"Failed to get chat metrics: {str(e)}")
        return {
            "error": str(e),
            "timestamp": time.time()
        }

@router.get("/errors/{request_id}")
async def get_error_details(request_id: str):
    """Get detailed error information for a specific request."""
    try:
        error_details = error_service.get_error_details(request_id)
        
        if error_details:
            return error_details
        else:
            raise HTTPException(status_code=404, detail="Error details not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get error details for {request_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve error details")