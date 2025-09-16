from typing import List, Union, Dict, Any, Optional
from typing import List, Union, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
import httpx
import os
import re
import numpy as np
import json
import uuid
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.crud import phone as phone_crud
from app.schemas.phone import Phone
from app.core.database import get_db
from app.core.config import settings
from app.services.contextual_query_processor import ContextualQueryProcessor
from app.services.phone_name_resolver import PhoneNameResolver
from app.services.context_manager import ContextManager
from app.services.error_handler import (
    handle_contextual_error, create_error_response, PhoneResolutionError,
    ExternalServiceError, ValidationError
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services
contextual_processor = ContextualQueryProcessor()
phone_name_resolver = PhoneNameResolver()
context_manager = ContextManager()

# Gemini AI service configuration
GEMINI_AI_SERVICE_URL = settings.GEMINI_SERVICE_URL_SECURE

async def call_gemini_ai_service(query: str) -> dict:
    """
    Direct call to the Gemini AI service
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{GEMINI_AI_SERVICE_URL}/parse-query",
                json={"query": query},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Gemini AI response: {result}")
                return result
            else:
                logger.error(f"Gemini AI service error: {response.status_code} - {response.text}")
                raise Exception(f"AI service returned status {response.status_code}")
                
    except httpx.TimeoutException:
        logger.error("Gemini AI service timeout")
        raise Exception("AI service timeout")
    except Exception as e:
        logger.error(f"Error calling Gemini AI service: {str(e)}")
        raise Exception(f"AI service error: {str(e)}")

# Pydantic models for request/response
class ContextualQueryRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    context: Optional[str] = None

class ExplicitContextualQueryRequest(BaseModel):
    query: str
    referenced_phones: Optional[List[str]] = None
    context_type: Optional[str] = None
    session_id: Optional[str] = None

class PhoneResolutionRequest(BaseModel):
    phone_names: List[str]

class IntelligentQueryRequest(BaseModel):
    """Enhanced request model for intelligent query processing"""
    query: str
    conversation_history: Optional[List[Dict[str, str]]] = None
    session_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class IntelligentQueryResponse(BaseModel):
    """Enhanced response model for intelligent query processing"""
    response_type: str
    content: Dict[str, Any]
    formatting_hints: Optional[Dict[str, Any]] = None
    context_updates: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

# This endpoint was moved to the main health check endpoint
# @router.get("/health")
# async def health_check():
#     """Health check endpoint"""
#     return {"status": "healthy", "message": "Natural language processing is available"}

@router.get("/test")
async def test_endpoint():
    """Test endpoint to check basic functionality"""
    return {"message": "Natural language endpoint is working"}



def extract_phone_names_from_query(query: str) -> List[str]:
    """Extract phone names from a query using regex patterns and a large brand dictionary"""

    # Full expanded brand list
    brands = [
        "5star","Acer","Alcatel","Allview","Apple","Asus","Benco","Bengal","BlackBerry",
        "Blackview","Cat","Celkon","Coolpad","Cubot","Doogee","DOOGEE","Energizer","FreeYond",
        "Geo","Gionee","Google","Hallo","Helio","HMD","Honor","HTC","Huawei","Infinix",
        "iPhone","iQOO","Itel","Kingstar","Lava","LAVA","Leica","Leitz","Lenovo","LG",
        "maximus","Maximus","Maxis","Meizu","Micromax","Microsoft","Motorola","Mycell","Nio",
        "Nokia","Nothing","Okapia","Oneplus","OnePlus","OnePlus 2","Oppo","Oscal","Oukitel",
        "Panasonic","Philips","Proton","PROTON","Realme","Samsung","Sharp","Sonim","Sony",
        "Symphony","TCL","Tecno","TECNO","Thuraya","Ulefone","Umidigi","UMIDIGI","vivo","Vivo",
        "Walton","We","WE","WE X2","Wiko","Xiaomi","ZTE"
    ]

    query_clean = query.strip()
    phone_names = []

    # Build regex for all brands
    brand_pattern = "|".join([re.escape(b) for b in brands])

    # Regex to capture "Brand + Model" (multi-word, allows +, -, numbers, Pro, Max, Ultra, 5G etc.)
    phone_pattern = re.compile(
        rf"\b({brand_pattern})\s+([A-Za-z0-9]+(?:[\s\-+]*[A-Za-z0-9]+)*)",
        re.IGNORECASE
    )

    # Find brand + model matches
    for match in phone_pattern.finditer(query_clean):
        brand, model = match.group(1).strip(), match.group(2).strip()
        phone_names.append(f"{brand} {model}")

    # Fallback: specific "Pixel" or "iPhone" style names without explicit brand
    fallback_pattern = re.compile(r"\b(Pixel\s+\d+(?:\s+\w+)*|iPhone\s+\d+(?:\s+\w+)*)\b", re.IGNORECASE)
    for match in fallback_pattern.finditer(query_clean):
        phone_names.append(match.group(1).strip())

    # Deduplicate while preserving order
    seen = set()
    phone_names = [x for x in phone_names if not (x.lower() in seen or seen.add(x.lower()))]

    return phone_names

def extract_feature_from_query(query: str) -> str:
    """Extract feature name from query"""
    features = {
        # Display features
        "refresh rate": "refresh_rate_numeric",
        "refresh_rate": "refresh_rate_numeric",
        "screen size": "screen_size_numeric",
        "display size": "screen_size_numeric",
        "ppi": "ppi_numeric",
        "pixel density": "ppi_numeric",
        
        # Battery features
        "battery": "battery_capacity_numeric",
        "battery capacity": "battery_capacity_numeric",
        "fast charging": "has_fast_charging",
        "wireless charging": "has_wireless_charging",
        "charging": "quick_charging",
        "battery type": "battery_type",
        
        # Camera features
        "camera": "primary_camera_mp",
        "primary camera": "primary_camera_mp",
        "selfie camera": "selfie_camera_mp",
        "front camera": "selfie_camera_mp",
        "camera count": "camera_count",
        "camera score": "camera_score",
        
        # Performance features
        "ram": "ram_gb",
        "storage": "storage_gb",
        "chipset": "chipset",
        "processor": "chipset",
        "cpu": "cpu",
        "gpu": "gpu",
        "performance score": "performance_score",
        
        # Price features
        "price": "price_original",
        "price category": "price_category",
        "budget": "price_original",
        
        # Display features
        "display type": "display_type",
        "screen protection": "screen_protection",
        "display score": "display_score",
        
        # Camera setup
        "camera setup": "camera_setup",
        
        # Security features
        "fingerprint": "fingerprint_sensor",
        "face unlock": "face_unlock",
        "security score": "security_score",
        
        # Software features
        "operating system": "operating_system",
        "os": "operating_system",
        
        # Design features
        "weight": "weight",
        "thickness": "thickness",
        "colors": "colors",
        "waterproof": "waterproof",
        "ip rating": "ip_rating",
        
        # Connectivity features
        "bluetooth": "bluetooth",
        "nfc": "nfc",
        "usb": "usb",
        "sim": "sim_slot",
        "connectivity score": "connectivity_score",
        "5g": "network",
        "4g": "network",
        
        # Overall scores
        "overall score": "overall_device_score",
        "device score": "overall_device_score"
    }
    
    query_lower = query.lower()
    for feature_name, db_column in features.items():
        if feature_name in query_lower:
            return db_column
    
    return None

def generate_qa_response(db: Session, query: str) -> str:
    """Generate a response for QA queries"""
    print(f"🔍 Processing QA query: {query}")
    
    phone_names = extract_phone_names_from_query(query)
    feature = extract_feature_from_query(query)
    
    print(f"📱 Extracted phone names: {phone_names}")
    print(f"🔧 Extracted feature: {feature}")
    
    if not phone_names:
        return "I couldn't identify a specific phone in your query. Could you please mention the phone name?"
    
    if not feature:
        return "I couldn't identify a specific feature in your query. Could you please specify what feature you're asking about?"
    
    phone_name = phone_names[0]
    phone = phone_crud.get_phone_by_name_or_model(db, phone_name)
    
    print(f"🔍 Looking for phone: {phone_name}")
    print(f"📱 Found phone: {phone is not None}")
    
    if not phone:
        return f"Sorry, I couldn't find information about {phone_name} in our database."
    
    # Convert to dict if it's a SQLAlchemy object
    if hasattr(phone, '__table__'):  # SQLAlchemy object
        phone_dict = phone_crud.phone_to_dict(phone)
        feature_value = phone_dict.get(feature)
    else:
        feature_value = getattr(phone, feature, None)
    
    print(f"🔧 Feature value for {feature}: {feature_value}")
    
    if feature_value is None:
        return f"Sorry, I don't have information about the {feature} for {phone_name}."

    # Format the response based on the feature
    feature_display_names = {
        "refresh_rate_numeric": "refresh rate",
        "screen_size_numeric": "screen size",
        "ppi_numeric": "pixel density",
        "battery_capacity_numeric": "battery capacity",
        "primary_camera_mp": "primary camera",
        "selfie_camera_mp": "selfie camera",
        "camera_count": "camera count",
        "camera_score": "camera score",
        "ram_gb": "RAM",
        "storage_gb": "storage",
        "price_original": "price",
        "price_category": "price category",
        "weight": "weight",
        "thickness": "thickness",
        "display_score": "display score",
        "battery_score": "battery score",
        "performance_score": "performance score",
        "security_score": "security score",
        "connectivity_score": "connectivity score",
        "overall_device_score": "overall device score"
    }
    
    display_name = feature_display_names.get(feature, feature)
    
    if feature == "refresh_rate_numeric":
        response = f"The {phone_name} has a {feature_value}Hz refresh rate."
    elif feature == "screen_size_numeric":
        response = f"The {phone_name} has a {feature_value}-inch screen."
    elif feature == "ppi_numeric":
        response = f"The {phone_name} has a {feature_value} PPI display."
    elif feature == "battery_capacity_numeric":
        response = f"The {phone_name} has a {feature_value}mAh battery."
    elif feature in ["primary_camera_mp", "selfie_camera_mp"]:
        response = f"The {phone_name} has a {feature_value}MP {display_name}."
    elif feature == "camera_count":
        response = f"The {phone_name} has {feature_value} cameras."
    elif feature == "camera_score":
        response = f"The {phone_name} has a camera score of {feature_value/10:.1f}/10."
    elif feature in ["ram_gb", "storage_gb"]:
        response = f"The {phone_name} has {feature_value}GB {display_name}."
    elif feature == "price_original":
        response = f"The {phone_name} costs ৳{feature_value:,.0f}."
    elif feature == "price_category":
        response = f"The {phone_name} is in the {feature_value} price category."
    elif feature in ["display_score", "battery_score", "performance_score", "security_score", "connectivity_score", "overall_device_score"]:
        response = f"The {phone_name} has a {display_name} of {feature_value/10:.1f}/10."
    elif feature in ["has_fast_charging", "has_wireless_charging"]:
        response = f"The {phone_name} {'supports' if feature_value else 'does not support'} {display_name}."
    else:
        response = f"The {phone_name} has {feature_value} for {display_name}."
    
    print(f"✅ QA Response: {response}")
    return response

def generate_comparison_summary(phones: List[Dict], features: List[Dict]) -> str:
    """Generate a summary of the comparison highlighting key differences"""
    if not phones or not features:
        return "Comparison completed."
    
    summary_parts = []
    
    # Find the phone with highest price
    price_feature = next((f for f in features if f["key"] == "price_original"), None)
    if price_feature:
        max_price_idx = price_feature["raw"].index(max(price_feature["raw"]))
        min_price_idx = price_feature["raw"].index(min(price_feature["raw"]))
        summary_parts.append(f"{phones[max_price_idx]['name']} is the most expensive, while {phones[min_price_idx]['name']} is the most affordable.")
    
    # Find the phone with highest RAM
    ram_feature = next((f for f in features if f["key"] == "ram_gb"), None)
    if ram_feature:
        max_ram_idx = ram_feature["raw"].index(max(ram_feature["raw"]))
        summary_parts.append(f"{phones[max_ram_idx]['name']} has the highest RAM capacity.")
    
    # Find the phone with highest camera
    camera_feature = next((f for f in features if f["key"] == "primary_camera_mp"), None)
    if camera_feature:
        max_camera_idx = camera_feature["raw"].index(max(camera_feature["raw"]))
        summary_parts.append(f"{phones[max_camera_idx]['name']} has the highest main camera resolution.")
    
    # Find the phone with highest battery
    battery_feature = next((f for f in features if f["key"] == "battery_capacity_numeric"), None)
    if battery_feature:
        max_battery_idx = battery_feature["raw"].index(max(battery_feature["raw"]))
        summary_parts.append(f"{phones[max_battery_idx]['name']} has the largest battery capacity.")
    
    # Find the phone with highest display score
    display_feature = next((f for f in features if f["key"] == "display_score"), None)
    if display_feature:
        max_display_idx = display_feature["raw"].index(max(display_feature["raw"]))
        summary_parts.append(f"{phones[max_display_idx]['name']} has the best display quality.")
    
    if summary_parts:
        return " ".join(summary_parts)
    else:
        return "Comparison completed."

def generate_contextual_comparison_summary(phones: List[Dict], features: List[Dict], focus_area: str = None) -> str:
    """Generate a contextual summary based on the focus area of the comparison"""
    if not phones or not features:
        return "Comparison completed."
    
    summary_parts = []
    
    if focus_area == "camera":
        # Focus on camera-related comparisons
        camera_score_feature = next((f for f in features if f["key"] == "camera_score"), None)
        camera_mp_feature = next((f for f in features if f["key"] == "primary_camera_mp"), None)
        
        if camera_score_feature:
            max_idx = camera_score_feature["raw"].index(max(camera_score_feature["raw"]))
            summary_parts.append(f"For camera quality, {phones[max_idx]['name']} leads with the highest camera score.")
        
        if camera_mp_feature:
            max_idx = camera_mp_feature["raw"].index(max(camera_mp_feature["raw"]))
            summary_parts.append(f"{phones[max_idx]['name']} has the highest megapixel count.")
    
    elif focus_area == "battery":
        # Focus on battery-related comparisons
        battery_feature = next((f for f in features if f["key"] == "battery_capacity_numeric"), None)
        battery_score_feature = next((f for f in features if f["key"] == "battery_score"), None)
        
        if battery_feature:
            max_idx = battery_feature["raw"].index(max(battery_feature["raw"]))
            summary_parts.append(f"{phones[max_idx]['name']} offers the largest battery capacity for longer usage.")
        
        if battery_score_feature:
            max_idx = battery_score_feature["raw"].index(max(battery_score_feature["raw"]))
            summary_parts.append(f"{phones[max_idx]['name']} has the best overall battery performance.")
    
    elif focus_area == "performance":
        # Focus on performance-related comparisons
        perf_feature = next((f for f in features if f["key"] == "performance_score"), None)
        ram_feature = next((f for f in features if f["key"] == "ram_gb"), None)
        
        if perf_feature:
            max_idx = perf_feature["raw"].index(max(perf_feature["raw"]))
            summary_parts.append(f"{phones[max_idx]['name']} delivers the best performance for demanding tasks.")
        
        if ram_feature:
            max_idx = ram_feature["raw"].index(max(ram_feature["raw"]))
            summary_parts.append(f"{phones[max_idx]['name']} provides the most RAM for multitasking.")
    
    elif focus_area == "display":
        # Focus on display-related comparisons
        display_feature = next((f for f in features if f["key"] == "display_score"), None)
        refresh_feature = next((f for f in features if f["key"] == "refresh_rate_numeric"), None)
        
        if display_feature:
            max_idx = display_feature["raw"].index(max(display_feature["raw"]))
            summary_parts.append(f"{phones[max_idx]['name']} offers the best display quality and visual experience.")
        
        if refresh_feature:
            max_idx = refresh_feature["raw"].index(max(refresh_feature["raw"]))
            summary_parts.append(f"{phones[max_idx]['name']} has the smoothest display with the highest refresh rate.")
    
    elif focus_area == "price":
        # Focus on price-related comparisons
        price_feature = next((f for f in features if f["key"] == "price_original"), None)
        if price_feature:
            max_idx = price_feature["raw"].index(max(price_feature["raw"]))
            min_idx = price_feature["raw"].index(min(price_feature["raw"]))
            summary_parts.append(f"{phones[min_idx]['name']} offers the best value at the lowest price, while {phones[max_idx]['name']} is the premium option.")
    
    else:
        # Default comprehensive summary
        return generate_comparison_summary(phones, features)
    
    if summary_parts:
        return " ".join(summary_parts)
    else:
        return generate_comparison_summary(phones, features)

def generate_comparison_response(db: Session, query: str, phone_names: list = None) -> Dict[str, Any]:
    """Generate a structured response for comparison queries (2-5 phones, normalized features for charting)"""
    # Use provided phone_names or extract from query
    if phone_names is None:
        # Extract phone names (split by vs, comma, and, etc.)
        query_clean = query.lower().replace(' vs ', ',').replace(' and ', ',').replace(' & ', ',')
        phone_names = [n.strip() for n in re.split(r',|/|\\|\|', query_clean) if n.strip()]
        phone_names = [n for n in phone_names if n and not n.isdigit()]
        phone_names = phone_names[:5]
    else:
        phone_names = [str(n).strip() for n in phone_names if n and not str(n).isdigit()][:5]
    
    # Fuzzy match phones
    phones = phone_crud.get_phones_by_fuzzy_names(db, phone_names, limit=5)
    if len(phones) < 2:
        return {"error": f"I couldn't find information about two or more phones: {', '.join(phone_names)}"}

    # Determine focus area from query for contextual comparisons
    focus_area = None
    query_lower = query.lower()
    if "camera" in query_lower:
        focus_area = "camera"
    elif "battery" in query_lower:
        focus_area = "battery"
    elif "performance" in query_lower or "speed" in query_lower:
        focus_area = "performance"
    elif "display" in query_lower or "screen" in query_lower:
        focus_area = "display"
    elif "price" in query_lower or "cost" in query_lower:
        focus_area = "price"

    # Key features for comparison - prioritize based on focus area
    if focus_area == "camera":
        features = [
            ("primary_camera_mp", "Main Camera"),
            ("selfie_camera_mp", "Front Camera"),
            ("camera_score", "Camera Score"),
            ("price_original", "Price"),
            ("overall_device_score", "Overall Score")
        ]
    elif focus_area == "battery":
        features = [
            ("battery_capacity_numeric", "Battery Capacity"),
            ("battery_score", "Battery Score"),
            ("has_fast_charging", "Fast Charging"),
            ("price_original", "Price"),
            ("overall_device_score", "Overall Score")
        ]
    elif focus_area == "performance":
        features = [
            ("performance_score", "Performance Score"),
            ("ram_gb", "RAM"),
            ("storage_gb", "Storage"),
            ("price_original", "Price"),
            ("overall_device_score", "Overall Score")
        ]
    elif focus_area == "display":
        features = [
            ("display_score", "Display Score"),
            ("screen_size_numeric", "Screen Size"),
            ("refresh_rate_numeric", "Refresh Rate"),
            ("price_original", "Price"),
            ("overall_device_score", "Overall Score")
        ]
    else:
        # Default comprehensive comparison
        features = [
            ("price_original", "Price"),
            ("ram_gb", "RAM"),
            ("storage_gb", "Storage"),
            ("primary_camera_mp", "Main Camera"),
            ("selfie_camera_mp", "Front Camera"),
            ("display_score", "Display"),
            ("battery_capacity_numeric", "Battery")
        ]
    
    # Only keep features that exist for at least one phone
    selected_features = []
    for f in features:
        key = f[0]
        if any(p.get(key) is not None for p in phones):
            selected_features.append(f)
    
    # Normalize numeric features for 100% stacked chart
    chart_features = []
    for f in selected_features:
        key, label = f[0], f[1]
        values = [p.get(key) for p in phones]
        # If all values are None or not numeric, skip
        if all(v is None or isinstance(v, str) for v in values):
            continue
        # For boolean, convert to 0/1
        if all(isinstance(v, (bool, type(None))) for v in values):
            norm = [int(bool(v)) if v is not None else 0 for v in values]
        else:
            # Numeric normalization
            arr = np.array([float(v) if v is not None else 0 for v in values])
            total = arr.sum()
            norm = list((arr / total * 100) if total > 0 else np.zeros_like(arr))
        chart_features.append({
            "key": key,
            "label": label,
            "raw": values,
            "percent": norm
        })
    
    # Prepare phone info with lighter colors
    phone_infos = []
    brand_colors = ["#4A90E2", "#7ED321", "#F5A623", "#D0021B", "#9013FE"]  # Lighter, more vibrant colors
    for idx, p in enumerate(phones):
        phone_infos.append({
            "name": p.get("name"),
            "brand": p.get("brand"),
            "img_url": p.get("img_url"),
            "color": brand_colors[idx % len(brand_colors)]
        })
    
    # Generate contextual comparison summary
    summary = generate_contextual_comparison_summary(phones, chart_features, focus_area)
    
    return {
        "type": "comparison",
        "phones": phone_infos,
        "features": chart_features,
        "summary": summary,
        "focus_area": focus_area
    }
























async def process_legacy_query(request: ContextualQueryRequest, db: Session):
    """
    Legacy query processing as fallback when intelligent processing fails
    """
    query = request.query
    
    try:
        # Simple fallback processing
        if "recommend" in query.lower() or "suggest" in query.lower():
            # Basic recommendation fallback
            phones = phone_crud.get_phones_by_filters(db, {}, limit=5)
            return JSONResponse(content=[{"phone": phone_crud.phone_to_dict(phone)} for phone in phones])
        elif "compare" in query.lower():
            # Basic comparison fallback
            comparison_data = generate_comparison_response(db, query)
            return JSONResponse(content=comparison_data)
        else:
            # Basic Q&A fallback
            return JSONResponse(content={
                "type": "qa",
                "data": "I'm here to help with smartphone questions! Try asking about phone recommendations or comparisons."
            })
    except Exception as e:
        logger.error(f"Error in legacy query processing: {str(e)}")
        return JSONResponse(content={
            "type": "qa",
            "data": "I'm having trouble processing your request. Please try again."
        }, status_code=500)
    
# RAG Pipeline Integration
@router.post("/rag-query")
async def rag_enhanced_query(
    request: IntelligentQueryRequest,
    db: Session = Depends(get_db)
):
    """
    RAG-enhanced query endpoint that integrates GEMINI service with database knowledge.
    This endpoint provides grounded, accurate responses by combining AI understanding
    with phone database information.
    """
    try:
        # Try to import RAG services, but fall back if they're not available
        try:
            from app.services.gemini_rag_service import GeminiRAGService
            from app.services.knowledge_retrieval import KnowledgeRetrievalService
            from app.services.response_formatter import ResponseFormatterService
            rag_services_available = True
        except ImportError as e:
            logger.warning(f"RAG services not available: {str(e)}. Using direct Gemini AI service.")
            rag_services_available = False
        
        logger.info(f"Processing RAG query: {request.query[:100]}...")
        
        # Step 1: Parse query with GEMINI service (either through RAG or direct)
        if rag_services_available:
            try:
                # Initialize RAG services
                gemini_rag_service = GeminiRAGService()
                knowledge_retrieval_service = KnowledgeRetrievalService()
                response_formatter_service = ResponseFormatterService()
                
                gemini_response = await gemini_rag_service.parse_query_with_context(
                    query=request.query,
                    conversation_history=request.conversation_history or []
                )
            except Exception as rag_error:
                logger.warning(f"RAG service failed: {str(rag_error)}. Falling back to direct Gemini service.")
                rag_services_available = False
        
        if not rag_services_available:
            # Fall back to direct Gemini AI service call
            gemini_response = await call_gemini_ai_service(request.query)
        
        # Step 2: Enhance with knowledge from database
        response_type = gemini_response.get("type", "chat")
        
        if response_type == "recommendation":
            # Get phone recommendations based on GEMINI filters
            filters = gemini_response.get("filters", {})
            
            # Extract the requested limit from Gemini response, default to 5 if not specified
            requested_limit = gemini_response.get("limit", None)
            
            # If Gemini didn't extract limit, try to extract it from the original query
            if requested_limit is None:
                import re
                query_lower = request.query.lower()
                
                # Look for explicit numbers
                number_matches = re.findall(r'\b(\d+)\b', query_lower)
                
                # Check for "best phone" (singular) - should return 1
                if re.search(r'\bbest\s+phone\b(?!s)', query_lower) and 'phones' not in query_lower:
                    requested_limit = 1
                # Check for "top/best X phones" patterns
                elif re.search(r'\b(?:top|best)\s+(\d+)\s+phones?\b', query_lower):
                    match = re.search(r'\b(?:top|best)\s+(\d+)\s+phones?\b', query_lower)
                    requested_limit = int(match.group(1))
                # Check for "show/give me X phones" patterns
                elif re.search(r'\b(?:show|give\s+me|find)\s+(\d+)\s+phones?\b', query_lower):
                    match = re.search(r'\b(?:show|give\s+me|find)\s+(\d+)\s+phones?\b', query_lower)
                    requested_limit = int(match.group(1))
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
            
            logger.info(f"Processing recommendation request with limit: {limit}")
            
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
            
            logger.info(f"Original filters from Gemini: {filters}")
            logger.info(f"Processed filters for database query: {processed_filters}")
            
            # Try RAG services first if available, but use processed filters
            if rag_services_available:
                try:
                    phones_data = await knowledge_retrieval_service.find_similar_phones(
                        db=db,
                        filters=processed_filters,  # Use processed filters instead of original filters
                        limit=limit  # Use the extracted limit
                    )
                    
                    if phones_data:
                        logger.info(f"RAG service retrieved {len(phones_data)} phones after filtering")
                        phone_dicts = phones_data
                    else:
                        logger.warning("RAG service returned no phones, falling back to direct database query")
                        phones = phone_crud.get_phones_by_filters(db, processed_filters, limit=limit)  # Use the extracted limit
                        phone_dicts = phones
                except Exception as rag_error:
                    logger.warning(f"RAG service failed: {str(rag_error)}. Falling back to direct database query.")
                    phones = phone_crud.get_phones_by_filters(db, processed_filters, limit=limit)  # Use the extracted limit
                    phone_dicts = phones
            else:
                # Use direct database query
                phones = phone_crud.get_phones_by_filters(db, processed_filters, limit=limit)  # Use the extracted limit
                phone_dicts = phones
                
            logger.info(f"Retrieved {len(phone_dicts)} phones after filtering")
            
            # The phones are already dictionaries from either RAG service or get_phones_by_filters
            # Format phones to include all database fields directly (not nested in key_specs)
            formatted_phones = []
            for phone_dict in phone_dicts:
                
                # Create flattened phone structure
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
                    
                    # Scores
                    "overall_device_score": phone_dict.get("overall_device_score"),
                    "performance_score": phone_dict.get("performance_score"),
                    "display_score": phone_dict.get("display_score"),
                    "camera_score": phone_dict.get("camera_score"),
                    "battery_score": phone_dict.get("battery_score"),
                    "security_score": phone_dict.get("security_score"),
                    "connectivity_score": phone_dict.get("connectivity_score"),
                    
                    # Additional metadata if available
                    "relevance_score": phone_dict.get('relevance_score', 0.9),
                    "match_reasons": phone_dict.get('match_reasons', [])
                }
                
                formatted_phones.append(formatted_phone)
            
            # Create the response in the desired format
            formatted_response = {
                "response_type": "recommendations",
                "content": {
                    "text": gemini_response.get("reasoning", ""),
                    "phones": formatted_phones,
                    "filters_applied": filters,
                    "total_found": len(formatted_phones)
                },
                "suggestions": gemini_response.get("suggestions", [
                    "Find phones with excellent cameras",
                    "Show phones with long battery life",
                    "Compare these phones side by side",
                    "Show me the detailed specs of the top phone",
                    "Find similar phones from different brands"
                ]),
                "metadata": {
                    "request_id": gemini_response.get("request_id", ""),
                    "gemini_response_type": response_type,
                    "data_sources": ["phone_database"],
                    "confidence_score": gemini_response.get("confidence_score", 0.7)
                },
                "session_id": request.session_id or "default",
                "processing_time": gemini_response.get("processing_time", 0.0)
            }
            
        elif response_type == "comparison":
            # Get comparison data for specified phones
            phone_names = gemini_response.get("data", [])
            if rag_services_available:
                try:
                    comparison_data = await knowledge_retrieval_service.get_comparison_data(db, phone_names)
                    # Format comparison
                    formatted_response = await response_formatter_service.format_comparison(
                        comparison_data=comparison_data,
                        reasoning=gemini_response.get("reasoning", ""),
                        original_query=request.query
                    )
                except Exception as e:
                    logger.warning(f"RAG comparison failed: {str(e)}. Using basic comparison.")
                    # Fallback to basic comparison
                    formatted_response = generate_comparison_response(db, request.query, phone_names=phone_names)
            else:
                # Direct comparison fallback
                formatted_response = generate_comparison_response(db, request.query, phone_names=phone_names)
            
        elif response_type == "drill_down":
            # Get detailed specifications for a specific phone
            phone_names = gemini_response.get("data", [])
            if phone_names and rag_services_available:
                try:
                    phone_specs = await knowledge_retrieval_service.retrieve_phone_specs(db, phone_names[0])
                    formatted_response = await response_formatter_service.format_specifications(
                        phone_specs=phone_specs,
                        reasoning=gemini_response.get("reasoning", ""),
                        original_query=request.query
                    )
                except Exception as e:
                    logger.warning(f"RAG drill down failed: {str(e)}. Using basic response.")
                    formatted_response = {
                        "response_type": "text",
                        "content": {"text": f"Here's information about the {phone_names[0]}. Please check our database for detailed specifications."},
                        "suggestions": ["Ask about a specific phone model", "Get phone recommendations"]
                    }
            else:
                formatted_response = {
                    "response_type": "text",
                    "content": {"text": "Please specify which phone you'd like to know more about."},
                    "suggestions": ["Ask about a specific phone model", "Get phone recommendations"]
                }
                
        elif response_type == "qa":
            # Handle Q&A with potential database lookup
            query_data = gemini_response.get("data", "")
            if rag_services_available:
                try:
                    related_phones = await knowledge_retrieval_service.search_by_features(db, query_data, limit=3)
                    formatted_response = await response_formatter_service.format_conversational(
                        text=query_data,
                        related_phones=related_phones if related_phones else None,
                        reasoning=gemini_response.get("reasoning", ""),
                        original_query=request.query
                    )
                except Exception as e:
                    logger.warning(f"RAG QA failed: {str(e)}. Using basic response.")
                    formatted_response = {
                        "response_type": "text",
                        "content": {
                            "text": query_data or gemini_response.get("reasoning", "I'm here to help with smartphone questions!"),
                            "suggestions": gemini_response.get("suggestions", [])
                        }
                    }
            else:
                # Direct QA fallback
                formatted_response = {
                    "response_type": "text",
                    "content": {
                        "text": query_data or gemini_response.get("reasoning", "I'm here to help with smartphone questions!"),
                        "suggestions": gemini_response.get("suggestions", [])
                    }
                }
            
        else:
            # Default conversational response
            if rag_services_available:
                try:
                    formatted_response = await response_formatter_service.format_conversational(
                        text=gemini_response.get("data", gemini_response.get("reasoning", "")),
                        related_phones=None,
                        reasoning=gemini_response.get("reasoning", ""),
                        original_query=request.query
                    )
                except Exception as e:
                    logger.warning(f"RAG formatting failed: {str(e)}. Using basic response.")
                    formatted_response = {
                        "response_type": "text",
                        "content": {
                            "text": gemini_response.get("data", gemini_response.get("reasoning", "I'm here to help with smartphone questions!")),
                            "suggestions": [
                                "Ask for phone recommendations",
                                "Compare different phones",
                                "Get phone specifications",
                                "Ask about phone features"
                            ]
                        }
                    }
            else:
                # Direct fallback
                formatted_response = {
                    "response_type": "text",
                    "content": {
                        "text": gemini_response.get("data", gemini_response.get("reasoning", "I'm here to help with smartphone questions!")),
                        "suggestions": [
                            "Ask for phone recommendations",
                            "Compare different phones",
                            "Get phone specifications",
                            "Ask about phone features"
                        ]
                    }
                }
        
        logger.info(f"RAG query processed successfully: {formatted_response.get('response_type')}")
        return formatted_response
        
    except Exception as e:
        logger.error(f"Error in RAG query processing: {str(e)}", exc_info=True)
        
        # Try a simple fallback - basic phone query without AI processing
        try:
            logger.info("Attempting basic phone recommendation fallback")
            
            # Extract basic filters from simple query patterns
            query_lower = request.query.lower()
            fallback_filters = {}
            
            # Simple price extraction
            import re
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
            phones = phone_crud.get_phones_by_filters(db, fallback_filters, limit=5)  # Use default 5 for fallback
            
            if phones:
                formatted_phones = []
                for phone_dict in phones:
                    formatted_phone = {
                        "id": phone_dict.get("id"),
                        "name": phone_dict.get("name"),
                        "brand": phone_dict.get("brand"),
                        "model": phone_dict.get("model"),
                        "slug": phone_dict.get("slug"),
                        "price": phone_dict.get("price_original") or phone_dict.get("price"),
                        "url": phone_dict.get("url"),
                        "img_url": phone_dict.get("img_url"),
                        "chipset": phone_dict.get("chipset"),
                        "ram": phone_dict.get("ram"),
                        "internal_storage": phone_dict.get("internal_storage"),
                        "primary_camera_resolution": phone_dict.get("primary_camera_resolution"),
                        "battery_type": phone_dict.get("battery_type"),
                        "capacity": phone_dict.get("capacity"),
                        "operating_system": phone_dict.get("operating_system"),
                        "overall_device_score": phone_dict.get("overall_device_score"),
                        "camera_score": phone_dict.get("camera_score"),
                        "battery_score": phone_dict.get("battery_score"),
                        "performance_score": phone_dict.get("performance_score"),
                        "display_score": phone_dict.get("display_score")
                    }
                    formatted_phones.append(formatted_phone)
                
                return {
                    "response_type": "recommendations",
                    "content": {
                        "text": f"Here are some phone recommendations based on your query: '{request.query}'",
                        "phones": formatted_phones,
                        "filters_applied": fallback_filters,
                        "total_found": len(formatted_phones)
                    },
                    "suggestions": [
                        "Ask for more specific requirements",
                        "Compare these phones",
                        "Ask about a specific feature"
                    ],
                    "metadata": {
                        "fallback_mode": True,
                        "error_handled": True
                    }
                }
            else:
                # No phones found, return helpful message
                return {
                    "response_type": "text",
                    "content": {
                        "text": "I couldn't find specific phones matching your query, but I'm here to help! Try asking about specific phone brands, price ranges, or features.",
                        "error": False
                    },
                    "suggestions": [
                        "Ask for phones under a specific budget (e.g., '30k')",
                        "Ask about a specific brand (e.g., 'Samsung phones')",
                        "Ask for phones with specific features (e.g., 'good camera phones')"
                    ],
                    "metadata": {
                        "fallback_mode": True,
                        "no_results": True
                    }
                }
                
        except Exception as fallback_error:
            logger.error(f"Fallback also failed: {str(fallback_error)}")
            
            # Final fallback response
            return {
                "response_type": "text",
                "content": {
                    "text": "I'm having trouble processing your request right now, but I'm still here to help! Could you try rephrasing your question?",
                    "error": True
                },
                "suggestions": [
                    "Try asking: 'Show me phones under 30k'",
                    "Try asking: 'Best Samsung phones'",
                    "Try asking: 'Compare iPhone vs Samsung'"
                ],
                "metadata": {
                    "fallback_mode": True,
                    "service_error": True
                }
            }


@router.post("/rag-test")
async def test_rag_integration(
    query: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    """
    Test endpoint for RAG integration functionality.
    """
    try:
        # Create a test request
        test_request = IntelligentQueryRequest(
            query=query,
            conversation_history=[],
            session_id="test-session"
        )
        
        # Process through RAG pipeline
        response = await rag_enhanced_query(test_request, db)
        
        return {
            "status": "success",
            "query": query,
            "response": response,
            "rag_integration": "working"
        }
        
    except Exception as e:
        logger.error(f"RAG test failed: {str(e)}")
        return {
            "status": "error",
            "query": query,
            "error": str(e),
            "rag_integration": "failed"
        }        