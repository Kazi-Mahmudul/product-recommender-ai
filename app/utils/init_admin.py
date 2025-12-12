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

        # --- ALSO SEED MAIN USER TABLE (For Standard Login Page Access) ---
        from app.crud.auth import get_user_by_email
        from app.models.user import User
        from app.utils.auth import get_password_hash
        
        main_user = get_user_by_email(db, settings.SUPER_ADMIN_EMAIL)
        if not main_user:
            logger.info("Seeding Super Admin into main Users table...")
            new_main_user = User(
                email=settings.SUPER_ADMIN_EMAIL,
                password_hash=get_password_hash(settings.SUPER_ADMIN_PASSWORD),
                first_name="Super",
                last_name="Admin",
                is_admin=True,
                is_verified=True
            )
            db.add(new_main_user)
            db.commit()
            db.refresh(new_main_user)
            logger.info(f"Main User created for Super Admin: {new_main_user.email}")
        else:
            # Ensure is_admin is True
            if not main_user.is_admin:
                main_user.is_admin = True
                db.commit()
                logger.info(f"Updated existing Main User to admin: {main_user.email}")
        # -------------------------------------------------------------
        
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