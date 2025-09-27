"""
Pydantic schemas for admin panel operations.
"""

from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.admin import AdminRole

# Admin Authentication Schemas
class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class AdminCreate(BaseModel):
    email: EmailStr
    password: str
    confirm_password: str
    role: AdminRole = AdminRole.MODERATOR
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

class AdminResponse(BaseModel):
    id: int
    email: str
    role: AdminRole
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]
    first_name: Optional[str]
    last_name: Optional[str]
    
    class Config:
        from_attributes = True

class AdminToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    admin_role: AdminRole

# Dashboard Overview Schemas
class DashboardStats(BaseModel):
    total_phones: int
    total_users: int
    active_sessions: int
    most_compared_phones: List[Dict[str, Any]]
    trending_searches: List[Dict[str, Any]]
    api_health: Dict[str, Any]
    scraper_status: List[Dict[str, Any]]

# Phone Management Schemas
class PhoneUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    price_taka: Optional[float] = None
    is_active: Optional[bool] = None
    specifications: Optional[Dict[str, Any]] = None

class PhoneBulkUpdate(BaseModel):
    phone_ids: List[int]
    updates: PhoneUpdate

# User Management Schemas
class UserManagement(BaseModel):
    id: int
    email: str
    is_verified: bool
    created_at: datetime
    first_name: Optional[str]
    last_name: Optional[str]
    session_count: int
    last_activity: Optional[datetime]
    
    class Config:
        from_attributes = True

class UserBlock(BaseModel):
    user_id: int
    reason: str
    duration_hours: Optional[int] = None  # None for permanent

# Activity Log Schemas
class ActivityLogCreate(BaseModel):
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class ActivityLogResponse(BaseModel):
    id: int
    admin_user_id: int
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    details: Optional[str]
    ip_address: Optional[str]
    created_at: datetime
    admin_email: str
    
    class Config:
        from_attributes = True

# System Monitoring Schemas
class SystemMetricCreate(BaseModel):
    metric_name: str
    metric_value: str
    metric_type: str

class SystemMetricResponse(BaseModel):
    id: int
    metric_name: str
    metric_value: str
    metric_type: str
    recorded_at: datetime
    
    class Config:
        from_attributes = True

# Scraper Management Schemas
class ScraperTrigger(BaseModel):
    scraper_name: str
    force: bool = False  # Force run even if already running

class ScraperStatusResponse(BaseModel):
    id: int
    scraper_name: str
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    records_processed: int
    records_updated: int
    records_failed: int
    error_message: Optional[str]
    triggered_by_email: Optional[str]
    
    class Config:
        from_attributes = True

# Analytics Schemas
class AnalyticsQuery(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    metric_type: Optional[str] = None

class AnalyticsResponse(BaseModel):
    metric_name: str
    data_points: List[Dict[str, Any]]
    summary: Dict[str, Any]

# Content Management Schemas
class ContentUpdate(BaseModel):
    content_type: str  # banner, faq, theme, etc.
    content_data: Dict[str, Any]
    is_active: bool = True

class MessageResponse(BaseModel):
    message: str
    success: bool = True
    data: Optional[Dict[str, Any]] = None