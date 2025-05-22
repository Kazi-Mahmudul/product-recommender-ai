from sqlalchemy import text
from app.core.database import engine, SessionLocal
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_database_connection():
    try:
        # Test connection
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1")).fetchone()
            logger.info(f"Database connection test successful: {result}")
            
            # Check if phones table exists
            result = connection.execute(text("SHOW TABLES LIKE 'phones'")).fetchone()
            logger.info(f"Phones table exists: {result is not None}")
            
            # Describe the phones table
            result = connection.execute(text("DESCRIBE phones")).fetchall()
            logger.info("Phone table columns:")
            for row in result:
                logger.info(f"{row[0]}: {row[1]}")
                
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")

if __name__ == '__main__':
    test_database_connection()
