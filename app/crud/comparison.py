
from sqlalchemy.orm import Session
from app.models.comparison import ComparisonSession, ComparisonItem
from app.schemas.comparison import ComparisonSessionCreate, ComparisonItemCreate
import uuid

def create_comparison_session(db: Session, session_id: uuid.UUID) -> ComparisonSession:
    db_session = ComparisonSession(session_id=session_id)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def get_comparison_session(db: Session, session_id: uuid.UUID) -> ComparisonSession:
    return db.query(ComparisonSession).filter(ComparisonSession.session_id == session_id).first()

def add_comparison_item(db: Session, slug: str, session_id: uuid.UUID = None, user_id: int = None) -> ComparisonItem:
    if session_id and user_id:
        raise ValueError("Cannot provide both session_id and user_id")
    if not session_id and not user_id:
        raise ValueError("Must provide either session_id or user_id")

    db_item = ComparisonItem(slug=slug, session_id=session_id, user_id=user_id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def get_comparison_items(db: Session, session_id: uuid.UUID = None, user_id: int = None) -> list[ComparisonItem]:
    if session_id:
        return db.query(ComparisonItem).filter(ComparisonItem.session_id == session_id).all()
    elif user_id:
        return db.query(ComparisonItem).filter(ComparisonItem.user_id == user_id).all()
    return []

def remove_comparison_item(db: Session, slug: str, session_id: uuid.UUID = None, user_id: int = None):
    if session_id and user_id:
        raise ValueError("Cannot provide both session_id and user_id")
    if not session_id and not user_id:
        raise ValueError("Must provide either session_id or user_id")

    if session_id:
        db_item = db.query(ComparisonItem).filter(ComparisonItem.session_id == session_id, ComparisonItem.slug == slug).first()
    elif user_id:
        db_item = db.query(ComparisonItem).filter(ComparisonItem.user_id == user_id, ComparisonItem.slug == slug).first()
    else:
        db_item = None

    if db_item:
        db.delete(db_item)
        db.commit()
    return db_item

def merge_comparison_data(db: Session, session_id: uuid.UUID, user_id: int):
    # Get all items from the anonymous session
    session_items = db.query(ComparisonItem).filter(ComparisonItem.session_id == session_id).all()
    
    # Get all items already associated with the user
    user_items = db.query(ComparisonItem).filter(ComparisonItem.user_id == user_id).all()
    user_slugs = {item.slug for item in user_items}

    for item in session_items:
        if item.slug not in user_slugs:
            # If the item is not already in the user's comparison list, associate it with the user
            item.user_id = user_id
            item.session_id = None  # Disassociate from the anonymous session
            db.add(item)
        else:
            # If the item is already in the user's list, delete the duplicate from the anonymous session
            db.delete(item)
    
    # Delete the anonymous session itself
    db_session = db.query(ComparisonSession).filter(ComparisonSession.session_id == session_id).first()
    if db_session:
        db.delete(db_session)

    db.commit()
