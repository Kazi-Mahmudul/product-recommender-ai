import os
import sys
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the project root directory to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from app.core.database import SessionLocal
from app.utils.data_loader import load_data_from_csv

def main():
    # Get the absolute path to the CSV file
    csv_path = os.path.join(project_root, "mobile_data.csv")
    
    # Create a database session
    db = SessionLocal()
    
    try:
        # Load the data
        logger.info(f"Loading data from {csv_path}...")
        phones = load_data_from_csv(db, csv_path)
        logger.info(f"Successfully loaded {len(phones)} phones into the database")
        
    except Exception as e:
        logger.error(f"Error loading data: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()