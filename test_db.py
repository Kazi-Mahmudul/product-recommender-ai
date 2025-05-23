from sqlalchemy import create_engine, text
from app.core.config import settings

def test_database():
    # Create engine
    engine = create_engine(settings.DATABASE_URL)
    
    # Test connection and data
    with engine.connect() as conn:
        # Check if table exists
        result = conn.execute(text("SHOW TABLES LIKE 'phones'"))
        if result.rowcount > 0:
            print("✅ phones table exists")
            
            # Count rows
            result = conn.execute(text("SELECT COUNT(*) FROM phones"))
            count = result.scalar()
            print(f"✅ Found {count} rows in phones table")
            
            # Get sample data
            result = conn.execute(text("SELECT id, name, brand, price FROM phones LIMIT 5"))
            print("\nSample data:")
            for row in result:
                print(f"ID: {row[0]}, Name: {row[1]}, Brand: {row[2]}, Price: {row[3]}")
        else:
            print("❌ phones table does not exist")

if __name__ == "__main__":
    test_database()
