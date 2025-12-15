from fastapi import APIRouter, Depends, Response, Cookie, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm.attributes import flag_modified
from app.api import deps
from app.models.user import User
from app.crud import comparison as crud_comparison
from app.schemas.comparison import ComparisonSession, ComparisonItem
from app.utils.session_manager import SessionManager
import uuid
import logging
from typing import List, Optional, Union

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/session", response_model=ComparisonSession)
def create_session(response: Response, db: Session = Depends(deps.get_db)):
    try:
        session_id = uuid.uuid4()
        session = crud_comparison.create_comparison_session(db, session_id=session_id)
        response.set_cookie(
            key="comparison_session_id",
            value=str(session.session_id),
            httponly=True,
            secure=True,
            samesite="strict",
            max_age=86400  # 1 day
        )
        logger.info(f"Created new comparison session: {session_id}")
        return session
    except SQLAlchemyError as e:
        logger.error(f"Database error creating session: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create comparison session")
    except Exception as e:
        logger.error(f"Unexpected error creating session: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/session", response_model=ComparisonSession)
def get_session(
    response: Response,
    comparison_session_id: Union[uuid.UUID, None] = Cookie(None),
    db: Session = Depends(deps.get_db)
):
    try:
        if comparison_session_id is None:
            # Create new session
            session_id = uuid.uuid4()
            session = crud_comparison.create_comparison_session(db, session_id=session_id)
            response.set_cookie(
                key="comparison_session_id",
                value=str(session.session_id),
                httponly=True,
                secure=True,
                samesite="strict",
                max_age=86400  # 1 day
            )
            logger.info(f"Created new session for anonymous user: {session_id}")
            return session
        
        # Try to get existing session
        session = crud_comparison.get_comparison_session(db, session_id=comparison_session_id)
        if not session:
            # Session doesn't exist or expired, create new one
            session_id = uuid.uuid4()
            session = crud_comparison.create_comparison_session(db, session_id=session_id)
            response.set_cookie(
                key="comparison_session_id",
                value=str(session.session_id),
                httponly=True,
                secure=True,
                samesite="strict",
                max_age=86400  # 1 day
            )
            logger.info(f"Created replacement session: {session_id}")
        else:
            logger.info(f"Retrieved existing session: {comparison_session_id}")
        
        return session
        
    except SQLAlchemyError as e:
        logger.error(f"Database error getting session: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get comparison session")
    except Exception as e:
        logger.error(f"Unexpected error getting session: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/items/{slug}", response_model=ComparisonItem)
def add_item(
    slug: str,
    response: Response,
    comparison_session_id: Union[uuid.UUID, None] = Cookie(None),
    x_session_id: Optional[str] = Header(None),
    db: Session = Depends(deps.get_db),
    current_user: Optional[User] = Depends(deps.get_current_user_optional)
):
    try:
        # Get session ID using production-ready session manager
        session_id = SessionManager.get_session_id(comparison_session_id, x_session_id)
        
        # If no session ID found, create a new session
        if session_id is None:
            session_id = uuid.uuid4()
            session = crud_comparison.create_comparison_session(db, session_id=session_id)
            SessionManager.set_session_cookie(response, session.session_id)
            session_id = session.session_id
            logger.info(f"Created new session for add_item: {session_id}")
        
        # Add the item to comparison
        item = crud_comparison.add_comparison_item(db, slug=slug, session_id=session_id)
        logger.info(f"Added item {slug} to session {session_id}")

        # Track comparison usage for logged-in users
        # We count it as a comparison interaction when they add an item
        if current_user:
             try:
                stats = current_user.usage_stats or {}
                # Initialize if needed
                if "total_comparisons" not in stats:
                    stats["total_comparisons"] = 0
                
                stats["total_comparisons"] += 1
                current_user.usage_stats = stats
                flag_modified(current_user, "usage_stats")
                db.commit()
             except Exception as e:
                logger.error(f"Failed to update comparison stats for user {current_user.id}: {e}")

        return item
        
    except SQLAlchemyError as e:
        logger.error(f"Database error adding item: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add comparison item")
    except Exception as e:
        logger.error(f"Unexpected error adding item: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/items/{slug}")
def remove_item(
    slug: str,
    comparison_session_id: Union[uuid.UUID, None] = Cookie(None),
    x_session_id: Optional[str] = Header(None),
    db: Session = Depends(deps.get_db)
):
    try:
        # Get session ID using production-ready session manager
        session_id = SessionManager.get_session_id(comparison_session_id, x_session_id)
        
        # If no session ID found, return success (nothing to remove)
        if session_id is None:
            logger.warning(f"Attempted to remove item {slug} without session")
            return {"message": "Item removed"}
        
        crud_comparison.remove_comparison_item(db, slug=slug, session_id=session_id)
        logger.info(f"Removed item {slug} from session {session_id}")
        return {"message": "Item removed"}
        
    except SQLAlchemyError as e:
        logger.error(f"Database error removing item: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to remove comparison item")
    except Exception as e:
        logger.error(f"Unexpected error removing item: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/items", response_model=List[ComparisonItem])
def get_items(
    comparison_session_id: Union[uuid.UUID, None] = Cookie(None),
    x_session_id: Optional[str] = Header(None),
    db: Session = Depends(deps.get_db)
):
    try:
        # Get session ID using production-ready session manager
        session_id = SessionManager.get_session_id(comparison_session_id, x_session_id)
        
        # If no session ID found, return empty list
        if session_id is None:
            logger.info("No session ID found, returning empty comparison list")
            return []
        
        items = crud_comparison.get_comparison_items(db, session_id=session_id)
        logger.info(f"Retrieved {len(items)} items for session {session_id}")
        return items
        
    except SQLAlchemyError as e:
        logger.error(f"Database error getting items: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get comparison items")
    except Exception as e:
        logger.error(f"Unexpected error getting items: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/popular")
def get_popular_comparisons(
    limit: int = 3,
    db: Session = Depends(deps.get_db)
):
    """
    Get most popular phone comparison pairs (public endpoint for homepage)
    Returns pairs of phones that are frequently compared together
    """
    try:
        from app.models.comparison import ComparisonItem, ComparisonSession
        from app.models.phone import Phone
        from sqlalchemy import func
        from typing import Dict, Tuple
        
        # Get sessions with exactly 2 phones
        sessions = db.query(ComparisonItem.session_id).group_by(
            ComparisonItem.session_id
        ).having(
            func.count(ComparisonItem.id) == 2
        ).all()
        
        session_ids = [s[0] for s in sessions]
        
        # Get pairs and count occurrences
        pairs_count: Dict[Tuple[str, str], int] = {}
        for session_id in session_ids:
            items = db.query(ComparisonItem).filter(
                ComparisonItem.session_id == session_id
            ).all()
            
            if len(items) == 2:
                slugs = tuple(sorted([items[0].slug, items[1].slug]))
                pairs_count[slugs] = pairs_count.get(slugs, 0) + 1
        
        # Sort by count and get top pairs
        sorted_pairs = sorted(pairs_count.items(), key=lambda x: x[1], reverse=True)[:limit]
        
        # Get phone details for each pair
        results = []
        for (slug1, slug2), count in sorted_pairs:
            phone1 = db.query(Phone).filter(Phone.slug == slug1).first()
            phone2 = db.query(Phone).filter(Phone.slug == slug2).first()
            
            if phone1 and phone2:
                results.append({
                    "phone1": {
                        "slug": slug1,
                        "name": phone1.name,
                        "brand": phone1.brand,
                        "model": phone1.model,
                        "img_url": phone1.img_url,
                        "price": phone1.price
                    },
                    "phone2": {
                        "slug": slug2,
                        "name": phone2.name,
                        "brand": phone2.brand,
                        "model": phone2.model,
                        "img_url": phone2.img_url,
                        "price": phone2.price
                    },
                    "comparison_count": count
                })
        
        return results
        
    except Exception as e:
        logger.error(f"Error getting popular comparisons: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get popular comparisons")