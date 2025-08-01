"""Script to check data in the phones table."""
import os
import sys
import logging
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()
logger.info("Database connection configured")

def get_db_connection():
    """Create and return a database connection."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL not set in environment variables.")
    return create_engine(database_url, echo=True)

def check_data():
    """Check data in the phones table."""
    engine = get_db_connection()
    
    with engine.connect() as conn:
        # Get column names and data types
        result = conn.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'phones'
            ORDER BY ordinal_position
        """))
        
        columns = [dict(row) for row in result.mappings()]
        logger.info("Table columns:")
        for col in columns:
            logger.info(f"- {col['column_name']} ({col['data_type']}, nullable: {col['is_nullable']})")
        
        # Get row count
        result = conn.execute(text("SELECT COUNT(*) FROM phones"))
        count = result.scalar()
        logger.info(f"Total rows: {count}")
        
        # Get sample data (first 3 rows)
        if count > 0:
            logger.info("Sample data (first 3 rows):")
            result = conn.execute(text("SELECT * FROM phones LIMIT 3"))
            rows = [dict(row) for row in result.mappings()]
            
            for i, row in enumerate(rows, 1):
                logger.info(f"Row {i}:")
                for key, value in row.items():
                    logger.info(f"  {key}: {str(value)[:100]}{'...' if len(str(value)) > 100 else ''}")
        
        # Check for null values in key columns
        logger.info("Checking for null values in key columns:")
        key_columns = ['name', 'brand', 'price', 'display_type', 'camera_setup', 'battery_type']
        for col in key_columns:
            result = conn.execute(
                text(f"SELECT COUNT(*) FROM phones WHERE {col} IS NULL"),
            )
            null_count = result.scalar()
            logger.info(f"- {col}: {null_count} null values ({null_count/count*100:.1f}%)" if count > 0 else "0 rows")

if __name__ == "__main__":
    logger.info("Checking data in the 'phones' table...")
    try:
        check_data()
    except Exception as e:
        logger.error(f"Error checking data: {str(e)}")
        sys.exit(1)
