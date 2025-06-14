from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Float
import logging

from app.models.phone import Phone
from app.schemas.phone import PhoneCreate

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
    min_camera_score: Optional[float] = None,
    min_battery_score: Optional[float] = None,
    min_ram_gb: Optional[int] = None,
    min_storage_gb: Optional[int] = None,
    max_price: Optional[float] = None,
    brand: Optional[str] = None,
    limit: Optional[int] = None
):
    """Get smart phone recommendations based on scores and specifications"""
    query = db.query(Phone)
    
    if min_display_score is not None:
        query = query.filter(Phone.display_score >= min_display_score)
    if min_camera_score is not None:
        query = query.filter(Phone.camera_score >= min_camera_score)
    if min_battery_score is not None:
        query = query.filter(Phone.battery_score >= min_battery_score)
    if min_ram_gb is not None:
        query = query.filter(Phone.ram_gb >= min_ram_gb)
    if min_storage_gb is not None:
        query = query.filter(Phone.storage_gb >= min_storage_gb)
    if max_price is not None:
        query = query.filter(Phone.price_original <= max_price)
    if brand is not None:
        query = query.filter(func.lower(Phone.brand) == func.lower(brand))
    
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

def get_stats(db: Session):
    """
    Get aggregate statistics about the phones in the database.
    """
    # Placeholder for stats logic
    return {"message": "Statistics not implemented yet."}