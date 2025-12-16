from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import time
import logging
import os

from app.crud import phone as phone_crud
from app.schemas.phone import Phone, PhoneList, BulkPhonesResponse
from app.schemas.recommendation import SmartRecommendation
from app.utils.validation import parse_and_validate_ids, parse_and_validate_slugs
from app.utils.error_handlers import APIErrorHandler
from app.core.database import get_db
from app.models.phone import Phone as PhoneModel
from app.services.recommendation_service import RecommendationService
from app.api import deps
from app.models.user import User
from sqlalchemy.orm.attributes import flag_modified
# Monitoring removed as requested

logger = logging.getLogger(__name__)

router = APIRouter()

def _read_phones_impl(
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
    db: Session = Depends(get_db),
    current_user: Optional[User] = None
):
    """
    Internal implementation for getting phones with filtering and pagination
    """
    # Log request information for debugging
    params = {
        "skip": skip, "limit": limit, "brand": brand, "min_price": min_price,
        "max_price": max_price, "min_ram_gb": min_ram_gb, "min_storage_gb": min_storage_gb,
        "camera_setup": camera_setup, "min_primary_camera_mp": min_primary_camera_mp,
        "min_selfie_camera_mp": min_selfie_camera_mp, "battery_type": battery_type,
        "min_battery_capacity": min_battery_capacity, "display_type": display_type,
        "min_refresh_rate": min_refresh_rate, "min_screen_size": min_screen_size,
        "max_screen_size": max_screen_size, "chipset": chipset, "os": os,
        "sort": sort, "search": search
    }
    APIErrorHandler.log_request_info("/api/v1/phones", params)
    
    # Validate pagination parameters
    validation_error = APIErrorHandler.validate_pagination_params(skip, limit)
    if validation_error:
        raise validation_error
    
    # Validate numeric parameters
    if min_price is not None and min_price < 0:
        raise APIErrorHandler.handle_validation_error(
            "min_price", min_price, "Price must be non-negative"
        )
    
    if max_price is not None and max_price < 0:
        raise APIErrorHandler.handle_validation_error(
            "max_price", max_price, "Price must be non-negative"
        )
    
    if min_price is not None and max_price is not None and min_price > max_price:
        raise APIErrorHandler.handle_validation_error(
            "price_range", f"{min_price}-{max_price}", "Minimum price cannot be greater than maximum price"
        )
    
    try:
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

        # Search usage tracking removed from here to prevent counting every keystroke
        # It is now handled by the /events/search endpoint triggered explicitly

        
        # Convert phones to dictionaries for response
        phones_data = []
        for phone in phones:
            try:
                phone_dict = phone_crud.phone_to_dict(phone)
                phones_data.append(phone_dict)
            except Exception as e:
                logger.warning(f"Error converting phone {getattr(phone, 'id', 'unknown')} to dict: {str(e)}")
                # Skip this phone but continue with others
                continue
        
        logger.info(f"Successfully retrieved {len(phones_data)} phones out of {total} total")
        return {"items": phones_data, "total": total}
        
    except Exception as e:
        # Handle database and other errors
        raise APIErrorHandler.handle_database_error(e, "fetching phones")

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
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(deps.get_current_user_optional)
):
    """
    Get all phones with filtering and pagination
    """
    return _read_phones_impl(
        skip=skip, limit=limit, brand=brand, min_price=min_price, max_price=max_price,
        min_ram_gb=min_ram_gb, min_storage_gb=min_storage_gb, camera_setup=camera_setup,
        min_primary_camera_mp=min_primary_camera_mp, min_selfie_camera_mp=min_selfie_camera_mp,
        battery_type=battery_type, min_battery_capacity=min_battery_capacity,
        display_type=display_type, min_refresh_rate=min_refresh_rate,
        min_screen_size=min_screen_size, max_screen_size=max_screen_size,
        chipset=chipset, os=os, sort=sort, search=search, db=db,
        current_user=current_user
    )

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

@router.get("/cache-stats")
def read_cache_stats():
    """
    Get cache statistics for monitoring performance
    """
    from app.utils import query_cache
    return query_cache.get_cache_stats()

@router.post("/events/search")
def record_search_event(
    query: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Explicitly record a search event for user statistics.
    Should be called when user presses Enter or clicks Search, not on keystroke.
    """
    try:
        stats = current_user.usage_stats or {}
        # Initialize if needed
        if "total_searches" not in stats:
            stats["total_searches"] = 0
        
        stats["total_searches"] += 1
        current_user.usage_stats = stats
        flag_modified(current_user, "usage_stats")
        db.commit()
        
        return {"status": "success", "total_searches": stats["total_searches"]}
    except Exception as e:
        logger.error(f"Failed to record search event for user {current_user.id}: {e}")
        # Return success anyway to not break frontend flow
        return {"status": "error", "message": "Failed to record stats"}

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

@router.get("/slug/{phone_slug}/recommendations", response_model=List[SmartRecommendation])
def get_phone_recommendations(
    phone_slug: str,
    limit: int = 8,
    response: Response = None,  # type: ignore
    db: Session = Depends(get_db)
):
    """
    Get smart recommendations for a specific phone
    
    This endpoint returns a list of recommended phones based on the specified phone slug.
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
    target_phone = phone_crud.get_phone_by_slug(db, slug=phone_slug)
    if target_phone is None:
        raise HTTPException(status_code=404, detail=f"Phone with slug {phone_slug} not found")
    
    # Generate recommendations using the recommendation service
    recommendation_service = RecommendationService(db)
    phone_id = getattr(target_phone, 'id', 0)  # Safely get the id attribute
    recommendations = recommendation_service.get_smart_recommendations(phone_id, limit=limit)
    
    # Set cache headers (24 hours)
    if response:
        cache_time = 24 * 60 * 60  # 24 hours in seconds
        response.headers["Cache-Control"] = f"public, max-age={cache_time}"
        response.headers["ETag"] = f"phone-{phone_slug}-recommendations-{int(time.time() / cache_time)}"
    
    return recommendations

@router.get("/bulk", response_model=BulkPhonesResponse)
def get_phones_bulk_by_slugs(
    slugs: str = Query(..., description="Comma-separated phone slugs (max 50)"),
    response: Response = None,  # type: ignore
    db: Session = Depends(get_db)
):
    """
    Get multiple phones by slugs in a single request.
    
    This endpoint allows fetching multiple phones efficiently for comparison features using slugs.
    
    Args:
        slugs: Comma-separated list of phone slugs (e.g., "samsung-galaxy-a15,realme-narzo-70")
        db: Database session
    
    Returns:
        BulkPhonesResponse with phones array, not_found slugs, and counts
    
    Raises:
        HTTPException: For validation errors or database issues
    """
    try:
        # Parse and validate input slugs
        phone_slugs = parse_and_validate_slugs(slugs)
        
        # Fetch phones from database
        found_phones, not_found_slugs = phone_crud.get_phones_by_slugs(db, phone_slugs)
        
        # Convert to dictionaries for response
        phones_data = [phone_crud.phone_to_dict(phone) for phone in found_phones]
        
        # Convert dictionaries to Phone models
        phone_models = [Phone(**phone_dict) for phone_dict in phones_data]
        
        # Set cache headers (1 hour for bulk phone data)
        if response:
            cache_time = 60 * 60  # 1 hour in seconds
            response.headers["Cache-Control"] = f"public, max-age={cache_time}"
            response.headers["ETag"] = f"bulk-phones-slugs-{hash(tuple(sorted(phone_slugs)))}-{int(time.time() / cache_time)}"
        
        # Return structured response
        return BulkPhonesResponse(
            phones=phone_models,
            not_found=[],
            total_requested=len(phone_slugs),
            total_found=len(phones_data)
        )
        
    except HTTPException:
        # Re-raise validation errors as-is
        raise
    except Exception as e:
        # Handle unexpected database or system errors
        raise HTTPException(
            status_code=500,
            detail={
                "error_code": "DATABASE_ERROR",
                "message": "Internal server error occurred while fetching phones by slugs"
            }
        )

@router.get("/slug/{phone_slug}", response_model=Phone)
def read_phone_by_slug(phone_slug: str, db: Session = Depends(get_db)):
    """
    Get a specific phone by slug
    """
    db_phone = phone_crud.get_phone_by_slug(db, slug=phone_slug)
    if db_phone is None:
        raise HTTPException(status_code=404, detail=f"Phone with slug '{phone_slug}' not found")
    return phone_crud.phone_to_dict(db_phone)

@router.get("/name/{phone_name}", response_model=Phone)
def read_phone_by_name(phone_name: str, db: Session = Depends(get_db)):
    """
    Get a specific phone by name
    """
    db_phone = phone_crud.get_phone_by_name(db, name=phone_name)
    if db_phone is None:
        raise HTTPException(status_code=404, detail=f"Phone with name '{phone_name}' not found")
    return db_phone

@router.get("/{phone_id}")
def read_phone(phone_id: int, request: Request, db: Session = Depends(get_db)):
    """
    Get a specific phone by ID - redirects to slug-based URL for SEO
    """
    # Check if phone exists
    db_phone = phone_crud.get_phone(db, phone_id=phone_id)
    if db_phone is None:
        raise HTTPException(status_code=404, detail=f"Phone with ID {phone_id} not found")
    
    # Get the phone's slug for redirect
    phone_slug = phone_crud.get_phone_slug_by_id(db, phone_id)
    if phone_slug:
        # Build redirect URL ensuring HTTPS in production
        if os.getenv("ENVIRONMENT") == "production":
            # Use absolute URL with HTTPS in production
            base_url = str(request.base_url).replace("http://", "https://")
            redirect_url = f"{base_url.rstrip('/')}/api/v1/phones/slug/{phone_slug}"
        else:
            # Use relative URL in development
            redirect_url = f"/api/v1/phones/slug/{phone_slug}"
            
        # Redirect to slug-based URL with 301 (permanent redirect)
        return RedirectResponse(
            url=redirect_url,
            status_code=301
        )
    else:
        # Fallback: return phone data directly if no slug available
        return phone_crud.phone_to_dict(db_phone)
