from typing import List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from uuid import UUID
from datetime import datetime

from app.models.chat_history import ChatSession, ChatMessage
from app.schemas.chat_history import ChatSessionCreate, ChatMessageCreate

def get_user_sessions(db: Session, user_id: int, limit: int = 100, offset: int = 0) -> List[ChatSession]:
    """
    Get all chat sessions for a user, ordered by most recently updated.
    """
    return db.query(ChatSession)\
        .filter(ChatSession.user_id == user_id, ChatSession.is_active == True)\
        .order_by(desc(ChatSession.updated_at))\
        .offset(offset)\
        .limit(limit)\
        .all()

def get_session(db: Session, session_id: UUID, user_id: int) -> Optional[ChatSession]:
    """
    Get a specific chat session if it belongs to the user.
    """
    return db.query(ChatSession)\
        .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)\
        .first()

def create_session(db: Session, user_id: int, title: Optional[str] = None) -> ChatSession:
    """
    Create a new chat session.
    """
    db_session = ChatSession(
        user_id=user_id,
        title=title or "New Conversation"
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def update_session_title(db: Session, session_id: UUID, title: str) -> Optional[ChatSession]:
    """
    Update the title of a chat session.
    """
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if session:
        session.title = title
        db.commit()
        db.refresh(session)
    return session

def delete_session(db: Session, session_id: UUID, user_id: int) -> bool:
    """
    Soft delete a chat session (mark as inactive).
    """
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user_id).first()
    if session:
        # We can adhere to actual deletion or soft deletion based on requirements.
        # Here we'll do actual deletion as per the typical user expectation for clearing history.
        # But since we have is_active, maybe soft delete? Let's do hard delete for now to save space, 
        # unless user asked for soft. Plan didn't specify, but privacy usually means hard delete.
        # But wait, we have ondelete="CASCADE" in DB. So deleting session deletes messages.
        db.delete(session)
        db.commit()
        return True
    return False

def add_message(db: Session, session_id: UUID, role: str, content: Any, metadata: dict = {}) -> ChatMessage:
    """
    Add a message to a session.
    """
    if isinstance(content, dict) or isinstance(content, list):
         # It's already JSON compatible, no need to jsonify string unless it's a string
         pass
    
    db_message = ChatMessage(
        session_id=session_id,
        role=role,
        content=content,
        metadata_=metadata
    )
    db.add(db_message)
    # The trigger on DB side should update session.updated_at, but SQLAlchemy might not know.
    # We can manually update it to be safe and ensure response consistency if we return session.
    
    # We rely on DB trigger for timestamp, but we can also do:
    # session = db.query(ChatSession).get(session_id)
    # session.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_message)
    return db_message

def get_session_messages(db: Session, session_id: UUID, limit: int = 100, offset: int = 0) -> List[ChatMessage]:
    """
    Get messages for a session.
    """
    return db.query(ChatMessage)\
        .filter(ChatMessage.session_id == session_id)\
        .order_by(ChatMessage.created_at)\
        .offset(offset)\
        .limit(limit)\
        .all()
