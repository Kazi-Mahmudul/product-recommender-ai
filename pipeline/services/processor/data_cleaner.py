"""
Data cleaning and preprocessing module.
"""

import logging
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
import re
from datetime import datetime

from .config import settings

logger = logging.getLogger(__name__)


class DataCleaner:
    """
    Handles data cleaning and preprocessing operations.
    """
    
    def __init__(self):
        """Initialize the data cleaner."""
        self.valid_columns = self._get_valid_columns()
        logger.info("Data cleaner initialized")
    
    def _get_valid_columns(self) -> List[str]:
        """Get list of valid columns for the dataset."""
        return [
            # Basic Information
            'name', 'brand', 'model', 'slug', 'price', 'url', 'img_url', 'status', 'made_by',
            
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
    
    def clean_string_value(self, value: Any) -> Optional[str]:
        """Clean string values by stripping whitespace and converting empty strings to None."""
        if pd.isna(value) or value is None:
            return None
        cleaned = str(value).strip()
        return cleaned if cleaned else None
    
    def clean_price_column(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean and process price column."""
        logger.info("Cleaning price column")
        
        # Clean price column by removing "?." prefix
        if 'price' in df.columns:
            df['price'] = df['price'].str.replace('?.', '', regex=False)
            
            # Create price_original column with numeric values
            df['price_original'] = (df['price']
                                   .str.replace(',', '')
                                   .str.extract('(\\d+)')
                                   .astype(float))
        
        return df
    
    def standardize_column_names(self, df: pd.DataFrame) -> pd.DataFrame:
        """Standardize column names to snake_case."""
        logger.info("Standardizing column names")
        
        # Convert column names to snake_case
        df.columns = [col.lower().replace(' ', '_') for col in df.columns]
        
        return df
    
    def filter_valid_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Keep only valid columns."""
        logger.info("Filtering valid columns")
        
        # Keep only valid columns that exist in the dataframe
        valid_cols = [col for col in df.columns if col in self.valid_columns]
        df = df[valid_cols]
        
        logger.info(f"Kept {len(valid_cols)} valid columns out of {len(df.columns)} total")
        return df
    
    def handle_data_types(self, df: pd.DataFrame) -> pd.DataFrame:
        """Handle data type conversions."""
        logger.info("Handling data type conversions")
        
        # Define column types
        numeric_cols = [
            'price_original', 'storage_gb', 'ram_gb', 'price_per_gb', 'price_per_gb_ram',
            'screen_size_numeric', 'resolution_width', 'resolution_height',
            'ppi_numeric', 'refresh_rate_numeric', 'display_score',
            'camera_count', 'primary_camera_mp', 'selfie_camera_mp', 'camera_score',
            'battery_capacity_numeric', 'charging_wattage', 'battery_score',
            'performance_score', 'security_score', 'connectivity_score',
            'age_in_months', 'overall_device_score'
        ]
        
        boolean_cols = [
            'has_fast_charging', 'has_wireless_charging', 'is_popular_brand',
            'is_new_release', 'is_upcoming'
        ]
        
        # String columns that should remain as strings
        string_cols = [
            'screen_size_inches', 'pixel_density_ppi', 'refresh_rate_hz', 
            'display_brightness', 'capacity', 'weight', 'thickness',
            'main_camera', 'front_camera'
        ]
        
        # Clean string columns
        for col in df.columns:
            if col not in numeric_cols and col not in boolean_cols:
                if col in df.columns:
                    df[col] = df[col].apply(self.clean_string_value)
        
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
    
    def remove_duplicates(self, df: pd.DataFrame) -> pd.DataFrame:
        """Remove duplicate records based on URL."""
        logger.info("Removing duplicates")
        
        initial_count = len(df)
        
        if 'url' in df.columns:
            df = df.drop_duplicates(subset=['url'], keep='last')
        else:
            df = df.drop_duplicates()
        
        final_count = len(df)
        removed_count = initial_count - final_count
        
        if removed_count > 0:
            logger.info(f"Removed {removed_count} duplicate records")
        
        return df
    
    def validate_required_fields(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
        """Validate that required fields are present."""
        logger.info("Validating required fields")
        
        issues = []
        
        for field in settings.min_required_fields:
            if field not in df.columns:
                issues.append(f"Missing required column: {field}")
            else:
                missing_count = df[field].isna().sum()
                if missing_count > 0:
                    missing_pct = (missing_count / len(df)) * 100
                    issues.append(f"Column '{field}' has {missing_count} missing values ({missing_pct:.1f}%)")
        
        return df, issues
    
    def clean_dataframe(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
        """
        Main data cleaning pipeline.
        
        Args:
            df: Input DataFrame
            
        Returns:
            Tuple of (cleaned DataFrame, list of issues)
        """
        logger.info(f"Starting data cleaning for {len(df)} records")
        
        issues = []
        
        try:
            # Standardize column names
            df = self.standardize_column_names(df)
            
            # Clean price column
            df = self.clean_price_column(df)
            
            # Filter valid columns
            df = self.filter_valid_columns(df)
            
            # Handle data types
            df = self.handle_data_types(df)
            
            # Remove duplicates
            df = self.remove_duplicates(df)
            
            # Validate required fields
            df, validation_issues = self.validate_required_fields(df)
            issues.extend(validation_issues)
            
            logger.info(f"Data cleaning completed: {len(df)} records remaining")
            
        except Exception as e:
            logger.error(f"Error during data cleaning: {e}")
            issues.append(f"Data cleaning error: {str(e)}")
        
        return df, issues
    
    def get_data_quality_metrics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate data quality metrics."""
        logger.info("Calculating data quality metrics")
        
        metrics = {
            'total_records': len(df),
            'total_columns': len(df.columns),
            'memory_usage_mb': df.memory_usage(deep=True).sum() / 1024 / 1024,
        }
        
        # Calculate completeness for each column
        completeness = {}
        for col in df.columns:
            non_null_count = df[col].notna().sum()
            completeness[col] = non_null_count / len(df) if len(df) > 0 else 0
        
        metrics['field_completeness'] = completeness
        metrics['overall_completeness'] = np.mean(list(completeness.values()))
        
        # Calculate missing values
        missing_values = df.isnull().sum()
        metrics['missing_values'] = missing_values.to_dict()
        metrics['total_missing'] = missing_values.sum()
        
        # Data type distribution
        dtype_counts = df.dtypes.value_counts()
        metrics['data_types'] = dtype_counts.to_dict()
        
        return metrics