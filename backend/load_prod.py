import pandas as pd
from sqlalchemy import create_engine, text, inspect

# Database URL
import os
from dotenv import load_dotenv
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def load_data():
    try:
        # Create database engine
        engine = create_engine(DATABASE_URL)
        
        # Read the CSV file
        print("Reading CSV file...")
        df = pd.read_csv('mobile_data.csv')
        
        # Print column names from CSV
        print("\nCSV Columns:", df.columns.tolist())
        
        # Load data into the database
        print("\nLoading data into production database...")
        df.to_sql('phones', engine, if_exists='replace', index=False)
        
        # Check table structure
        inspector = inspect(engine)
        columns = inspector.get_columns('phones')
        print("\nTable Structure:")
        for column in columns:
            print(f"Column: {column['name']}, Type: {column['type']}")
        
        # Verify the data
        with engine.connect() as connection:
            # Check if table exists
            result = connection.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'phones')"))
            table_exists = result.scalar()
            print(f"\nTable exists: {table_exists}")
            
            if table_exists:
                # Count records
                result = connection.execute(text("SELECT COUNT(*) FROM phones"))
                count = result.scalar()
                print(f"\nTotal records in database: {count}")
                
                # Show sample data
                result = connection.execute(text("SELECT * FROM phones LIMIT 5"))
                phones = result.fetchall()
                
                print("\nSample phones:")
                print("-" * 50)
                for phone in phones:
                    print(f"Phone data: {phone}")
                    print("-" * 50)
                
    except Exception as e:
        print(f"Error loading data: {str(e)}")

if __name__ == "__main__":
    load_data() 