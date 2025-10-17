from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(255), ForeignKey("phones.slug"), index=True, nullable=False)
    rating = Column(Integer, nullable=False)
    review_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    # Add session identifier for anonymous user tracking
    session_id = Column(String(255), nullable=False)
    
    # Relationship to Phone model
    phone = relationship("Phone", back_populates="reviews")

    def __repr__(self):
        return f"<Review {self.id} for phone {self.slug}>"