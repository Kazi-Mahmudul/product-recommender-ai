"""
System Settings Model for Admin Configuration
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON
from app.core.database import Base
from datetime import datetime

class SystemSettings(Base):
    """Global system settings that admins can configure"""
    __tablename__ = "system_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Site Information
    site_name = Column(String(255), default="Peyechi - Phone Recommender")
    site_tagline = Column(String(500), default="Find Your Perfect Phone")
    site_logo_url = Column(String(1000), nullable=True)
    site_icon_url = Column(String(1000), nullable=True)
    
    # Contact & Social
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    support_email = Column(String(255), nullable=True)
    facebook_url = Column(String(500), nullable=True)
    twitter_url = Column(String(500), nullable=True)
    instagram_url = Column(String(500), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    
    # SEO Settings
    meta_title = Column(String(255), nullable=True)
    meta_description = Column(Text, nullable=True)
    meta_keywords = Column(Text, nullable=True)
    
    # Feature Toggles
    chat_enabled = Column(Boolean, default=True)
    comparisons_enabled = Column(Boolean, default=True)
    reviews_enabled = Column(Boolean, default=True)
    user_registration_enabled = Column(Boolean, default=True)
    maintenance_mode = Column(Boolean, default=False)
    
    # API Limits
    rate_limit_anonymous = Column(Integer, default=100)  # per hour
    rate_limit_authenticated = Column(Integer, default=1000)  # per hour
    max_comparison_phones = Column(Integer, default=5)
    
    # AI Settings
    ai_model = Column(String(100), default="gemini-pro")
    ai_temperature = Column(Integer, default=7)  # 0-10, represents 0.0-1.0
    ai_max_tokens = Column(Integer, default=1000)
    ai_enabled = Column(Boolean, default=True)
    
    # Notification Settings
    email_notifications_enabled = Column(Boolean, default=True)
    admin_email_alerts = Column(Boolean, default=True)
    
    # Analytics
    google_analytics_id = Column(String(100), nullable=True)
    google_adsense_id = Column(String(100), nullable=True)
    tracking_enabled = Column(Boolean, default=True)
    
    # Custom JSON for additional settings
    custom_settings = Column(JSON, nullable=True)
    
    # Metadata
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by_admin_id = Column(Integer, nullable=True)
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "site_name": self.site_name,
            "site_tagline": self.site_tagline,
            "site_logo_url": self.site_logo_url,
            "site_icon_url": self.site_icon_url,
            "contact_email": self.contact_email,
            "contact_phone": self.contact_phone,
            "support_email": self.support_email,
            "facebook_url": self.facebook_url,
            "twitter_url": self.twitter_url,
            "instagram_url": self.instagram_url,
            "linkedin_url": self.linkedin_url,
            "meta_title": self.meta_title,
            "meta_description": self.meta_description,
            "meta_keywords": self.meta_keywords,
            "chat_enabled": self.chat_enabled,
            "comparisons_enabled": self.comparisons_enabled,
            "reviews_enabled": self.reviews_enabled,
            "user_registration_enabled": self.user_registration_enabled,
            "maintenance_mode": self.maintenance_mode,
            "rate_limit_anonymous": self.rate_limit_anonymous,
            "rate_limit_authenticated": self.rate_limit_authenticated,
            "max_comparison_phones": self.max_comparison_phones,
            "ai_model": self.ai_model,
            "ai_temperature": self.ai_temperature,
            "ai_max_tokens": self.ai_max_tokens,
            "ai_enabled": self.ai_enabled,
            "email_notifications_enabled": self.email_notifications_enabled,
            "admin_email_alerts": self.admin_email_alerts,
            "google_analytics_id": self.google_analytics_id,
            "google_adsense_id": self.google_adsense_id,
            "tracking_enabled": self.tracking_enabled,
            "custom_settings": self.custom_settings,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
