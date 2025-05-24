"""Script to add missing columns to the phones table."""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv()

def get_db_connection():
    """Create and return a database connection."""
    # Use the provided database credentials
    database_url = "postgresql://product_user1:8oZhXwwMrEZ0RK3uzHYIlqbzC0O8IPKV@dpg-d0o91hodl3ps73ac3j80-a.singapore-postgres.render.com/product_recommender"
    
    # Ensure we're using PostgreSQL
    if not database_url.startswith("postgresql://"):
        raise ValueError("Database URL must start with 'postgresql://' for PostgreSQL")
    
    return create_engine(database_url, echo=True)  # echo=True for debugging

def add_missing_columns():
    """Add missing columns to the phones table."""
    engine = get_db_connection()
    
    # List of columns to add with their SQL definitions
    columns_to_add = [
        {
            "name": "id",
            "definition": "SERIAL PRIMARY KEY",
            "condition": "SELECT NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='phones' AND column_name='id')"
        },
        {
            "name": "price_per_gb_ram",
            "definition": "FLOAT",
            "condition": "SELECT NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='phones' AND column_name='price_per_gb_ram')"
        },
        {
            "name": "price_per_gb_storage",
            "definition": "FLOAT",
            "condition": "SELECT NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='phones' AND column_name='price_per_gb_storage')"
        },
        {
            "name": "performance_score",
            "definition": "FLOAT",
            "condition": "SELECT NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='phones' AND column_name='performance_score')"
        },
        {
            "name": "display_score",
            "definition": "FLOAT",
            "condition": "SELECT NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='phones' AND column_name='display_score')"
        },
        {
            "name": "camera_score",
            "definition": "FLOAT",
            "condition": "SELECT NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='phones' AND column_name='camera_score')"
        },
        {
            "name": "storage_score",
            "definition": "FLOAT",
            "condition": "SELECT NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='phones' AND column_name='storage_score')"
        },
        {
            "name": "battery_efficiency",
            "definition": "FLOAT",
            "condition": "SELECT NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='phones' AND column_name='battery_efficiency')"
        },
        {
            "name": "price_to_display",
            "definition": "FLOAT",
            "condition": "SELECT NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='phones' AND column_name='price_to_display')"
        }
    ]
    
    with engine.connect() as conn:
        # Start a transaction
        trans = conn.begin()
        try:
            for column in columns_to_add:
                # Check if we need to add this column
                result = conn.execute(text(column["condition"])).scalar()
                if result:
                    # Add the column
                    sql = f"ALTER TABLE phones ADD COLUMN {column['name']} {column['definition']}"
                    print(f"Executing: {sql}")
                    conn.execute(text(sql))
                    print(f"✅ Added column: {column['name']}")
                else:
                    print(f"ℹ️ Column already exists: {column['name']}")
            
            # Commit the transaction
            trans.commit()
            print("\n✅ All columns have been added successfully!")
            
        except Exception as e:
            # Rollback in case of error
            trans.rollback()
            print(f"\n❌ Error: {str(e)}")
            raise

if __name__ == "__main__":
    print("Starting to add missing columns to the 'phones' table...\n")
    try:
        add_missing_columns()
    except Exception as e:
        print(f"\n❌ Failed to add columns: {str(e)}")
        sys.exit(1)
