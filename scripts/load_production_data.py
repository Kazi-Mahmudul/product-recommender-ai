import pandas as pd
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

def load_data_to_production():
    try:
        # Create database engine
        engine = create_engine(DATABASE_URL)
        
        # Read the CSV file
        print("Reading CSV file...")
        df = pd.read_csv('mobile_data.csv')
        
        # Load data into the database
        print("Loading data into production database...")
        df.to_sql('phones', engine, if_exists='replace', index=False)
        
        # Verify the data
        with engine.connect() as connection:
            result = connection.execute("SELECT COUNT(*) FROM phones")
            count = result.scalar()
            print(f"\nSuccessfully loaded {count} phones into the production database!")
            
            # Show sample data
            result = connection.execute("SELECT name, brand, price FROM phones LIMIT 5")
            phones = result.fetchall()
            
            print("\nSample phones:")
            print("-" * 50)
            for phone in phones:
                print(f"Name: {phone[0]}")
                print(f"Brand: {phone[1]}")
                print(f"Price: ${phone[2]:,.2f}")
                print("-" * 50)
                
    except Exception as e:
        print(f"Error loading data: {str(e)}")

if __name__ == "__main__":
    load_data_to_production() 