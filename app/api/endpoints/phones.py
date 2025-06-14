from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.crud import phone as phone_crud
from app.schemas.phone import Phone, PhoneList
from app.core.database import get_db
from app.models.phone import Phone as PhoneModel

router = APIRouter()

@router.get("/", response_model=PhoneList)
def read_phones(
    skip: int = 0,
    limit: int = 100,
    brand: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_ram_gb: Optional[int] = None,
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