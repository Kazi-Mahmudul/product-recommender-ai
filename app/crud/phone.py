from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Float
import logging
import hashlib
import json

from app.models.phone import Phone
from app.schemas.phone import PhoneCreate
from app.utils.database_validation import DatabaseValidator
from app.utils import query_cache
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
            "is_upcoming", "overall_device_score", "performance_score", "display_score", "camera_score",
            "average_rating", "review_count"  
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
        
        # Removed excessive debug logging - was logging 1000+ times per request
        # logger.debug(f"Successfully converted phone {result['id']} to dict")
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
    max_ram_gb: Optional[int] = None,
    min_storage_gb: Optional[int] = None,
    max_storage_gb: Optional[int] = None,
    camera_setup: Optional[str] = None,
    min_primary_camera_mp: Optional[float] = None,
    min_selfie_camera_mp: Optional[float] = None,
    battery_type: Optional[str] = None,
    min_battery_capacity: Optional[int] = None,
    max_battery_capacity: Optional[int] = None,
    display_type: Optional[str] = None,
    min_refresh_rate: Optional[int] = None,
    min_screen_size: Optional[float] = None,
    max_screen_size: Optional[float] = None,
    chipset: Optional[str] = None,
    operating_system: Optional[str] = None,
    network: Optional[str] = None,
    bluetooth: Optional[str] = None,
    nfc: Optional[str] = None,
    usb: Optional[str] = None,
    fingerprint_sensor: Optional[str] = None,
    face_unlock: Optional[str] = None,
    wireless_charging: Optional[str] = None,
    quick_charging: Optional[str] = None,
    reverse_charging: Optional[str] = None,
    build: Optional[str] = None,
    waterproof: Optional[str] = None,
    ip_rating: Optional[str] = None,
    min_charging_wattage: Optional[float] = None,
    max_age_in_months: Optional[int] = None,
    sort: Optional[str] = None,
    search: Optional[str] = None
) -> Tuple[List[Phone], int]:
    """Get phones with optional filtering and safe column access with caching"""
    try:
        # Generate cache key from all filter parameters
        filter_params = {
            'skip': skip, 'limit': limit, 'brand': brand, 'min_price': min_price,
            'max_price': max_price, 'min_ram_gb': min_ram_gb, 'max_ram_gb': max_ram_gb,
            'min_storage_gb': min_storage_gb, 'max_storage_gb': max_storage_gb,
            'camera_setup': camera_setup, 'min_primary_camera_mp': min_primary_camera_mp,
            'min_selfie_camera_mp': min_selfie_camera_mp, 'battery_type': battery_type,
            'min_battery_capacity': min_battery_capacity, 'max_battery_capacity': max_battery_capacity,
            'display_type': display_type, 'min_refresh_rate': min_refresh_rate,
            'min_screen_size': min_screen_size, 'max_screen_size': max_screen_size,
            'chipset': chipset, 'operating_system': operating_system, 'network': network,
            'bluetooth': bluetooth, 'nfc': nfc, 'usb': usb,
            'fingerprint_sensor': fingerprint_sensor, 'face_unlock': face_unlock,
            'wireless_charging': wireless_charging, 'quick_charging': quick_charging,
            'reverse_charging': reverse_charging, 'build': build, 'waterproof': waterproof,
            'ip_rating': ip_rating, 'min_charging_wattage': min_charging_wattage,
            'max_age_in_months': max_age_in_months, 'sort': sort, 'search': search
        }
        
        # Create hash of filter parameters for cache key
        filter_hash = hashlib.md5(json.dumps(filter_params, sort_keys=True).encode()).hexdigest()
        cache_key = query_cache.get_cached_filter_result(filter_hash, limit)
        
        # Check if cache is valid
        if query_cache.is_cache_valid(cache_key):
            logger.debug(f"Cache hit for filter query: {filter_hash[:8]}...")
        else:
            query_cache.set_cache_timestamp(cache_key)
            logger.debug(f"Cache miss for filter query: {filter_hash[:8]}...")
        
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
            
        if max_ram_gb is not None and column_validation.get('ram_gb', False):
            query = query.filter(Phone.ram_gb <= max_ram_gb)
        elif max_ram_gb is not None:
            logger.warning("ram_gb column not found, skipping max_ram_gb filter")
            
        if min_storage_gb is not None and column_validation.get('storage_gb', False):
            query = query.filter(Phone.storage_gb >= min_storage_gb)
        elif min_storage_gb is not None:
            logger.warning("storage_gb column not found, skipping min_storage_gb filter")
            
        if max_storage_gb is not None and column_validation.get('storage_gb', False):
            query = query.filter(Phone.storage_gb <= max_storage_gb)
        elif max_storage_gb is not None:
            logger.warning("storage_gb column not found, skipping max_storage_gb filter")
        
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
            
        if max_battery_capacity is not None and column_validation.get('battery_capacity_numeric', False):
            query = query.filter(Phone.battery_capacity_numeric <= max_battery_capacity)
        elif max_battery_capacity is not None:
            logger.warning("battery_capacity_numeric column not found, skipping max_battery_capacity filter")
        
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
        
        # Connectivity filters
        if network is not None and column_validation.get('network', False):
            query = query.filter(func.lower(Phone.network).contains(func.lower(network)))
        elif network is not None:
            logger.warning("network column not found, skipping network filter")
            
        if bluetooth is not None and column_validation.get('bluetooth', False):
            query = query.filter(func.lower(Phone.bluetooth).contains(func.lower(bluetooth)))
        elif bluetooth is not None:
            logger.warning("bluetooth column not found, skipping bluetooth filter")
            
        if nfc is not None and column_validation.get('nfc', False):
            query = query.filter(func.lower(Phone.nfc).contains(func.lower(nfc)))
        elif nfc is not None:
            logger.warning("nfc column not found, skipping nfc filter")
            
        if usb is not None and column_validation.get('usb', False):
            query = query.filter(func.lower(Phone.usb).contains(func.lower(usb)))
        elif usb is not None:
            logger.warning("usb column not found, skipping usb filter")
            
        # Security filters
        if fingerprint_sensor is not None and column_validation.get('fingerprint_sensor', False):
            query = query.filter(func.lower(Phone.fingerprint_sensor).contains(func.lower(fingerprint_sensor)))
        elif fingerprint_sensor is not None:
            logger.warning("fingerprint_sensor column not found, skipping fingerprint_sensor filter")
            
        if face_unlock is not None and column_validation.get('face_unlock', False):
            query = query.filter(func.lower(Phone.face_unlock).contains(func.lower(face_unlock)))
        elif face_unlock is not None:
            logger.warning("face_unlock column not found, skipping face_unlock filter")
        
        # Charging filters
        if wireless_charging is not None and column_validation.get('wireless_charging', False):
            query = query.filter(func.lower(Phone.wireless_charging).contains(func.lower(wireless_charging)))
        elif wireless_charging is not None:
            logger.warning("wireless_charging column not found, skipping wireless_charging filter")
            
        if quick_charging is not None and column_validation.get('quick_charging', False):
            query = query.filter(func.lower(Phone.quick_charging).contains(func.lower(quick_charging)))
        elif quick_charging is not None:
            logger.warning("quick_charging column not found, skipping quick_charging filter")
            
        if reverse_charging is not None and column_validation.get('reverse_charging', False):
            query = query.filter(func.lower(Phone.reverse_charging).contains(func.lower(reverse_charging)))
        elif reverse_charging is not None:
            logger.warning("reverse_charging column not found, skipping reverse_charging filter")
        
        # Design and build filters
        if build is not None and column_validation.get('build', False):
            query = query.filter(func.lower(Phone.build).contains(func.lower(build)))
        elif build is not None:
            logger.warning("build column not found, skipping build filter")
            
        if waterproof is not None and column_validation.get('waterproof', False):
            query = query.filter(func.lower(Phone.waterproof).contains(func.lower(waterproof)))
        elif waterproof is not None:
            logger.warning("waterproof column not found, skipping waterproof filter")
            
        if ip_rating is not None and column_validation.get('ip_rating', False):
            query = query.filter(func.lower(Phone.ip_rating).contains(func.lower(ip_rating)))
        elif ip_rating is not None:
            logger.warning("ip_rating column not found, skipping ip_rating filter")
        
        # Advanced filters
        if min_charging_wattage is not None and column_validation.get('charging_wattage', False):
            query = query.filter(Phone.charging_wattage >= min_charging_wattage)
        elif min_charging_wattage is not None:
            logger.warning("charging_wattage column not found, skipping min_charging_wattage filter")
            
        if max_age_in_months is not None and column_validation.get('age_in_months', False):
            query = query.filter(Phone.age_in_months <= max_age_in_months)
        elif max_age_in_months is not None:
            logger.warning("age_in_months column not found, skipping max_age_in_months filter")
        
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
            # logger.debug("Applied price_high sorting")  # Removed to reduce log spam
        elif sort == "price_low" and column_validation.get('price_original', False):
            query = query.order_by(Phone.price_original.asc())
            # logger.debug("Applied price_low sorting")  # Removed to reduce log spam
        elif sort in ["price_high", "price_low"] and not column_validation.get('price_original', False):
            logger.warning(f"Price sorting requested but price_original column not available, using default sorting")
            # Default sorting: newest phones first (release_date_clean descending if available, otherwise created_at descending)
            if column_validation.get('release_date_clean', False):
                query = query.order_by(Phone.release_date_clean.desc())
                # logger.debug("Applied default release_date_clean descending sorting (newest phones first)")
            elif column_validation.get('created_at', False):
                query = query.order_by(Phone.created_at.desc())
                # logger.debug("Applied default created_at descending sorting (newest phones first)")
            else:
                query = query.order_by(Phone.id.desc())
                # logger.debug("Applied default ID descending sorting (newest phones first)")
        elif sort == "score_high" and column_validation.get('overall_device_score', False):
            # Score-based sorting when explicitly requested
            query = query.order_by(Phone.overall_device_score.desc())
            # logger.debug("Applied overall_device_score sorting")  # Removed to reduce log spam
        else:
            # Default sorting: newest phones first (release_date_clean descending if available, otherwise created_at descending)
            if column_validation.get('release_date_clean', False):
                query = query.order_by(Phone.release_date_clean.desc())
                logger.debug("Applied default release_date_clean descending sorting (newest phones first)")
            elif column_validation.get('created_at', False):
                query = query.order_by(Phone.created_at.desc())
                logger.debug("Applied default created_at descending sorting (newest phones first)")
            else:
                query = query.order_by(Phone.id.desc())
                logger.debug("Applied default ID descending sorting (newest phones first)")
        
        # Execute query with error handling
        try:
            total = query.count()
            phones = query.offset(skip).limit(limit).all()
            
            # Periodically clear expired cache entries (every 100th query)
            import random
            if random.randint(1, 100) == 1:
                query_cache.clear_expired_cache()
            
            logger.info(f"Successfully retrieved {len(phones)} phones (total: {total}) with filters applied")
            return phones, total
            
        except Exception as query_error:
            logger.error(f"Error executing phone query: {str(query_error)}", exc_info=True)
            # Try a simpler query as fallback
            try:
                logger.info("Attempting fallback query with basic columns only")
                # Use newest phones first for fallback query as well
                # Default sorting: newest phones first (release_date_clean descending if available, otherwise created_at descending)
                column_validation = DatabaseValidator.validate_phone_columns(db)
                if column_validation.get('release_date_clean', False):
                    fallback_query = db.query(Phone).order_by(Phone.release_date_clean.desc())
                    # logger.debug("Applied fallback release_date_clean descending sorting (newest phones first)")
                elif column_validation.get('created_at', False):
                    fallback_query = db.query(Phone).order_by(Phone.created_at.desc())
                    # logger.debug("Applied fallback created_at descending sorting (newest phones first)")
                else:
                    fallback_query = db.query(Phone).order_by(Phone.id.desc())
                    # logger.debug("Applied fallback ID descending sorting (newest phones first)")
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
        found_ids = {DatabaseValidator.get_safe_column_value(phone, 'id') for phone in found_phones}
        
        # Determine which IDs were not found
        not_found_ids = [phone_id for phone_id in phone_ids if phone_id not in found_ids]
        
        # Sort found phones to match the order of requested IDs
        phone_id_to_phone = {DatabaseValidator.get_safe_column_value(phone, 'id'): phone for phone in found_phones}
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
        if phone and hasattr(phone, 'slug'):
            slug_value = DatabaseValidator.get_safe_column_value(phone, 'slug')
            return slug_value if slug_value else None
        return None
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
        found_slugs = {DatabaseValidator.get_safe_column_value(phone, 'slug') for phone in found_phones if DatabaseValidator.get_safe_column_value(phone, 'slug')}
        
        # Determine which slugs were not found
        not_found_slugs = [slug for slug in phone_slugs if slug not in found_slugs]
        
        # Sort found phones to match the order of requested slugs
        phone_slug_to_phone = {DatabaseValidator.get_safe_column_value(phone, 'slug'): phone for phone in found_phones if DatabaseValidator.get_safe_column_value(phone, 'slug')}
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
    Get a single phone by slug with caching
    """
    # Generate cache key
    cache_key = query_cache.get_cached_phone_by_slug(slug)
    
    # Check if cache is valid
    if query_cache.is_cache_valid(cache_key):
        # Note: We still need to query DB as LRU cache only stores the key
        # But this helps track cache hits/misses
        logger.debug(f"Cache hit for phone slug: {slug}")
    else:
        query_cache.set_cache_timestamp(cache_key)
        logger.debug(f"Cache miss for phone slug: {slug}")
    
    return db.query(Phone).filter(Phone.slug == slug).first()

def get_brands(db: Session) -> List[str]:
    """
    Get all unique brands in the database with caching
    """
    try:
        # Use a simple cache key for brands
        cache_key = "brands_list"
        
        # Check if cache is valid (5 minute TTL)
        if query_cache.is_cache_valid(cache_key):
            logger.debug("Using cached brands list")
        else:
            query_cache.set_cache_timestamp(cache_key)
            logger.debug("Refreshing brands cache")
        
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
        return {"min": 0.0, "max": 0.0}

def calculate_derived_fields(phone: Phone) -> None:
    """
    Calculate and update ALL derived fields based on phone data.
    This modifies the phone object in-place.
    
    Calculates all numeric/derived fields from string fields.
    """
    import re
    from datetime import datetime, date
    
    # ===== PRICE FIELDS =====
    # Extract numeric price from price string
    if phone.price:
        price_str = str(phone.price)
        match = re.search(r'[\d,]+\.?\d*', price_str.replace(',', ''))
        if match:
            try:
                phone.price_original = float(match.group(0))
            except (ValueError, AttributeError):
                logger.warning(f"Could not parse price: {phone.price}")
                phone.price_original = None
    
    # Determine price category
    if phone.price_original:
        if phone.price_original < 15000:
            phone.price_category = "Budget"
        elif phone.price_original < 40000:
            phone.price_category = "Mid-range"
        else:
            phone.price_category = "Flagship"
    
    # ===== RAM & STORAGE =====
    # Extract numeric RAM from ram string
    if phone.ram and not phone.ram_gb:
        ram_str = str(phone.ram).upper()
        match = re.search(r'(\d+)\s*GB', ram_str)
        if match:
            try:
                phone.ram_gb = float(match.group(1))
            except (ValueError, AttributeError):
                logger.warning(f"Could not parse RAM: {phone.ram}")
    
    # Extract numeric storage from internal_storage string
    if phone.internal_storage and not phone.storage_gb:
        storage_str = str(phone.internal_storage).upper()
        match = re.search(r'(\d+)\s*TB', storage_str)
        if match:
            try:
                phone.storage_gb = float(match.group(1)) * 1024
            except (ValueError, AttributeError):
                logger.warning(f"Could not parse storage (TB): {phone.internal_storage}")
        else:
            match = re.search(r'(\d+)\s*GB', storage_str)
            if match:
                try:
                    phone.storage_gb = float(match.group(1))
                except (ValueError, AttributeError):
                    logger.warning(f"Could not parse storage (GB): {phone.internal_storage}")
    
    # Calculate price per GB
    if phone.price_original and phone.storage_gb and phone.storage_gb > 0:
        phone.price_per_gb = round(phone.price_original / phone.storage_gb, 2)
    
    if phone.price_original and phone.ram_gb and phone.ram_gb > 0:
        phone.price_per_gb_ram = round(phone.price_original / phone.ram_gb, 2)
    
    # ===== DISPLAY FIELDS =====
    # Extract screen size
    if phone.screen_size_inches:
        size_str = str(phone.screen_size_inches)
        match = re.search(r'(\d+\.?\d*)', size_str)
        if match:
            try:
                phone.screen_size_numeric = float(match.group(1))
            except (ValueError, AttributeError):
                logger.warning(f"Could not parse screen size: {phone.screen_size_inches}")
    
    # Extract resolution (e.g., "1080x2400", "1080 x 2400 pixels")
    if phone.display_resolution:
        res_str = str(phone.display_resolution)
        match = re.search(r'(\d+)\s*[xX×]\s*(\d+)', res_str)
        if match:
            try:
                phone.resolution_width = int(match.group(1))
                phone.resolution_height = int(match.group(2))
            except (ValueError, AttributeError):
                logger.warning(f"Could not parse resolution: {phone.display_resolution}")
    
    # Extract PPI
    if phone.pixel_density_ppi:
        ppi_str = str(phone.pixel_density_ppi)
        match = re.search(r'(\d+\.?\d*)', ppi_str)
        if match:
            try:
                phone.ppi_numeric = float(match.group(1))
            except (ValueError, AttributeError):
                logger.warning(f"Could not parse PPI: {phone.pixel_density_ppi}")
    
    # Extract refresh rate
    if phone.refresh_rate_hz:
        refresh_str = str(phone.refresh_rate_hz)
        match = re.search(r'(\d+)', refresh_str)
        if match:
            try:
                phone.refresh_rate_numeric = int(match.group(1))
            except (ValueError, AttributeError):
                logger.warning(f"Could not parse refresh rate: {phone.refresh_rate_hz}")
    
    # ===== CAMERA FIELDS =====
    # Count cameras (e.g., "Triple", "Quad", "Dual")
    if phone.camera_setup:
        setup_str = str(phone.camera_setup).lower()
        if 'quad' in setup_str or '4' in setup_str:
            phone.camera_count = 4
        elif 'triple' in setup_str or '3' in setup_str:
            phone.camera_count = 3
        elif 'dual' in setup_str or '2' in setup_str:
            phone.camera_count = 2
        elif 'single' in setup_str or '1' in setup_str:
            phone.camera_count = 1
        else:
            # Try to count from primary_camera_resolution
            if phone.primary_camera_resolution:
                camera_count = len(re.findall(r'\d+\s*MP', str(phone.primary_camera_resolution), re.IGNORECASE))
                phone.camera_count = camera_count if camera_count > 0 else None
    
    # Extract primary camera MP
    if phone.primary_camera_resolution:
        cam_str = str(phone.primary_camera_resolution)
        match = re.search(r'(\d+\.?\d*)\s*MP', cam_str, re.IGNORECASE)
        if match:
            try:
                phone.primary_camera_mp = float(match.group(1))
            except (ValueError, AttributeError):
                logger.warning(f"Could not parse primary camera: {phone.primary_camera_resolution}")
    
    # Extract selfie camera MP
    if phone.selfie_camera_resolution:
        cam_str = str(phone.selfie_camera_resolution)
        match = re.search(r'(\d+\.?\d*)\s*MP', cam_str, re.IGNORECASE)
        if match:
            try:
                phone.selfie_camera_mp = float(match.group(1))
            except (ValueError, AttributeError):
                logger.warning(f"Could not parse selfie camera: {phone.selfie_camera_resolution}")
    
    # ===== BATTERY FIELDS =====
    # Extract battery capacity
    if phone.capacity:
        cap_str = str(phone.capacity)
        match = re.search(r'(\d+)', cap_str)
        if match:
            try:
                phone.battery_capacity_numeric = int(match.group(1))
            except (ValueError, AttributeError):
                logger.warning(f"Could not parse battery capacity: {phone.capacity}")
    
    # Detect fast charging
    if phone.quick_charging:
        quick_str = str(phone.quick_charging).lower()
        phone.has_fast_charging = 'yes' in quick_str or 'fast' in quick_str or 'quick' in quick_str or 'w' in quick_str
        
        # Extract wattage (e.g., "33W", "65W Fast Charging")
        match = re.search(r'(\d+)\s*W', quick_str, re.IGNORECASE)
        if match:
            try:
                phone.charging_wattage = float(match.group(1))
            except (ValueError, AttributeError):
                pass
    
    # Detect wireless charging
    if phone.wireless_charging:
        wireless_str = str(phone.wireless_charging).lower()
        phone.has_wireless_charging = 'yes' in wireless_str or 'wireless' in wireless_str or 'w' in wireless_str
    
    # ===== BRAND & RELEASE DATE =====
    # Check if popular brand
    popular_brands = ['Samsung', 'Apple', 'Xiaomi', 'Realme', 'Oppo', 'Vivo', 'OnePlus', 'Google', 'Motorola', 'Nokia']
    if phone.brand:
        phone.is_popular_brand = any(brand.lower() in str(phone.brand).lower() for brand in popular_brands)
    
    # Parse release date
    if phone.release_date and not phone.release_date_clean:
        date_str = str(phone.release_date)
        # Try various date formats
        for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%B %Y', '%b %Y', '%Y']:
            try:
                parsed_date = datetime.strptime(date_str.strip(), fmt).date()
                phone.release_date_clean = parsed_date
                break
            except (ValueError, AttributeError):
                continue
    
    # Calculate age and new release status
    if phone.release_date_clean:
        today = date.today()
        
        # Check if upcoming
        phone.is_upcoming = phone.release_date_clean > today
        
        if not phone.is_upcoming:
            # Calculate age in months
            age_delta = (today.year - phone.release_date_clean.year) * 12 + (today.month - phone.release_date_clean.month)
            phone.age_in_months = age_delta
            
            # New release if less than 6 months old
            phone.is_new_release = age_delta <= 6
        else:
            phone.age_in_months = 0
            phone.is_new_release = False

def create_phone(db: Session, phone: PhoneCreate) -> Phone:
    """
    Create a new phone
    """
    try:
        db_phone = Phone(**phone.model_dump())
        
        # Calculate derived fields
        calculate_derived_fields(db_phone)
        
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

def update_phone(db: Session, phone_id: int, phone_update: PhoneCreate) -> Optional[Phone]:
    """
    Update an existing phone by ID
    """
    try:
        db_phone = db.query(Phone).filter(Phone.id == phone_id).first()
        if not db_phone:
            return None
        
        # Update phone fields
        update_data = phone_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_phone, field, value)
        
        # Recalculate derived fields after update
        calculate_derived_fields(db_phone)
        
        db.commit()
        db.refresh(db_phone)
        logger.info(f"Updated phone: {db_phone.name} (ID: {phone_id})")
        
        # Invalidate caches
        from app.services.cache_invalidation import CacheInvalidationService
        CacheInvalidationService.invalidate_phone_recommendations()
        query_cache.invalidate_cache(f"phone_slug_{db_phone.slug}")
        
        return db_phone
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating phone {phone_id}: {str(e)}")
        raise

def delete_phone(db: Session, phone_id: int) -> bool:
    """
    Delete a phone by ID
    """
    try:
        db_phone = db.query(Phone).filter(Phone.id == phone_id).first()
        if not db_phone:
            return False
        
        phone_name = db_phone.name
        db.delete(db_phone)
        db.commit()
        logger.info(f"Deleted phone: {phone_name} (ID: {phone_id})")
        
        # Invalidate caches
        from app.services.cache_invalidation import CacheInvalidationService
        CacheInvalidationService.invalidate_phone_recommendations()
        
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting phone {phone_id}: {str(e)}")
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
def get_phones_by_filters(db: Session, filters: Dict[str, Any], limit: int = 10) -> List[Dict[str, Any]]:
    """
    Get phones based on a dictionary of filters with enhanced multi-step filtering.
    This method implements the proper recommendation logic:
    1. Exact requirement matching
    2. Closest to user specs (price, RAM, etc.)
    3. Recent releases (within 6 months)
    4. Overall score sorting
    5. Popular brands filtering
    
    Args:
        db: Database session
        filters: Dictionary of filter criteria
        limit: Maximum number of phones to return
        
    Returns:
        List of phone dictionaries
    """
    try:
        # Map filter keys to get_phones parameters
        filter_mapping = {
            'brand': 'brand',
            'max_price': 'max_price',  # Direct mapping for max_price
            'min_price': 'min_price',  # Direct mapping for min_price
            'price_category': None,  # Handle separately
            'min_ram_gb': 'min_ram_gb',
            'max_ram_gb': 'max_ram_gb',
            'min_storage_gb': 'min_storage_gb',
            'max_storage_gb': 'max_storage_gb',
            'min_battery_capacity': 'min_battery_capacity',
            'max_battery_capacity': 'max_battery_capacity',
            'min_primary_camera_mp': 'min_primary_camera_mp',
            'min_selfie_camera_mp': 'min_selfie_camera_mp',
            'min_screen_size': 'min_screen_size',
            'max_screen_size': 'max_screen_size',
            'min_refresh_rate': 'min_refresh_rate',
            'min_charging_wattage': 'min_charging_wattage',
            'max_age_in_months': 'max_age_in_months',
            'camera_score': None,  # Handle separately
            'performance_score': None,  # Handle separately
            'display_score': None,  # Handle separately
            'overall_device_score': None,  # Handle separately
            'battery_score': None,  # Handle separately
            'security_score': None,  # Handle separately
            'connectivity_score': None,  # Handle separately
            'is_popular_brand': None,  # Handle separately
            'has_fast_charging': None,  # Handle separately
            'has_wireless_charging': None,  # Handle separately
            'is_new_release': None,  # Handle separately
            'is_upcoming': None,  # Handle separately
            'network': 'network',
            'chipset': 'chipset',
            'operating_system': 'operating_system',
            'display_type': 'display_type',
            'battery_type': 'battery_type',
            'camera_setup': 'camera_setup',
            'bluetooth': 'bluetooth',
            'nfc': 'nfc',
            'usb': 'usb',
            'fingerprint_sensor': 'fingerprint_sensor',
            'face_unlock': 'face_unlock',
            'wireless_charging': 'wireless_charging',
            'quick_charging': 'quick_charging',
            'reverse_charging': 'reverse_charging',
            'build': 'build',
            'waterproof': 'waterproof',
            'ip_rating': 'ip_rating'
        }
        
        # Build parameters for get_phones method
        params = {
            'db': db,
            'skip': 0,
            'limit': 1000  # Always fetch 1000 phones for better filtering across all queries
        }
        
        # Map simple filters
        for filter_key, param_name in filter_mapping.items():
            if filter_key in filters and param_name:
                params[param_name] = filters[filter_key]
        
        # Handle special filters
        if 'is_popular_brand' in filters and filters['is_popular_brand']:
            # Filter for popular brands
            popular_brands = ["samsung","apple","iphone","xiaomi","redmi","poco","realme","oppo","vivo","oneplus","infinix","tecno","motorola","google","huawei","nokia","symphony","iqoo","sony","lg","nokia"]
            if 'brand' not in params:
                # If no specific brand filter, we'll handle this in the query
                pass
        
        # Handle price category only if explicit price filters are not provided
        if 'price_category' in filters and 'max_price' not in filters and 'min_price' not in filters:
            price_category = filters['price_category'].lower()
            if price_category == 'budget':
                params['max_price'] = 30000
            elif price_category == 'mid-range':
                params['min_price'] = 30000
                params['max_price'] = 80000
            elif price_category == 'premium':
                params['min_price'] = 80000
        
        # Call the existing get_phones method
        phones, total = get_phones(**params)
        
        # Convert to dictionaries
        phone_dicts = []
        for phone in phones:
            phone_dict = phone_to_dict(phone)
            phone_dicts.append(phone_dict)
        
        # Apply enhanced multi-step filtering
        filtered_phones = phone_dicts.copy()
        
        # Step 1: Exclude upcoming phones by default (unless explicitly requested)
        if 'is_upcoming' not in filters:
            # By default, exclude upcoming phones from recommendations
            filtered_phones = [p for p in filtered_phones if p.get('is_upcoming') is not True]
        elif filters['is_upcoming'] is False:
            # Explicitly exclude upcoming phones
            filtered_phones = [p for p in filtered_phones if p.get('is_upcoming') is not True]
        # If is_upcoming is True, we'll include them (handled later)
        
        # Step 2: Apply additional filters that aren't handled by get_phones
        if 'camera_score' in filters:
            camera_score = filters['camera_score']
            filtered_phones = [p for p in filtered_phones if p.get('camera_score') is not None and p.get('camera_score', 0) >= camera_score]
        
        if 'performance_score' in filters:
            performance_score = filters['performance_score']
            filtered_phones = [p for p in filtered_phones if p.get('performance_score') is not None and p.get('performance_score', 0) >= performance_score]
        
        if 'display_score' in filters:
            display_score = filters['display_score']
            filtered_phones = [p for p in filtered_phones if p.get('display_score') is not None and p.get('display_score', 0) >= display_score]
        
        if 'battery_score' in filters:
            battery_score = filters['battery_score']
            filtered_phones = [p for p in filtered_phones if p.get('battery_score') is not None and p.get('battery_score', 0) >= battery_score]
        
        if 'security_score' in filters:
            security_score = filters['security_score']
            filtered_phones = [p for p in filtered_phones if p.get('security_score') is not None and p.get('security_score', 0) >= security_score]
        
        if 'connectivity_score' in filters:
            connectivity_score = filters['connectivity_score']
            filtered_phones = [p for p in filtered_phones if p.get('connectivity_score') is not None and p.get('connectivity_score', 0) >= connectivity_score]
        
        if 'overall_device_score' in filters:
            overall_score = filters['overall_device_score']
            filtered_phones = [p for p in filtered_phones if p.get('overall_device_score') is not None and p.get('overall_device_score', 0) >= overall_score]
        
        if 'is_popular_brand' in filters and filters['is_popular_brand']:
            popular_brands = ['Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi', 'Huawei', 'Sony', 'LG']
            filtered_phones = [p for p in filtered_phones if p.get('brand', '') in popular_brands]
        
        if 'has_fast_charging' in filters:
            has_fast_charging = filters['has_fast_charging']
            filtered_phones = [p for p in filtered_phones if p.get('has_fast_charging') is not None and p.get('has_fast_charging', False) == has_fast_charging]
        
        if 'has_wireless_charging' in filters:
            has_wireless_charging = filters['has_wireless_charging']
            filtered_phones = [p for p in filtered_phones if p.get('has_wireless_charging') is not None and p.get('has_wireless_charging', False) == has_wireless_charging]
        
        if 'is_new_release' in filters:
            is_new_release = filters['is_new_release']
            filtered_phones = [p for p in filtered_phones if p.get('is_new_release') is not None and p.get('is_new_release', False) == is_new_release]
        
        if 'is_upcoming' in filters and filters['is_upcoming'] is True:
            # Explicitly include upcoming phones
            filtered_phones = [p for p in filtered_phones if p.get('is_upcoming') is True]
        
        # Step 3: Filter for recent releases (within 6 months) if not explicitly disabled
        # For single phone requests, be more lenient with the age filter to ensure we get results
        if 'max_age_in_months' not in filters:
            # Default to 6 months for recent releases unless user specifically asked for older phones
            # For single phone requests, extend the window to 12 months to increase chances of finding matches
            max_age = 6 if limit > 1 else 12
            filtered_phones = [p for p in filtered_phones if (p.get('age_in_months') is not None and p.get('age_in_months', 12) <= max_age) or p.get('age_in_months') is None]
        
        # Step 4: Enhanced price proximity sorting for better recommendations
        # For price filtering, prioritize phones closer to the target price range with better weighting
        if 'max_price' in filters and 'min_price' not in filters:
            target_price = filters['max_price']
            # Enhanced price proximity sorting that balances price closeness with quality scores
            def price_proximity_score(phone):
                price = phone.get('price_original')
                overall_score = phone.get('overall_device_score', 0) or 0
                performance_score = phone.get('performance_score', 0) or 0
                
                if price is None:
                    return float('inf')
                
                # If price exceeds the limit, give it a very bad score
                if price > target_price:
                    return float('inf')
                
                # Calculate price difference - we want phones reasonably close to the target
                price_diff = abs(target_price - price)
                
                # For 'under X' queries, we want to prioritize phones that are:
                # 1. Close to the target price (but under it)
                # 2. Have good overall scores
                # 3. Have good performance scores
                
                # Normalize scores to 0-1 range (assuming scores are out of 100)
                normalized_overall = overall_score / 100 if overall_score <= 100 else 1
                normalized_performance = performance_score / 100 if performance_score <= 100 else 1
                
                # Weighted score for 'under X' queries:
                # - Price difference (60% weight) - lower difference is better (0.0 to 1.0, lower is better)
                # - Overall score (25% weight) - higher score is better (0.0 to 1.0, higher is better)
                # - Performance score (15% weight) - higher score is better (0.0 to 1.0, higher is better)
                
                # Normalize price difference to 0-1 range (assuming max reasonable difference is target_price)
                normalized_price_diff = min(price_diff / target_price, 1.0)
                
                # For 'under X' queries, we want phones close to the target price
                # but we don't want to penalize phones that are significantly under
                # the target if they have excellent scores
                # Note: Lower weighted_score is better (closer to 0)
                # Price diff: lower is better (0.0 to 1.0)
                # Scores: higher is better (0.0 to 1.0), so we use them directly
                weighted_score = (normalized_price_diff * 0.60) + ((1 - normalized_overall) * 0.25) + ((1 - normalized_performance) * 0.15)
                
                return weighted_score
            
            # Sort by the enhanced scoring function
            filtered_phones.sort(key=price_proximity_score)
            
            # For 'under X' queries, we want phones that are under the max price
            # The sorting already prioritizes phones closer to the target
            # We don't need an additional filter that excludes phones based on proximity
            # as this can be too restrictive for the 'under X' use case
        elif 'min_price' in filters and 'max_price' not in filters:
            target_price = filters['min_price']
            # Sort by how close to the target price (but still over)
            filtered_phones.sort(key=lambda p: abs(p.get('price_original', target_price) - target_price) if p.get('price_original') is not None else float('inf'))
        elif 'min_price' in filters and 'max_price' in filters:
            min_price = filters['min_price']
            max_price = filters['max_price']
            # Sort by how close to the middle of the range
            target_price = (min_price + max_price) / 2
            filtered_phones.sort(key=lambda p: abs(p.get('price_original', target_price) - target_price) if (p.get('price_original') is not None and min_price <= p.get('price_original', 0) <= max_price) else float('inf'))
        
        # For RAM filtering, prioritize exact matches
        if 'min_ram_gb' in filters and 'max_ram_gb' not in filters:
            target_ram = filters['min_ram_gb']
            # Sort by how close to the target RAM
            filtered_phones.sort(key=lambda p: abs(p.get('ram_gb', target_ram) - target_ram) if p.get('ram_gb') is not None else float('inf'))
        elif 'max_ram_gb' in filters and 'min_ram_gb' not in filters:
            target_ram = filters['max_ram_gb']
            # Sort by how close to the target RAM
            filtered_phones.sort(key=lambda p: abs(p.get('ram_gb', target_ram) - target_ram) if p.get('ram_gb') is not None else float('inf'))
        elif 'min_ram_gb' in filters and 'max_ram_gb' in filters:
            min_ram = filters['min_ram_gb']
            max_ram = filters['max_ram_gb']
            # Sort by how close to the middle of the range
            target_ram = (min_ram + max_ram) / 2
            filtered_phones.sort(key=lambda p: abs(p.get('ram_gb', target_ram) - target_ram) if (p.get('ram_gb') is not None and min_ram <= p.get('ram_gb', 0) <= max_ram) else float('inf'))
        
        # For camera count filtering, prioritize exact matches
        if 'camera_count' in filters:
            target_camera_count = filters['camera_count']
            filtered_phones.sort(key=lambda p: abs(p.get('camera_count', target_camera_count) - target_camera_count) if p.get('camera_count') is not None else float('inf'))
        
        # Step 5: Apply brand preference if no specific brand requested
        # Only apply this if we haven't already sorted by price proximity
        if 'max_price' not in filters and 'brand' not in filters and ('is_popular_brand' not in filters or filters['is_popular_brand']):
            # Move popular brand phones to the front
            popular_brands = ['Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi', 'Huawei', 'Sony', 'LG']
            filtered_phones.sort(key=lambda p: 0 if p.get('brand', '') in popular_brands else 1)
        
        # Step 6: Sort by overall device score (highest first) for cases where we haven't already sorted by price proximity
        # Only apply this if we haven't already sorted by price proximity
        if 'max_price' not in filters:
            filtered_phones.sort(key=lambda p: p.get('overall_device_score', 0) if p.get('overall_device_score') is not None else 0, reverse=True)
        
        # For single phone requests, if we still don't have results, try a more relaxed approach
        if limit == 1 and len(filtered_phones) == 0 and phone_dicts:
            # Use the original phone list but apply only the most critical filters
            relaxed_phones = phone_dicts.copy()
            
            # Apply only the most critical filters that were specified
            critical_filters = ['max_price', 'min_ram_gb', 'brand']
            for filter_key in critical_filters:
                if filter_key in filters:
                    if filter_key == 'max_price':
                        relaxed_phones = [p for p in relaxed_phones if p.get('price_original') is not None and p.get('price_original') <= filters[filter_key]]
                    elif filter_key == 'min_ram_gb':
                        relaxed_phones = [p for p in relaxed_phones if p.get('ram_gb') is not None and p.get('ram_gb') >= filters[filter_key]]
                    elif filter_key == 'brand':
                        relaxed_phones = [p for p in relaxed_phones if p.get('brand', '').lower() == filters[filter_key].lower()]
            
            # Exclude upcoming phones even in relaxed mode
            relaxed_phones = [p for p in relaxed_phones if p.get('is_upcoming') is not True]
            
            # Sort by overall device score
            relaxed_phones.sort(key=lambda p: p.get('overall_device_score', 0) if p.get('overall_device_score') is not None else 0, reverse=True)
            
            # Use relaxed results if we have them
            if relaxed_phones:
                filtered_phones = relaxed_phones
        
        # Limit to requested number of phones
        filtered_phones = filtered_phones[:limit]
        
        logger.info(f"Retrieved {len(filtered_phones)} phones with enhanced filtering. Original: {len(phone_dicts)}, Filters: {filters}")
        return filtered_phones
        
    except Exception as e:
        logger.error(f"Error in get_phones_by_filters: {str(e)}", exc_info=True)
        return []

def update_phone(db: Session, phone_id: int, phone_update: PhoneCreate) -> Optional[Phone]:
    """
    Update an existing phone
    """
    try:
        db_phone = get_phone(db, phone_id)
        if not db_phone:
            return None
            
        update_data = phone_update.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(db_phone, field, value)
        
        # Calculate derived fields after updating
        calculate_derived_fields(db_phone)
            
        db.add(db_phone)
        db.commit()
        db.refresh(db_phone)
        logger.info(f"Updated phone: {db_phone.name} with ID {db_phone.id}")
        
        # Invalidate recommendation cache
        from app.services.cache_invalidation import CacheInvalidationService
        CacheInvalidationService.invalidate_phone_recommendations()
        
        return db_phone
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating phone {phone_id}: {str(e)}")
        raise

def delete_phone(db: Session, phone_id: int) -> bool:
    """
    Delete a phone by ID
    """
    try:
        db_phone = get_phone(db, phone_id)
        if not db_phone:
            return False
            
        db.delete(db_phone)
        db.commit()
        logger.info(f"Deleted phone with ID {phone_id}")
        
        # Invalidate recommendation cache
        from app.services.cache_invalidation import CacheInvalidationService
        CacheInvalidationService.invalidate_phone_recommendations()
        
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting phone {phone_id}: {str(e)}")
        raise