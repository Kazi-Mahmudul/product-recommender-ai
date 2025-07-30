import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import sys
from pathlib import Path
# Ensure the project root is in sys.path so 'app' is importable
backend_dir = Path(__file__).resolve().parent
project_root = backend_dir.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from app.core.config import settings
from app.core.database import Base
from app.core.db_utils import DatabaseManager
from app.models.phone import Phone

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def reset_database():
    """
    Reset the database by dropping all tables and recreating them with proper auto-increment setup.
    """
    try:
        # Load environment variables from .env file in the current directory
        env_path = Path.cwd() / '.env'
        if not env_path.exists():
            logger.error(f"❌ .env file not found at {env_path}")
            logger.error("Please make sure you're running the script from the project root directory.")
            return False
            
        # Reload settings with the correct .env file
        from app.core.config import settings
        
        # Handle postgres:// to postgresql:// URL scheme issue for SQLAlchemy
        database_url = settings.DATABASE_URL
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
            
        logger.info(f"Connecting to database: {database_url.split('@')[-1] if '@' in database_url else database_url}")
        
        # Create database manager
        db_manager = DatabaseManager(database_url)
        
        # Create engine with SSL for production
        engine = create_engine(
            database_url,
            pool_pre_ping=True,
            connect_args={"sslmode": "require"} if not database_url.startswith("postgresql://localhost") else {}
        )
        
        # Drop all tables
        logger.info("Dropping all tables...")
        Base.metadata.drop_all(bind=engine)
        logger.info("All tables dropped successfully.")
        
        # Create all tables
        logger.info("Creating tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Tables created successfully.")
        
        # Set up auto-increment sequences for tables that need them
        logger.info("Setting up auto-increment sequences...")
        
        # Setup sequence for phones table
        if not db_manager.create_sequence_if_not_exists('phones'):
            logger.error("Failed to setup sequence for phones table")
            return False
        
        # Validate table structure
        expected_phone_columns = [
            'id', 'name', 'brand', 'model', 'slug', 'price', 'url', 'img_url',
            'display_type', 'screen_size_inches', 'display_resolution', 'pixel_density_ppi',
            'refresh_rate_hz', 'screen_protection', 'display_brightness', 'aspect_ratio',
            'hdr_support', 'chipset', 'cpu', 'gpu', 'ram', 'ram_type', 'internal_storage',
            'storage_type', 'camera_setup', 'primary_camera_resolution', 'selfie_camera_resolution',
            'primary_camera_video_recording', 'selfie_camera_video_recording', 'primary_camera_ois',
            'primary_camera_aperture', 'selfie_camera_aperture', 'camera_features', 'autofocus',
            'flash', 'settings', 'zoom', 'shooting_modes', 'video_fps', 'main_camera', 'front_camera',
            'battery_type', 'capacity', 'quick_charging', 'wireless_charging', 'reverse_charging',
            'build', 'weight', 'thickness', 'colors', 'waterproof', 'ip_rating', 'ruggedness',
            'network', 'speed', 'sim_slot', 'volte', 'bluetooth', 'wlan', 'gps', 'nfc', 'usb',
            'usb_otg', 'fingerprint_sensor', 'finger_sensor_type', 'finger_sensor_position',
            'face_unlock', 'light_sensor', 'infrared', 'fm_radio', 'operating_system', 'os_version',
            'user_interface', 'status', 'made_by', 'release_date'
        ]
        
        if not db_manager.validate_table_structure('phones', expected_phone_columns):
            logger.warning("Phone table structure validation failed, but continuing...")
        
        # Test auto-increment functionality
        logger.info("Testing auto-increment functionality...")
        if not db_manager.test_auto_increment('phones'):
            logger.error("Auto-increment test failed for phones table")
            return False
        
        logger.info("Database reset completed successfully with proper auto-increment setup.")
        return True
        
    except Exception as e:
        logger.error(f"Error resetting database: {str(e)}")
        return False

if __name__ == "__main__":
    print("WARNING: This will DROP ALL TABLES in the database and recreate them.")
    confirm = input("Are you sure you want to continue? (yes/no): ")
    
    if confirm.lower() == 'yes':
        success = reset_database()
        if success:
            print("Database reset completed successfully.")
            sys.exit(0)
        else:
            print("Failed to reset database.")
            sys.exit(1)
    else:
        print("Operation cancelled.")
        sys.exit(0)
