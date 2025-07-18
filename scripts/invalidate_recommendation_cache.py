"""
Script to invalidate the recommendation cache for all phones.
This is useful when making changes to the recommendation service logic.
"""
import sys
import os
import logging

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.cache_invalidation import CacheInvalidationService
from app.core.database import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Invalidate recommendation cache for all phones"""
    logger.info("Invalidating recommendation cache for all phones...")
    
    # Create a database session
    db = SessionLocal()
    try:
        # Invalidate all phone recommendations
        success = CacheInvalidationService.invalidate_phone_recommendations()
        
        if success:
            logger.info("Successfully invalidated recommendation cache")
        else:
            logger.error("Failed to invalidate recommendation cache")
    finally:
        db.close()

if __name__ == "__main__":
    main()