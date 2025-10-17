from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from app.models.review import Review
from app.models.phone import Phone

def create_review(db: Session, slug: str, rating: int, review_text: Optional[str] = None) -> Review:
    """
    Create a new review for a phone and update the phone's average rating and review count.
    """
    # Create the review
    db_review = Review(
        slug=slug,
        rating=rating,
        review_text=review_text
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    
    # Update the phone's average rating and review count
    update_phone_ratings(db, slug)
    
    return db_review

def get_reviews_by_phone_slug(db: Session, slug: str) -> List[Review]:
    """
    Get all reviews for a specific phone by slug.
    """
    return db.query(Review).filter(Review.slug == slug).order_by(Review.created_at.desc()).all()

def get_review(db: Session, review_id: int) -> Optional[Review]:
    """
    Get a specific review by ID.
    """
    return db.query(Review).filter(Review.id == review_id).first()

def update_phone_ratings(db: Session, slug: str) -> None:
    """
    Update the average rating and review count for a phone.
    """
    # Get all reviews for this phone
    reviews = db.query(Review).filter(Review.slug == slug).all()
    
    if reviews:
        # Calculate average rating
        total_rating = sum(review.rating for review in reviews)
        average_rating = total_rating / len(reviews)
        review_count = len(reviews)
    else:
        # No reviews, set defaults
        average_rating = 0.0
        review_count = 0
    
    # Update the phone record
    db.query(Phone).filter(Phone.slug == slug).update({
        "average_rating": average_rating,
        "review_count": review_count
    })
    
    db.commit()

def delete_review(db: Session, review_id: int) -> bool:
    """
    Delete a review and update the phone's ratings.
    """
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        return False
    
    phone_slug = review.slug
    db.delete(review)
    db.commit()
    
    # Update the phone's average rating and review count
    update_phone_ratings(db, phone_slug)
    
    return True