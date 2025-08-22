
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import SessionLocal
from app.models.comparison import ComparisonSession
import logging

logger = logging.getLogger(__name__)

def cleanup_expired_sessions():
    db = None
    try:
        db = SessionLocal()
        now = datetime.utcnow()
        expired_sessions = db.query(ComparisonSession).filter(ComparisonSession.expires_at < now).all()
        for session in expired_sessions:
            db.delete(session)
        db.commit()
        logger.info(f"Cleaned up {len(expired_sessions)} expired comparison sessions.")
    except Exception as e:
        logger.error(f"Error cleaning up expired sessions: {e}")
        if db:
            db.rollback()
    finally:
        if db:
            db.close()
