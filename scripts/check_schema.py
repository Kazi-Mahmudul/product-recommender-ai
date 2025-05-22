import os
import sys

# Add parent directory to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine
from sqlalchemy import text

with engine.connect() as connection:
    result = connection.execute(text("""
        SELECT 
            COLUMN_NAME, 
            CHARACTER_MAXIMUM_LENGTH 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'phones'
        AND COLUMN_NAME = 'selfie_camera_resolution'
    """))
    
    column_info = result.fetchone()
    if column_info:
        print(f"Column: {column_info[0]}")
        print(f"Max Length: {column_info[1]}")
    else:
        print("Column not found")
