from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.phone import Phone
from app.schemas.phone import PhoneCreate

def get_phones(
    db: Session, 
    skip: int = 0, 
    limit: int = 100,
    brand: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_ram: Optional[int] = None,
    search: Optional[str] = None
) -> Tuple[List[Phone], int]:
    """
    Get phones with optional filtering
    """
    query = db.query(Phone)
    
    # Apply filters if provided
    if brand:
        query = query.filter(Phone.brand == brand)
    if min_price is not None:
        query = query.filter(Phone.price >= min_price)
    if max_price is not None:
        query = query.filter(Phone.price <= max_price)
    if min_ram is not None:
        query = query.filter(Phone.ram >= min_ram)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Phone.name.ilike(search_term)) | 
            (Phone.brand.ilike(search_term)) |
            (Phone.model.ilike(search_term))
        )
    
    # Get total count for pagination
    total = query.count()
    
    # Apply pagination
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

def get_brands(db: Session) -> List[str]:
    """
    Get all unique brands in the database
    """
    return [brand[0] for brand in db.query(Phone.brand).distinct().all()]

def get_price_range(db: Session) -> Dict[str, float]:
    """
    Get the minimum and maximum price in the database
    """
    min_price = db.query(func.min(Phone.price)).scalar()
    max_price = db.query(func.max(Phone.price)).scalar()
    return {"min": min_price, "max": max_price}

def create_phone(db: Session, phone: PhoneCreate) -> Phone:
    """
    Create a new phone
    """
    db_phone = Phone(**phone.model_dump())
    db.add(db_phone)
    db.commit()
    db.refresh(db_phone)
    return db_phone

def create_phones_batch(db: Session, phones: List[Dict[str, Any]]) -> List[Phone]:
    """
    Create multiple phones at once
    """
    db_phones = [Phone(**phone) for phone in phones]
    db.add_all(db_phones)
    db.commit()
    for phone in db_phones:
        db.refresh(phone)
    return db_phones