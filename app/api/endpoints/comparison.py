from fastapi import APIRouter, Depends, Response, Cookie, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.api import deps
from app.crud import comparison as crud_comparison
from app.schemas.comparison import ComparisonSession, ComparisonItem
import uuid
import logging
from typing import List, Optional

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
    comparison_session_id: uuid.UUID | None = Cookie(None),
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
    comparison_session_id: uuid.UUID | None = Cookie(None),
    x_session_id: Optional[str] = Header(None),
    db: Session = Depends(deps.get_db)
):
    try:
        # Try to get session ID from cookie first, then from header
        session_id = comparison_session_id
        if session_id is None and x_session_id:
            try:
                session_id = uuid.UUID(x_session_id)
                logger.info(f"Using session ID from header: {session_id}")
            except ValueError:
                logger.warning(f"Invalid session ID in header: {x_session_id}")
                session_id = None
        
        # If no session ID found, create a new session
        if session_id is None:
            session_id = uuid.uuid4()
            session = crud_comparison.create_comparison_session(db, session_id=session_id)
            response.set_cookie(
                key="comparison_session_id",
                value=str(session.session_id),
                httponly=True,
                secure=False,  # Allow non-HTTPS for development
                samesite="lax",  # More permissive for cross-origin
                max_age=86400  # 1 day
            )
            session_id = session.session_id
            logger.info(f"Created new session for add_item: {session_id}")
        
        # Add the item to comparison
        item = crud_comparison.add_comparison_item(db, slug=slug, session_id=session_id)
        logger.info(f"Added item {slug} to session {session_id}")
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
    comparison_session_id: uuid.UUID | None = Cookie(None),
    x_session_id: Optional[str] = Header(None),
    db: Session = Depends(deps.get_db)
):
    try:
        # Try to get session ID from cookie first, then from header
        session_id = comparison_session_id
        if session_id is None and x_session_id:
            try:
                session_id = uuid.UUID(x_session_id)
                logger.info(f"Using session ID from header for remove_item: {session_id}")
            except ValueError:
                logger.warning(f"Invalid session ID in header: {x_session_id}")
                session_id = None
        
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
    comparison_session_id: uuid.UUID | None = Cookie(None),
    x_session_id: Optional[str] = Header(None),
    db: Session = Depends(deps.get_db)
):
    try:
        # Try to get session ID from cookie first, then from header
        session_id = comparison_session_id
        if session_id is None and x_session_id:
            try:
                session_id = uuid.UUID(x_session_id)
                logger.info(f"Using session ID from header for get_items: {session_id}")
            except ValueError:
                logger.warning(f"Invalid session ID in header: {x_session_id}")
                session_id = None
        
        # If no session ID found, return empty list
        if session_id is None:
            logger.info("No session ID found (cookie or header), returning empty comparison list")
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