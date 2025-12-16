"""
Admin Settings Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional

from app.core.database import get_db
from app.api.deps.admin_deps import get_current_admin_user
from app.models.user import User
from app.models.system_settings import SystemSettings

router = APIRouter()

class SettingsUpdate(BaseModel):
    # Site Information
    site_name: Optional[str] = None
    site_tagline: Optional[str] = None
    site_logo_url: Optional[str] = None
    site_icon_url: Optional[str] = None
    
    # Contact & Social
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    support_email: Optional[str] = None
    facebook_url: Optional[str] = None
    twitter_url: Optional[str] = None
    instagram_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    
    # SEO
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None
    
    # Feature Toggles
    chat_enabled: Optional[bool] = None
    comparisons_enabled: Optional[bool] = None
    reviews_enabled: Optional[bool] = None
    user_registration_enabled: Optional[bool] = None
    maintenance_mode: Optional[bool] = None
    
    # API Limits
    rate_limit_anonymous: Optional[int] = Field(None, ge=1, le=10000)
    rate_limit_authenticated: Optional[int] = Field(None, ge=1, le=100000)
    max_comparison_phones: Optional[int] = Field(None, ge=2, le=10)
    
    # AI Settings
    ai_model: Optional[str] = None
    ai_temperature: Optional[int] = Field(None, ge=0, le=10)
    ai_max_tokens: Optional[int] = Field(None, ge=100, le=5000)
    ai_enabled: Optional[bool] = None
    
    # Notifications
    email_notifications_enabled: Optional[bool] = None
    admin_email_alerts: Optional[bool] = None
    
    # Analytics
    google_analytics_id: Optional[str] = None
    google_adsense_id: Optional[str] = None
    tracking_enabled: Optional[bool] = None


@router.get("/settings")
def get_settings(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Get current system settings (admin only)
    """
    settings = db.query(SystemSettings).first()
    
    # Create default settings if none exist
    if not settings:
        settings = SystemSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return settings.to_dict()


@router.put("/settings")
def update_settings(
    settings_update: SettingsUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Update system settings (admin only)
    """
    settings = db.query(SystemSettings).first()
    
    # Create if doesn't exist
    if not settings:
        settings = SystemSettings()
        db.add(settings)
    
    # Update only provided fields
    for field, value in settings_update.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
    
    settings.updated_by_admin_id = current_admin.id
    
    db.commit()
    db.refresh(settings)
    
    return {
        "success": True,
        "message": "Settings updated successfully",
        "settings": settings.to_dict()
    }


@router.post("/settings/reset")
def reset_settings(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Reset settings to defaults (admin only)
    """
    settings = db.query(SystemSettings).first()
    
    if settings:
        db.delete(settings)
        db.commit()
    
    # Create new default settings
    settings = SystemSettings()
    db.add(settings)
    db.commit()
    db.refresh(settings)
    
    return {
        "success": True,
        "message": "Settings reset to defaults",
        "settings": settings.to_dict()
    }
