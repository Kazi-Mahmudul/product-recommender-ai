"""
Data Cleaner Module

Provides data cleaning functionality for the processing pipeline.
"""

import pandas as pd
import numpy as np
import re
from typing import List, Tuple, Dict, Any


class DataCleaner:
    """Data cleaning service for mobile phone data"""
    
    def __init__(self):
        self.cleaning_issues = []
    
    def clean_dataframe(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
        """
        Clean the input dataframe and return cleaned data with issues found
        
        Args:
            df: Raw dataframe to clean
            
        Returns:
            Tuple of (cleaned_dataframe, list_of_issues)
        """
        self.cleaning_issues = []
        cleaned_df = df.copy()
        
        # Clean price data
        cleaned_df = self._clean_price_data(cleaned_df)
        
        # Clean storage and RAM data
        cleaned_df = self._clean_storage_ram_data(cleaned_df)
        
        # Clean display data
        cleaned_df = self._clean_display_data(cleaned_df)
        
        # Clean camera data
        cleaned_df = self._clean_camera_data(cleaned_df)
        
        # Clean battery data
        cleaned_df = self._clean_battery_data(cleaned_df)
        
        # Clean processor data
        cleaned_df = self._clean_processor_data(cleaned_df)
        
        # Remove duplicates
        initial_count = len(cleaned_df)
        cleaned_df = cleaned_df.drop_duplicates()
        if len(cleaned_df) < initial_count:
            self.cleaning_issues.append({
                'type': 'duplicates_removed',
                'count': initial_count - len(cleaned_df),
                'message': f'Removed {initial_count - len(cleaned_df)} duplicate records'
            })
        
        return cleaned_df, self.cleaning_issues
    
    def _clean_price_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean price-related columns"""
        if 'price' in df.columns:
            # Remove currency symbols and clean price data
            df['price'] = (
                df['price']
                .astype(str)
                .str.replace('৳', '', regex=False)
                .str.replace('?.', '', regex=False)
                .str.replace('à§³', '', regex=False)
                .str.replace(',', '', regex=False)
                .str.strip()
            )
            
            # Extract numeric price
            original_nulls = df['price'].isna().sum()
            df['price_numeric'] = pd.to_numeric(df['price'], errors='coerce')
            new_nulls = df['price_numeric'].isna().sum()
            
            if new_nulls > original_nulls:
                self.cleaning_issues.append({
                    'type': 'price_conversion_issues',
                    'count': new_nulls - original_nulls,
                    'message': f'Failed to convert {new_nulls - original_nulls} price values to numeric'
                })
        
        return df
    
    def _clean_storage_ram_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean storage and RAM data"""
        # Clean storage data
        storage_cols = ['storage', 'internal_storage', 'internal']
        for col in storage_cols:
            if col in df.columns:
                df[f'{col}_cleaned'] = df[col].apply(self._convert_to_gb)
        
        # Clean RAM data
        if 'ram' in df.columns:
            df['ram_cleaned'] = df['ram'].apply(self._convert_ram_to_gb)
        
        return df
    
    def _clean_display_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean display-related data"""
        # Clean screen size
        if 'screen_size_inches' in df.columns:
            df['screen_size_numeric'] = df['screen_size_inches'].str.extract('(\d+\.?\d*)').astype(float)
        
        # Clean resolution
        if 'display_resolution' in df.columns:
            df['resolution_width'] = df['display_resolution'].str.extract('(\d+)x').astype(float)
            df['resolution_height'] = df['display_resolution'].str.extract('x(\d+)').astype(float)
        
        # Clean PPI
        if 'pixel_density_ppi' in df.columns:
            df['ppi_numeric'] = df['pixel_density_ppi'].str.extract('(\d+)').astype(float)
        
        # Clean refresh rate
        if 'refresh_rate_hz' in df.columns:
            df['refresh_rate_numeric'] = df['refresh_rate_hz'].str.extract('(\d+)').astype(float)
        
        return df
    
    def _clean_camera_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean camera-related data and generate camera features"""
        # Extract camera megapixels (legacy columns)
        camera_cols = ['main_camera', 'front_camera', 'primary_camera_resolution', 'selfie_camera_resolution']
        for col in camera_cols:
            if col in df.columns:
                df[f'{col}_mp'] = df[col].apply(self._extract_camera_mp)
        
        # Generate the 4 specific camera features
        if 'main_camera' in df.columns:
            df['primary_camera_mp'] = df['main_camera'].apply(self._extract_primary_camera_mp)
        
        if 'front_camera' in df.columns:
            df['selfie_camera_mp'] = df['front_camera'].apply(self._extract_selfie_camera_mp)
        
        if 'camera_setup' in df.columns:
            df['camera_count'] = df['camera_setup'].apply(self._get_camera_count)
        
        # Calculate camera score if we have the required data
        if all(col in df.columns for col in ['primary_camera_mp', 'selfie_camera_mp', 'camera_count']):
            df['camera_score'] = df.apply(
                lambda row: self._calculate_camera_score(
                    row['primary_camera_mp'], 
                    row['selfie_camera_mp'], 
                    row['camera_count']
                ), axis=1
            )
        
        return df
    
    def _clean_battery_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean battery-related data"""
        # Clean battery capacity
        if 'capacity' in df.columns:
            df['battery_capacity_numeric'] = df['capacity'].str.extract('(\d+)').astype(float)
        
        # Clean charging wattage
        if 'quick_charging' in df.columns:
            df['charging_wattage'] = df['quick_charging'].apply(self._extract_wattage)
        
        return df
    
    def _clean_processor_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean processor-related data"""
        # Normalize processor names
        processor_cols = ['processor', 'chipset']
        for col in processor_cols:
            if col in df.columns:
                df[f'{col}_normalized'] = df[col].apply(self._normalize_processor_name)
        
        return df
    
    def _convert_to_gb(self, value):
        """Convert storage values to GB"""
        if pd.isna(value):
            return None
        value = str(value).lower()
        if 'gb' in value:
            return float(value.replace('gb', '').strip())
        elif 'mb' in value:
            return float(value.replace('mb', '').strip()) / 1024
        else:
            return None
    
    def _convert_ram_to_gb(self, value):
        """Convert RAM values to GB"""
        if pd.isna(value):
            return None
        value = str(value).lower()
        numbers = re.findall(r'\d+', value)
        if numbers:
            num = float(numbers[0])
            if 'gb' in value:
                return num
            elif 'mb' in value:
                return num / 1024
            else:
                return num
        return None
    
    def _extract_camera_mp(self, value):
        """Extract megapixel value from camera specification"""
        if pd.isna(value):
            return None
        
        value_str = str(value).strip()
        if not value_str:
            return None

        # For formats like "48+8+2MP" or "48MP"
        if '+' in value_str:
            first_camera = value_str.split('+')[0]
            mp_match = re.search(r'(\d+\.?\d*)', first_camera)
            if mp_match:
                return float(mp_match.group(1))
        else:
            mp_match = re.search(r'(\d+\.?\d*)\s*MP', value_str, re.IGNORECASE)
            if mp_match:
                return float(mp_match.group(1))
            
            mp_match = re.search(r'(\d+\.?\d*)', value_str)
            if mp_match:
                return float(mp_match.group(1))

        return None
    
    def _extract_primary_camera_mp(self, main_camera):
        """Extract primary camera MP from main_camera string"""
        if pd.isna(main_camera) or not main_camera:
            return None
        
        main_camera_str = str(main_camera).strip()
        
        # For formats like "50+8+2MP" or "48MP"
        if '+' in main_camera_str:
            # Get the first camera (primary)
            first_camera = main_camera_str.split('+')[0]
            mp_match = re.search(r'(\d+)', first_camera)
            if mp_match:
                return int(mp_match.group(1))
        else:
            # Single camera like "48MP"
            mp_match = re.search(r'(\d+)', main_camera_str)
            if mp_match:
                return int(mp_match.group(1))
        
        return None
    
    def _extract_selfie_camera_mp(self, front_camera):
        """Extract selfie camera MP from front_camera string"""
        if pd.isna(front_camera) or not front_camera:
            return None
        
        front_camera_str = str(front_camera).strip()
        
        # Extract MP value like "8MP" -> 8
        mp_match = re.search(r'(\d+)', front_camera_str)
        if mp_match:
            return int(mp_match.group(1))
        
        return None
    
    def _get_camera_count(self, camera_setup):
        """Get camera count from camera_setup"""
        if pd.isna(camera_setup) or not camera_setup:
            return 1  # Default to single camera
        
        setup_str = str(camera_setup).lower().strip()
        
        if 'single' in setup_str:
            return 1
        elif 'dual' in setup_str:
            return 2
        elif 'triple' in setup_str:
            return 3
        elif 'quad' in setup_str:
            return 4
        elif 'penta' in setup_str or 'five' in setup_str:
            return 5
        else:
            # Try to extract number from strings like "4 Cameras"
            num_match = re.search(r'(\d+)', setup_str)
            if num_match:
                return int(num_match.group(1))
        
        return 1  # Default to single camera
    
    def _calculate_camera_score(self, primary_mp, selfie_mp, camera_count):
        """Calculate camera score based on specifications"""
        if pd.isna(primary_mp):
            primary_mp = 0
        if pd.isna(selfie_mp):
            selfie_mp = 0
        if pd.isna(camera_count):
            camera_count = 1
        
        # Camera scoring algorithm
        # Primary camera: 60% weight, Selfie camera: 25% weight, Camera count: 15% weight
        primary_score = min(primary_mp / 108.0 * 60, 60)  # Max 60 points for primary
        selfie_score = min(selfie_mp / 40.0 * 25, 25)     # Max 25 points for selfie
        count_score = min((camera_count - 1) * 5, 15)      # Max 15 points for count
        
        total_score = primary_score + selfie_score + count_score
        return round(total_score, 2)
    
    def _extract_wattage(self, value):
        """Extract wattage from charging specification"""
        if pd.isna(value):
            return None
        
        value_str = str(value).strip()
        if not value_str:
            return None
        
        wattage_match = re.search(r'(\d+\.?\d*)\s*W', value_str, re.IGNORECASE)
        if wattage_match:
            return float(wattage_match.group(1))
        
        return None
    
    def _normalize_processor_name(self, name):
        """Normalize processor names for matching"""
        if pd.isna(name):
            return None
        
        return (
            str(name).lower()
            .replace("qualcomm", "")
            .replace("mediatek", "")
            .replace("apple", "")
            .replace("samsung", "")
            .replace("google", "")
            .replace("huawei", "")
            .replace("hisilicon", "")
            .replace("kirin", "")
            .replace("unisoc", "")
            .strip()
        )