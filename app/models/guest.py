from sqlalchemy import Column, Integer, String, DateTime, func
from app.core.database import Base

class GuestUsage(Base):
    """
    Model for tracking guest user usage.
    """
    __tablename__ = "guest_usage"

    id = Column(Integer, primary_key=True, index=True)
    guest_uuid = Column(String(50), unique=True, index=True, nullable=False)
    chat_count = Column(Integer, default=0, nullable=False)
    first_seen = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_activity = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent_hash = Column(String(64), nullable=True)  # Simple fingerprinting

    def __repr__(self):
        return f"<GuestUsage(uuid={self.guest_uuid}, count={self.chat_count})>"
