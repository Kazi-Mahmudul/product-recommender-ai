import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

logger = logging.getLogger(__name__)

# Create SQLAlchemy engine with explicit echo
engine = create_engine(
    settings.DATABASE_URL,
    echo=True,  # Enable SQL logging
    echo_pool=True,  # Enable pool logging
    pool_size=5,
    max_overflow=10,
    pool_recycle=3600
)

# Create SessionLocal class
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Create Base class for models
Base = declarative_base()

# Database dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        logger.info("Database connection opened")
        yield db
    finally:
        logger.info("Database connection closed")
        db.close()