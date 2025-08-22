from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.crud import top_searched as top_searched_crud
from app.schemas.phone import Phone
from app.core.database import get_db
from app.models.phone import Phone as PhoneModel

router = APIRouter()

@router.get("/", response_model=List[Phone])
def read_top_searched_phones(limit: int = 10, db: Session = Depends(get_db)):
    """
    Get top searched phones in Bangladesh
    """
    # Get the top searched phone records
    top_searched_records = top_searched_crud.get_top_searched_phones(db, limit=limit)
    
    # Get the actual phone details from the phones table
    phone_ids = [record.phone_id for record in top_searched_records]
    phones = db.query(PhoneModel).filter(PhoneModel.id.in_(phone_ids)).all()
    
    # Sort phones to match the rank order
    phone_dict = {phone.id: phone for phone in phones}
    sorted_phones = [phone_dict[record.phone_id] for record in top_searched_records if record.phone_id in phone_dict]
    
    # Convert to dict format for response
    return [Phone(**phone.__dict__) for phone in sorted_phones]