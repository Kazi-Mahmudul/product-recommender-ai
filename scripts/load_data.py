import os
import sys
from pathlib import Path

# Add the project root directory to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from app.core.database import SessionLocal
from app.utils.data_loader import load_data_from_csv

def main():
    # Get the absolute path to the CSV file
    csv_path = os.path.join(project_root, "mobile_data.csv")
    
    # Create a database session
    db = SessionLocal()
    
    try:
        # Load the data
        print(f"Loading data from {csv_path}...")
        phones = load_data_from_csv(db, csv_path)
        print(f"Successfully loaded {len(phones)} phones into the database")
        
    except Exception as e:
        print(f"Error loading data: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()