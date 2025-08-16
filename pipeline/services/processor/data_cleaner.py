"""
Data cleaning and preprocessing module.
"""

import logging
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
import re
from datetime import datetime

try:
    from .config import settings
except ImportError:
    from config import settings

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
    
    def convert_to_gb(self, value: Any) -> Optional[float]:
        """Convert storage values to GB."""
        if pd.isna(value):
            return None
        value_str = str(value).lower()
        
        # Extract numeric value
        numbers = re.findall(r'\d+', value_str)
        if not numbers:
            return None
        
        num = float(numbers[0])
        
        if 'gb' in value_str:
            return num
        elif 'mb' in value_str:
            return num / 1024
        elif 'tb' in value_str:
            return num * 1024
        else:
            # Assume GB if no unit specified
            return num
    
    def convert_ram_to_gb(self, value: Any) -> Optional[float]:
        """Convert RAM values to GB."""
        if pd.isna(value):
            return None
        value_str = str(value).lower()
        
        # Extract numbers from the string
        numbers = re.findall(r'\d+', value_str)
        if numbers:
            num = float(numbers[0])
            if 'gb' in value_str:
                return num
            elif 'mb' in value_str:
                return num / 1024
            else:
                # If no unit specified, assume GB
                return num
        return None
    
    def extract_display_metrics(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extract numeric display metrics from text fields."""
        logger.info("Extracting display metrics")
        
        # Screen size numeric
        if "screen_size_inches" in df.columns:
            df['screen_size_numeric'] = df['screen_size_inches'].str.extract(r'(\d+\.?\d*)').astype(float)
        
        # Resolution numeric (width x height)
        if "display_resolution" in df.columns:
            df["resolution_width"] = df["display_resolution"].str.extract(r'(\d+)x').astype(float)
            df["resolution_height"] = df["display_resolution"].str.extract(r'x(\d+)').astype(float)
        
        # PPI numeric
        if "pixel_density_ppi" in df.columns:
            df['ppi_numeric'] = df['pixel_density_ppi'].str.extract(r'(\d+)').astype(float)
        
        # Refresh rate numeric
        if "refresh_rate_hz" in df.columns:
            df['refresh_rate_numeric'] = df['refresh_rate_hz'].str.extract(r'(\d+)').astype(float)
        
        return df
    
    def _extract_resolution_wh(self, res: str) -> Optional[Tuple[int, int]]:
        """Extract resolution width and height from resolution string."""
        if pd.isna(res):
            return None
        s = str(res).lower()
        m = re.search(r'(\d{3,5})\s*[x×]\s*(\d{3,5})', s)
        if not m:
            return None
        return int(m.group(1)), int(m.group(2))
    
    def _extract_ppi(self, value) -> Optional[float]:
        """Extract PPI value from text."""
        if pd.isna(value):
            return None
        m = re.search(r'(\d+(?:\.\d+)?)\s*ppi', str(value).lower())
        if not m:
            return None
        return float(m.group(1))
    
    def _extract_refresh_rate(self, value) -> Optional[float]:
        """Extract refresh rate from text."""
        if pd.isna(value):
            return None
        m = re.search(r'(\d+(?:\.\d+)?)\s*hz', str(value).lower())
        if not m:
            return None
        return float(m.group(1))
    
    def normalize_camera_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extract camera MP values and camera counts."""
        logger.info("Normalizing camera data")
        
        # Extract primary camera MP
        if "main_camera" in df.columns:
            df['primary_camera_mp'] = df['main_camera'].apply(self.extract_camera_mp)
        elif "primary_camera_resolution" in df.columns:
            df['primary_camera_mp'] = df['primary_camera_resolution'].apply(self.extract_camera_mp)
        
        # Extract selfie camera MP
        if "front_camera" in df.columns:
            df['selfie_camera_mp'] = df['front_camera'].apply(self.extract_camera_mp)
        elif "selfie_camera_resolution" in df.columns:
            df['selfie_camera_mp'] = df['selfie_camera_resolution'].apply(self.extract_camera_mp)
        
        # Extract camera count
        if "camera_setup" in df.columns or "main_camera" in df.columns:
            df['camera_count'] = df.apply(
                lambda row: self.get_camera_count(
                    row.get('camera_setup'), 
                    row.get('main_camera')
                ), axis=1
            )
        
        return df
    
    def extract_camera_mp(self, value: Any) -> Optional[float]:
        """Extract megapixel value from camera specification string."""
        if pd.isna(value):
            return None
        
        value_str = str(value).strip()
        if not value_str:
            return None

        # For formats like "48+8+2MP" or "48MP"
        if '+' in value_str:
            # Extract the first (main) camera MP value
            first_camera = value_str.split('+')[0]
            mp_match = re.search(r'(\d+\.?\d*)', first_camera)
            if mp_match:
                return float(mp_match.group(1))
        else:
            # For single camera format like "48MP"
            mp_match = re.search(r'(\d+\.?\d*)\s*MP', value_str, re.IGNORECASE)
            if mp_match:
                return float(mp_match.group(1))
            
            # Try without the MP suffix (some entries might just have the number)
            mp_match = re.search(r'(\d+\.?\d*)', value_str)
            if mp_match:
                return float(mp_match.group(1))

        return None
    
    def get_camera_count(self, camera_setup: Any, main_camera: Any = None) -> Optional[int]:
        """Try several patterns: 'triple camera', '3 cameras', fallback to list-likes."""
        if not pd.isna(camera_setup):
            s = str(camera_setup).lower()
            if 'single' in s: 
                return 1
            if 'dual' in s: 
                return 2
            if 'triple' in s: 
                return 3
            if 'quad' in s: 
                return 4
            if 'penta' in s: 
                return 5
            m = re.search(r'(\d+)\s*(cameras?|lens|lenses)', s)
            if m: 
                return int(m.group(1))
        
        # Enhanced MP-based detection for formats like "50+12+10MP"
        if main_camera is not None and not pd.isna(main_camera):
            camera_str = str(main_camera).lower()
            
            # Count cameras by '+' separators (e.g., "50+12+10MP" = 3 cameras)
            if '+' in camera_str and 'mp' in camera_str:
                # Split by '+' and count valid MP values
                parts = camera_str.split('+')
                valid_cameras = 0
                for part in parts:
                    if re.search(r'\d+', part):  # Contains a number
                        valid_cameras += 1
                if valid_cameras > 0:
                    return valid_cameras
            
            # Fallback: count MP occurrences
            mps = re.findall(r'(\d+(?:\.\d+)?)\s*mp', camera_str)
            if mps: 
                return max(1, len(mps))
        
        return None
    
    def clean_battery_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean and extract battery-related data."""
        logger.info("Cleaning battery data")
        
        # Battery capacity numeric
        if "capacity" in df.columns:
            df['battery_capacity_numeric'] = df['capacity'].str.extract(r'(\d+)').astype(float)
        
        # Has fast charging
        if "quick_charging" in df.columns:
            df["has_fast_charging"] = df["quick_charging"].notna()
        else:
            # fallback: detect in text fields
            df["has_fast_charging"] = df.get("charging", pd.Series([""]*len(df))).astype(str).str.contains(r'(fast|quick|turbo|dart|super)', case=False, regex=True)

        # Has wireless charging
        if "wireless_charging" in df.columns:
            df["has_wireless_charging"] = df["wireless_charging"].notna()
        else:
            df["has_wireless_charging"] = df.get("charging", pd.Series([""]*len(df))).astype(str).str.contains("wireless", case=False, regex=False)

        # Extract charging wattage
        if "quick_charging" in df.columns:
            df["charging_wattage"] = df["quick_charging"].apply(self.extract_wattage)
        
        return df
    
    def extract_wattage(self, value: Any) -> Optional[float]:
        """Extract wattage from charging specification string."""
        if pd.isna(value):
            return None
        
        value_str = str(value).strip()
        if not value_str:
            return None
        
        # Use regex to find a number (integer or float) followed by 'W'
        wattage_match = re.search(r'(\d+\.?\d*)\s*W', value_str, re.IGNORECASE)
        if wattage_match:
            return float(wattage_match.group(1))
        
        return None
    
    def generate_slugs(self, df: pd.DataFrame) -> pd.DataFrame:
        """Generate SEO-friendly slugs from phone names."""
        logger.info("Generating slugs from phone names")
        
        try:
            from slugify import slugify
            if 'name' in df.columns:
                df['slug'] = df['name'].apply(lambda x: slugify(str(x)) if pd.notna(x) else None)
        except ImportError:
            logger.warning("slugify library not available, skipping slug generation")
            if 'name' in df.columns:
                # Fallback slug generation
                df['slug'] = df['name'].apply(self._create_simple_slug)
        
        return df
    
    def _create_simple_slug(self, name: str) -> Optional[str]:
        """Create a simple slug without external dependencies."""
        if pd.isna(name):
            return None
        
        # Convert to lowercase and replace spaces/special chars with hyphens
        slug = str(name).lower()
        slug = re.sub(r'[^a-z0-9]+', '-', slug)
        slug = slug.strip('-')
        return slug if slug else None
    
    def clean_price_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean and process price column with comprehensive currency handling."""
        logger.info("Cleaning price data with comprehensive currency handling")
        
        if 'price' in df.columns:
            # Remove various currency prefixes like '৳', '?.', 'à§³.', 'à§³', etc.
            df["price"] = (
                df["price"]
                .astype(str)
                .str.replace('?.', '', regex=False)
                .str.replace('৳.', '', regex=False)
                .str.replace('৳', '', regex=False)
                .str.replace('à§³.', '', regex=False)
                .str.replace('à§³', '', regex=False)
                .str.strip()
            )
            
            # Create price_original column with numeric values
            df["price_original"] = (
                df["price"]
                .astype(str)
                .str.replace(",", "", regex=False)
                .str.extract(r'(\d+(?:\.\d+)?)')[0]
                .astype(float)
            )
        
        return df
    
    def create_price_categories(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create price categories for Budget/Mid-range/Premium/Flagship."""
        logger.info("Creating price categories")
        
        if 'price_original' in df.columns:
            # Price categories (BDT)
            df["price_category"] = pd.cut(
                df["price_original"],
                bins=[0, 20000, 40000, 60000, 100000, float('inf')],
                labels=["Budget", "Mid-range", "Upper Mid-range", "Premium", "Flagship"]
            )
        
        return df
    
    def calculate_price_per_gb(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate price per GB ratios for storage and RAM."""
        logger.info("Calculating price per GB ratios")
        
        if "price_original" in df.columns:
            # Price per GB of storage
            if "storage_gb" in df.columns:
                df["price_per_gb"] = (df["price_original"] / df["storage_gb"]).replace([np.inf, -np.inf], np.nan).round(2)
            
            # Price per GB of RAM
            if "ram_gb" in df.columns:
                df["price_per_gb_ram"] = (df["price_original"] / df["ram_gb"]).replace([np.inf, -np.inf], np.nan).round(2)
        
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
            
            # Clean price data with comprehensive currency handling
            df = self.clean_price_data(df)
            df = self.create_price_categories(df)
            df = self.calculate_price_per_gb(df)
            
            # Extract display metrics
            df = self.extract_display_metrics(df)
            
            # Normalize camera data
            df = self.normalize_camera_data(df)
            
            # Clean battery data
            df = self.clean_battery_data(df)
            
            # Generate slugs
            df = self.generate_slugs(df)
            
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