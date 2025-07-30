import pandas as pd
import logging
import sys
from pathlib import Path
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError

# Ensure the project root is in sys.path so 'app' is importable
backend_dir = Path(__file__).resolve().parent
project_root = backend_dir.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from app.core.db_utils import DatabaseManager

# Database URL
import os
from dotenv import load_dotenv
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_data():
    """
    Load phone data from CSV while preserving table structure and auto-increment functionality.
    """
    try:
        # Handle postgres:// to postgresql:// URL scheme issue for SQLAlchemy
        database_url = DATABASE_URL
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        
        # Create database manager
        db_manager = DatabaseManager(database_url)
        
        # Check if phones table exists
        table_info = db_manager.get_table_info('phones')
        if not table_info.get('exists', False):
            logger.error("Phones table does not exist. Please run reset_database.py first.")
            return False
        
        logger.info(f"Found phones table with {table_info['row_count']} existing records")
        
        # Read the CSV file
        logger.info("Reading CSV file...")
        try:
            df = pd.read_csv('mobile_data.csv')
        except FileNotFoundError:
            logger.error("mobile_data.csv file not found. Please ensure the file exists in the current directory.")
            return False
        
        logger.info(f"Read {len(df)} records from CSV")
        logger.info(f"CSV Columns: {df.columns.tolist()}")
        
        # Remove 'id' column if it exists in CSV to allow auto-increment
        if 'id' in df.columns:
            logger.info("Removing 'id' column from CSV data to allow auto-increment")
            df = df.drop('id', axis=1)
        
        # Get the actual table columns from database
        table_columns = [col['name'] for col in table_info['columns'] if col['name'] != 'id']
        csv_columns = df.columns.tolist()
        
        # Find columns that exist in CSV but not in database
        extra_columns = [col for col in csv_columns if col not in table_columns]
        if extra_columns:
            logger.info(f"Removing columns that don't exist in database: {extra_columns}")
            df = df.drop(extra_columns, axis=1)
        
        # Find columns that exist in database but not in CSV
        missing_columns = [col for col in table_columns if col not in df.columns]
        if missing_columns:
            logger.info(f"Database columns not in CSV (will be NULL): {missing_columns}")
        
        # Validate that we have the required columns
        required_columns = ['name', 'brand', 'model', 'price', 'url']
        missing_required = [col for col in required_columns if col not in df.columns]
        if missing_required:
            logger.error(f"CSV is missing required columns: {missing_required}")
            return False
        
        # Clear existing data while preserving table structure
        logger.info("Clearing existing data from phones table...")
        if not db_manager.truncate_table('phones'):
            logger.error("Failed to truncate phones table")
            return False
        
        # Load data in batches to handle large datasets efficiently
        batch_size = 1000
        total_batches = (len(df) + batch_size - 1) // batch_size
        
        logger.info(f"Loading data in {total_batches} batches of {batch_size} records each...")
        
        try:
            with db_manager.engine.connect() as connection:
                # Begin transaction
                trans = connection.begin()
                
                for i in range(0, len(df), batch_size):
                    batch_df = df.iloc[i:i+batch_size]
                    batch_num = (i // batch_size) + 1
                    
                    logger.info(f"Loading batch {batch_num}/{total_batches} ({len(batch_df)} records)...")
                    
                    # Insert batch data without specifying ID to allow auto-increment
                    batch_df.to_sql('phones', connection, if_exists='append', index=False, method='multi')
                
                # Commit transaction
                trans.commit()
                logger.info("All data loaded successfully")
                
        except SQLAlchemyError as e:
            logger.error(f"Error loading data: {str(e)}")
            return False
        
        # Reset sequence to ensure it's synchronized with the data
        logger.info("Synchronizing auto-increment sequence...")
        if not db_manager.reset_sequence('phones'):
            logger.warning("Failed to reset sequence, but data loading completed")
        
        # Verify the loaded data
        final_table_info = db_manager.get_table_info('phones')
        logger.info(f"Data loading completed. Total records in database: {final_table_info['row_count']}")
        
        # Test auto-increment functionality
        logger.info("Testing auto-increment functionality...")
        if not db_manager.test_auto_increment('phones'):
            logger.warning("Auto-increment test failed, but data loading completed")
        
        # Show sample data
        with db_manager.engine.connect() as connection:
            result = connection.execute(text("SELECT id, name, brand, model FROM phones ORDER BY id LIMIT 5"))
            phones = result.fetchall()
            
            logger.info("Sample loaded phones:")
            logger.info("-" * 60)
            for phone in phones:
                logger.info(f"ID: {phone[0]}, Name: {phone[1]}, Brand: {phone[2]}, Model: {phone[3]}")
            logger.info("-" * 60)
        
        return True
        
    except Exception as e:
        logger.error(f"Unexpected error loading data: {str(e)}")
        return False

if __name__ == "__main__":
    success = load_data()
    if success:
        print("✅ Data loading completed successfully!")
        sys.exit(0)
    else:
        print("❌ Data loading failed!")
        sys.exit(1) 