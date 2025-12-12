from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps.admin_deps import get_current_admin_user
from app.crud import phone as phone_crud
from app.schemas.phone import Phone, PhoneCreate
from app.models.user import User

router = APIRouter()

@router.get("/")
def list_phones_admin(
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    List all phones (admin only)
    Returns: {items: [...], total: X}
    """
    phones, total = phone_crud.get_phones(db, skip=skip, limit=limit, search=search)
    return {
        "items": [phone_crud.phone_to_dict(phone) for phone in phones],
        "total": total
    }

@router.post("/", response_model=Phone)
def create_phone_admin(
    phone: PhoneCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Create a new phone (admin only)
    """
    try:
        db_phone = phone_crud.create_phone(db, phone)
        return phone_crud.phone_to_dict(db_phone)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating phone: {str(e)}")

@router.put("/{phone_id}", response_model=Phone)
def update_phone_admin(
    phone_id: int,
    phone: PhoneCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Update an existing phone (admin only)
    """
    db_phone = phone_crud.update_phone(db, phone_id, phone)
    if not db_phone:
        raise HTTPException(status_code=404, detail=f"Phone with ID {phone_id} not found")
    return phone_crud.phone_to_dict(db_phone)

@router.delete("/{phone_id}")
def delete_phone_admin(
    phone_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Delete a phone (admin only)
    """
    success = phone_crud.delete_phone(db, phone_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Phone with ID {phone_id} not found")
    return {"message": "Phone deleted successfully", "success": True}
