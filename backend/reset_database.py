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
from app.models.phone import Phone

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def reset_database():
    """
    Reset the database by dropping all tables and recreating them.
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
        
        # Create engine with SSL for production
        engine = create_engine(
            database_url,
            pool_pre_ping=True,
            connect_args={"sslmode": "require"} if not database_url.startswith("postgresql://localhost") else {}
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        # Drop all tables
        logger.info("Dropping all tables...")
        Base.metadata.drop_all(bind=engine)
        logger.info("All tables dropped successfully.")
        
        # Create all tables
        logger.info("Creating tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Tables created successfully.")
        
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
