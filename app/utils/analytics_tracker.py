"""
Analytics tracking utilities for easy event logging
"""
from sqlalchemy.orm import Session
from app.models.analytics import (
    PageView, UserSession, AIUsage, UserAction, 
    SearchQuery, PhoneView, ConversionEvent
)
from typing import Optional, Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def track_page_view(
    db: Session,
    session_id: str,
    path: str,
    user_agent: str,
    ip_address: str,
    user_id: Optional[int] = None,
    referrer: Optional[str] = None,
    duration_seconds: Optional[int] = None
):
    """Track a page view"""
    try:
        page_view = PageView(
            user_id=user_id,
            session_id=session_id,
            path=path,
            user_agent=user_agent,
            ip_address=ip_address,
            referrer=referrer,
            duration_seconds=duration_seconds
        )
        db.add(page_view)
        db.commit()
        return page_view
    except Exception as e:
        logger.error(f"Error tracking page view: {str(e)}")
        db.rollback()
        return None


def track_ai_usage(
    db: Session,
    session_id: str,
    endpoint: str,
    model_name: str,
    user_query: str,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    response_time_ms: int = 0,
    user_id: Optional[int] = None,
    response_preview: Optional[str] = None,
    success: bool = True,
    error_message: Optional[str] = None
):
    """Track AI/LLM usage"""
    try:
        total_tokens = prompt_tokens + completion_tokens
        
        # Simple cost estimation (adjust based on actual pricing)
        # Example: $0.001 per 1000 tokens
        estimated_cost = (total_tokens / 1000) * 0.001
        
        ai_usage = AIUsage(
            user_id=user_id,
            session_id=session_id,
            endpoint=endpoint,
            model_name=model_name,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            estimated_cost=estimated_cost,
            response_time_ms=response_time_ms,
            user_query=user_query[:1000],  # Limit to 1000 chars
            response_preview=response_preview[:500] if response_preview else None,
            success=success,
            error_message=error_message
        )
        db.add(ai_usage)
        db.commit()
        return ai_usage
    except Exception as e:
        logger.error(f"Error tracking AI usage: {str(e)}")
        db.rollback()
        return None


def track_user_action(
    db: Session,
    session_id: str,
    action_type: str,
    action_category: str,
    user_id: Optional[int] = None,
    target_id: Optional[str] = None,
    target_type: Optional[str] = None,
    extra_data: Optional[Dict[str, Any]] = None
):
    """Track a user action"""
    try:
        action = UserAction(
            user_id=user_id,
            session_id=session_id,
            action_type=action_type,
            action_category=action_category,
            target_id=target_id,
            target_type=target_type,
            extra_data=extra_data
        )
        db.add(action)
        db.commit()
        return action
    except Exception as e:
        logger.error(f"Error tracking user action: {str(e)}")
        db.rollback()
        return None


def track_search_query(
    db: Session,
    session_id: str,
    query_text: str,
    query_type: str,
    results_count: int,
    response_time_ms: int,
    user_id: Optional[int] = None,
    clicked_result_id: Optional[str] = None,
    clicked_position: Optional[int] = None
):
    """Track a search query"""
    try:
        search = SearchQuery(
            user_id=user_id,
            session_id=session_id,
            query_text=query_text,
            query_type=query_type,
            results_count=results_count,
            response_time_ms=response_time_ms,
            clicked_result_id=clicked_result_id,
            clicked_position=clicked_position
        )
        db.add(search)
        db.commit()
        return search
    except Exception as e:
        logger.error(f"Error tracking search query: {str(e)}")
        db.rollback()
        return None


def track_phone_view(
    db: Session,
    session_id: str,
    phone_id: int,
    user_id: Optional[int] = None,
    view_duration_seconds: Optional[int] = None,
    scrolled_to_specs: bool = False,
    viewed_reviews: bool = False,
    referrer_type: Optional[str] = None
):
    """Track a phone detail page view"""
    try:
        phone_view = PhoneView(
            user_id=user_id,
            session_id=session_id,
            phone_id=phone_id,
            view_duration_seconds=view_duration_seconds,
            scrolled_to_specs=scrolled_to_specs,
            viewed_reviews=viewed_reviews,
            referrer_type=referrer_type
        )
        db.add(phone_view)
        db.commit()
        return phone_view
    except Exception as e:
        logger.error(f"Error tracking phone view: {str(e)}")
        db.rollback()
        return None


def track_conversion(
    db: Session,
    session_id: str,
    event_type: str,
    user_id: Optional[int] = None,
    event_value: Optional[float] = None,
    extra_data: Optional[Dict[str, Any]] = None
):
    """Track a conversion event"""
    try:
        conversion = ConversionEvent(
            user_id=user_id,
            session_id=session_id,
            event_type=event_type,
            event_value=event_value,
            extra_data=extra_data
        )
        db.add(conversion)
        db.commit()
        return conversion
    except Exception as e:
        logger.error(f"Error tracking conversion: {str(e)}")
        db.rollback()
        return None


def start_session(
    db: Session,
    session_id: str,
    user_agent: str,
    ip_address: str,
    user_id: Optional[int] = None
):
    """Start a new user session"""
    try:
        session = UserSession(
            user_id=user_id,
            session_id=session_id,
            user_agent=user_agent,
            ip_address=ip_address,
            started_at=datetime.utcnow()
        )
        db.add(session)
        db.commit()
        return session
    except Exception as e:
        logger.error(f"Error starting session: {str(e)}")
        db.rollback()
        return None


def end_session(
    db: Session,
    session_id: str,
    pages_viewed: int = 0,
    actions_taken: int = 0
):
    """End a user session"""
    try:
        session = db.query(UserSession).filter(
            UserSession.session_id == session_id
        ).first()
        
        if session:
            session.ended_at = datetime.utcnow()
            if session.started_at:
                duration = (session.ended_at - session.started_at).total_seconds()
                session.duration_seconds = int(duration)
            session.pages_viewed = pages_viewed
            session.actions_taken = actions_taken
            db.commit()
            return session
    except Exception as e:
        logger.error(f"Error ending session: {str(e)}")
        db.rollback()
        return None
