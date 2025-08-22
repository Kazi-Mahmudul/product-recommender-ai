from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.top_searched import TopSearchedPhone
from datetime import datetime

def create_top_searched_phone(db: Session, phone_id: int, phone_name: str, brand: str, model: str, search_index: float, rank: int):
    """Create a new top searched phone record"""
    db_phone = TopSearchedPhone(
        phone_id=phone_id,
        phone_name=phone_name,
        brand=brand,
        model=model,
        search_index=search_index,
        rank=rank,
        last_updated=datetime.utcnow()
    )
    db.add(db_phone)
    db.commit()
    db.refresh(db_phone)
    return db_phone

def get_top_searched_phones(db: Session, limit: int = 10) -> List[TopSearchedPhone]:
    """Get top searched phones ordered by rank"""
    return db.query(TopSearchedPhone).order_by(TopSearchedPhone.rank).limit(limit).all()

def update_top_searched_phone(db: Session, phone_id: int, search_index: float, rank: int):
    """Update an existing top searched phone record"""
    db_phone = db.query(TopSearchedPhone).filter(TopSearchedPhone.phone_id == phone_id).first()
    if db_phone:
        db_phone.search_index = search_index
        db_phone.rank = rank
        db_phone.last_updated = datetime.utcnow()
        db.commit()
        db.refresh(db_phone)
        return db_phone
    return None

def delete_all_top_searched_phones(db: Session):
    """Delete all top searched phone records"""
    db.query(TopSearchedPhone).delete()
    db.commit()
    return True

def get_phone_rank(db: Session, phone_id: int) -> Optional[int]:
    """Get the rank of a specific phone"""
    phone = db.query(TopSearchedPhone).filter(TopSearchedPhone.phone_id == phone_id).first()
    return phone.rank if phone else None