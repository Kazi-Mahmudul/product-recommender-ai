import pandas as pd
import logging
from sqlalchemy.orm import Session
from typing import List
from app.models.phone import Phone

logger = logging.getLogger(__name__)

def clean_string_value(value):
    """Clean string values by stripping whitespace and converting empty strings to None."""
    if pd.isna(value) or value is None:
        return None
    cleaned = str(value).strip()
    return cleaned if cleaned else None

def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and prepare the dataframe for database insertion."""
    # Convert column names to snake_case
    df.columns = [col.lower().replace(' ', '_') for col in df.columns]
    
    # List of all valid columns from the dataset
    valid_columns = [
        # Basic Information
        'name', 'brand', 'model', 'price', 'url', 'img_url', 'status', 'made_by',
        
        # Display
        'display_type', 'screen_size_inches', 'display_resolution', 'pixel_density_ppi',
        'refresh_rate_hz', 'screen_protection', 'display_brightness', 'aspect_ratio',
        'hdr_support',
        
        # Performance
        'chipset', 'cpu', 'gpu', 'ram', 'ram_type', 'internal_storage', 'storage_type',
        
        # Camera
        'camera_setup', 'primary_camera_resolution', 'selfie_camera_resolution',
        'primary_camera_video_recording', 'selfie_camera_video_recording',
        'primary_camera_ois', 'primary_camera_aperture', 'selfie_camera_aperture',
        'camera_features', 'autofocus', 'flash', 'settings', 'zoom', 'shooting_modes',
        'video_fps', 'main_camera', 'front_camera',
        
        # Battery
        'battery_type', 'capacity', 'quick_charging', 'wireless_charging',
        'reverse_charging',
        
        # Design
        'build', 'weight', 'thickness', 'colors', 'waterproof', 'ip_rating',
        'ruggedness',
        
        # Connectivity
        'network', 'speed', 'sim_slot', 'volte', 'bluetooth', 'wlan', 'gps',
        'nfc', 'usb', 'usb_otg',
        
        # Security
        'fingerprint_sensor', 'finger_sensor_type', 'finger_sensor_position',
        'face_unlock', 'light_sensor',
        
        # Additional Features
        'infrared', 'fm_radio',
        
        # Software
        'operating_system', 'os_version', 'user_interface',
        
        # Release Info
        'release_date', 'release_date_clean', 'is_new_release', 'age_in_months',
        'is_upcoming',
        
        # Price Info
        'price_original', 'price_category',
        
        # Derived Numeric Fields
        'storage_gb', 'ram_gb', 'price_per_gb', 'price_per_gb_ram',
        'screen_size_numeric', 'resolution_width', 'resolution_height',
        'ppi_numeric', 'refresh_rate_numeric',
        
        # Derived Scores
        'display_score', 'camera_count', 'primary_camera_mp', 'selfie_camera_mp',
        'camera_score', 'battery_capacity_numeric', 'has_fast_charging',
        'has_wireless_charging', 'charging_wattage', 'battery_score',
        'performance_score', 'security_score', 'connectivity_score',
        'is_popular_brand', 'overall_device_score'
    ]
    
    # Keep only valid columns
    df = df[[col for col in df.columns if col in valid_columns]]
    
    # Define numeric columns
    numeric_cols = [
        'price_original', 
        # Removed: 'screen_size_inches', 'pixel_density_ppi', 'refresh_rate_hz', 
        # 'display_brightness', 'capacity', 'weight', 'thickness',
        'storage_gb', 'ram_gb', 'price_per_gb', 'price_per_gb_ram',
        'screen_size_numeric', 'resolution_width', 'resolution_height',
        'ppi_numeric', 'refresh_rate_numeric', 'display_score',
        'camera_count', 'primary_camera_mp', 'selfie_camera_mp', 'camera_score',
        'battery_capacity_numeric', 'charging_wattage', 'battery_score',
        'performance_score', 'security_score', 'connectivity_score',
        'age_in_months', 'overall_device_score'
    ]
    
    # Define boolean columns
    boolean_cols = [
        'has_fast_charging', 'has_wireless_charging', 'is_popular_brand',
        'is_new_release', 'is_upcoming'
    ]
    
    # Explicitly define string columns that were previously numeric
    explicit_string_cols = [
        'screen_size_inches', 
        'pixel_density_ppi', 
        'refresh_rate_hz', 
        'display_brightness', 
        'capacity', 
        'weight', 
        'thickness',
        'main_camera',
        'front_camera'
    ]
    
    # All other columns are treated as strings
    string_cols = explicit_string_cols + [col for col in valid_columns if col not in numeric_cols and col not in boolean_cols and col not in explicit_string_cols]
    
    # Clean string columns
    for col in string_cols:
        if col in df.columns:
            df[col] = df[col].apply(clean_string_value)
    
    # Handle numeric columns
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            df[col] = df[col].fillna(0)
    
    # Handle boolean columns
    for col in boolean_cols:
        if col in df.columns:
            df[col] = df[col].fillna(False)
            df[col] = df[col].astype(bool)
    
    return df

def load_data_from_csv(db: Session, csv_path: str) -> List[Phone]:
    """Load phone data from CSV file and insert into database."""
    try:
        # Read CSV file
        df = pd.read_csv(csv_path)
        logger.info(f"Loaded {len(df)} rows from {csv_path}")
        
        # Clean and prepare the data
        df = clean_dataframe(df)
        logger.info("Data cleaning completed")
        
        # Convert DataFrame to list of Phone objects
        phones = []
        for _, row in df.iterrows():
            try:
                phone_dict = row.to_dict()
                phone = Phone(**phone_dict)
                phones.append(phone)
            except Exception as e:
                logger.error(f"Error creating Phone object: {str(e)}")
        
        # Bulk insert into database
        db.bulk_save_objects(phones)
        db.commit()
        logger.info(f"Successfully inserted {len(phones)} phones into database")
        
        return phones
    
    except Exception as e:
        logger.error(f"Error loading data from CSV: {str(e)}")
        db.rollback()
        return []