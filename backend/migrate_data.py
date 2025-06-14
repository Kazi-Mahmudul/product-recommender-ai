import os
import sys
import logging
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from pathlib import Path
import sys
# Ensure the project root is in sys.path so 'app' is importable
backend_dir = Path(__file__).resolve().parent
project_root = backend_dir.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))
from app.core.config import settings
from app.models.phone import Phone
from app.utils.data_loader import clean_dataframe

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_db_connection_strings():
    """Get the database connection strings from environment variables."""
    try:
        # Load environment variables from .env file in the current directory
        env_path = Path.cwd() / '.env'
        if not env_path.exists():
            logger.error(f"❌ .env file not found at {env_path}")
            logger.error("Please make sure you're running the script from the project root directory.")
            sys.exit(1)
            
        load_dotenv(env_path, override=True)
        
        # Get the database URLs from environment variables
        remote_db_url = os.getenv("DATABASE_URL")
        local_db_url = os.getenv("LOCAL_DATABASE_URL")
        
        # Validate the URLs
        if not remote_db_url:
            logger.error("❌ DATABASE_URL environment variable not found in .env")
            sys.exit(1)
        
        if not local_db_url:
            logger.error("❌ LOCAL_DATABASE_URL environment variable not found in .env")
            sys.exit(1)
        
        logger.info("✅ Successfully loaded database URLs from .env")
        return local_db_url.strip(), remote_db_url.strip()
        
    except Exception as e:
        logger.error(f"❌ Error loading database configuration: {str(e)}")
        sys.exit(1)

def export_data(local_db_url):
    """Export data from local database to a pandas DataFrame."""
    try:
        # Handle URL scheme for SQLAlchemy
        if local_db_url.startswith("postgres://"):
            local_db_url = local_db_url.replace("postgres://", "postgresql://", 1)
            
        logger.info("Connecting to local database...")
        logger.debug(f"Local database URL: {local_db_url.split('@')[-1] if '@' in local_db_url else local_db_url}")
        
        # Create engine with appropriate settings
        local_engine = create_engine(
            local_db_url,
            pool_pre_ping=True,
            connect_args={"sslmode": "prefer"}  # Use SSL if available, but don't require it for local
        )
        
        # Read data using pandas
        logger.info("Reading data from local database...")
        query = "SELECT * FROM phones"
        df = pd.read_sql(query, local_engine)
        
        logger.info(f"Successfully exported {len(df)} records from local database")
        return df
        
    except Exception as e:
        logger.error(f"Error exporting data: {str(e)}")
        raise

def import_data(remote_db_url, df):
    """Import data to the remote database."""
    try:
        # Handle URL scheme for SQLAlchemy
        if remote_db_url.startswith("postgres://"):
            remote_db_url = remote_db_url.replace("postgres://", "postgresql://", 1)
            
        logger.info("Connecting to remote database...")
        logger.debug(f"Remote database URL: {remote_db_url.split('@')[-1] if '@' in remote_db_url else remote_db_url}")
        
        # Create engine with SSL for production
        remote_engine = create_engine(
            remote_db_url,
            pool_pre_ping=True,
            connect_args={"sslmode": "require"}  # Require SSL for remote connections
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=remote_engine)
        
        # Clean the data
        logger.info("Cleaning data...")
        df = clean_dataframe(df)
        
        # Convert DataFrame to list of dictionaries
        data = df.to_dict('records')
        
        # Insert data in batches
        batch_size = 100
        total = len(data)
        logger.info(f"Importing {total} records in batches of {batch_size}...")
        
        db = SessionLocal()
        try:
            # Clear existing data
            logger.info("Clearing existing data...")
            db.execute(text("TRUNCATE TABLE phones RESTART IDENTITY CASCADE"))
            
            # Insert new data
            for i in range(0, total, batch_size):
                batch = data[i:i + batch_size]
                db.bulk_insert_mappings(Phone, batch)
                db.commit()
                logger.info(f"Inserted batch {i//batch_size + 1}/{(total + batch_size - 1)//batch_size}")
                
            logger.info("Data import completed successfully")
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error during import: {str(e)}")
            return False
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error connecting to remote database: {str(e)}")
        return False

def main():
    """Main function to handle the migration process."""
    print("Starting database migration...")
    
    # Get database URLs
    local_db_url, remote_db_url = get_db_connection_strings()
    
    # Log the remote database host for verification (without credentials)
    remote_host = remote_db_url.split('@')[-1].split('/')[0] if '@' in remote_db_url else remote_db_url
    print(f"\n🔗 Remote database host: {remote_host}")
    
    # Export data from local database
    print("\n📤 Exporting data from local database...")
    try:
        df = export_data(local_db_url)
        print(f"✅ Successfully exported {len(df)} records")
    except Exception as e:
        print(f"❌ Failed to export data: {str(e)}")
        logger.exception("Export failed")
        sys.exit(1)
    
    # Import data to remote database
    print("\n📥 Importing data to remote database...")
    success = import_data(remote_db_url, df)
    
    if success:
        print("\n✅ Migration completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Migration failed. Please check the logs for details.")
        sys.exit(1)

if __name__ == "__main__":
    main()
