"""
Initialize admin users from environment variables.
"""

from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.utils.admin_auth import init_super_admin
from app.crud.admin import admin_crud
from app.schemas.admin import AdminCreate
from app.models.admin import AdminRole
import logging

logger = logging.getLogger(__name__)

def initialize_admin_users():
    """Initialize admin users from environment variables."""
    db = next(get_db())
    
    try:
        # Initialize Super Admin
        super_admin = init_super_admin(
            db=db, 
            email=settings.SUPER_ADMIN_EMAIL, 
            password=settings.SUPER_ADMIN_PASSWORD
        )
        logger.info(f"Super admin initialized: {super_admin.email}")
        
        # Initialize Moderator if credentials are provided
        if settings.MODERATOR_EMAIL and settings.MODERATOR_PASSWORD:
            existing_moderator = admin_crud.get_admin_by_email(db, settings.MODERATOR_EMAIL)
            
            if not existing_moderator:
                moderator_data = AdminCreate(
                    email=settings.MODERATOR_EMAIL,
                    password=settings.MODERATOR_PASSWORD,
                    confirm_password=settings.MODERATOR_PASSWORD,
                    role=AdminRole.MODERATOR,
                    first_name="Default",
                    last_name="Moderator"
                )
                
                moderator = admin_crud.create_admin(db, moderator_data, created_by_id=super_admin.id)
                logger.info(f"Moderator initialized: {moderator.email}")
            else:
                logger.info(f"Moderator already exists: {existing_moderator.email}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error initializing admin users: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = initialize_admin_users()
    if success:
        print("✅ Admin users initialized successfully")
    else:
        print("❌ Failed to initialize admin users")