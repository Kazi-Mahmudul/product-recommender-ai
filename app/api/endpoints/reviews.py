from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud import review as review_crud
from app.schemas.review import ReviewCreate, Review
from app.core.database import get_db

router = APIRouter()

@router.post("/", response_model=Review)
def create_review(review: ReviewCreate, db: Session = Depends(get_db)):
    """
    Create a new review for a phone.
    """
    try:
        db_review = review_crud.create_review(
            db=db,
            slug=review.slug,
            rating=review.rating,
            review_text=review.review_text
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