"""
Feature Engineer Module

Provides feature engineering functionality for the processing pipeline.
"""

import pandas as pd
import numpy as np
import re
import sys
import os
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class FeatureEngineer:
    """Feature engineering service for mobile phone data"""
    
    def __init__(self):
        pass
    
    def engineer_features(self, df: pd.DataFrame, processor_df: Optional[pd.DataFrame] = None) -> pd.DataFrame:
        """
        Engineer features for the input dataframe
        
        Args:
            df: Cleaned dataframe to engineer features for
            processor_df: Optional processor rankings dataframe
            
        Returns:
            DataFrame with engineered features
        """
        logger.info(f"Starting feature engineering for {len(df)} records...")
        
        # Make a copy to avoid modifying the original
        enhanced_df = df.copy()
        
        # Price engineering
        enhanced_df = self._engineer_price_features(enhanced_df)
        
        # Storage and RAM engineering
        enhanced_df = self._engineer_storage_ram_features(enhanced_df)
        
        # Display engineering
        enhanced_df = self._engineer_display_features(enhanced_df)
        
        # Camera engineering (the key missing piece!)
        enhanced_df = self._engineer_camera_features(enhanced_df)
        
        # Battery engineering
        enhanced_df = self._engineer_battery_features(enhanced_df)
        
        # Performance engineering
        enhanced_df = self._engineer_performance_features(enhanced_df, processor_df)
        
        # Overall scoring
        enhanced_df = self._calculate_overall_scores(enhanced_df)
        
        logger.info(f"Feature engineering completed. Added {len(enhanced_df.columns) - len(df.columns)} new features")
        
        return enhanced_df
    
    def _engineer_price_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer price-related features"""
        # Extract numeric price from price column
        if 'price' in df.columns:
            df['price_original'] = df['price'].apply(self._extract_price_numeric)
        
        # Price categories
        if 'price_original' in df.columns:
            df['price_category'] = df['price_original'].apply(self._categorize_price)
        
        return df
    
    def _engineer_storage_ram_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer storage and RAM features"""
        # Convert storage to GB
        if 'internal_storage' in df.columns:
            df['storage_gb'] = df['internal_storage'].apply(self._convert_storage_to_gb)
        
        # Convert RAM to GB
        if 'ram' in df.columns:
            df['ram_gb'] = df['ram'].apply(self._convert_ram_to_gb)
        
        # Price per GB calculations
        if 'price_original' in df.columns and 'storage_gb' in df.columns:
            df['price_per_gb'] = df.apply(
                lambda row: row['price_original'] / row['storage_gb'] 
                if pd.notna(row['price_original']) and pd.notna(row['storage_gb']) and row['storage_gb'] > 0 
                else None, axis=1
            )
        
        if 'price_original' in df.columns and 'ram_gb' in df.columns:
            df['price_per_gb_ram'] = df.apply(
                lambda row: row['price_original'] / row['ram_gb'] 
                if pd.notna(row['price_original']) and pd.notna(row['ram_gb']) and row['ram_gb'] > 0 
                else None, axis=1
            )
        
        return df
    
    def _engineer_display_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer display-related features"""
        # Extract numeric screen size
        if 'screen_size_inches' in df.columns:
            df['screen_size_numeric'] = df['screen_size_inches'].apply(self._extract_screen_size)
        
        # Extract resolution dimensions
        if 'display_resolution' in df.columns:
            resolution_data = df['display_resolution'].apply(self._extract_resolution)
            df['resolution_width'] = resolution_data.apply(lambda x: x[0] if x else None)
            df['resolution_height'] = resolution_data.apply(lambda x: x[1] if x else None)
        
        # Extract PPI
        if 'pixel_density_ppi' in df.columns:
            df['ppi_numeric'] = df['pixel_density_ppi'].apply(self._extract_ppi)
        
        # Extract refresh rate
        if 'refresh_rate_hz' in df.columns:
            df['refresh_rate_numeric'] = df['refresh_rate_hz'].apply(self._extract_refresh_rate)
        
        return df
    
    def _engineer_camera_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer camera-related features - THIS IS THE KEY MISSING PIECE!"""
        logger.info("Engineering camera features...")
        
        # Extract primary camera MP from main_camera
        if 'main_camera' in df.columns:
            df['primary_camera_mp'] = df['main_camera'].apply(self._extract_primary_camera_mp)
            logger.info(f"Extracted primary_camera_mp for {df['primary_camera_mp'].notna().sum()} records")
        
        # Extract selfie camera MP from front_camera
        if 'front_camera' in df.columns:
            df['selfie_camera_mp'] = df['front_camera'].apply(self._extract_selfie_camera_mp)
            logger.info(f"Extracted selfie_camera_mp for {df['selfie_camera_mp'].notna().sum()} records")
        
        # Extract camera count from camera_setup
        if 'camera_setup' in df.columns:
            df['camera_count'] = df['camera_setup'].apply(self._get_camera_count)
            logger.info(f"Extracted camera_count for {df['camera_count'].notna().sum()} records")
        
        # Calculate camera score
        if all(col in df.columns for col in ['primary_camera_mp', 'selfie_camera_mp', 'camera_count']):
            df['camera_score'] = df.apply(
                lambda row: self._calculate_camera_score(
                    row['primary_camera_mp'], 
                    row['selfie_camera_mp'], 
                    row['camera_count']
                ), axis=1
            )
            logger.info(f"Calculated camera_score for {df['camera_score'].notna().sum()} records")
        
        return df
    
    def _engineer_battery_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer battery-related features"""
        # Extract numeric battery capacity
        if 'capacity' in df.columns:
            df['battery_capacity_numeric'] = df['capacity'].apply(self._extract_battery_capacity)
        
        # Fast charging detection
        if 'quick_charging' in df.columns:
            df['has_fast_charging'] = df['quick_charging'].apply(self._has_fast_charging)
            df['charging_wattage'] = df['quick_charging'].apply(self._extract_charging_wattage)
        
        # Wireless charging detection
        if 'wireless_charging' in df.columns:
            df['has_wireless_charging'] = df['wireless_charging'].apply(self._has_wireless_charging)
        
        return df
    
    def _engineer_performance_features(self, df: pd.DataFrame, processor_df: Optional[pd.DataFrame] = None) -> pd.DataFrame:
        """Engineer performance-related features"""
        # If processor rankings are available, add processor rank
        if processor_df is not None and 'chipset' in df.columns:
            df = self._add_processor_rankings(df, processor_df)
        
        return df
    
    def _calculate_overall_scores(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate overall device scores"""
        # Battery score
        if 'battery_capacity_numeric' in df.columns:
            df['battery_score'] = df['battery_capacity_numeric'].apply(self._calculate_battery_score)
        
        # Performance score (if processor rank available)
        if 'processor_rank' in df.columns:
            df['performance_score'] = df['processor_rank'].apply(self._calculate_performance_score)
        
        # Display score
        display_cols = ['screen_size_numeric', 'ppi_numeric', 'refresh_rate_numeric']
        if any(col in df.columns for col in display_cols):
            df['display_score'] = df.apply(self._calculate_display_score, axis=1)
        
        # Overall device score
        score_cols = ['camera_score', 'battery_score', 'performance_score', 'display_score']
        available_scores = [col for col in score_cols if col in df.columns]
        if available_scores:
            df['overall_device_score'] = df[available_scores].mean(axis=1, skipna=True)
        
        return df
    
    # Helper methods for feature extraction
    def _extract_price_numeric(self, price_str):
        """Extract numeric price from price string"""
        if pd.isna(price_str):
            return None
        
        price_str = str(price_str).replace('৳', '').replace(',', '').strip()
        try:
            return float(re.search(r'[\d.]+', price_str).group())
        except:
            return None
    
    def _categorize_price(self, price):
        """Categorize price into ranges"""
        if pd.isna(price):
            return 'Unknown'
        
        if price < 15000:
            return 'Budget'
        elif price < 30000:
            return 'Mid-range'
        elif price < 60000:
            return 'Premium'
        else:
            return 'Flagship'
    
    def _convert_storage_to_gb(self, storage_str):
        """Convert storage string to GB"""
        if pd.isna(storage_str):
            return None
        
        storage_str = str(storage_str).lower()
        numbers = re.findall(r'\d+', storage_str)
        if numbers:
            num = float(numbers[0])
            if 'gb' in storage_str:
                return num
            elif 'mb' in storage_str:
                return num / 1024
            elif 'tb' in storage_str:
                return num * 1024
        return None
    
    def _convert_ram_to_gb(self, ram_str):
        """Convert RAM string to GB"""
        if pd.isna(ram_str):
            return None
        
        ram_str = str(ram_str).lower()
        numbers = re.findall(r'\d+', ram_str)
        if numbers:
            num = float(numbers[0])
            if 'gb' in ram_str:
                return num
            elif 'mb' in ram_str:
                return num / 1024
        return None
    
    def _extract_screen_size(self, size_str):
        """Extract numeric screen size"""
        if pd.isna(size_str):
            return None
        
        try:
            return float(re.search(r'(\d+\.?\d*)', str(size_str)).group(1))
        except:
            return None
    
    def _extract_resolution(self, resolution_str):
        """Extract resolution width and height"""
        if pd.isna(resolution_str):
            return None
        
        try:
            match = re.search(r'(\d+)\s*x\s*(\d+)', str(resolution_str))
            if match:
                return (int(match.group(1)), int(match.group(2)))
        except:
            pass
        return None
    
    def _extract_ppi(self, ppi_str):
        """Extract PPI value"""
        if pd.isna(ppi_str):
            return None
        
        try:
            return int(re.search(r'(\d+)', str(ppi_str)).group(1))
        except:
            return None
    
    def _extract_refresh_rate(self, refresh_str):
        """Extract refresh rate value"""
        if pd.isna(refresh_str):
            return None
        
        try:
            return int(re.search(r'(\d+)', str(refresh_str)).group(1))
        except:
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
    
    def _extract_battery_capacity(self, capacity_str):
        """Extract battery capacity in mAh"""
        if pd.isna(capacity_str):
            return None
        
        try:
            return int(re.search(r'(\d+)', str(capacity_str)).group(1))
        except:
            return None
    
    def _has_fast_charging(self, charging_str):
        """Check if device has fast charging"""
        if pd.isna(charging_str):
            return False
        
        charging_str = str(charging_str).lower()
        return any(term in charging_str for term in ['fast', 'quick', 'rapid', 'turbo', 'w', 'watt'])
    
    def _extract_charging_wattage(self, charging_str):
        """Extract charging wattage"""
        if pd.isna(charging_str):
            return None
        
        try:
            match = re.search(r'(\d+)\s*w', str(charging_str).lower())
            if match:
                return int(match.group(1))
        except:
            pass
        return None
    
    def _has_wireless_charging(self, wireless_str):
        """Check if device has wireless charging"""
        if pd.isna(wireless_str):
            return False
        
        wireless_str = str(wireless_str).lower()
        return 'yes' in wireless_str or 'supported' in wireless_str
    
    def _add_processor_rankings(self, df: pd.DataFrame, processor_df: pd.DataFrame) -> pd.DataFrame:
        """Add processor rankings to the dataframe"""
        # This would need processor matching logic
        # For now, just add a placeholder
        df['processor_rank'] = None
        return df
    
    def _calculate_battery_score(self, capacity):
        """Calculate battery score based on capacity"""
        if pd.isna(capacity):
            return None
        
        # Score based on capacity (5000mAh = 10 points)
        return min(capacity / 500, 10)
    
    def _calculate_performance_score(self, processor_rank):
        """Calculate performance score based on processor rank"""
        if pd.isna(processor_rank):
            return None
        
        # Higher rank = lower score (rank 1 = 10 points)
        return max(11 - processor_rank, 1)
    
    def _calculate_display_score(self, row):
        """Calculate display score based on multiple factors"""
        score = 0
        factors = 0
        
        if pd.notna(row.get('screen_size_numeric')):
            # Screen size score (6.5" = optimal)
            size_score = min(row['screen_size_numeric'] / 0.65, 10)
            score += size_score
            factors += 1
        
        if pd.notna(row.get('ppi_numeric')):
            # PPI score (400+ = good)
            ppi_score = min(row['ppi_numeric'] / 40, 10)
            score += ppi_score
            factors += 1
        
        if pd.notna(row.get('refresh_rate_numeric')):
            # Refresh rate score (120Hz = optimal)
            refresh_score = min(row['refresh_rate_numeric'] / 12, 10)
            score += refresh_score
            factors += 1
        
        return score / factors if factors > 0 else None