from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Float, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class PageView(Base):
    """Track page views for analytics"""
    __tablename__ = "page_views"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Null for anonymous
    session_id = Column(String(255), index=True)  # Browser session ID
    path = Column(String(500))  # URL path visited
    user_agent = Column(String(500))  # Browser info
    ip_address = Column(String(50))  # IP address
    referrer = Column(String(500))  # Where they came from
    duration_seconds = Column(Integer)  # Time spent on page
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationship
    user = relationship("User", backref="page_views")


class UserSession(Base):
    """Track user sessions for engagement analytics"""
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    session_id = Column(String(255), unique=True, index=True)
    started_at = Column(DateTime, default=datetime.utcnow, index=True)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer)  # Total session duration
    pages_viewed = Column(Integer, default=0)  # Number of pages viewed
    actions_taken = Column(Integer, default=0)  # Number of actions (searches, comparisons, etc.)
    ip_address = Column(String(50))
    user_agent = Column(String(500))
    
    # Relationship
    user = relationship("User", backref="sessions")


class AIUsage(Base):
    """Track AI/LLM usage for cost and analytics"""
    __tablename__ = "ai_usage"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    session_id = Column(String(255), index=True)
    
    # Request details
    endpoint = Column(String(255))  # /chat, /natural-language, etc.
    model_name = Column(String(100))  # gemini-pro, etc.
    
    # Token usage
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    
    # Cost estimation (if applicable)
    estimated_cost = Column(Float)
    
    # Performance
    response_time_ms = Column(Integer)  # Response time in milliseconds
    
    # Request/Response
    user_query = Column(Text)  # User's question
    response_preview = Column(Text)  # First 500 chars of response
    
    # Status
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationship
    user = relationship("User", backref="ai_usage")


class UserAction(Base):
    """Track specific user actions for behavior analytics"""
    __tablename__ = "user_actions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    session_id = Column(String(255), index=True)
    
    # Action details
    action_type = Column(String(100), index=True)  # search, compare, view_phone, add_review, etc.
    action_category = Column(String(50))  # engagement, conversion, navigation
    
    # Context
    target_id = Column(String(255))  # Phone ID, comparison ID, etc.
    target_type = Column(String(50))  # phone, comparison, review
    
    # Additional data
    extra_data = Column(JSON)  # Flexible JSON for action-specific data
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationship
    user = relationship("User", backref="actions")


class SearchQuery(Base):
    """Track search queries for analytics and improvement"""
    __tablename__ = "search_queries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    session_id = Column(String(255), index=True)
    
    # Query details
    query_text = Column(Text, index=True)  # The actual search query
    query_type = Column(String(50))  # natural_language, filter, keyword
    
    # Results
    results_count = Column(Integer)  # Number of results returned
    clicked_result_id = Column(String(255))  # Which result was clicked
    clicked_position = Column(Integer)  # Position of clicked result
    
    # Performance
    response_time_ms = Column(Integer)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationship
    user = relationship("User", backref="searches")


class PhoneView(Base):
    """Track phone detail page views"""
    __tablename__ = "phone_views"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    session_id = Column(String(255), index=True)
    phone_id = Column(Integer, ForeignKey("phones.id"))
    
    # View details
    view_duration_seconds = Column(Integer)  # Time spent viewing
    scrolled_to_specs = Column(Boolean, default=False)  # Did they scroll to specs?
    viewed_reviews = Column(Boolean, default=False)  # Did they view reviews?
    
    # Source
    referrer_type = Column(String(50))  # search, comparison, recommendation, direct
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User", backref="phone_views")
    phone = relationship("Phone", backref="views")


class ConversionEvent(Base):
    """Track conversion events (goals achieved)"""
    __tablename__ = "conversion_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    session_id = Column(String(255), index=True)
    
    # Event details
    event_type = Column(String(100), index=True)  # signup, first_search, first_comparison, review_written
    event_value = Column(Float)  # Optional value for the conversion
    
    # Context
    extra_data = Column(JSON)  # Additional event data
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationship
    user = relationship("User", backref="conversions")

