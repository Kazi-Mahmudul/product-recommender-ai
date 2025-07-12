from typing import List, Union, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
import os
import re

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
        "refresh rate": "refresh_rate_hz",
        "refresh_rate": "refresh_rate_hz",
        "screen size": "screen_size_inches",
        "display size": "screen_size_inches",
        "battery": "battery_capacity_numeric",
        "battery capacity": "battery_capacity_numeric",
        "camera": "primary_camera_mp",
        "primary camera": "primary_camera_mp",
        "selfie camera": "selfie_camera_mp",
        "front camera": "selfie_camera_mp",
        "ram": "ram_gb",
        "storage": "storage_gb",
        "price": "price_original",
        "chipset": "chipset",
        "processor": "chipset",
        "cpu": "cpu",
        "gpu": "gpu",
        "display type": "display_type",
        "screen protection": "screen_protection",
        "camera setup": "camera_setup",
        "battery type": "battery_type",
        "charging": "quick_charging",
        "wireless charging": "has_wireless_charging",
        "fast charging": "has_fast_charging",
        "fingerprint": "fingerprint_sensor",
        "face unlock": "face_unlock",
        "operating system": "operating_system",
        "os": "operating_system",
        "weight": "weight",
        "thickness": "thickness",
        "colors": "colors",
        "waterproof": "waterproof",
        "ip rating": "ip_rating",
        "bluetooth": "bluetooth",
        "nfc": "nfc",
        "usb": "usb",
        "sim": "sim_slot",
        "5g": "network",
        "4g": "network"
    }
    
    query_lower = query.lower()
    for feature_name, db_column in features.items():
        if feature_name in query_lower:
            return db_column
    
    return None

def generate_qa_response(db: Session, query: str) -> str:
    """Generate a response for QA queries"""
    phone_names = extract_phone_names_from_query(query)
    feature = extract_feature_from_query(query)
    
    if not phone_names:
        return "I couldn't identify a specific phone in your query. Could you please mention the phone name?"
    
    if not feature:
        return "I couldn't identify a specific feature in your query. Could you please specify what feature you're asking about?"
    
    phone_name = phone_names[0]
    phone = phone_crud.get_phone_by_name_or_model(db, phone_name)
    
    if not phone:
        return f"Sorry, I couldn't find information about {phone_name} in our database."
    
    feature_value = getattr(phone, feature, None)
    if feature_value is None:
        return f"Sorry, I don't have information about the {feature} for {phone_name}."
    
    # Format the response based on the feature
    feature_display_names = {
        "refresh_rate_hz": "refresh rate",
        "screen_size_inches": "screen size",
        "battery_capacity_numeric": "battery capacity",
        "primary_camera_mp": "primary camera",
        "selfie_camera_mp": "selfie camera",
        "ram_gb": "RAM",
        "storage_gb": "storage",
        "price_original": "price",
        "weight": "weight",
        "thickness": "thickness"
    }
    
    display_name = feature_display_names.get(feature, feature)
    
    if feature == "refresh_rate_hz":
        return f"The {phone_name} has a {feature_value}Hz refresh rate."
    elif feature == "screen_size_inches":
        return f"The {phone_name} has a {feature_value}-inch screen."
    elif feature == "battery_capacity_numeric":
        return f"The {phone_name} has a {feature_value}mAh battery."
    elif feature in ["primary_camera_mp", "selfie_camera_mp"]:
        return f"The {phone_name} has a {feature_value}MP {display_name}."
    elif feature in ["ram_gb", "storage_gb"]:
        return f"The {phone_name} has {feature_value}GB {display_name}."
    elif feature == "price_original":
        return f"The {phone_name} costs ৳{feature_value:,.0f}."
    else:
        return f"The {phone_name} has {feature_value} for {display_name}."

def generate_comparison_response(db: Session, query: str) -> str:
    """Generate a response for comparison queries"""
    phone_names = extract_phone_names_from_query(query)
    
    if len(phone_names) < 2:
        return "I couldn't identify two phones to compare. Please mention both phone names."
    
    phones = phone_crud.get_phones_by_names(db, phone_names)
    
    if len(phones) < 2:
        return f"I couldn't find information about one or both phones: {', '.join(phone_names)}"
    
    phone1, phone2 = phones[0], phones[1]
    
    # Compare key features
    comparison = f"Here's a comparison between {phone1.name} and {phone2.name}:\n\n"
    
    # Price comparison
    if phone1.price_original and phone2.price_original:
        price_diff = phone1.price_original - phone2.price_original
        if price_diff > 0:
            comparison += f"💰 Price: {phone2.name} is ৳{price_diff:,.0f} cheaper\n"
        else:
            comparison += f"💰 Price: {phone1.name} is ৳{abs(price_diff):,.0f} cheaper\n"
    
    # Display comparison
    if phone1.screen_size_inches and phone2.screen_size_inches:
        comparison += f"📱 Screen: {phone1.name} ({phone1.screen_size_inches}\") vs {phone2.name} ({phone2.screen_size_inches}\")\n"
    
    # Camera comparison
    if phone1.primary_camera_mp and phone2.primary_camera_mp:
        if phone1.primary_camera_mp > phone2.primary_camera_mp:
            comparison += f"📸 Camera: {phone1.name} has better camera ({phone1.primary_camera_mp}MP vs {phone2.primary_camera_mp}MP)\n"
        else:
            comparison += f"📸 Camera: {phone2.name} has better camera ({phone2.primary_camera_mp}MP vs {phone1.primary_camera_mp}MP)\n"
    
    # Battery comparison
    if phone1.battery_capacity_numeric and phone2.battery_capacity_numeric:
        if phone1.battery_capacity_numeric > phone2.battery_capacity_numeric:
            comparison += f"🔋 Battery: {phone1.name} has larger battery ({phone1.battery_capacity_numeric}mAh vs {phone2.battery_capacity_numeric}mAh)\n"
        else:
            comparison += f"🔋 Battery: {phone2.name} has larger battery ({phone2.battery_capacity_numeric}mAh vs {phone1.battery_capacity_numeric}mAh)\n"
    
    # Performance comparison
    if phone1.overall_device_score and phone2.overall_device_score:
        if phone1.overall_device_score > phone2.overall_device_score:
            comparison += f"⚡ Performance: {phone1.name} has better overall score ({phone1.overall_device_score:.1f} vs {phone2.overall_device_score:.1f})\n"
        else:
            comparison += f"⚡ Performance: {phone2.name} has better overall score ({phone2.overall_device_score:.1f} vs {phone1.overall_device_score:.1f})\n"
    
    return comparison

@router.post("/query")
async def process_natural_language_query(
    query: str,
    db: Session = Depends(get_db)
) -> Union[List[Phone], str]:
    """
    Process a natural language query and return relevant phone recommendations
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
                    # Fallback to chat response for non-200 status
                    return f"I'm having trouble processing your query right now. Please try again in a moment. (Error: {response.status_code})"
                
                result = response.json()
                print(f"Gemini response: {result}")
                
                # Handle different response formats
                if result.get("type") == "recommendation":
                    filters = result.get("filters", {})
                    print(f"Processing recommendation with filters: {filters}")
                elif result.get("type") == "qa":
                    print("Processing QA query")
                    # Handle QA queries
                    return generate_qa_response(db, query)
                elif result.get("type") == "comparison":
                    print("Processing comparison query")
                    # Handle comparison queries
                    return generate_comparison_response(db, query)
                elif result.get("type") == "chat":
                    print("Processing chat query")
                    # For chat queries, return the response data as a string
                    return result.get("data", "I'm here to help you with smartphone questions!")
                else:
                    print(f"Unknown response type: {result.get('type')}")
                    # Fallback for old format or unknown type
                    filters = result.get("filters", {})
                    if not filters:
                        # If no filters, return a helpful message
                        return "I'm here to help you with smartphone questions! You can ask me about:\n\n• Phone recommendations (e.g., 'best phones under 30000')\n• Specific features (e.g., 'What is the battery capacity of Galaxy A55?')\n• Phone comparisons (e.g., 'Compare POCO X6 vs Redmi Note 13 Pro')\n• General questions about smartphones"
            except httpx.ConnectError as e:
                print(f"Connection error to Gemini service: {e}")
                return "I'm having trouble connecting to my AI service right now. Please try again in a moment."
            except httpx.TimeoutException as e:
                print(f"Timeout error to Gemini service: {e}")
                return "The AI service is taking too long to respond. Please try again in a moment."
            except Exception as e:
                print(f"Unexpected error calling Gemini service: {e}")
                return "I'm experiencing some technical difficulties. Please try again in a moment."

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
            return results

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
                min_refresh_rate_hz=filters.get("min_refresh_rate_hz"),
                max_refresh_rate_hz=filters.get("max_refresh_rate_hz"),
                min_screen_size_inches=filters.get("min_screen_size_inches"),
                max_screen_size_inches=filters.get("max_screen_size_inches"),
                min_battery_capacity_numeric=filters.get("min_battery_capacity_numeric"),
                max_battery_capacity_numeric=filters.get("max_battery_capacity_numeric"),
                min_primary_camera_mp=filters.get("min_primary_camera_mp"),
                max_primary_camera_mp=filters.get("max_primary_camera_mp"),
                min_selfie_camera_mp=filters.get("min_selfie_camera_mp"),
                max_selfie_camera_mp=filters.get("max_selfie_camera_mp"),
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
                limit=filters.get("limit")
            )

            print(f"Found {len(recommendations)} recommendations")

            # If limit is not specified in the query but we have results, return top 5 by default
            if filters.get("limit") is None and recommendations:
                return recommendations[:5]
            return recommendations
        except Exception as e:
            print(f"Database error: {e}")
            return "I'm having trouble accessing the phone database right now. Please try again in a moment."

    except httpx.HTTPError as e:
        print(f"HTTP error: {e}")
        return "I'm having trouble processing your query right now. Please try again in a moment."
    except Exception as e:
        print(f"Unexpected error: {e}")
        return "I'm experiencing some technical difficulties. Please try again in a moment."