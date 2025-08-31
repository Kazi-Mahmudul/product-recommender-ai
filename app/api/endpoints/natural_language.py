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
from app.services.ai_service_client import (
    ai_service_client, AIServiceRequest, AIServiceResponse, AIServiceError
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services
contextual_processor = ContextualQueryProcessor()
phone_name_resolver = PhoneNameResolver()
context_manager = ContextManager()

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

import re
from typing import List

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
        response = f"The {phone_name} has a camera score of {feature_value:.1f}/10."
    elif feature in ["ram_gb", "storage_gb"]:
        response = f"The {phone_name} has {feature_value}GB {display_name}."
    elif feature == "price_original":
        response = f"The {phone_name} costs ৳{feature_value:,.0f}."
    elif feature == "price_category":
        response = f"The {phone_name} is in the {feature_value} price category."
    elif feature in ["display_score", "battery_score", "performance_score", "security_score", "connectivity_score", "overall_device_score"]:
        response = f"The {phone_name} has a {display_name} of {feature_value:.1f}/10."
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

async def process_intelligent_query(
    request: IntelligentQueryRequest,
    db: Session
) -> IntelligentQueryResponse:
    """
    Main intelligent query processing function that leverages the AI service
    for truly smart, contextual responses to any user query.
    """
    try:
        # Prepare AI service request
        ai_request = AIServiceRequest(
            query=request.query,
            context=request.context,
            session_id=request.session_id,
            conversation_history=request.conversation_history
        )
        
        # Enhance query with context if beneficial
        enhanced_query = ai_service_client.enhance_query_with_context(
            request.query,
            request.conversation_history
        )
        ai_request.query = enhanced_query
        
        # Call the intelligent AI service
        ai_response = await ai_service_client.call_ai_service(ai_request)
        
        # Parse and format the AI response
        formatted_response = await parse_ai_response(ai_response, db)
        
        return formatted_response
        
    except AIServiceError as e:
        # Handle AI service errors gracefully
        return create_fallback_response(request.query, str(e))
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"Unexpected error in intelligent query processing: {str(e)}")
        return create_fallback_response(request.query, "An unexpected error occurred")

async def parse_ai_response(ai_response: AIServiceResponse, db: Session) -> IntelligentQueryResponse:
    """
    Intelligently parse any AI service response and format it for optimal frontend consumption.
    """
    response_type = ai_response.type
    
    if response_type == "recommendation":
        return await handle_recommendation_response(ai_response, db)
    elif response_type == "qa":
        return handle_qa_response(ai_response)
    elif response_type == "comparison":
        return await handle_comparison_response(ai_response, db)
    elif response_type == "chat":
        return handle_chat_response(ai_response)
    elif response_type == "drill_down":
        return await handle_drill_down_response(ai_response, db)
    else:
        # Handle unknown response types intelligently
        return handle_unknown_response(ai_response)

async def handle_recommendation_response(ai_response: AIServiceResponse, db: Session) -> IntelligentQueryResponse:
    """Handle recommendation responses from the AI service"""
    filters = ai_response.filters or {}
    
    # Get phone recommendations based on AI-determined filters
    phones = phone_crud.get_phones_by_filters(db, filters, limit=10)
    
    # Format phones for frontend display
    formatted_phones = []
    for phone in phones:
        phone_dict = phone_crud.phone_to_dict(phone) if hasattr(phone, '__table__') else phone
        formatted_phones.append({
            "id": phone_dict.get("id"),
            "name": phone_dict.get("name"),
            "brand": phone_dict.get("brand"),
            "price": phone_dict.get("price_original"),
            "image": phone_dict.get("img_url"),
            "key_specs": {
                "ram": f"{phone_dict.get('ram_gb', 'N/A')}GB",
                "storage": f"{phone_dict.get('storage_gb', 'N/A')}GB",
                "camera": f"{phone_dict.get('primary_camera_mp', 'N/A')}MP",
                "battery": f"{phone_dict.get('battery_capacity_numeric', 'N/A')}mAh"
            },
            "scores": {
                "overall": phone_dict.get("overall_device_score", 0),
                "camera": phone_dict.get("camera_score", 0),
                "battery": phone_dict.get("battery_score", 0),
                "performance": phone_dict.get("performance_score", 0)
            }
        })
    
    # Create intelligent response text
    response_text = ai_response.reasoning or "Here are some great phone recommendations based on your requirements:"
    
    return IntelligentQueryResponse(
        response_type="recommendations",
        content={
            "text": response_text,
            "phones": formatted_phones,
            "filters_applied": filters
        },
        formatting_hints={
            "display_as": "cards",
            "show_comparison": len(formatted_phones) > 1,
            "highlight_specs": True
        },
        metadata={
            "ai_confidence": ai_response.confidence,
            "phone_count": len(formatted_phones)
        }
    )

def handle_qa_response(ai_response: AIServiceResponse) -> IntelligentQueryResponse:
    """Handle Q&A responses from the AI service"""
    response_text = ai_response.data or ai_response.content or "I'm here to help with your smartphone questions!"
    
    return IntelligentQueryResponse(
        response_type="text",
        content={
            "text": response_text,
            "suggestions": ai_response.suggestions or []
        },
        formatting_hints={
            "text_style": "conversational",
            "show_suggestions": bool(ai_response.suggestions)
        },
        metadata={
            "ai_confidence": ai_response.confidence
        }
    )

async def handle_comparison_response(ai_response: AIServiceResponse, db: Session) -> IntelligentQueryResponse:
    """Handle comparison responses from the AI service"""
    phone_names = ai_response.data if isinstance(ai_response.data, list) else []
    
    if not phone_names:
        return IntelligentQueryResponse(
            response_type="text",
            content={"text": "I couldn't identify specific phones to compare. Could you please mention the phone names?"},
            formatting_hints={"text_style": "error"}
        )
    
    # Generate comparison using existing logic but with AI context
    comparison_data = generate_comparison_response(db, "", phone_names=phone_names)
    
    if isinstance(comparison_data, dict) and comparison_data.get("error"):
        return IntelligentQueryResponse(
            response_type="text",
            content={"text": comparison_data["error"]},
            formatting_hints={"text_style": "error"}
        )
    
    return IntelligentQueryResponse(
        response_type="comparison",
        content=comparison_data,
        formatting_hints={
            "display_as": "comparison_chart",
            "show_summary": True
        },
        metadata={
            "ai_confidence": ai_response.confidence
        }
    )

def handle_chat_response(ai_response: AIServiceResponse) -> IntelligentQueryResponse:
    """Handle general chat responses from the AI service"""
    response_text = ai_response.data or ai_response.content or "I'm here to help you with smartphone questions!"
    
    return IntelligentQueryResponse(
        response_type="text",
        content={
            "text": response_text,
            "suggestions": ai_response.suggestions or []
        },
        formatting_hints={
            "text_style": "conversational",
            "show_suggestions": bool(ai_response.suggestions)
        },
        metadata={
            "ai_confidence": ai_response.confidence
        }
    )

async def handle_drill_down_response(ai_response: AIServiceResponse, db: Session) -> IntelligentQueryResponse:
    """Handle drill-down responses from the AI service"""
    command = ai_response.command or "detail_focus"
    target = ai_response.target or "specifications"
    
    # Generate appropriate drill-down content based on command
    if command == "full_specs":
        content_text = "Here are the detailed specifications you requested:"
    elif command == "chart_view":
        content_text = "Here's a detailed comparison chart:"
    else:
        content_text = f"Here are more details about {target}:"
    
    return IntelligentQueryResponse(
        response_type="text",
        content={
            "text": ai_response.data or content_text,
            "drill_down_options": [
                {
                    "label": "Full Specifications",
                    "command": "full_specs",
                    "target": "all_specs"
                },
                {
                    "label": "Comparison Chart",
                    "command": "chart_view",
                    "target": "comparison"
                }
            ]
        },
        formatting_hints={
            "text_style": "detailed",
            "show_drill_down": True
        },
        metadata={
            "ai_confidence": ai_response.confidence
        }
    )

def handle_unknown_response(ai_response: AIServiceResponse) -> IntelligentQueryResponse:
    """Handle unknown response types intelligently"""
    # Try to extract meaningful content from unknown response
    content_text = "I'm here to help with your smartphone questions!"
    
    if ai_response.data:
        if isinstance(ai_response.data, str):
            content_text = ai_response.data
        else:
            content_text = str(ai_response.data)
    elif ai_response.content:
        if isinstance(ai_response.content, str):
            content_text = ai_response.content
        else:
            content_text = str(ai_response.content)
    
    return IntelligentQueryResponse(
        response_type="text",
        content={
            "text": content_text,
            "suggestions": ai_response.suggestions or [
                "Ask me about phone recommendations",
                "Compare different smartphones",
                "Get phone specifications"
            ]
        },
        formatting_hints={
            "text_style": "conversational",
            "show_suggestions": True
        },
        metadata={
            "ai_confidence": ai_response.confidence or 0.5,
            "original_type": ai_response.type
        }
    )

def create_fallback_response(query: str, error_message: str) -> IntelligentQueryResponse:
    """Create a fallback response when AI service is unavailable"""
    return IntelligentQueryResponse(
        response_type="text",
        content={
            "text": f"I'm having trouble processing your request right now. {error_message}",
            "suggestions": [
                "Try asking about phone recommendations",
                "Ask for phone comparisons",
                "Request specific phone information"
            ]
        },
        formatting_hints={
            "text_style": "error",
            "show_suggestions": True
        },
        metadata={
            "fallback": True,
            "error": error_message
        }
    )

@router.post("/intelligent-query")
async def intelligent_query_endpoint(
    request: IntelligentQueryRequest,
    db: Session = Depends(get_db)
):
    """
    Enhanced intelligent query processing endpoint that leverages the AI service
    for truly smart, contextual responses to any user query.
    """
    try:
        response = await process_intelligent_query(request, db)
        return response.dict()
    except Exception as e:
        logger.error(f"Error in intelligent query endpoint: {str(e)}")
        fallback_response = create_fallback_response(request.query, str(e))
        return fallback_response.dict()

# Update the main query endpoint to use intelligent processing
@router.post("/query")
async def enhanced_natural_language_query(
    request: IntelligentQueryRequest,
    db: Session = Depends(get_db)
):
    """
    Enhanced natural language query endpoint that uses intelligent AI service integration.
    This replaces the old limited processing with smart, contextual responses.
    """
    try:
        # Use the intelligent query processing
        response = await process_intelligent_query(request, db)
        
        # Convert to the expected format for backward compatibility
        if response.response_type == "recommendations":
            # Return phone recommendations in the expected format
            phones = response.content.get("phones", [])
            return [{"phone": phone} for phone in phones]
        elif response.response_type == "comparison":
            # Return comparison data directly
            return response.content
        elif response.response_type == "text":
            # Return text responses
            return {
                "type": "qa",
                "data": response.content.get("text", ""),
                "suggestions": response.content.get("suggestions", [])
            }
        else:
            # Return the full intelligent response
            return response.dict()
            
    except Exception as e:
        logger.error(f"Error in enhanced natural language query: {str(e)}")
        # Fallback to basic error response
        return {
            "type": "qa",
            "data": f"I'm having trouble processing your request: {str(e)}",
            "suggestions": ["Try rephrasing your question", "Ask about phone recommendations"]
        }

async def handle_drill_down_response(ai_response: AIServiceResponse, db: Session) -> IntelligentQueryResponse:
    """Handle drill-down responses from the AI service"""
    command = ai_response.command or "detail_focus"
    target = ai_response.target or "specifications"
    
    # Generate appropriate drill-down content based on command
    if command == "full_specs":
        content_text = "Here are the detailed specifications you requested:"
    elif command == "chart_view":
        content_text = "Here's a detailed comparison chart:"
    else:
        content_text = f"Here are more details about {target}:"
    
    return IntelligentQueryResponse(
        response_type="text",
        content={
            "text": ai_response.data or content_text,
            "drill_down_options": [
                {
                    "label": "Full Specifications",
                    "command": "full_specs",
                    "target": "all_specs"
                },
                {
                    "label": "Comparison Chart",
                    "command": "chart_view",
                    "target": "comparison"
                }
            ]
        },
        formatting_hints={
            "text_style": "detailed",
            "show_drill_down": True
        },
        metadata={
            "ai_confidence": ai_response.confidence
        }
    )

def handle_unknown_response(ai_response: AIServiceResponse) -> IntelligentQueryResponse:
    """Handle unknown response types intelligently"""
    # Try to extract meaningful content from unknown response
    content_text = "I'm here to help with your smartphone questions!"
    
    if ai_response.data:
        if isinstance(ai_response.data, str):
            content_text = ai_response.data
        else:
            content_text = str(ai_response.data)
    elif ai_response.content:
        if isinstance(ai_response.content, str):
            content_text = ai_response.content
        else:
            content_text = str(ai_response.content)
    
    return IntelligentQueryResponse(
        response_type="text",
        content={
            "text": content_text,
            "suggestions": ai_response.suggestions or [
                "Ask me about phone recommendations",
                "Compare different smartphones",
                "Get phone specifications"
            ]
        },
        formatting_hints={
            "text_style": "conversational",
            "show_suggestions": True
        },
        metadata={
            "ai_confidence": ai_response.confidence or 0.5,
            "original_type": ai_response.type
        }
    )

def create_fallback_response(query: str, error_message: str) -> IntelligentQueryResponse:
    """Create a fallback response when AI service is unavailable"""
    return IntelligentQueryResponse(
        response_type="text",
        content={
            "text": f"I'm having trouble processing your request right now. {error_message}",
            "suggestions": [
                "Try asking about phone recommendations",
                "Ask for phone comparisons",
                "Request specific phone information"
            ]
        },
        formatting_hints={
            "text_style": "error",
            "show_suggestions": True
        },
        metadata={
            "fallback": True,
            "error": error_message
        }
    )

@router.post("/intelligent-query")
async def intelligent_query_endpoint(
    request: IntelligentQueryRequest,
    db: Session = Depends(get_db)
):
    """
    Enhanced intelligent query processing endpoint that leverages the AI service
    for truly smart, contextual responses to any user query.
    """
    try:
        response = await process_intelligent_query(request, db)
        return response.dict()
    except Exception as e:
        logger.error(f"Error in intelligent query endpoint: {str(e)}")
        fallback_response = create_fallback_response(request.query, str(e))
        return fallback_response.dict()

# Update the main query endpoint to use intelligent processing
@router.post("/query")
async def enhanced_natural_language_query(
    request: IntelligentQueryRequest,
    db: Session = Depends(get_db)
):
    """
    Enhanced natural language query endpoint that uses intelligent AI service integration.
    This replaces the old limited processing with smart, contextual responses.
    """
    try:
        # Use the intelligent query processing
        response = await process_intelligent_query(request, db)
        
        # Convert to the expected format for backward compatibility
        if response.response_type == "recommendations":
            # Return phone recommendations in the expected format
            phones = response.content.get("phones", [])
            return [{"phone": phone} for phone in phones]
        elif response.response_type == "comparison":
            # Return comparison data directly
            return response.content
        elif response.response_type == "text":
            # Return text responses
            return {
                "type": "qa",
                "data": response.content.get("text", ""),
                "suggestions": response.content.get("suggestions", [])
            }
        else:
            # Return the full intelligent response
            return response.dict()
            
    except Exception as e:
        logger.error(f"Error in enhanced natural language query: {str(e)}")
        # Fallback to basic error response
        return {
            "type": "qa",
            "data": f"I'm having trouble processing your request: {str(e)}",
            "suggestions": ["Try rephrasing your question", "Ask about phone recommendations"]
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
    