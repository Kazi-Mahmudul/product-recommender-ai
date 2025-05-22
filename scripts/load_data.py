import os
import sys
import argparse
import logging

# Add parent directory to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, engine
from app.models.phone import Base
from app.utils.data_loader import load_csv_to_db

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def main():
    """
    Main function to load data from CSV file into database
    """
    parser = argparse.ArgumentParser(description='Load data from CSV file into database')
    parser.add_argument('--csv', type=str, default='mobiledokan_data.csv',
                        help='Path to CSV file')
    parser.add_argument('--create-tables', action='store_true',
                        help='Create database tables before loading data')
    parser.add_argument('--drop-tables', action='store_true',
                        help='Drop existing tables before creating new ones')
    parser.add_argument('--batch-size', type=int, default=100,
                        help='Number of records to insert at once')
    
    args = parser.parse_args()
    
    # Drop tables if requested
    if args.drop_tables:
        logger.info("Dropping existing tables...")
        try:
            Base.metadata.drop_all(bind=engine)
            logger.info("Tables dropped successfully.")
        except Exception as e:
            logger.warning(f"Error dropping tables: {e}")
    
    # Create tables if requested
    if args.create_tables:
        logger.info("Creating database tables...")
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("Tables created successfully.")
        except Exception as e:
            logger.error(f"Error creating tables: {e}")
            sys.exit(1)
    
    # Load data
    logger.info(f"Loading data from {args.csv}...")
    db = SessionLocal()
    try:
        count = load_csv_to_db(args.csv, db, args.batch_size)
        logger.info(f"Successfully loaded {count} records.")
    except Exception as e:
        logger.error(f"Error loading data: {e}")
        sys.exit(1)
    finally:
        db.close()
    
    logger.info("Done.")

if __name__ == '__main__':
    main()