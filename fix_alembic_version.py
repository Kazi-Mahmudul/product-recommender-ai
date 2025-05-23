from sqlalchemy import create_engine, text
from app.core.config import settings

def fix_alembic_version():
    # Create database engine
    engine = create_engine(settings.DATABASE_URL)
    
    try:
        # Connect to the database
        with engine.connect() as connection:
            # First, check if the table exists
            result = connection.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alembic_version')"))
            table_exists = result.scalar()
            
            if not table_exists:
                print("Creating alembic_version table...")
                connection.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)"))
                connection.commit()
            
            # Update the version to the latest merge head
            print("Updating alembic_version...")
            connection.execute(text("UPDATE alembic_version SET version_num = 'e3993390c09c'"))
            connection.commit()
            
            # Verify the update
            result = connection.execute(text("SELECT * FROM alembic_version"))
            version = result.scalar()
            print(f"Current alembic version: {version}")
            
    except Exception as e:
        print(f"Error: {str(e)}")
        raise
    finally:
        engine.dispose()

if __name__ == "__main__":
    fix_alembic_version() 