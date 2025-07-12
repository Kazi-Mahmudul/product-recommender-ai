from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Float
import logging

from app.models.phone import Phone
from app.schemas.phone import PhoneCreate
from rapidfuzz import process, fuzz

logger = logging.getLogger(__name__)

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
):
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
        return results[:limit]
    return results

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

def get_phones_by_names(db: Session, names: List[str]) -> List[Phone]:
    """
    Get multiple phones by names for comparison
    """
    phones = []
    for name in names:
        phone = get_phone_by_name_or_model(db, name)
        if phone:
            phones.append(phone)
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
    """Return all phone names in the database."""
    return [row[0] for row in db.query(Phone.name).all()]

def get_phones_by_fuzzy_names(db: Session, names: list, limit: int = 5, score_cutoff: int = 80):
    """Return best-matching phones for a list of names using fuzzy matching."""
    all_names = get_all_phone_names(db)
    matched_phones = []
    for name in names:
        match, score, _ = process.extractOne(name, all_names, scorer=fuzz.token_sort_ratio)
        if score >= score_cutoff:
            phone = get_phone_by_name_or_model(db, match)
            if phone:
                matched_phones.append(phone)
    return matched_phones[:limit]