
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime, timedelta

class ComparisonSession(Base):
    __tablename__ = "comparison_sessions"
    session_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(days=1))
    items = relationship("ComparisonItem", back_populates="session")

class ComparisonItem(Base):
    __tablename__ = "comparison_items"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("comparison_sessions.session_id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    slug = Column(String, index=True)
    added_at = Column(DateTime, default=datetime.utcnow)
    session = relationship("ComparisonSession", back_populates="items")
