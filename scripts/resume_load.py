import os
import sys
import argparse
import logging
import pandas as pd

# Add parent directory to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, engine
from app.models.phone import Base, Phone
from app.utils.data_loader import clean_dataframe

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def get_existing_count(db):
    """Get the number of existing records in the database"""
    return db.query(Phone).count()

def create_phones_batch(db, phones):
    """Create phones in batch using bulk insert"""
    try:
        db.bulk_insert_mappings(Phone, phones)
        db.commit()
        return phones
    except Exception as e:
        db.rollback()
        raise e

def resume_load(csv_file, batch_size=100):
    """
    Resume loading data from CSV file, skipping existing records
    """
    logger.info(f"Starting resume load from {csv_file}")
    
    # Get database session
    db = SessionLocal()
    
    try:
        # Get existing count
        existing_count = get_existing_count(db)
        logger.info(f"Found {existing_count} existing records in database")
        
        # Read CSV file
        df = pd.read_csv(csv_file)
        
        # Clean data
        df = clean_dataframe(df)
        
        # Convert to list of dictionaries
        phone_data = df.to_dict(orient='records')
        
        # Skip existing records
        remaining_data = phone_data[existing_count:]
        total_remaining = len(remaining_data)
        logger.info(f"Need to load {total_remaining} remaining records")
        
        if total_remaining == 0:
            logger.info("No new records to load")
            return
        
        # Insert remaining data in batches
        total_inserted = 0
        for i in range(0, total_remaining, batch_size):
            batch = remaining_data[i:i+batch_size]
            create_phones_batch(db, batch)
            total_inserted += len(batch)
            logger.info(f"Inserted {total_inserted} of {total_remaining} remaining records")
        
        logger.info(f"Successfully loaded {total_inserted} records")
        
    except Exception as e:
        logger.error(f"Error during resume load: {e}")
        raise
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(description='Resume loading data from CSV file')
    parser.add_argument('--csv', type=str, default='mobiledokan_data.csv',
                        help='Path to CSV file')
    parser.add_argument('--batch-size', type=int, default=100,
                        help='Number of records to insert at once')
    
    args = parser.parse_args()
    resume_load(args.csv, args.batch_size)

if __name__ == '__main__':
    main()
