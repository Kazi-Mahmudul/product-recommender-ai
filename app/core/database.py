import logging
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from contextlib import contextmanager
from typing import Generator
import os
import time
from dotenv import load_dotenv
from fastapi import HTTPException

from app.core.config import settings

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def create_database_engine(database_url: str, is_fallback: bool = False):
    """Create database engine with appropriate configuration"""
    # Handle postgres:// to postgresql:// URL scheme issue for SQLAlchemy
    sqlalchemy_url = database_url.replace("postgres://", "postgresql://", 1) if database_url.startswith("postgres://") else database_url
    
    # Determine connection arguments based on URL
    connect_args = {}
    if "supabase.com" in database_url or "amazonaws.com" in database_url:
        # Cloud database - require SSL with enhanced configuration
        connect_args = {
            "sslmode": "require",
            "connect_timeout": 30,  # Increased timeout for cloud connections
            "application_name": "pickbd_backend",
            "keepalives_idle": 600,  # Keep connection alive
            "keepalives_interval": 30,
            "keepalives_count": 3
        }
    elif "localhost" in database_url or "127.0.0.1" in database_url:
        # Local database - no SSL required but add timeout
        connect_args = {
            "connect_timeout": 10,
            "application_name": "pickbd_backend_local"
        }
    
    engine_name = "fallback" if is_fallback else "primary"
    logger.info(f"Creating {engine_name} database engine for: {sqlalchemy_url.split('@')[0]}@***")
    
    return create_engine(
        sqlalchemy_url,
        echo=settings.DEBUG,  # Only enable SQL logging in debug mode
        pool_size=10,  # Increased pool size for production
        max_overflow=20,  # Increased overflow for high load
        pool_recycle=300,  # Recycle connections after 5 minutes
        pool_pre_ping=True,  # Enable connection health checks
        pool_timeout=30,  # Timeout for getting connection from pool
        connect_args=connect_args
    )

def test_database_connection(engine, engine_name: str) -> bool:
    """Test database connection and return True if successful"""
    try:
        with engine.connect() as conn:
            # Test basic connectivity
            conn.execute(text("SELECT 1"))
            logger.info(f"✅ {engine_name} database connection successful")
            return True
    except Exception as e:
        logger.warning(f"❌ {engine_name} database connection failed: {str(e)}")
        return False

# Initialize database connection with fallback
engine = None
current_db_type = None

# Try primary database first
if settings.DATABASE_URL:
    try:
        primary_engine = create_database_engine(settings.DATABASE_URL)
        if test_database_connection(primary_engine, "Primary (Supabase)"):
            engine = primary_engine
            current_db_type = "supabase"
            logger.info("🎯 Using Supabase database")
    except Exception as e:
        logger.error(f"Failed to create primary database engine: {e}")

# Fallback to local database if primary fails
if engine is None and hasattr(settings, 'LOCAL_DATABASE_URL') and settings.LOCAL_DATABASE_URL:
    try:
        fallback_engine = create_database_engine(settings.LOCAL_DATABASE_URL, is_fallback=True)
        if test_database_connection(fallback_engine, "Fallback (Local)"):
            engine = fallback_engine
            current_db_type = "local"
            logger.info("🏠 Using local database as fallback")
    except Exception as e:
        logger.error(f"Failed to create fallback database engine: {e}")

# Final check
if engine is None:
    # In production environments, we might want to continue even without database
    if os.getenv("ENVIRONMENT") == "production":
        logger.warning("⚠️  No database connection established, but continuing in production mode")
        # Create a dummy engine for now
        from sqlalchemy import create_engine
        engine = create_engine("sqlite:///:memory:")  # In-memory SQLite as fallback
        current_db_type = "dummy"
    else:
        raise RuntimeError("❌ Could not establish connection to any database. Please check your database configuration.")

# Create SessionLocal class
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Create Base class for models
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """Database session dependency for FastAPI with enhanced error handling."""
    db = SessionLocal()
    try:
        # Test connection before yielding
        db.execute(text("SELECT 1"))
        yield db
    except OperationalError as e:
        logger.error(f"Database operational error: {str(e)}")
        db.rollback()
        db.close()
        # Try to recreate engine if connection is lost
        if "connection" in str(e).lower() or "timeout" in str(e).lower():
            logger.info("Attempting to recreate database connection...")
            try:
                global engine
                if settings.DATABASE_URL:
                    engine = create_database_engine(settings.DATABASE_URL)
                    db = SessionLocal()
                    db.execute(text("SELECT 1"))
                    yield db
                else:
                    raise HTTPException(status_code=503, detail="Database connection failed")
            except Exception as reconnect_error:
                logger.error(f"Failed to reconnect to database: {str(reconnect_error)}")
                raise HTTPException(status_code=503, detail="Database service unavailable")
        else:
            raise HTTPException(status_code=500, detail="Database error occurred")
    except SQLAlchemyError as e:
        logger.error(f"Database error occurred: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error occurred")
    except Exception as e:
        # Don't catch validation errors - let FastAPI handle them
        # Check if this is a Pydantic validation error
        if "validation" in str(type(e)).lower() or "pydantic" in str(type(e)).lower():
            # Re-raise validation errors so FastAPI can handle them properly
            raise
        logger.error(f"Unexpected error occurred: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        try:
            db.close()
        except Exception as close_error:
            logger.warning(f"Error closing database connection: {str(close_error)}")

# Final connection test and table verification
def verify_database_connection():
    """Verify database connection in a separate thread to avoid blocking startup"""
    # Skip verification in production if we're using a dummy database
    if current_db_type == "dummy":
        logger.info("Skipping database verification for dummy database in production")
        return
        
    try:
        # Add a timeout to the connection
        with engine.connect() as conn:
            conn = conn.execution_options(timeout=10)  # 10 second timeout
            logger.info(f"📊 Database connection established ({current_db_type})")
            
            # Check if phones table exists
            result = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'phones')"))
            if result.scalar():
                result = conn.execute(text("SELECT COUNT(*) FROM phones"))
                count = result.scalar()
                logger.info(f"📱 Found {count} phones in database")
            else:
                logger.warning("⚠️  phones table does not exist yet")
            
            # Check if comparison tables exist
            result = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'comparison_sessions')"))
            if result.scalar():
                logger.info("✅ comparison_sessions table exists")
            else:
                logger.warning("⚠️  comparison_sessions table does not exist")
                
            result = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'comparison_items')"))
            if result.scalar():
                logger.info("✅ comparison_items table exists")
            else:
                logger.warning("⚠️  comparison_items table does not exist")
                
    except Exception as e:
        logger.error(f"❌ Database verification failed: {str(e)}")
        # Don't raise here, let the app start and handle errors gracefully
        # But log the full traceback for debugging
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")

# Start database verification in a separate thread to avoid blocking startup
import threading
verification_thread = threading.Thread(target=verify_database_connection, daemon=True)
verification_thread.start()