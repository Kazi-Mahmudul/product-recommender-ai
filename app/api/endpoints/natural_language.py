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

def generate_comparison_response(db: Session, query: str, phone_names: list = None) -> dict:
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

@router.post("/query")
async def process_natural_language_query(
    request: ContextualQueryRequest,
    db: Session = Depends(get_db)
):
    """
    Enhanced natural language query processing with contextual awareness
    """
    query = request.query
    session_id = request.session_id or str(uuid.uuid4())
    context_str = request.context
    try:
        print(f"Processing query: {query}")
        print(f"Gemini service URL: {settings.GEMINI_SERVICE_URL}")
        
        # Call Gemini service to parse the query
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{settings.GEMINI_SERVICE_URL}/parse-query",
                    json={"query": query}
                )
                print(f"Gemini response status: {response.status_code}")
                
                if response.status_code != 200:
                    error_text = await response.text()
                    print(f"Gemini service error: {error_text}")
                    return JSONResponse(content={"error": f"I'm having trouble processing your query right now. Please try again in a moment. (Error: {response.status_code})"}, status_code=500)
                
                result = response.json()
                print(f"Gemini response: {result}")
                
                # Handle different response formats
                if result.get("type") == "recommendation":
                    filters = result.get("filters", {})
                    print(f"Processing recommendation with filters: {filters}")
                    
                    # Check if this is a contextual query and enhance filters
                    contextual_intent = contextual_processor.process_contextual_query(db, query)
                    if contextual_intent.get("is_contextual"):
                        print(f"[CONTEXTUAL] Detected contextual query: {contextual_intent.get('type')}")
                        contextual_filters = contextual_processor.generate_contextual_filters(contextual_intent)
                        print(f"[CONTEXTUAL] Generated contextual filters: {contextual_filters}")
                        
                        # Merge contextual filters with Gemini filters
                        filters.update(contextual_filters)
                        
                        # Add contextual information to response
                        filters["_contextual_info"] = {
                            "is_contextual": True,
                            "intent_type": contextual_intent.get("type"),
                            "reference_phones": [rp["reference"]["full_name"] for rp in contextual_intent.get("resolved_phones", []) if rp["found"]],
                            "relationship": contextual_intent.get("relationship"),
                            "focus_area": contextual_intent.get("focus_area")
                        }
                    
                    # --- FALLBACK: Extract price constraints from query if missing ---
                    if not filters.get("max_price"):
                        match = re.search(r"(?:under|below|less than|up to|maximum|<=|<)\s*([0-9,]+)", query, re.IGNORECASE)
                        if match:
                            price = float(match.group(1).replace(",", ""))
                            filters["max_price"] = price
                            print(f"[Fallback] Extracted max_price from query: {price}")
                    if not filters.get("min_price"):
                        match = re.search(r"(?:over|above|more than|at least|minimum|>=|>)\s*([0-9,]+)", query, re.IGNORECASE)
                        if match:
                            price = float(match.group(1).replace(",", ""))
                            filters["min_price"] = price
                            print(f"[Fallback] Extracted min_price from query: {price}")
                    print(f"[DEBUG] Final filters for recommendation: {filters}")
                    
                    # Proceed with recommendation processing here instead of after the if/elif blocks
                elif result.get("type") == "qa":
                    print("Processing QA query")
                    return JSONResponse(content={"type": "qa", "data": generate_qa_response(db, query)})
                elif result.get("type") == "comparison":
                    print("Processing comparison query")
                    # Use Gemini's data if it's a list of phone names, else fallback to query
                    phone_names = []
                    if isinstance(result.get("data"), list):
                        phone_names = result["data"]
                    else:
                        phone_names = None  # fallback to extract from query in generate_comparison_response
                    comparison = generate_comparison_response(db, query, phone_names=phone_names)
                    if isinstance(comparison, dict) and comparison.get("error"):
                        return JSONResponse(content=comparison, status_code=400)
                    return JSONResponse(content=comparison)
                elif result.get("type") == "drill_down":
                    print("Processing drill-down query")
                    from app.services.drill_down_handler import DrillDownHandler
                    
                    command = result.get("command")
                    target = result.get("target")
                    
                    # Extract phone names from the query itself for drill-down commands
                    phone_names = extract_phone_names_from_query(query)
                    
                    # If no phone names found in query, try to get from context if provided
                    if not phone_names and context_str:
                        try:
                            context_data = json.loads(context_str) if context_str else {}
                            if context_data.get("current_phones"):
                                phone_names = [phone.get("name") for phone in context_data["current_phones"]]
                        except json.JSONDecodeError:
                            print("Invalid context JSON for drill-down")
                    
                    drill_down_response = DrillDownHandler.process_drill_down_command(
                        db=db,
                        command=command,
                        target=target,
                        phone_names=phone_names,
                        context={"current_phones": [{"name": name} for name in phone_names]} if phone_names else None
                    )
                    
                    return JSONResponse(content=drill_down_response)
                elif result.get("type") == "chat":
                    print("Processing chat query")
                    return JSONResponse(content={"type": "chat", "data": result.get("data", "I'm here to help you with smartphone questions!")})
                else:
                    print(f"Unknown response type: {result.get('type')}")
                    filters = result.get("filters", {})
                    if not filters:
                        return JSONResponse(content={"error": "I'm here to help you with smartphone questions! What would you like to know?"}, status_code=400)
            except httpx.ConnectError as e:
                print(f"Connection error to Gemini service: {e}")
                return JSONResponse(content={"error": "I'm having trouble connecting to my AI service right now. Please try again in a moment."}, status_code=500)
            except httpx.TimeoutException as e:
                print(f"Timeout error to Gemini service: {e}")
                return JSONResponse(content={"error": "The AI service is taking too long to respond. Please try again in a moment."}, status_code=500)
            except Exception as e:
                print(f"Unexpected error calling Gemini service: {e}")
                return JSONResponse(content={"error": "I'm experiencing some technical difficulties. Please try again in a moment."}, status_code=500)

        # If user requests full specification, return all columns for the matched phone
        if filters.get("full_spec") and filters.get("name"):
            from app.models.phone import Phone as PhoneModel
            import logging
            logging.warning(f"Full spec query: filters={filters}")
            phone = db.query(PhoneModel).filter(PhoneModel.name.ilike(f"%{filters['name']}%"))
            results = phone.all()
            logging.warning(f"Full spec DB results count: {len(results)}")
            if not results:
                # Try matching by model as fallback
                if hasattr(PhoneModel, 'model'):
                    phone = db.query(PhoneModel).filter(PhoneModel.model.ilike(f"%{filters['name']}%"))
                    results = phone.all()
                    logging.warning(f"Full spec fallback by model results count: {len(results)}")
            return JSONResponse(content=[phone_crud.phone_to_dict(r) for r in results])

        try:
            # Use the parsed filters to get recommendations
            recommendations = phone_crud.get_smart_recommendations(
                db=db,
                min_display_score=filters.get("min_display_score"),
                max_display_score=filters.get("max_display_score"),
                min_camera_score=filters.get("min_camera_score"),
                max_camera_score=filters.get("max_camera_score"),
                min_battery_score=filters.get("min_battery_score"),
                max_battery_score=filters.get("max_battery_score"),
                min_performance_score=filters.get("min_performance_score"),
                max_performance_score=filters.get("max_performance_score"),
                min_security_score=filters.get("min_security_score"),
                max_security_score=filters.get("max_security_score"),
                min_connectivity_score=filters.get("min_connectivity_score"),
                max_connectivity_score=filters.get("max_connectivity_score"),
                min_overall_device_score=filters.get("min_overall_device_score"),
                max_overall_device_score=filters.get("max_overall_device_score"),
                min_ram_gb=filters.get("min_ram_gb"),
                max_ram_gb=filters.get("max_ram_gb"),
                min_storage_gb=filters.get("min_storage_gb"),
                max_storage_gb=filters.get("max_storage_gb"),
                min_price=filters.get("min_price"),
                max_price=filters.get("max_price"),
                brand=filters.get("brand"),
                min_refresh_rate_numeric=filters.get("min_refresh_rate_numeric"),
                max_refresh_rate_numeric=filters.get("max_refresh_rate_numeric"),
                min_screen_size_numeric=filters.get("min_screen_size_numeric"),
                max_screen_size_numeric=filters.get("max_screen_size_numeric"),
                min_battery_capacity_numeric=filters.get("min_battery_capacity_numeric"),
                max_battery_capacity_numeric=filters.get("max_battery_capacity_numeric"),
                min_primary_camera_mp=filters.get("min_primary_camera_mp"),
                max_primary_camera_mp=filters.get("max_primary_camera_mp"),
                min_selfie_camera_mp=filters.get("min_selfie_camera_mp"),
                max_selfie_camera_mp=filters.get("max_selfie_camera_mp"),
                min_camera_count=filters.get("min_camera_count"),
                max_camera_count=filters.get("max_camera_count"),
                has_fast_charging=filters.get("has_fast_charging"),
                has_wireless_charging=filters.get("has_wireless_charging"),
                is_popular_brand=filters.get("is_popular_brand"),
                is_new_release=filters.get("is_new_release"),
                is_upcoming=filters.get("is_upcoming"),
                display_type=filters.get("display_type"),
                camera_setup=filters.get("camera_setup"),
                battery_type=filters.get("battery_type"),
                chipset=filters.get("chipset"),
                operating_system=filters.get("operating_system"),
                price_category=filters.get("price_category"),
                min_ppi_numeric=filters.get("min_ppi_numeric"),
                max_ppi_numeric=filters.get("max_ppi_numeric"),
                limit=filters.get("limit")
            )
            print(f"[DEBUG] Recommendations found: {len(recommendations)}")

            # Format recommendations properly
            formatted_recommendations = []
            for phone_data in recommendations:
                formatted_recommendations.append({
                    "phone": phone_data,
                    "score": phone_data.get("overall_device_score", 0),
                    "match_reason": f"Matches your search criteria"
                })
            
            print(f"[DEBUG] Formatted recommendations: {len(formatted_recommendations)}")
            
            # Filter out invalid recommendations (no id or id <= 0)
            valid_recommendations = [rec for rec in formatted_recommendations if rec["phone"] and isinstance(rec["phone"].get("id"), int) and rec["phone"]["id"] > 0]
            skipped = len(formatted_recommendations) - len(valid_recommendations)
            if skipped > 0:
                print(f"Filtered out {skipped} invalid recommendations before returning response.")

            # If no recommendations found, return a helpful message
            if not valid_recommendations:
                return JSONResponse(content={"type": "chat", "data": "I couldn't find any phones matching your criteria. Try adjusting your search parameters."})
                
            # If limit is not specified in the query but we have results, return top 3 by default for better UX
            if filters.get("limit") is None and valid_recommendations:
                return JSONResponse(content=valid_recommendations[:3])
            return JSONResponse(content=valid_recommendations)
        except Exception as e:
            print(f"Database error: {e}")
            return JSONResponse(content={"error": "I'm having trouble accessing the phone database right now. Please try again in a moment."}, status_code=500)

    except httpx.HTTPError as e:
        print(f"HTTP error: {e}")
        return JSONResponse(content={"error": "I'm having trouble processing your query right now. Please try again in a moment."}, status_code=500)
    except Exception as e:
        print(f"Unexpected error: {e}")
        return JSONResponse(content={"error": "I'm experiencing some technical difficulties. Please try again in a moment."}, status_code=500)

@router.post("/contextual-query")
async def process_contextual_query(
    request: ExplicitContextualQueryRequest,
    db: Session = Depends(get_db)
):
    """
    Process contextual natural language query with explicit phone references
    """
    try:
        query = request.query
        referenced_phones = request.referenced_phones or []
        context_type = request.context_type
        session_id = request.session_id or str(uuid.uuid4())
        
        print(f"Processing contextual query: {query}")
        print(f"Referenced phones: {referenced_phones}")
        print(f"Context type: {context_type}")
        
        # Initialize contextual processor with session
        processor = ContextualQueryProcessor(session_id=session_id)
        
        # Process the contextual query using enhanced processing
        result = processor.process_contextual_query_enhanced(db, query, session_id)
        
        # Add contextual metadata
        result["contextual_query"] = True
        result["referenced_phones"] = referenced_phones
        result["context_type"] = context_type
        result["original_query"] = query
        result["session_id"] = session_id
        
        return JSONResponse(content=result)
        
    except Exception as e:
        print(f"Error processing contextual query: {e}")
        return JSONResponse(
            content={"error": "I'm having trouble processing your contextual query. Please try rephrasing."},
            status_code=500
        )

@router.get("/parse-intent")
async def parse_query_intent(
    query: str = Query(..., description="Query to parse for intent"),
    context: Optional[str] = Query(None, description="Optional context information")
):
    """
    Parse query intent and extract contextual information
    """
    try:
        print(f"Parsing intent for query: {query}")
        
        # Initialize processor
        processor = ContextualQueryProcessor()
        
        # Parse context if provided
        context_data = None
        if context:
            try:
                context_data = json.loads(context)
            except json.JSONDecodeError:
                print(f"Invalid context JSON: {context}")
        
        # Extract phone references (mock db for intent parsing)
        mock_db = None
        resolved_phones = []
        
        # For intent parsing, we'll use a simplified approach
        phone_refs = processor.extract_phone_references(query)
        
        # Classify intent using enhanced method
        intent = processor.classify_query_intent_enhanced(query, resolved_phones, context_data)
        
        return JSONResponse(content={
            "intent_type": intent.query_type,
            "confidence": intent.confidence,
            "relationship": intent.relationship,
            "focus_area": intent.focus_area,
            "phone_references": phone_refs,
            "context_metadata": intent.context_metadata,
            "original_query": intent.original_query,
            "processed_query": intent.processed_query
        })
        
    except Exception as e:
        print(f"Error parsing query intent: {e}")
        return JSONResponse(
            content={"error": "I'm having trouble parsing your query intent."},
            status_code=500
        )

@router.post("/resolve-phones")
async def resolve_phone_names(
    request: PhoneResolutionRequest,
    db: Session = Depends(get_db)
):
    """
    Resolve phone names to database objects
    """
    try:
        phone_names = request.phone_names
        print(f"Resolving phone names: {phone_names}")
        
        # Use phone name resolver
        resolved_phones = phone_name_resolver.resolve_phone_names(phone_names, db)
        
        # Format response
        results = []
        for resolved_phone in resolved_phones:
            results.append({
                "original_reference": resolved_phone.original_reference,
                "matched_phone": resolved_phone.matched_phone,
                "confidence_score": resolved_phone.confidence_score,
                "match_type": resolved_phone.match_type,
                "alternative_matches": resolved_phone.alternative_matches
            })
        
        # Add suggestions for failed resolutions
        failed_names = []
        for name in phone_names:
            if not any(r["original_reference"] == name for r in results):
                failed_names.append(name)
        
        suggestions = {}
        for failed_name in failed_names:
            suggestions[failed_name] = phone_name_resolver.suggest_similar_phones(failed_name, db)
        
        return JSONResponse(content={
            "resolved_phones": results,
            "failed_resolutions": failed_names,
            "suggestions": suggestions,
            "total_requested": len(phone_names),
            "total_resolved": len(results)
        })
        
    except Exception as e:
        print(f"Error resolving phone names: {e}")
        return JSONResponse(
            content={"error": "I'm having trouble resolving the phone names."},
            status_code=500
        )

@router.get("/context/{session_id}")
async def get_conversation_context(
    session_id: str,
    summary_only: bool = Query(False, description="Return only context summary")
):
    """
    Retrieve conversation context for a session
    """
    try:
        print(f"Retrieving context for session: {session_id}")
        
        if summary_only:
            # Return context summary
            summary = context_manager.get_context_summary(session_id)
            return JSONResponse(content=summary)
        else:
            # Return full context
            context = context_manager.get_context(session_id)
            if context:
                return JSONResponse(content=context.to_dict())
            else:
                return JSONResponse(content={"exists": False, "session_id": session_id})
        
    except Exception as e:
        print(f"Error retrieving context: {e}")
        return JSONResponse(
            content={"error": "I'm having trouble retrieving the conversation context."},
            status_code=500
        )

@router.delete("/context/{session_id}")
async def delete_conversation_context(session_id: str):
    """
    Delete conversation context for a session
    """
    try:
        print(f"Deleting context for session: {session_id}")
        
        context_manager.delete_context(session_id)
        
        return JSONResponse(content={
            "message": f"Context deleted for session {session_id}",
            "session_id": session_id
        })
        
    except Exception as e:
        print(f"Error deleting context: {e}")
        return JSONResponse(
            content={"error": "I'm having trouble deleting the conversation context."},
            status_code=500
        )

@router.post("/context/cleanup")
async def cleanup_expired_contexts():
    """
    Clean up expired conversation contexts
    """
    try:
        print("Cleaning up expired contexts")
        
        cleaned_count = context_manager.cleanup_expired_contexts()
        
        return JSONResponse(content={
            "message": f"Cleaned up {cleaned_count} expired contexts",
            "cleaned_count": cleaned_count
        })
        
    except Exception as e:
        print(f"Error cleaning up contexts: {e}")
        return JSONResponse(
            content={"error": "I'm having trouble cleaning up expired contexts."},
            status_code=500
        )
    