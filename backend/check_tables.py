from sqlalchemy import create_engine, text
from app.core.config import settings

# Create engine
engine = create_engine(settings.DATABASE_URL)

# Connect and execute query
with engine.connect() as connection:
    # Get list of tables
    result = connection.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
    tables = result.fetchall()
    
    print("\nTables in the database:")
    print("-" * 30)
    for table in tables:
        print(table[0])
        
        # Get column information for each table
        columns = connection.execute(text(f"""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = '{table[0]}'
        """))
        
        print("\nColumns:")
        for col in columns:
            print(f"  - {col[0]}: {col[1]}")
        print("-" * 30) 