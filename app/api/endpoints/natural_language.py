from typing import List, Union, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
import os
import re
import numpy as np
from fastapi.responses import JSONResponse

from app.crud import phone as phone_crud
from app.schemas.phone import Phone
from app.core.database import get_db
from app.core.config import settings

router = APIRouter()

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Natural language processing is available"}

@router.get("/test")
async def test_endpoint():
    """Test endpoint to check basic functionality"""
    return {"message": "Natural language endpoint is working"}

def extract_phone_names_from_query(query: str) -> List[str]:
    """Extract phone names from a query using common patterns"""
    # Common phone brand patterns
    brands = ["Samsung", "Apple", "iPhone", "Xiaomi", "POCO", "Redmi", "OnePlus", "OPPO", "Vivo", "Realme", "Nothing", "Google", "Pixel"]
    
    phone_names = []
    query_lower = query.lower()
    
    # Look for brand + model patterns
    for brand in brands:
        brand_lower = brand.lower()
        if brand_lower in query_lower:
            # Find the model number after the brand
            brand_index = query_lower.find(brand_lower)
            remaining_text = query[brand_index + len(brand):].strip()
            
            # Extract model number (usually starts with a letter or number)
            model_match = re.search(r'([A-Za-z0-9]+(?:\s*[A-Za-z0-9]+)*)', remaining_text)
            if model_match:
                model = model_match.group(1).strip()
                phone_names.append(f"{brand} {model}")
            else:
                phone_names.append(brand)
    
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

    # Key features for comparison - only numeric columns for better comparison
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
    
    # Generate comparison summary
    summary = generate_comparison_summary(phones, chart_features)
    
    return {
        "type": "comparison",
        "phones": phone_infos,
        "features": chart_features,
        "summary": summary
    }

@router.post("/query")
async def process_natural_language_query(
    query: str,
    db: Session = Depends(get_db)
):
    """
    Process a natural language query and return relevant phone recommendations, QA, comparison, or error as JSON.
    """
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
                
            # If limit is not specified in the query but we have results, return top 5 by default
            if filters.get("limit") is None and valid_recommendations:
                return JSONResponse(content=valid_recommendations[:5])
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
    