"""
CRUD operations for admin panel.
"""

from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_, or_
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import json

from app.models.admin import AdminUser, AdminActivityLog, SystemMetrics, ScraperStatus, AdminRole
from app.models.user import User
from app.models.phone import Phone
from app.schemas.admin import AdminCreate, AdminLogin, ActivityLogCreate
from app.utils.auth import get_password_hash, verify_password

class AdminCRUD:
    
    def create_admin(self, db: Session, admin_data: AdminCreate, created_by_id: Optional[int] = None) -> AdminUser:
        """Create a new admin user."""
        hashed_password = get_password_hash(admin_data.password)
        
        admin = AdminUser(
            email=admin_data.email,
            password_hash=hashed_password,
            role=admin_data.role,
            first_name=admin_data.first_name,
            last_name=admin_data.last_name,
            created_by=created_by_id
        )
        
        db.add(admin)
        db.commit()
        db.refresh(admin)
        return admin
    
    def authenticate_admin(self, db: Session, email: str, password: str) -> Optional[AdminUser]:
        """Authenticate admin user."""
        admin = db.query(AdminUser).filter(
            AdminUser.email == email,
            AdminUser.is_active == True
        ).first()
        
        if admin and verify_password(password, admin.password_hash):
            # Update last login
            admin.last_login = datetime.utcnow()
            db.commit()
            return admin
        return None
    
    def get_admin_by_id(self, db: Session, admin_id: int) -> Optional[AdminUser]:
        """Get admin user by ID."""
        return db.query(AdminUser).filter(AdminUser.id == admin_id).first()
    
    def get_admin_by_email(self, db: Session, email: str) -> Optional[AdminUser]:
        """Get admin user by email."""
        return db.query(AdminUser).filter(AdminUser.email == email).first()
    
    def get_all_admins(self, db: Session, skip: int = 0, limit: int = 100) -> List[AdminUser]:
        """Get all admin users."""
        return db.query(AdminUser).offset(skip).limit(limit).all()
    
    def update_admin(self, db: Session, admin_id: int, **updates) -> Optional[AdminUser]:
        """Update admin user."""
        admin = self.get_admin_by_id(db, admin_id)
        if admin:
            for key, value in updates.items():
                if hasattr(admin, key):
                    setattr(admin, key, value)
            db.commit()
            db.refresh(admin)
        return admin
    
    def deactivate_admin(self, db: Session, admin_id: int) -> Optional[AdminUser]:
        """Deactivate admin user."""
        return self.update_admin(db, admin_id, is_active=False)

class ActivityLogCRUD:
    
    def log_activity(self, db: Session, admin_id: int, log_data: ActivityLogCreate, 
                    ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> AdminActivityLog:
        """Create an activity log entry."""
        
        details_json = None
        if log_data.details:
            details_json = json.dumps(log_data.details)
        
        activity_log = AdminActivityLog(
            admin_user_id=admin_id,
            action=log_data.action,
            resource_type=log_data.resource_type,
            resource_id=log_data.resource_id,
            details=details_json,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.add(activity_log)
        db.commit()
        db.refresh(activity_log)
        return activity_log
    
    def get_activity_logs(self, db: Session, admin_id: Optional[int] = None, 
                         action: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[AdminActivityLog]:
        """Get activity logs with optional filters."""
        query = db.query(AdminActivityLog)
        
        if admin_id:
            query = query.filter(AdminActivityLog.admin_user_id == admin_id)
        if action:
            query = query.filter(AdminActivityLog.action == action)
        
        return query.order_by(desc(AdminActivityLog.created_at)).offset(skip).limit(limit).all()
    
    def get_recent_activities(self, db: Session, hours: int = 24, limit: int = 50) -> List[AdminActivityLog]:
        """Get recent activities within specified hours."""
        since = datetime.utcnow() - timedelta(hours=hours)
        return db.query(AdminActivityLog).filter(
            AdminActivityLog.created_at >= since
        ).order_by(desc(AdminActivityLog.created_at)).limit(limit).all()

class SystemMetricsCRUD:
    
    def record_metric(self, db: Session, metric_name: str, metric_value: str, metric_type: str) -> SystemMetrics:
        """Record a system metric."""
        metric = SystemMetrics(
            metric_name=metric_name,
            metric_value=metric_value,
            metric_type=metric_type
        )
        
        db.add(metric)
        db.commit()
        db.refresh(metric)
        return metric
    
    def get_latest_metrics(self, db: Session) -> Dict[str, Any]:
        """Get the latest value for each metric."""
        # Get the latest record for each metric name
        subquery = db.query(
            SystemMetrics.metric_name,
            func.max(SystemMetrics.recorded_at).label('latest_time')
        ).group_by(SystemMetrics.metric_name).subquery()
        
        latest_metrics = db.query(SystemMetrics).join(
            subquery,
            and_(
                SystemMetrics.metric_name == subquery.c.metric_name,
                SystemMetrics.recorded_at == subquery.c.latest_time
            )
        ).all()
        
        return {metric.metric_name: {
            'value': metric.metric_value,
            'type': metric.metric_type,
            'recorded_at': metric.recorded_at
        } for metric in latest_metrics}
    
    def get_dashboard_stats(self, db: Session) -> Dict[str, Any]:
        """Get comprehensive dashboard statistics."""
        # Basic counts
        total_phones = db.query(Phone).count()
        total_users = db.query(User).count()
        verified_users = db.query(User).filter(User.is_verified == True).count()
        
        # Recent activity (last 24 hours)
        recent_cutoff = datetime.utcnow() - timedelta(hours=24)
        recent_users = db.query(User).filter(User.created_at >= recent_cutoff).count()
        
        # Most compared phones (this would need comparison data from your comparison table)
        # For now, we'll use a placeholder
        most_compared = []
        
        # Trending searches (would need search log data)
        trending_searches = []
        
        return {
            'total_phones': total_phones,
            'total_users': total_users,
            'verified_users': verified_users,
            'recent_users_24h': recent_users,
            'most_compared_phones': most_compared,
            'trending_searches': trending_searches,
            'verification_rate': round((verified_users / total_users * 100) if total_users > 0 else 0, 2)
        }

class ScraperCRUD:
    
    def create_scraper_status(self, db: Session, scraper_name: str, 
                            triggered_by: Optional[int] = None) -> ScraperStatus:
        """Create a new scraper status record."""
        scraper_status = ScraperStatus(
            scraper_name=scraper_name,
            status='running',
            started_at=datetime.utcnow(),
            triggered_by=triggered_by
        )
        
        db.add(scraper_status)
        db.commit()
        db.refresh(scraper_status)
        return scraper_status
    
    def update_scraper_status(self, db: Session, scraper_id: int, 
                            status: str, **updates) -> Optional[ScraperStatus]:
        """Update scraper status."""
        scraper = db.query(ScraperStatus).filter(ScraperStatus.id == scraper_id).first()
        if scraper:
            scraper.status = status
            if status in ['completed', 'failed']:
                scraper.completed_at = datetime.utcnow()
            
            for key, value in updates.items():
                if hasattr(scraper, key):
                    setattr(scraper, key, value)
            
            db.commit()
            db.refresh(scraper)
        return scraper
    
    def get_scraper_statuses(self, db: Session, limit: int = 20) -> List[ScraperStatus]:
        """Get recent scraper statuses."""
        return db.query(ScraperStatus).order_by(
            desc(ScraperStatus.started_at)
        ).limit(limit).all()
    
    def get_active_scrapers(self, db: Session) -> List[ScraperStatus]:
        """Get currently running scrapers."""
        return db.query(ScraperStatus).filter(
            ScraperStatus.status == 'running'
        ).all()

# Create instances
admin_crud = AdminCRUD()
activity_log_crud = ActivityLogCRUD()
system_metrics_crud = SystemMetricsCRUD()
scraper_crud = ScraperCRUD()