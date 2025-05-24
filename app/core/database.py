import logging
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError
from contextlib import contextmanager
from typing import Generator
import os
from dotenv import load_dotenv

from app.core.config import settings

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get database URL from settings
if not settings.DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# Handle postgres:// to postgresql:// URL scheme issue for SQLAlchemy
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL.replace("postgres://", "postgresql://", 1) if settings.DATABASE_URL.startswith("postgres://") else settings.DATABASE_URL

# Create SQLAlchemy engine with explicit echo
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=settings.DEBUG,  # Only enable SQL logging in debug mode
    pool_size=5,
    max_overflow=10,
    pool_recycle=300,  # Recycle connections after 5 minutes
    pool_pre_ping=True,  # Enable connection health checks
    connect_args={"sslmode": "require"}  # Force SSL for production
)

# Create SessionLocal class
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Create Base class for models
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """Database session dependency for FastAPI."""
    db = SessionLocal()
    try:
        logger.info("Database connection opened")
        yield db
    except SQLAlchemyError as e:
        logger.error(f"Database error occurred: {str(e)}")
        db.rollback()
        raise
    except Exception as e:
        logger.error(f"Unexpected error occurred: {str(e)}")
        db.rollback()
        raise
    finally:
        logger.info("Database connection closed")
        db.close()

# Test connection
try:
    with engine.connect() as conn:
        logger.info("Successfully connected to database")
        # First check if the table exists
        result = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'phones')"))
        if result.scalar():
            # If table exists, count rows
            result = conn.execute(text("SELECT COUNT(*) FROM phones"))
            count = result.scalar()
            logger.info(f"Found {count} rows in phones table")
        else:
            logger.warning("phones table does not exist yet")
except Exception as e:
    logger.error(f"Database connection test failed: {str(e)}")