"""
Admin-specific models for the product recommender admin panel.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class AdminRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    MODERATOR = "moderator"
    ANALYST = "analyst"

class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default=AdminRole.MODERATOR.value, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(Integer, ForeignKey("admin_users.id"), nullable=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    
    # Relationships
    activity_logs = relationship("AdminActivityLog", back_populates="admin_user", cascade="all, delete-orphan")
    creator = relationship("AdminUser", remote_side=[id], backref="created_admins")

    def __repr__(self):
        return f"<AdminUser {self.email} ({self.role})>"

class AdminActivityLog(Base):
    __tablename__ = "admin_activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_user_id = Column(Integer, ForeignKey("admin_users.id"), nullable=False)
    action = Column(String(100), nullable=False)  # e.g., "phone_update", "user_block", "scraper_trigger"
    resource_type = Column(String(50), nullable=True)  # e.g., "phone", "user", "system"
    resource_id = Column(String(100), nullable=True)  # ID of the affected resource
    details = Column(Text, nullable=True)  # JSON string with additional details
    ip_address = Column(String(45), nullable=True)  # IPv4/IPv6 address
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    admin_user = relationship("AdminUser", back_populates="activity_logs")

    def __repr__(self):
        return f"<AdminActivityLog {self.action} by {self.admin_user_id}>"

class SystemMetrics(Base):
    __tablename__ = "system_metrics"

    id = Column(Integer, primary_key=True, index=True)
    metric_name = Column(String(100), nullable=False)  # e.g., "total_phones", "active_users"
    metric_value = Column(String(100), nullable=False)  # Store as string for flexibility
    metric_type = Column(String(50), nullable=False)  # e.g., "count", "percentage", "status"
    recorded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<SystemMetrics {self.metric_name}: {self.metric_value}>"

class ScraperStatus(Base):
    __tablename__ = "scraper_status"

    id = Column(Integer, primary_key=True, index=True)
    scraper_name = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False)  # running, completed, failed, scheduled
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    records_processed = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    triggered_by = Column(Integer, ForeignKey("admin_users.id"), nullable=True)
    
    # Relationships
    triggered_by_admin = relationship("AdminUser")
    
    def __repr__(self):
        return f"<ScraperStatus {self.scraper_name}: {self.status}>"