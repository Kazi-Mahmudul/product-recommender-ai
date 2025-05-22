import pandas as pd
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import logging

from app.models.phone import Phone
from app.crud.phone import create_phones_batch

logger = logging.getLogger(__name__)

def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean and prepare DataFrame for insertion into the database
    """
    # Make a copy to avoid modifying the original
    df = df.copy()
    
    # Convert column names to snake_case
    df.columns = [col.lower().replace(' ', '_') for col in df.columns]
    
    # Get numeric columns from the database model
    numeric_cols = [
        'price', 'screen_size_inches', 'weight', 'capacity', 
        'pixel_density_ppi', 'refresh_rate_hz'
    ]
    
    # Get string columns from the database model
    string_cols = [
        'ram', 'internal_storage', 'virtual_ram', 'brand', 'model', 
        'display_type', 'display_resolution', 'screen_protection', 
        'display_brightness', 'screen_to_body_ratio', 'aspect_ratio', 
        'hdr_support', 'chipset', 'cpu', 'gpu', 'ram_type', 
        'storage_type', 'camera_setup', 'primary_camera_resolution', 
        'selfie_camera_resolution', 'primary_camera_video_recording', 
        'selfie_camera_video_recording', 'primary_camera_ois', 
        'primary_camera_aperture', 'primary_camera_image_resolution', 
        'selfie_camera_aperture', 'camera_features', 'autofocus', 
        'flash', 'settings', 'battery_type', 'quick_charging', 
        'wireless_charging', 'reverse_charging', 'fingerprint_sensor', 
        'finger_sensor_type', 'finger_sensor_position', 'face_unlock', 
        'light_sensor', 'sensor', 'infrared', 'fm_radio', 
        'operating_system', 'os_version', 'user_interface', 
        'release_date', 'status', 'made_by'
    ]
    
    # Handle missing values
    for col in numeric_cols:
        if col in df.columns:
            # Convert to numeric and replace NaN with 0
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    
    for col in string_cols:
        if col in df.columns:
            # Replace NaN with empty string
            df[col] = df[col].fillna('').astype(str)
    
    # Ensure all required columns exist
    required_cols = ['name', 'brand', 'model', 'price', 'url']
    for col in required_cols:
        if col not in df.columns:
            df[col] = ''
    
    # Log any columns that don't match our schema
    unknown_cols = set(df.columns) - set(numeric_cols + string_cols + required_cols)
    if unknown_cols:
        logger.warning(f"Unknown columns found: {unknown_cols}")
    
    return df

def load_csv_to_db(file_path: str, db: Session, batch_size: int = 100) -> int:
    """
    Load data from CSV file into database
    
    Args:
        file_path: Path to the CSV file
        db: Database session
        batch_size: Number of records to insert at once
        
    Returns:
        Number of records inserted
    """
    try:
        # Read CSV file
        df = pd.read_csv(file_path)
        
        # Clean and prepare data
        df = clean_dataframe(df)
        
        # Log the length of selfie_camera_resolution for the first few records
        logger.info("Selfie camera resolution lengths:")
        for i in range(min(20, len(df))):
            length = len(df.iloc[i]['selfie_camera_resolution'])
            logger.info(f"Record {i}: length={length}, value='{df.iloc[i]['selfie_camera_resolution']}'")
        
        # Convert DataFrame to list of dictionaries
        phone_data = df.to_dict(orient='records')
        
        # Insert data in batches
        total_inserted = 0
        for i in range(0, len(phone_data), batch_size):
            batch = phone_data[i:i+batch_size]
            # Log the length of selfie_camera_resolution in this batch
            for j, record in enumerate(batch):
                length = len(record['selfie_camera_resolution'])
                if length > 100:
                    logger.warning(f"Long selfie_camera_resolution in batch {i//batch_size}, record {j}: length={length}, value='{record['selfie_camera_resolution']}'")
            create_phones_batch(db, batch)
            total_inserted += len(batch)
            logger.info(f"Inserted {total_inserted} records so far")
        
        logger.info(f"Successfully loaded {total_inserted} records from {file_path}")
        return total_inserted
        
    except Exception as e:
        logger.error(f"Error loading CSV data: {e}")
        raise