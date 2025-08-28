from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Float
import logging

from app.models.phone import Phone
from app.schemas.phone import PhoneCreate
from app.utils.database_validation import DatabaseValidator
from rapidfuzz import process, fuzz

logger = logging.getLogger(__name__)

def phone_to_dict(phone: Phone, include_optimized_images: bool = True) -> Dict[str, Any]:
    """
    Convert SQLAlchemy Phone object to dictionary for JSON serialization.
    Uses safe attribute access to handle missing columns gracefully.
    """
    try:
        # Add optimized image URLs if requested
        optimized_images = {}
        if include_optimized_images:
            img_url = DatabaseValidator.get_safe_column_value(phone, 'img_url')
            if img_url:
                try:
                    # Import here to avoid circular imports
                    from app.services.image_optimizer import ImageOptimizer
                    optimized_images = {
                        "img_url_card": ImageOptimizer.get_optimized_phone_image(img_url, "card"),
                        "img_url_thumbnail": ImageOptimizer.get_optimized_phone_image(img_url, "thumbnail"),
                        "img_url_detail": ImageOptimizer.get_optimized_phone_image(img_url, "detail"),
                        "img_url_list": ImageOptimizer.get_optimized_phone_image(img_url, "list"),
                    }
                except Exception as e:
                    logger.warning(f"Error generating optimized image URLs: {str(e)}")
        
        # Core fields - these should always exist
        result = {
            "id": int(DatabaseValidator.get_safe_column_value(phone, 'id', 0)),
            "name": DatabaseValidator.get_safe_column_value(phone, 'name') or "Unknown Phone",
            "brand": DatabaseValidator.get_safe_column_value(phone, 'brand') or "Unknown",
            "model": DatabaseValidator.get_safe_column_value(phone, 'model') or "Unknown Model",
            "slug": DatabaseValidator.get_safe_column_value(phone, 'slug'),
            "price": DatabaseValidator.get_safe_column_value(phone, 'price') or "",
            "url": DatabaseValidator.get_safe_column_value(phone, 'url') or "",
            "img_url": DatabaseValidator.get_safe_column_value(phone, 'img_url') or "https://via.placeholder.com/300x300?text=No+Image",
            **optimized_images,
        }
        
        # Display fields
        display_fields = [
            "display_type", "screen_size_inches", "display_resolution", "pixel_density_ppi",
            "refresh_rate_hz", "screen_protection", "display_brightness", "aspect_ratio", "hdr_support"
        ]
        for field in display_fields:
            result[field] = DatabaseValidator.get_safe_column_value(phone, field)
        
        # Performance fields
        performance_fields = [
            "chipset", "cpu", "gpu", "ram", "ram_type", "internal_storage", "storage_type"
        ]
        for field in performance_fields:
            result[field] = DatabaseValidator.get_safe_column_value(phone, field)
        
        # Camera fields
        camera_fields = [
            "camera_setup", "primary_camera_resolution", "selfie_camera_resolution",
            "primary_camera_video_recording", "selfie_camera_video_recording", "primary_camera_ois",
            "primary_camera_aperture", "selfie_camera_aperture", "camera_features", "autofocus",
            "flash", "settings", "zoom", "shooting_modes", "video_fps", "main_camera", "front_camera"
        ]
        for field in camera_fields:
            result[field] = DatabaseValidator.get_safe_column_value(phone, field)
        
        # Battery fields
        battery_fields = [
            "battery_type", "capacity", "quick_charging", "wireless_charging", "reverse_charging"
        ]
        for field in battery_fields:
            result[field] = DatabaseValidator.get_safe_column_value(phone, field)
        
        # Design fields
        design_fields = [
            "build", "weight", "thickness", "colors", "waterproof", "ip_rating", "ruggedness"
        ]
        for field in design_fields:
            result[field] = DatabaseValidator.get_safe_column_value(phone, field)
        
        # Connectivity fields
        connectivity_fields = [
            "network", "speed", "sim_slot", "volte", "bluetooth", "wlan", "gps", "nfc",
            "usb", "usb_otg", "fingerprint_sensor", "finger_sensor_type", "finger_sensor_position",
            "face_unlock", "light_sensor", "infrared", "fm_radio"
        ]
        for field in connectivity_fields:
            result[field] = DatabaseValidator.get_safe_column_value(phone, field)
        
        # System fields
        system_fields = [
            "operating_system", "os_version", "user_interface", "status", "made_by", "release_date"
        ]
        for field in system_fields:
            result[field] = DatabaseValidator.get_safe_column_value(phone, field)
        
        # Numeric/derived fields - these might not exist in all databases
        numeric_fields = [
            "price_original", "price_category", "storage_gb", "ram_gb", "price_per_gb",
            "price_per_gb_ram", "screen_size_numeric", "resolution_width", "resolution_height",
            "ppi_numeric", "refresh_rate_numeric", "camera_count", "primary_camera_mp",
            "selfie_camera_mp", "battery_capacity_numeric", "has_fast_charging",
            "has_wireless_charging", "charging_wattage", "battery_score", "security_score",
            "connectivity_score", "is_popular_brand", "is_new_release", "age_in_months",
            "is_upcoming", "overall_device_score", "performance_score", "display_score", "camera_score"
        ]
        for field in numeric_fields:
            result[field] = DatabaseValidator.get_safe_column_value(phone, field)
        
        # Handle special date field
        release_date_clean = DatabaseValidator.get_safe_column_value(phone, 'release_date_clean')
        if release_date_clean and hasattr(release_date_clean, 'isoformat'):
            result["release_date_clean"] = release_date_clean.isoformat()
        else:
            result["release_date_clean"] = None
        
        # Validate ID
        if not isinstance(result["id"], int) or result["id"] <= 0:
            logger.warning(f"phone_to_dict: Invalid or missing id for phone: {result.get('name', 'Unknown')} (raw id: {result['id']})")
        
        logger.debug(f"Successfully converted phone {result['id']} to dict")
        return result
        
    except Exception as e:
        logger.error(f"Error in phone_to_dict for phone {getattr(phone, 'id', 'unknown')}: {str(e)}", exc_info=True)
        # Return minimal safe dictionary
        return {
            "id": int(getattr(phone, 'id', 0)),
            "name": getattr(phone, 'name', 'Unknown Phone'),
            "brand": getattr(phone, 'brand', 'Unknown'),
            "model": getattr(phone, 'model', 'Unknown Model'),
            "slug": getattr(phone, 'slug', None),
            "price": getattr(phone, 'price', ''),
            "url": getattr(phone, 'url', ''),
            "img_url": getattr(phone, 'img_url', 'https://via.placeholder.com/300x300?text=No+Image'),
            "error": "Partial data due to serialization error"
        }

def get_phones(
    db: Session, 
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
    operating_system: Optional[str] = None,
    sort: Optional[str] = None,
    search: Optional[str] = None
) -> Tuple[List[Phone], int]:
    """Get phones with optional filtering and safe column access"""
    try:
        # Validate column existence for critical columns
        column_validation = DatabaseValidator.validate_phone_columns(db)
        
        query = db.query(Phone)
        
        # Apply filters if provided and columns exist
        if brand:
            query = query.filter(Phone.brand == brand)
        
        # Price filters - check if price_original column exists
        if min_price is not None and column_validation.get('price_original', False):
            query = query.filter(Phone.price_original >= min_price)
        elif min_price is not None:
            logger.warning("price_original column not found, skipping min_price filter")
            
        if max_price is not None and column_validation.get('price_original', False):
            query = query.filter(Phone.price_original <= max_price)
        elif max_price is not None:
            logger.warning("price_original column not found, skipping max_price filter")
        
        # RAM and storage filters
        if min_ram_gb is not None and column_validation.get('ram_gb', False):
            query = query.filter(Phone.ram_gb >= min_ram_gb)
        elif min_ram_gb is not None:
            logger.warning("ram_gb column not found, skipping min_ram_gb filter")
            
        if min_storage_gb is not None and column_validation.get('storage_gb', False):
            query = query.filter(Phone.storage_gb >= min_storage_gb)
        elif min_storage_gb is not None:
            logger.warning("storage_gb column not found, skipping min_storage_gb filter")
        
        # Camera filters
        if camera_setup is not None and column_validation.get('camera_setup', False):
            query = query.filter(func.lower(Phone.camera_setup) == func.lower(camera_setup))
        elif camera_setup is not None:
            logger.warning("camera_setup column not found, skipping camera_setup filter")
            
        if min_primary_camera_mp is not None and column_validation.get('primary_camera_mp', False):
            query = query.filter(Phone.primary_camera_mp >= min_primary_camera_mp)
        elif min_primary_camera_mp is not None:
            logger.warning("primary_camera_mp column not found, skipping min_primary_camera_mp filter")
            
        if min_selfie_camera_mp is not None and column_validation.get('selfie_camera_mp', False):
            query = query.filter(Phone.selfie_camera_mp >= min_selfie_camera_mp)
        elif min_selfie_camera_mp is not None:
            logger.warning("selfie_camera_mp column not found, skipping min_selfie_camera_mp filter")
        
        # Battery filters
        if battery_type is not None and column_validation.get('battery_type', False):
            query = query.filter(func.lower(Phone.battery_type).contains(func.lower(battery_type)))
        elif battery_type is not None:
            logger.warning("battery_type column not found, skipping battery_type filter")
            
        if min_battery_capacity is not None and column_validation.get('battery_capacity_numeric', False):
            query = query.filter(Phone.battery_capacity_numeric >= min_battery_capacity)
        elif min_battery_capacity is not None:
            logger.warning("battery_capacity_numeric column not found, skipping min_battery_capacity filter")
        
        # Display filters
        if display_type is not None and column_validation.get('display_type', False):
            query = query.filter(func.lower(Phone.display_type).contains(func.lower(display_type)))
        elif display_type is not None:
            logger.warning("display_type column not found, skipping display_type filter")
            
        if min_refresh_rate is not None and column_validation.get('refresh_rate_numeric', False):
            query = query.filter(Phone.refresh_rate_numeric >= min_refresh_rate)
        elif min_refresh_rate is not None:
            logger.warning("refresh_rate_numeric column not found, skipping min_refresh_rate filter")
            
        if min_screen_size is not None and column_validation.get('screen_size_numeric', False):
            query = query.filter(Phone.screen_size_numeric >= min_screen_size)
        elif min_screen_size is not None:
            logger.warning("screen_size_numeric column not found, skipping min_screen_size filter")
            
        if max_screen_size is not None and column_validation.get('screen_size_numeric', False):
            query = query.filter(Phone.screen_size_numeric <= max_screen_size)
        elif max_screen_size is not None:
            logger.warning("screen_size_numeric column not found, skipping max_screen_size filter")
        
        # Platform filters
        if chipset is not None and column_validation.get('chipset', False):
            query = query.filter(func.lower(Phone.chipset).contains(func.lower(chipset)))
        elif chipset is not None:
            logger.warning("chipset column not found, skipping chipset filter")
            
        if operating_system is not None and column_validation.get('operating_system', False):
            query = query.filter(func.lower(Phone.operating_system).contains(func.lower(operating_system)))
        elif operating_system is not None:
            logger.warning("operating_system column not found, skipping operating_system filter")
        
        # Search filter - basic columns should always exist
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Phone.name.ilike(search_term)) | 
                (Phone.brand.ilike(search_term)) |
                (Phone.model.ilike(search_term))
            )
        
        # Apply sorting with safe column access
        if sort == "price_high" and column_validation.get('price_original', False):
            query = query.order_by(Phone.price_original.desc())
            logger.debug("Applied price_high sorting")
        elif sort == "price_low" and column_validation.get('price_original', False):
            query = query.order_by(Phone.price_original.asc())
            logger.debug("Applied price_low sorting")
        elif sort in ["price_high", "price_low"] and not column_validation.get('price_original', False):
            logger.warning(f"Price sorting requested but price_original column not available, using default sorting")
            query = query.order_by(Phone.id.desc())
        elif column_validation.get('overall_device_score', False):
            # Default sorting
            query = query.order_by(Phone.overall_device_score.desc())
            logger.debug("Applied overall_device_score sorting")
        else:
            # Fallback to ID ordering if no score column
            query = query.order_by(Phone.id.desc())
            logger.debug("Applied fallback ID sorting")
        
        # Execute query with error handling
        try:
            total = query.count()
            phones = query.offset(skip).limit(limit).all()
            
            logger.info(f"Successfully retrieved {len(phones)} phones (total: {total}) with filters applied")
            return phones, total
            
        except Exception as query_error:
            logger.error(f"Error executing phone query: {str(query_error)}", exc_info=True)
            # Try a simpler query as fallback
            try:
                logger.info("Attempting fallback query with basic columns only")
                fallback_query = db.query(Phone).order_by(Phone.id.desc())
                total = fallback_query.count()
                phones = fallback_query.offset(skip).limit(limit).all()
                logger.warning(f"Fallback query succeeded, returned {len(phones)} phones")
                return phones, total
            except Exception as fallback_error:
                logger.error(f"Fallback query also failed: {str(fallback_error)}", exc_info=True)
                return [], 0
        
    except Exception as e:
        logger.error(f"Critical error in get_phones: {str(e)}", exc_info=True)
        # Return empty result on error to prevent complete failure
        return [], 0

def get_phone(db: Session, phone_id: int) -> Optional[Phone]:
    """
    Get a single phone by ID
    """
    return db.query(Phone).filter(Phone.id == phone_id).first()

def get_phones_by_ids(db: Session, phone_ids: List[int]) -> Tuple[List[Phone], List[int]]:
    """
    Get multiple phones by IDs using a single database query.
    
    Args:
        db: Database session
        phone_ids: List of phone IDs to retrieve
    
    Returns:
        Tuple of (found_phones, not_found_ids)
    """
    try:
        # Execute single query with IN clause for performance
        found_phones = db.query(Phone).filter(Phone.id.in_(phone_ids)).all()
        
        # Create a mapping of found phone IDs for quick lookup
        found_ids = {phone.id for phone in found_phones}
        
        # Determine which IDs were not found
        not_found_ids = [phone_id for phone_id in phone_ids if phone_id not in found_ids]
        
        # Sort found phones to match the order of requested IDs
        phone_id_to_phone = {phone.id: phone for phone in found_phones}
        ordered_phones = []
        for phone_id in phone_ids:
            if phone_id in phone_id_to_phone:
                ordered_phones.append(phone_id_to_phone[phone_id])
        
        logger.info(f"Bulk phone query: requested {len(phone_ids)}, found {len(ordered_phones)}, not found {len(not_found_ids)}")
        
        return ordered_phones, not_found_ids
        
    except Exception as e:
        logger.error(f"Error in bulk phone retrieval: {str(e)}")
        raise

def get_phone_slug_by_id(db: Session, phone_id: int) -> Optional[str]:
    """
    Get phone slug by ID for redirect purposes.
    
    Args:
        db: Database session
        phone_id: Phone ID to look up
    
    Returns:
        Phone slug if found, None otherwise
    """
    try:
        phone = db.query(Phone).filter(Phone.id == phone_id).first()
        return phone.slug if phone and phone.slug else None
    except Exception as e:
        logger.error(f"Error getting phone slug by ID {phone_id}: {str(e)}")
        return None

def get_phones_by_slugs(db: Session, phone_slugs: List[str]) -> Tuple[List[Phone], List[str]]:
    """
    Get multiple phones by slugs using a single database query.
    
    Args:
        db: Database session
        phone_slugs: List of phone slugs to retrieve
    
    Returns:
        Tuple of (found_phones, not_found_slugs)
    """
    try:
        # Execute single query with IN clause for performance
        found_phones = db.query(Phone).filter(Phone.slug.in_(phone_slugs)).all()
        
        # Create a mapping of found phone slugs for quick lookup
        found_slugs = {phone.slug for phone in found_phones if phone.slug}
        
        # Determine which slugs were not found
        not_found_slugs = [slug for slug in phone_slugs if slug not in found_slugs]
        
        # Sort found phones to match the order of requested slugs
        phone_slug_to_phone = {phone.slug: phone for phone in found_phones if phone.slug}
        ordered_phones = []
        for slug in phone_slugs:
            if slug in phone_slug_to_phone:
                ordered_phones.append(phone_slug_to_phone[slug])
        
        logger.info(f"Bulk phone slug query: requested {len(phone_slugs)}, found {len(ordered_phones)}, not found {len(not_found_slugs)}")
        
        return ordered_phones, not_found_slugs
        
    except Exception as e:
        logger.error(f"Error in bulk phone slug retrieval: {str(e)}")
        raise

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

def get_phone_by_slug(db: Session, slug: str) -> Optional[Phone]:
    """
    Get a single phone by slug
    """
    return db.query(Phone).filter(Phone.slug == slug).first()

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

def validate_database_schema(db: Session) -> Dict[str, Any]:
    """
    Validate the database schema and return a report of available columns and potential issues.
    This function should be called during application startup to identify schema problems early.
    """
    try:
        validation_result = DatabaseValidator.validate_phone_columns(db)
        
        # Count missing columns
        missing_columns = [col for col, exists in validation_result.items() if not exists]
        available_columns = [col for col, exists in validation_result.items() if exists]
        
        # Test basic query
        try:
            test_query = db.query(Phone).limit(1).first()
            query_test_passed = test_query is not None
        except Exception as e:
            query_test_passed = False
            logger.error(f"Basic query test failed: {str(e)}")
        
        report = {
            "schema_validation_passed": len(missing_columns) == 0,
            "total_columns_checked": len(validation_result),
            "available_columns": len(available_columns),
            "missing_columns": len(missing_columns),
            "missing_column_names": missing_columns,
            "query_test_passed": query_test_passed,
            "recommendations": []
        }
        
        # Add recommendations based on missing columns
        if "price_original" in missing_columns:
            report["recommendations"].append("Price filtering will be disabled due to missing price_original column")
        
        if "overall_device_score" in missing_columns:
            report["recommendations"].append("Default sorting will use ID instead of device score")
        
        if missing_columns:
            report["recommendations"].append(f"Consider adding missing columns: {', '.join(missing_columns[:5])}")
        
        logger.info(f"Database schema validation completed: {report}")
        return report
        
    except Exception as e:
        logger.error(f"Database schema validation failed: {str(e)}", exc_info=True)
        return {
            "schema_validation_passed": False,
            "error": str(e),
            "recommendations": ["Database schema validation failed - check database connection and table structure"]
        }