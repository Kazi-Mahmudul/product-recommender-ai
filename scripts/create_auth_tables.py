#!/usr/bin/env python3
"""
Script to create authentication tables in the database.
This script creates the users and email_verifications tables.
"""

import sys
import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.config import settings
from app.core.database import Base
from app.models.user import User, EmailVerification

def create_auth_tables():
    """Create authentication tables in the database."""
    
    # Handle postgres:// to postgresql:// URL scheme issue for SQLAlchemy
    database_url = settings.DATABASE_URL.replace("postgres://", "postgresql://", 1) if settings.DATABASE_URL.startswith("postgres://") else settings.DATABASE_URL
    
    # Create engine
    engine = create_engine(database_url, echo=True)
    
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Authentication tables created successfully!")
        
        # Verify tables were created
        with engine.connect() as conn:
            # Check if users table exists
            result = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"))
            users_exists = result.scalar()
            
            # Check if email_verifications table exists
            result = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_verifications')"))
            verifications_exists = result.scalar()
            
            if users_exists and verifications_exists:
                logger.info("Tables verified successfully!")
                logger.info("Created tables:")
                logger.info("   - users")
                logger.info("   - email_verifications")
            else:
                logger.error("Some tables were not created properly")
                
    except SQLAlchemyError as e:
        logger.error(f"Database error: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    logger.info("Creating authentication tables...")
    success = create_auth_tables()
    
    if success:
        logger.info("Authentication system setup complete!")
        logger.info("Next steps:")
        logger.info("   1. Configure your email settings in environment variables:")
        logger.info("      - EMAIL_HOST (e.g., smtp.gmail.com)")
        logger.info("      - EMAIL_PORT (e.g., 587)")
        logger.info("      - EMAIL_USER (your email)")
        logger.info("      - EMAIL_PASS (your email password or app password)")
        logger.info("      - EMAIL_FROM (sender email)")
        logger.info("   2. Set a secure SECRET_KEY for JWT tokens")
        logger.info("   3. Test the authentication endpoints at /api/v1/docs")
    else:
        logger.error("Authentication system setup failed!")
        sys.exit(1) 