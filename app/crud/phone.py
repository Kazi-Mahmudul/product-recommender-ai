from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Float
import logging

from app.models.phone import Phone
from app.schemas.phone import PhoneCreate
from rapidfuzz import process, fuzz

logger = logging.getLogger(__name__)

def phone_to_dict(phone: Phone, include_optimized_images: bool = True) -> Dict[str, Any]:
    """
    Convert SQLAlchemy Phone object to dictionary for JSON serialization
    Ensures 'id' is present and is an integer > 0 if possible.
    Logs the output for debugging.
    """
    # Import here to avoid circular imports
    from app.services.image_optimizer import ImageOptimizer
    
    # Add optimized image URLs if requested
    optimized_images = {}
    if include_optimized_images and phone.img_url:
        try:
            optimized_images = {
                "img_url_card": ImageOptimizer.get_optimized_phone_image(phone.img_url, "card"),
                "img_url_thumbnail": ImageOptimizer.get_optimized_phone_image(phone.img_url, "thumbnail"),
                "img_url_detail": ImageOptimizer.get_optimized_phone_image(phone.img_url, "detail"),
                "img_url_list": ImageOptimizer.get_optimized_phone_image(phone.img_url, "list"),
            }
        except Exception as e:
            logger.error(f"Error generating optimized image URLs: {str(e)}")
    
    result = {
        "id": int(getattr(phone, 'id', 0)) if getattr(phone, 'id', None) is not None else 0,
        "name": getattr(phone, 'name', None) or "Unknown Phone",
        "brand": getattr(phone, 'brand', None) or "Unknown",
        "model": getattr(phone, 'model', None) or "Unknown Model",
        "price": getattr(phone, 'price', None) or "",
        "url": getattr(phone, 'url', None) or "",
        "img_url": getattr(phone, 'img_url', None) or "https://via.placeholder.com/300x300?text=No+Image",
        **optimized_images,
        "display_type": phone.display_type,
        "screen_size_inches": phone.screen_size_inches,
        "display_resolution": phone.display_resolution,
        "pixel_density_ppi": phone.pixel_density_ppi,
        "refresh_rate_hz": phone.refresh_rate_hz,
        "screen_protection": phone.screen_protection,
        "display_brightness": phone.display_brightness,
        "aspect_ratio": phone.aspect_ratio,
        "hdr_support": phone.hdr_support,
        "chipset": phone.chipset,
        "cpu": phone.cpu,
        "gpu": phone.gpu,
        "ram": phone.ram,
        "ram_type": phone.ram_type,
        "internal_storage": phone.internal_storage,
        "storage_type": phone.storage_type,
        "camera_setup": phone.camera_setup,
        "primary_camera_resolution": phone.primary_camera_resolution,
        "selfie_camera_resolution": phone.selfie_camera_resolution,
        "primary_camera_video_recording": phone.primary_camera_video_recording,
        "selfie_camera_video_recording": phone.selfie_camera_video_recording,
        "primary_camera_ois": phone.primary_camera_ois,
        "primary_camera_aperture": phone.primary_camera_aperture,
        "selfie_camera_aperture": phone.selfie_camera_aperture,
        "camera_features": phone.camera_features,
        "autofocus": phone.autofocus,
        "flash": phone.flash,
        "settings": phone.settings,
        "zoom": phone.zoom,
        "shooting_modes": phone.shooting_modes,
        "video_fps": phone.video_fps,
        "battery_type": phone.battery_type,
        "capacity": phone.capacity,
        "quick_charging": phone.quick_charging,
        "wireless_charging": phone.wireless_charging,
        "reverse_charging": phone.reverse_charging,
        "build": phone.build,
        "weight": phone.weight,
        "thickness": phone.thickness,
        "colors": phone.colors,
        "waterproof": phone.waterproof,
        "ip_rating": phone.ip_rating,
        "ruggedness": phone.ruggedness,
        "network": phone.network,
        "speed": phone.speed,
        "sim_slot": phone.sim_slot,
        "volte": phone.volte,
        "bluetooth": phone.bluetooth,
        "wlan": phone.wlan,
        "gps": phone.gps,
        "nfc": phone.nfc,
        "usb": phone.usb,
        "usb_otg": phone.usb_otg,
        "fingerprint_sensor": phone.fingerprint_sensor,
        "finger_sensor_type": phone.finger_sensor_type,
        "finger_sensor_position": phone.finger_sensor_position,
        "face_unlock": phone.face_unlock,
        "light_sensor": phone.light_sensor,
        "infrared": phone.infrared,
        "fm_radio": phone.fm_radio,
        "operating_system": phone.operating_system,
        "os_version": phone.os_version,
        "user_interface": phone.user_interface,
        "status": phone.status,
        "made_by": phone.made_by,
        "release_date": phone.release_date,
        "price_original": phone.price_original,
        "price_category": phone.price_category,
        "storage_gb": phone.storage_gb,
        "ram_gb": phone.ram_gb,
        "price_per_gb": phone.price_per_gb,
        "price_per_gb_ram": phone.price_per_gb_ram,
        "screen_size_numeric": phone.screen_size_numeric,
        "resolution_width": phone.resolution_width,
        "resolution_height": phone.resolution_height,
        "ppi_numeric": phone.ppi_numeric,
        "refresh_rate_numeric": phone.refresh_rate_numeric,
        "camera_count": phone.camera_count,
        "primary_camera_mp": phone.primary_camera_mp,
        "selfie_camera_mp": phone.selfie_camera_mp,
        "battery_capacity_numeric": phone.battery_capacity_numeric,
        "has_fast_charging": phone.has_fast_charging,
        "has_wireless_charging": phone.has_wireless_charging,
        "charging_wattage": phone.charging_wattage,
        "battery_score": phone.battery_score,
        "security_score": phone.security_score,
        "connectivity_score": phone.connectivity_score,
        "is_popular_brand": phone.is_popular_brand,
        "release_date_clean": phone.release_date_clean.isoformat() if phone.release_date_clean else None,
        "is_new_release": phone.is_new_release,
        "age_in_months": phone.age_in_months,
        "is_upcoming": phone.is_upcoming,
        "overall_device_score": phone.overall_device_score,
        "performance_score": phone.performance_score,
        "display_score": phone.display_score,
        "camera_score": phone.camera_score
    }
    # Defensive: If id is not a positive integer, log a warning
    if not isinstance(result["id"], int) or result["id"] <= 0:
        logger.warning(f"phone_to_dict: Invalid or missing id for phone: {getattr(phone, 'name', None)} (raw id: {getattr(phone, 'id', None)})")
    # Log the output for debugging
    logger.debug(f"phone_to_dict output: {result}")
    return result

def get_phones(
    db: Session, 
    skip: int = 0, 
    limit: int = 100,
    brand: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_ram_gb: Optional[int] = None,
    min_storage_gb: Optional[int] = None,
    min_refresh_rate: Optional[int] = None,
    search: Optional[str] = None
) -> Tuple[List[Phone], int]:
    """Get phones with optional filtering"""
    query = db.query(Phone)
    
    # Apply filters if provided
    if brand:
        query = query.filter(Phone.brand == brand)
    if min_price is not None:
        query = query.filter(Phone.price_original >= min_price)
    if max_price is not None:
        query = query.filter(Phone.price_original <= max_price)
    if min_ram_gb is not None:
        query = query.filter(Phone.ram_gb >= min_ram_gb)
    if min_storage_gb is not None:
        query = query.filter(Phone.storage_gb >= min_storage_gb)
    if min_refresh_rate is not None:
        query = query.filter(Phone.refresh_rate_hz >= min_refresh_rate)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Phone.name.ilike(search_term)) | 
            (Phone.brand.ilike(search_term)) |
            (Phone.model.ilike(search_term))
        )
    
    total = query.count()
    phones = query.offset(skip).limit(limit).all()
    return phones, total

def get_phone(db: Session, phone_id: int) -> Optional[Phone]:
    """
    Get a single phone by ID
    """
    return db.query(Phone).filter(Phone.id == phone_id).first()

def get_phone_by_name(db: Session, name: str) -> Optional[Phone]:
    """
    Get a single phone by name
    """
    return db.query(Phone).filter(Phone.name == name).first()

def get_phone_by_name_and_brand(db: Session, name: str, brand: str) -> Optional[Phone]:
    """
    Get a single phone by name and brand
    """
    return db.query(Phone).filter(
        Phone.name == name,
        Phone.brand == brand
    ).first()

def get_brands(db: Session) -> List[str]:
    """
    Get all unique brands in the database
    """
    try:
        return [brand[0] for brand in db.query(Phone.brand).distinct().all()]
    except Exception as e:
        logger.error(f"Error fetching brands: {str(e)}")
        return []

def get_price_range(db: Session) -> Dict[str, float]:
    """
    Get the minimum and maximum price in the database
    """
    try:
        min_price = db.query(func.min(Phone.price_original)).scalar()
        max_price = db.query(func.max(Phone.price_original)).scalar()
        return {"min": min_price, "max": max_price}
    except Exception as e:
        logger.error(f"Error fetching price range: {str(e)}")
        return {"min": None, "max": None}

def create_phone(db: Session, phone: PhoneCreate) -> Phone:
    """
    Create a new phone
    """
    try:
        db_phone = Phone(**phone.model_dump())
        db.add(db_phone)
        db.commit()
        db.refresh(db_phone)
        logger.info(f"Created phone: {db_phone.name} with ID {db_phone.id}")
        
        # Invalidate recommendation cache for all phones
        # We import here to avoid circular imports
        from app.services.cache_invalidation import CacheInvalidationService
        CacheInvalidationService.invalidate_phone_recommendations()
        
        return db_phone
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating phone: {str(e)}")
        raise

def create_phones_batch(db: Session, phones: List[Dict[str, Any]]) -> List[Phone]:
    """
    Create multiple phones at once
    """
    try:
        db_phones = []
        for phone_data in phones:
            try:
                db_phone = Phone(**phone_data)
                db.add(db_phone)
                db_phones.append(db_phone)
            except Exception as e:
                logger.error(f"Error creating phone {phone_data.get('name', 'Unknown')}: {str(e)}")
                continue
        
        db.commit()
        for phone in db_phones:
            db.refresh(phone)
            logger.info(f"Created phone: {phone.name} with ID {phone.id}")
        
        # Invalidate recommendation cache for all phones
        # We import here to avoid circular imports
        from app.services.cache_invalidation import CacheInvalidationService
        CacheInvalidationService.invalidate_phone_recommendations()
        
        return db_phones
    except Exception as e:
        db.rollback()
        logger.error(f"Error in batch creation: {str(e)}")
        raise

def get_smart_recommendations(
    db: Session,
    min_display_score: Optional[float] = None,
    max_display_score: Optional[float] = None,
    min_camera_score: Optional[float] = None,
    max_camera_score: Optional[float] = None,
    min_battery_score: Optional[float] = None,
    max_battery_score: Optional[float] = None,
    min_performance_score: Optional[float] = None,
    max_performance_score: Optional[float] = None,
    min_security_score: Optional[float] = None,
    max_security_score: Optional[float] = None,
    min_connectivity_score: Optional[float] = None,
    max_connectivity_score: Optional[float] = None,
    min_overall_device_score: Optional[float] = None,
    max_overall_device_score: Optional[float] = None,
    min_ram_gb: Optional[float] = None,
    max_ram_gb: Optional[float] = None,
    min_storage_gb: Optional[float] = None,
    max_storage_gb: Optional[float] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    brand: Optional[str] = None,
    min_refresh_rate_numeric: Optional[int] = None,
    max_refresh_rate_numeric: Optional[int] = None,
    min_screen_size_numeric: Optional[float] = None,
    max_screen_size_numeric: Optional[float] = None,
    min_battery_capacity_numeric: Optional[int] = None,
    max_battery_capacity_numeric: Optional[int] = None,
    min_primary_camera_mp: Optional[float] = None,
    max_primary_camera_mp: Optional[float] = None,
    min_selfie_camera_mp: Optional[float] = None,
    max_selfie_camera_mp: Optional[float] = None,
    min_camera_count: Optional[int] = None,
    max_camera_count: Optional[int] = None,
    has_fast_charging: Optional[bool] = None,
    has_wireless_charging: Optional[bool] = None,
    is_popular_brand: Optional[bool] = None,
    is_new_release: Optional[bool] = None,
    is_upcoming: Optional[bool] = None,
    display_type: Optional[str] = None,
    camera_setup: Optional[str] = None,
    battery_type: Optional[str] = None,
    chipset: Optional[str] = None,
    operating_system: Optional[str] = None,
    price_category: Optional[str] = None,
    min_ppi_numeric: Optional[float] = None,
    max_ppi_numeric: Optional[float] = None,
    limit: Optional[int] = None
) -> List[Dict[str, Any]]:
    """Get smart phone recommendations based on scores and specifications"""
    query = db.query(Phone)
    
    # Score filters
    if min_display_score is not None:
        query = query.filter(Phone.display_score >= min_display_score)
    if max_display_score is not None:
        query = query.filter(Phone.display_score <= max_display_score)
    if min_camera_score is not None:
        query = query.filter(Phone.camera_score >= min_camera_score)
    if max_camera_score is not None:
        query = query.filter(Phone.camera_score <= max_camera_score)
    if min_battery_score is not None:
        query = query.filter(Phone.battery_score >= min_battery_score)
    if max_battery_score is not None:
        query = query.filter(Phone.battery_score <= max_battery_score)
    if min_performance_score is not None:
        query = query.filter(Phone.performance_score >= min_performance_score)
    if max_performance_score is not None:
        query = query.filter(Phone.performance_score <= max_performance_score)
    if min_security_score is not None:
        query = query.filter(Phone.security_score >= min_security_score)
    if max_security_score is not None:
        query = query.filter(Phone.security_score <= max_security_score)
    if min_connectivity_score is not None:
        query = query.filter(Phone.connectivity_score >= min_connectivity_score)
    if max_connectivity_score is not None:
        query = query.filter(Phone.connectivity_score <= max_connectivity_score)
    if min_overall_device_score is not None:
        query = query.filter(Phone.overall_device_score >= min_overall_device_score)
    if max_overall_device_score is not None:
        query = query.filter(Phone.overall_device_score <= max_overall_device_score)
    
    # Hardware filters
    if min_ram_gb is not None:
        query = query.filter(Phone.ram_gb >= min_ram_gb)
    if max_ram_gb is not None:
        query = query.filter(Phone.ram_gb <= max_ram_gb)
    if min_storage_gb is not None:
        query = query.filter(Phone.storage_gb >= min_storage_gb)
    if max_storage_gb is not None:
        query = query.filter(Phone.storage_gb <= max_storage_gb)
    if min_price is not None:
        query = query.filter(Phone.price_original >= min_price)
    if max_price is not None:
        query = query.filter(Phone.price_original <= max_price)
    if brand is not None:
        query = query.filter(func.lower(Phone.brand) == func.lower(brand))
    
    # Display filters
    if min_refresh_rate_numeric is not None:
        query = query.filter(Phone.refresh_rate_numeric >= min_refresh_rate_numeric)
    if max_refresh_rate_numeric is not None:
        query = query.filter(Phone.refresh_rate_numeric <= max_refresh_rate_numeric)
    if min_screen_size_numeric is not None:
        query = query.filter(Phone.screen_size_numeric >= min_screen_size_numeric)
    if max_screen_size_numeric is not None:
        query = query.filter(Phone.screen_size_numeric <= max_screen_size_numeric)
    if display_type is not None:
        query = query.filter(func.lower(Phone.display_type).contains(func.lower(display_type)))
    
    # Camera filters
    if min_primary_camera_mp is not None:
        query = query.filter(Phone.primary_camera_mp >= min_primary_camera_mp)
    if max_primary_camera_mp is not None:
        query = query.filter(Phone.primary_camera_mp <= max_primary_camera_mp)
    if min_selfie_camera_mp is not None:
        query = query.filter(Phone.selfie_camera_mp >= min_selfie_camera_mp)
    if max_selfie_camera_mp is not None:
        query = query.filter(Phone.selfie_camera_mp <= max_selfie_camera_mp)
    if min_camera_count is not None:
        query = query.filter(Phone.camera_count >= min_camera_count)
    if max_camera_count is not None:
        query = query.filter(Phone.camera_count <= max_camera_count)
    if camera_setup is not None:
        query = query.filter(func.lower(Phone.camera_setup).contains(func.lower(camera_setup)))
    
    # Battery filters
    if min_battery_capacity_numeric is not None:
        query = query.filter(Phone.battery_capacity_numeric >= min_battery_capacity_numeric)
    if max_battery_capacity_numeric is not None:
        query = query.filter(Phone.battery_capacity_numeric <= max_battery_capacity_numeric)
    if has_fast_charging is not None:
        query = query.filter(Phone.has_fast_charging == has_fast_charging)
    if has_wireless_charging is not None:
        query = query.filter(Phone.has_wireless_charging == has_wireless_charging)
    if battery_type is not None:
        query = query.filter(func.lower(Phone.battery_type).contains(func.lower(battery_type)))
    
    # Performance filters
    if chipset is not None:
        query = query.filter(func.lower(Phone.chipset).contains(func.lower(chipset)))
    if operating_system is not None:
        query = query.filter(func.lower(Phone.operating_system).contains(func.lower(operating_system)))
    
    # Price category filter
    if price_category is not None:
        query = query.filter(func.lower(Phone.price_category) == func.lower(price_category))
    
    # PPI filter
    if min_ppi_numeric is not None:
        query = query.filter(Phone.ppi_numeric >= min_ppi_numeric)
    if max_ppi_numeric is not None:
        query = query.filter(Phone.ppi_numeric <= max_ppi_numeric)
    
    # Status filters
    if is_popular_brand is not None:
        query = query.filter(Phone.is_popular_brand == is_popular_brand)
    if is_new_release is not None:
        query = query.filter(Phone.is_new_release == is_new_release)
    if is_upcoming is not None:
        query = query.filter(Phone.is_upcoming == is_upcoming)
    
    # Order by overall device score for better recommendations
    query = query.order_by(Phone.overall_device_score.desc())
    
    results = query.all()
    if limit is not None:
        return [phone_to_dict(p) for p in results[:limit]]
    return [phone_to_dict(p) for p in results]

# Placeholder functions
def get_price_history(db: Session, phone_id: int):
    """
    Get price history for a specific phone.
    """
    # Placeholder for price history logic
    return {"message": "Price history not implemented yet."}

def get_reviews(db: Session, phone_id: int):
    """
    Get user reviews for a specific phone.
    """
    # Placeholder for reviews logic
    return {"message": "Reviews not implemented yet."}

def get_similar_phones(db: Session, phone_id: int) -> List[Phone]:
    """
    Get phones similar to a given phone.
    """
    phone = get_phone(db, phone_id)
    if not phone:
        return []
    # Placeholder for similar phones logic
    return []

def get_phone_by_name_or_model(db: Session, name: str) -> Optional[Phone]:
    """
    Get a phone by name or model (case-insensitive search)
    """
    return db.query(Phone).filter(
        (func.lower(Phone.name).contains(func.lower(name))) |
        (func.lower(Phone.model).contains(func.lower(name))) |
        (func.lower(Phone.brand).contains(func.lower(name)))
    ).first()

def get_phones_by_names(db: Session, names: List[str]) -> List[Dict[str, Any]]:
    """
    Get multiple phones by names for comparison
    """
    phones = []
    for name in names:
        phone = get_phone_by_name_or_model(db, name)
        if phone:
            phones.append(phone_to_dict(phone))
    return phones

def get_phone_feature_value(db: Session, phone_name: str, feature: str) -> Optional[Any]:
    """
    Get a specific feature value for a phone
    """
    phone = get_phone_by_name_or_model(db, phone_name)
    if phone and hasattr(phone, feature):
        return getattr(phone, feature)
    return None

def get_stats(db: Session):
    """
    Get aggregate statistics about the phones in the database.
    """
    # Placeholder for stats logic
    return {"message": "Statistics not implemented yet."}

def get_all_phone_names(db: Session):
    names = [row[0] for row in db.query(Phone.name).all()]
    print("All phone names in DB:", names)
    return names

def get_phones_by_fuzzy_names(db: Session, names: list, limit: int = 5, score_cutoff: int = 60):
    """Return best-matching phones for a list of names using fuzzy matching."""
    all_names = get_all_phone_names(db)
    matched_phones = []
    for name in names:
        if not all_names:
            print(f"No phone names in DB to match '{name}'")
            continue
        match, score, _ = process.extractOne(name, all_names, scorer=fuzz.token_sort_ratio)
        print(f"Trying to match '{name}' -> '{match}' (score: {score})")
        if score >= score_cutoff:
            phone = get_phone_by_name_or_model(db, match)
            if phone:
                matched_phones.append(phone_to_dict(phone))
            else:
                print(f"Matched name '{match}' not found in DB as Phone object.")
        else:
            print(f"No good match for '{name}' (best: '{match}', score: {score})")
    return matched_phones[:limit]