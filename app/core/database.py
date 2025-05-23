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

# Load environment variables based on environment
env_file = ".env.production" if os.getenv("ENVIRONMENT") == "production" else ".env"
load_dotenv(dotenv_path=env_file)

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Create SQLAlchemy engine with explicit echo
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=True,  # Enable SQL logging
    echo_pool=True,  # Enable pool logging
    pool_size=5,
    max_overflow=10,
    pool_recycle=3600,
    pool_pre_ping=True  # Enable connection health checks
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