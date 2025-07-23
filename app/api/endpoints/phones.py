from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
import time

from app.crud import phone as phone_crud
from app.schemas.phone import Phone, PhoneList
from app.schemas.recommendation import SmartRecommendation
from app.core.database import get_db
from app.models.phone import Phone as PhoneModel
from app.services.recommendation_service import RecommendationService
from app.core.monitoring import track_execution_time

router = APIRouter()

@router.get("/", response_model=PhoneList)
def read_phones(
    skip: int = 0,
    limit: int = 100,
    brand: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_ram_gb: Optional[int] = None,
    min_storage_gb: Optional[int] = None,
    camera_setup: Optional[str] = None,
    min_primary_camera_mp: Optional[float] = None,
    min_selfie_camera_mp: Optional[float] = None,
    battery_type: Optional[str] = None,
    min_battery_capacity: Optional[int] = None,
    display_type: Optional[str] = None,
    min_refresh_rate: Optional[int] = None,
    min_screen_size: Optional[float] = None,
    max_screen_size: Optional[float] = None,
    chipset: Optional[str] = None,
    os: Optional[str] = None,
    sort: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get all phones with filtering and pagination
    """
    phones, total = phone_crud.get_phones(
        db, 
        skip=skip, 
        limit=limit,
        brand=brand,
        min_price=min_price,
        max_price=max_price,
        min_ram_gb=min_ram_gb,
        min_storage_gb=min_storage_gb,
        camera_setup=camera_setup,
        min_primary_camera_mp=min_primary_camera_mp,
        min_selfie_camera_mp=min_selfie_camera_mp,
        battery_type=battery_type,
        min_battery_capacity=min_battery_capacity,
        display_type=display_type,
        min_refresh_rate=min_refresh_rate,
        min_screen_size=min_screen_size,
        max_screen_size=max_screen_size,
        chipset=chipset,
        operating_system=os,
        sort=sort,
        search=search
    )
    return {"items": phones, "total": total}

@router.get("/brands", response_model=List[str])
def read_brands(db: Session = Depends(get_db)):
    """
    Get all unique phone brands
    """
    brands = db.query(PhoneModel.brand).distinct().all()
    return [b[0] for b in brands if b[0] is not None]

@router.get("/price-range")
def read_price_range(db: Session = Depends(get_db)):
    """
    Get the minimum and maximum phone price
    """
    return phone_crud.get_price_range(db)

@router.get("/filter-options")
def read_filter_options(db: Session = Depends(get_db)):
    """
    Get available filter options for the phones
    """
    # Get price range
    price_range = phone_crud.get_price_range(db)
    
    # Get unique values and ranges for various filters
    # For display types, we'll limit to common types and clean the data
    display_types_query = db.query(PhoneModel.display_type).filter(
        PhoneModel.display_type.isnot(None),
        PhoneModel.display_type != ""
    ).distinct().all()
    
    # For battery types, we'll extract the main types (Li-Po, Li-Ion, etc.)
    battery_types_query = db.query(PhoneModel.battery_type).filter(
        PhoneModel.battery_type.isnot(None),
        PhoneModel.battery_type != ""
    ).distinct().all()
    
    # For chipsets, we'll group by manufacturer (Snapdragon, Exynos, etc.)
    chipsets_query = db.query(PhoneModel.chipset).filter(
        PhoneModel.chipset.isnot(None),
        PhoneModel.chipset != ""
    ).distinct().all()
    
    # For operating systems, we'll extract the main OS (Android, iOS, etc.)
    operating_systems_query = db.query(PhoneModel.operating_system).filter(
        PhoneModel.operating_system.isnot(None),
        PhoneModel.operating_system != ""
    ).distinct().all()
    
    # Get numeric ranges
    main_camera_range = {
        "min": db.query(func.min(PhoneModel.primary_camera_mp)).scalar() or 0,
        "max": db.query(func.max(PhoneModel.primary_camera_mp)).scalar() or 200
    }
    
    front_camera_range = {
        "min": db.query(func.min(PhoneModel.selfie_camera_mp)).scalar() or 0,
        "max": db.query(func.max(PhoneModel.selfie_camera_mp)).scalar() or 100
    }
    
    display_size_range = {
        "min": db.query(func.min(PhoneModel.screen_size_numeric)).scalar() or 4,
        "max": db.query(func.max(PhoneModel.screen_size_numeric)).scalar() or 8
    }
    
    battery_capacity_range = {
        "min": db.query(func.min(PhoneModel.battery_capacity_numeric)).scalar() or 2000,
        "max": db.query(func.max(PhoneModel.battery_capacity_numeric)).scalar() or 7000
    }
    
    # Get common RAM and storage options
    ram_options = [2, 4, 6, 8, 12, 16, 32]
    storage_options = [16, 32, 64, 128, 256, 512, 1024]
    refresh_rate_options = [60, 90, 120, 144, 165]
    
    # Process and clean the filter options
    display_types_list = []
    for d in display_types_query:
        if d[0] and isinstance(d[0], str):
            # Clean and normalize display type
            display_type = d[0].strip()
            if display_type and len(display_type) > 1:  # Avoid single character entries
                display_types_list.append(display_type)
    
    battery_types_list = []
    for b in battery_types_query:
        if b[0] and isinstance(b[0], str):
            # Extract main battery type (Li-Po, Li-Ion, etc.)
            battery_type = b[0].strip()
            if "Li-Po" in battery_type:
                if "Li-Po" not in battery_types_list:
                    battery_types_list.append("Li-Po")
            elif "Li-Ion" in battery_type:
                if "Li-Ion" not in battery_types_list:
                    battery_types_list.append("Li-Ion")
            elif len(battery_type) > 1:  # Avoid single character entries
                battery_types_list.append(battery_type)
    
    chipsets_list = []
    for c in chipsets_query:
        if c[0] and isinstance(c[0], str):
            chipset = c[0].strip()
            if chipset and len(chipset) > 1:  # Avoid single character entries
                # Extract main chipset manufacturer
                if "Snapdragon" in chipset and "Snapdragon" not in chipsets_list:
                    chipsets_list.append("Snapdragon")
                elif "Exynos" in chipset and "Exynos" not in chipsets_list:
                    chipsets_list.append("Exynos")
                elif "MediaTek" in chipset and "MediaTek" not in chipsets_list:
                    chipsets_list.append("MediaTek")
                elif "Apple" in chipset and "Apple" not in chipsets_list:
                    chipsets_list.append("Apple")
                elif "Kirin" in chipset and "Kirin" not in chipsets_list:
                    chipsets_list.append("Kirin")
                elif len(chipset) > 3:  # Avoid very short entries
                    chipsets_list.append(chipset)
    
    operating_systems_list = []
    for o in operating_systems_query:
        if o[0] and isinstance(o[0], str):
            os = o[0].strip()
            if "Android" in os and "Android" not in operating_systems_list:
                operating_systems_list.append("Android")
            elif "iOS" in os and "iOS" not in operating_systems_list:
                operating_systems_list.append("iOS")
            elif "HarmonyOS" in os and "HarmonyOS" not in operating_systems_list:
                operating_systems_list.append("HarmonyOS")
            elif len(os) > 1:  # Avoid single character entries
                operating_systems_list.append(os)
    
    # If we don't have enough values, add some common ones
    if len(display_types_list) < 2:
        display_types_list = ["AMOLED", "IPS LCD", "OLED", "Super AMOLED", "Dynamic AMOLED", "TFT"]
    
    if len(battery_types_list) < 2:
        battery_types_list = ["Li-Po", "Li-Ion"]
    
    if len(chipsets_list) < 2:
        chipsets_list = ["Snapdragon", "Exynos", "MediaTek", "Apple", "Kirin"]
    
    if len(operating_systems_list) < 2:
        operating_systems_list = ["Android", "iOS", "HarmonyOS"]
    
    # Sort the lists for better user experience
    display_types_list.sort()
    battery_types_list.sort()
    chipsets_list.sort()
    operating_systems_list.sort()
    
    # Log the values for debugging
    print(f"Display types: {display_types_list}")
    print(f"Battery types: {battery_types_list}")
    print(f"Chipsets: {chipsets_list}")
    print(f"Operating systems: {operating_systems_list}")
    
    # Return the filter options in the format expected by the frontend
    return {
        "priceRange": price_range,
        "displayTypes": display_types_list,
        "batteryTypes": battery_types_list,
        "chipsets": chipsets_list,
        "operatingSystems": operating_systems_list,
        "mainCameraRange": main_camera_range,
        "frontCameraRange": front_camera_range,
        "displaySizeRange": display_size_range,
        "batteryCapacityRange": battery_capacity_range,
        "ramOptions": ram_options,
        "storageOptions": storage_options,
        "refreshRateOptions": refresh_rate_options
    }

@router.get("/recommendations", response_model=List[Phone])
def get_smart_recommendations(
    min_display_score: Optional[float] = None,
    min_camera_score: Optional[float] = None,
    min_battery_score: Optional[float] = None,
    max_price: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """
    Get smart phone recommendations based on derived scores and price.
    """
    recommendations = phone_crud.get_smart_recommendations(
        db,
        min_display_score=min_display_score,
        min_camera_score=min_camera_score,
        min_battery_score=min_battery_score,
        max_price=max_price
    )
    return recommendations

@router.get("/{phone_id}/recommendations", response_model=List[SmartRecommendation])
@track_execution_time("get_phone_recommendations_endpoint", "api_response_times")
def get_phone_recommendations(
    phone_id: int,
    limit: int = 8,
    response: Response = None,
    db: Session = Depends(get_db)
):
    """
    Get smart recommendations for a specific phone
    
    This endpoint returns a list of recommended phones based on the specified phone ID.
    The recommendations are generated using multiple matching algorithms including:
    - Price proximity matching
    - Specification similarity
    - Purpose-based score matching
    - AI-powered similarity analysis
    
    Each recommendation includes:
    - Phone details
    - Similarity score
    - Highlight labels
    - Badges
    - Match reasons
    """
    # Check if phone exists
    target_phone = phone_crud.get_phone(db, phone_id=phone_id)
    if target_phone is None:
        raise HTTPException(status_code=404, detail=f"Phone with ID {phone_id} not found")
    
    # Generate recommendations using the recommendation service
    recommendation_service = RecommendationService(db)
    recommendations = recommendation_service.get_smart_recommendations(phone_id, limit=limit)
    
    # Set cache headers (24 hours)
    if response:
        cache_time = 24 * 60 * 60  # 24 hours in seconds
        response.headers["Cache-Control"] = f"public, max-age={cache_time}"
        response.headers["ETag"] = f"phone-{phone_id}-recommendations-{int(time.time() / cache_time)}"
    
    return recommendations

@router.get("/name/{phone_name}", response_model=Phone)
def read_phone_by_name(phone_name: str, db: Session = Depends(get_db)):
    """
    Get a specific phone by name
    """
    db_phone = phone_crud.get_phone_by_name(db, name=phone_name)
    if db_phone is None:
        raise HTTPException(status_code=404, detail=f"Phone with name '{phone_name}' not found")
    return db_phone

@router.get("/{phone_id}", response_model=Phone)
def read_phone(phone_id: int, db: Session = Depends(get_db)):
    """
    Get a specific phone by ID
    """
    db_phone = phone_crud.get_phone(db, phone_id=phone_id)
    if db_phone is None:
        raise HTTPException(status_code=404, detail=f"Phone with ID {phone_id} not found")
    return db_phone
