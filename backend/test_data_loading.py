from pathlib import Path
import sys
# Ensure the project root is in sys.path so 'app' is importable
backend_dir = Path(__file__).resolve().parent
project_root = backend_dir.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from app.core.database import SessionLocal
from app.utils.data_loader import load_data_from_csv
import logging


# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_data_loading():
    try:
        # Create database session
        db = SessionLocal()
        
        # Load data from CSV
        logger.info("Starting data loading process...")
        phones = load_data_from_csv(db, 'mobile_data.csv')
        
        # Log some sample data
        logger.info("\nSample phone data:")
        for phone in phones[:5]:  # Show first 5 phones
            logger.info(f"Phone: {phone.name} ({phone.brand})")
            logger.info(f"Price: {phone.price}")
            logger.info(f"RAM: {phone.ram}")
            logger.info(f"Storage: {phone.internal_storage}")
            logger.info("---")
            
        logger.info(f"\nSuccessfully loaded {len(phones)} phones")
        
    except Exception as e:
        logger.error(f"Error during data loading: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    test_data_loading() 