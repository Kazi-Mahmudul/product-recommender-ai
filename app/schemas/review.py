from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ReviewBase(BaseModel):
    rating: int
    review_text: Optional[str] = None

class ReviewCreate(ReviewBase):
    slug: str

class ReviewUpdate(ReviewBase):
    pass

class Review(ReviewBase):
    id: int
    slug: str
    created_at: datetime

    class Config:
        from_attributes = True