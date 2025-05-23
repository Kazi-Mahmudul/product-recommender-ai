import pandas as pd
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import logging
import math
import numpy as np
import re

from app.models.phone import Phone
from app.crud.phone import create_phones_batch, get_phone_by_name_and_brand
from app.utils.derived_columns import calculate_derived_columns

logger = logging.getLogger(__name__)

def clean_numeric_value(value):
    """Clean and convert a numeric value, handling special cases like percentages."""
    if value is None or value == '':
        return 0.0
    
    if isinstance(value, (int, float)):
        return float(value)
    
    if isinstance(value, str):
        value = value.strip()
        
        # Handle percentage values
        if '%' in value:
            try:
                # Remove % sign and convert to decimal
                return float(value.replace('%', '').strip()) / 100
            except (ValueError, TypeError):
                return 0.0
        
        # Handle comma-separated numbers
        if ',' in value:
            value = value.replace(',', '')
        
        # Remove currency symbols and other non-numeric characters
        value = re.sub(r'[^\d.-]', '', value)
        
        try:
            return float(value)
        except (ValueError, TypeError):
            return 0.0
    
    return 0.0

def parse_resolution(resolution_str: str) -> tuple:
    """Parse display resolution string into width and height."""
    if not resolution_str or not isinstance(resolution_str, str):
        return None, None
        
    # Remove common suffixes and parentheses
    resolution_str = re.sub(r'\([^)]*\)', '', resolution_str)  # Remove (FHD+), (HD+), etc.
    resolution_str = re.sub(r'[^\dx]', '', resolution_str)  # Keep only numbers and 'x'
    
    try:
        # Split by 'x' and convert to integers
        parts = resolution_str.split('x')
        if len(parts) == 2:
            width = int(parts[0])
            height = int(parts[1])
            return width, height
    except (ValueError, IndexError):
        pass
        
    return None, None

def clean_string_value(value: Any) -> str:
    """Clean and convert string values."""
    if pd.isna(value):
        return ''
    return str(value).strip()

def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean and prepare DataFrame for insertion into the database
    """
    # Make a copy to avoid modifying the original
    df = df.copy()
    
    # Handle empty DataFrame
    if df.empty:
        logger.warning("Empty DataFrame received")
        return df
    
    # Convert column names to snake_case
    df.columns = [col.lower().replace(' ', '_').replace('__', '_') for col in df.columns]

    # List of valid columns from the Phone model
    valid_columns = [
        'name', 'brand', 'model', 'price', 'url',
        'display_type', 'screen_size_inches', 'display_resolution', 'pixel_density_ppi', 'refresh_rate_hz',
        'screen_protection', 'display_brightness', 'aspect_ratio', 'hdr_support',
        'chipset', 'cpu', 'gpu', 'ram', 'ram_type', 'internal_storage', 'storage_type', 'virtual_ram',
        'camera_setup', 'primary_camera_resolution', 'selfie_camera_resolution', 'primary_camera_video_recording',
        'selfie_camera_video_recording', 'primary_camera_ois', 'primary_camera_aperture', 'primary_camera_image_resolution',
        'selfie_camera_aperture', 'camera_features', 'autofocus', 'flash', 'settings', 'zoom', 'shooting_modes', 'video_fps',
        'battery_type', 'capacity', 'quick_charging', 'wireless_charging', 'reverse_charging',
        'build', 'weight', 'thickness', 'colors', 'waterproof', 'ip_rating', 'ruggedness',
        'network', 'speed', 'sim_slot', 'volte', 'bluetooth', 'wlan', 'gps', 'nfc', 'usb_type_c', 'usb_otg',
        'fingerprint_sensor', 'finger_sensor_type', 'finger_sensor_position', 'face_unlock',
        'light_sensor', 'sensor', 'infrared', 'fm_radio',
        'operating_system', 'os_version', 'user_interface', 'release_date', 'status', 'made_by'
    ]
    # Keep only valid columns
    df = df[[col for col in df.columns if col in valid_columns]]
    
    # Get numeric columns from the database model
    numeric_cols = [
        'price', 'screen_size_inches', 
        'pixel_density_ppi', 'refresh_rate_hz'
    ]
    
    # Get string columns from the database model
    string_cols = [
        'ram', 'internal_storage', 'virtual_ram', 'brand', 'model', 
        'display_type', 'display_resolution', 'screen_protection', 
        'display_brightness', 'aspect_ratio', 
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
        'release_date', 'status', 'made_by',
        'capacity', 'weight', 'usb_type_c'
    ]
    
    # Handle missing values and clean data
    for col in numeric_cols:
        if col in df.columns:
            # Convert to string first to handle any special characters
            df[col] = df[col].astype(str)
            df[col] = df[col].apply(clean_numeric_value)
            # Replace any remaining NaN or infinite values with 0
            df[col] = df[col].replace([np.inf, -np.inf], 0)
            df[col] = df[col].fillna(0)
            logger.info(f"Processed numeric column {col}: min={df[col].min()}, max={df[col].max()}, non_zero={len(df[df[col] > 0])}")
    
    for col in string_cols:
        if col in df.columns:
            df[col] = df[col].apply(clean_string_value)
            # Replace empty strings with None for better database handling
            df[col] = df[col].replace('', None)
            logger.info(f"Processed string column {col}: unique values={df[col].nunique()}, non_empty={len(df[df[col].notna()])}")
    
    # Calculate derived columns for each row
    derived_columns = []
    for idx, row in df.iterrows():
        try:
            phone_data = row.to_dict()
            derived = calculate_derived_columns(phone_data)
            # Convert NaN and infinite values to 0.0
            for k, v in derived.items():
                if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
                    derived[k] = 0.0
            derived_columns.append(derived)
            if idx < 5:  # Log first 5 rows for debugging
                logger.info(f"Row {idx} derived columns: {derived}")
        except Exception as e:
            logger.error(f"Error calculating derived columns for row {idx}: {str(e)}")
            # Add empty derived columns for this row
            derived_columns.append({
                'price_per_gb_ram': 0.0,
                'price_per_gb_storage': 0.0,
                'performance_score': 0.0,
                'display_score': 0.0,
                'camera_score': 0.0,
                'storage_score': 0.0,
                'battery_efficiency': 0.0,
                'price_to_display': 0.0
            })
    
    # Add derived columns to DataFrame if we have any rows
    if derived_columns:
        for col in derived_columns[0].keys():
            df[col] = [d[col] for d in derived_columns]
            non_zero = len(df[df[col] > 0])
            logger.info(f"Added derived column {col}: min={df[col].min()}, max={df[col].max()}, non_zero={non_zero}")
    
    # Final cleaning: replace all NaN and infinite values with None
    df = df.replace([np.inf, -np.inf], None)
    df = df.where(pd.notnull(df), None)
    
    # Convert any remaining numeric columns to float and handle NaN values
    for col in df.select_dtypes(include=['float64']).columns:
        df[col] = df[col].apply(lambda x: None if pd.isna(x) else float(x))
    
    return df

def load_data_from_csv(db: Session, csv_path: str) -> List[Phone]:
    """Load phone data from CSV file and insert into database."""
    try:
        # Try different encodings
        encodings = ['utf-8', 'latin1', 'cp1252', 'iso-8859-1']
        df = None
        
        for encoding in encodings:
            try:
                df = pd.read_csv(csv_path, encoding=encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if df is None:
            raise ValueError("Could not read the CSV file with any of the attempted encodings")
            
        # Clean and prepare data
        logger.info("Cleaning and preparing data...")
        df = clean_dataframe(df)
        
        # Final robust cleaning for NaN/infinity before DB insert
        df = df.applymap(lambda x: None if (isinstance(x, float) and (pd.isna(x) or math.isnan(x) or math.isinf(x))) or x is np.nan else x)
        
        # Convert DataFrame to list of dictionaries
        phones_data = df.to_dict('records')
        
        # Extra robust cleaning: ensure no nan/infinity in any record
        def clean_record(record):
            for k, v in record.items():
                if isinstance(v, float) and (pd.isna(v) or math.isnan(v) or math.isinf(v)):
                    record[k] = None
                elif v is not None and str(v).lower() == 'nan':
                    record[k] = None
            return record
        phones_data = [clean_record(rec) for rec in phones_data]
        
        # Filter out duplicates
        unique_phones = []
        skipped_count = 0
        for phone_data in phones_data:
            name = phone_data.get('name')
            brand = phone_data.get('brand')
            
            if not name or not brand:
                logger.warning(f"Skipping record with missing name or brand: {phone_data}")
                skipped_count += 1
                continue
                
            existing_phone = get_phone_by_name_and_brand(db, name, brand)
            if existing_phone:
                logger.info(f"Skipping duplicate phone: {name} ({brand})")
                skipped_count += 1
                continue
                
            unique_phones.append(phone_data)
        
        logger.info(f"Found {skipped_count} duplicate phones, proceeding with {len(unique_phones)} unique phones")
        
        # Create phones in database
        logger.info("Creating phones in database...")
        phones = create_phones_batch(db, unique_phones)
        
        logger.info(f"Successfully loaded {len(phones)} phones from {csv_path}")
        return phones
        
    except Exception as e:
        logger.error(f"Error loading data from {csv_path}: {str(e)}")
        raise