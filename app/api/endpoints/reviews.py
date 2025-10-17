from typing import List
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app.crud import review as review_crud
from app.schemas.review import ReviewCreate, Review, ReviewUpdate
from app.core.database import get_db

router = APIRouter()

@router.post("/", response_model=Review)
def create_review(review: ReviewCreate, 
                  session_id: str = Header(None),
                  db: Session = Depends(get_db)):
    """
    Create a new review for a phone.
    """
    try:
        db_review = review_crud.create_review(
            db=db,
            slug=review.slug,
            rating=review.rating,
            review_text=review.review_text,
            session_id=session_id
        )
        return db_review
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{slug}", response_model=List[Review])
def read_reviews(slug: str, db: Session = Depends(get_db)):
    """
    Get all reviews for a specific phone by slug.
    """
    reviews = review_crud.get_reviews_by_phone_slug(db=db, slug=slug)
    return reviews

@router.put("/{review_id}", response_model=Review)
def update_review(review_id: int,
                  review_update: ReviewUpdate,
                  session_id: str = Header(None),
                  db: Session = Depends(get_db)):
    """
    Update a review if the session ID matches.
    """
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    db_review = review_crud.update_review(
        db=db,
        review_id=review_id,
        rating=review_update.rating,
        review_text=review_update.review_text,
        session_id=session_id
    )
    
    if not db_review:
        raise HTTPException(status_code=403, detail="Not authorized to update this review or review not found")
    
    return db_review

@router.delete("/{review_id}")
def delete_review(review_id: int,
                  session_id: str = Header(None),
                  db: Session = Depends(get_db)):
    """
    Delete a review if the session ID matches.
    """
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    success = review_crud.delete_review(
        db=db,
        review_id=review_id,
        session_id=session_id
    )
    
    if not success:
        raise HTTPException(status_code=403, detail="Not authorized to delete this review or review not found")
    
    return {"message": "Review deleted successfully"}