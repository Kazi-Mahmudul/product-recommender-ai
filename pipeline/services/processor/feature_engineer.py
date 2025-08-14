"""
Feature engineering module for mobile phone data.
"""

import logging
import pandas as pd
import numpy as np
import re
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta

from .config import settings
from .performance_scorer import PerformanceScorer
from .feature_versioning import FeatureVersionManager

logger = logging.getLogger(__name__)


class FeatureEngineer:
    """
    Handles feature engineering operations for mobile phone data.
    """
    
    def __init__(self):
        """Initialize the feature engineer."""
        self.performance_scorer = PerformanceScorer()
        self.version_manager = FeatureVersionManager()
        logger.info("Feature engineer initialized")
    
    def create_performance_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create performance-based features using the performance scorer."""
        logger.info("Creating performance-based features")
        
        # Calculate performance scores for each device
        performance_data = []
        for _, row in df.iterrows():
            breakdown = self.performance_scorer.get_performance_breakdown(row)
            performance_data.append(breakdown)
        
        # Convert to DataFrame and merge
        performance_df = pd.DataFrame(performance_data)
        
        # Add performance scores to main DataFrame
        for col in performance_df.columns:
            df[col] = performance_df[col]
        
        # For backward compatibility, also set 'performance_score'
        df['performance_score'] = df['overall_score']
        
        return df
    
    def create_price_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create price-based features."""
        logger.info("Creating price-based features")
        
        # Price categories
        if 'price_original' in df.columns:
            df['price_category'] = pd.cut(
                df['price_original'], 
                bins=settings.price_categories['bins'],
                labels=settings.price_categories['labels']
            )
        
        # Storage and RAM conversion functions
        def convert_to_gb(value):
            if pd.isna(value):
                return None
            value = str(value).lower()
            if 'gb' in value:
                return float(re.findall(r'\\d+', value)[0]) if re.findall(r'\\d+', value) else None
            elif 'mb' in value:
                return float(re.findall(r'\\d+', value)[0]) / 1024 if re.findall(r'\\d+', value) else None
            return None
        
        def convert_ram_to_gb(value):
            if pd.isna(value):
                return None
            value = str(value).lower()
            numbers = re.findall(r'\\d+', value)
            if numbers:
                num = float(numbers[0])
                if 'gb' in value:
                    return num
                elif 'mb' in value:
                    return num / 1024
                else:
                    return num  # Assume GB if no unit
            return None
        
        # Convert storage and RAM to GB
        if 'internal_storage' in df.columns:
            df['storage_gb'] = df['internal_storage'].apply(convert_to_gb)
        
        if 'ram' in df.columns:
            df['ram_gb'] = df['ram'].apply(convert_ram_to_gb)
        
        # Calculate price per GB
        if 'price_original' in df.columns and 'storage_gb' in df.columns:
            df['price_per_gb'] = (df['price_original'] / df['storage_gb']).round(2)
        
        if 'price_original' in df.columns and 'ram_gb' in df.columns:
            df['price_per_gb_ram'] = (df['price_original'] / df['ram_gb']).round(2)
        
        return df
    
    def create_display_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create display-based features."""
        logger.info("Creating display-based features")
        
        # Screen size in numeric format
        if 'screen_size_inches' in df.columns:
            df['screen_size_numeric'] = df['screen_size_inches'].str.extract('(\\d+\\.?\\d*)').astype(float)
        
        # Resolution in numeric format
        if 'display_resolution' in df.columns:
            df['resolution_width'] = df['display_resolution'].str.extract('(\\d+)x').astype(float)
            df['resolution_height'] = df['display_resolution'].str.extract('x(\\d+)').astype(float)
        
        # PPI in numeric format
        if 'pixel_density_ppi' in df.columns:
            df['ppi_numeric'] = df['pixel_density_ppi'].str.extract('(\\d+)').astype(float)
        
        # Refresh rate in numeric format
        if 'refresh_rate_hz' in df.columns:
            df['refresh_rate_numeric'] = df['refresh_rate_hz'].str.extract('(\\d+)').astype(float)
        
        # Calculate display score
        def get_display_score(row):
            score = 0
            weights = {'resolution': 0.4, 'ppi': 0.3, 'refresh_rate': 0.3}
            
            # Resolution score
            if not pd.isna(row.get('resolution_width')) and not pd.isna(row.get('resolution_height')):
                total_pixels = (row['resolution_width'] * row['resolution_height']) / 1000000
                resolution_score = min(total_pixels / 8.3 * 100, 100)
                score += resolution_score * weights['resolution']
            
            # PPI score
            if not pd.isna(row.get('ppi_numeric')):
                ppi_score = min(row['ppi_numeric'] / 500 * 100, 100)
                score += ppi_score * weights['ppi']
            
            # Refresh rate score
            if not pd.isna(row.get('refresh_rate_numeric')):
                refresh_score = min(row['refresh_rate_numeric'] / 120 * 100, 100)
                score += refresh_score * weights['refresh_rate']
            
            return round(score, 2)
        
        df['display_score'] = df.apply(get_display_score, axis=1)
        
        return df
    
    def create_camera_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create camera-based features."""
        logger.info("Creating camera-based features")
        
        # Camera count function
        def get_camera_count(camera_setup, main_camera):
            if not pd.isna(camera_setup):
                setup = str(camera_setup).lower()
                if setup == 'single':
                    return 1
                elif setup == 'dual':
                    return 2
                elif setup == 'triple':
                    return 3
                elif setup == 'quad':
                    return 4
                elif setup == 'penta':
                    return 5
                elif 'cameras' in setup:
                    match = re.search(r'(\\d+)', setup)
                    if match:
                        return int(match.group(1))
            
            if not pd.isna(main_camera):
                main_camera_str = str(main_camera)
                if '+' in main_camera_str:
                    return main_camera_str.count('+') + 1
                elif 'MP' in main_camera_str or re.search(r'\\d+', main_camera_str):
                    return 1
            
            return 0
        
        # Extract camera MP values
        def extract_camera_mp(value):
            if pd.isna(value):
                return None
            
            value_str = str(value).strip()
            if not value_str:
                return None
            
            if '+' in value_str:
                first_camera = value_str.split('+')[0]
                mp_match = re.search(r'(\\d+\\.?\\d*)', first_camera)
                if mp_match:
                    return float(mp_match.group(1))
            else:
                mp_match = re.search(r'(\\d+\\.?\\d*)\\s*MP', value_str, re.IGNORECASE)
                if mp_match:
                    return float(mp_match.group(1))
                
                mp_match = re.search(r'(\\d+\\.?\\d*)', value_str)
                if mp_match:
                    return float(mp_match.group(1))
            
            return None
        
        # Apply camera feature extraction
        if 'camera_setup' in df.columns or 'main_camera' in df.columns:
            df['camera_count'] = df.apply(
                lambda row: get_camera_count(
                    row.get('camera_setup'), 
                    row.get('main_camera')
                ), axis=1
            )
        
        # Extract MP values
        if 'main_camera' in df.columns:
            df['primary_camera_mp'] = df['main_camera'].apply(extract_camera_mp)
        elif 'primary_camera_resolution' in df.columns:
            df['primary_camera_mp'] = df['primary_camera_resolution'].apply(extract_camera_mp)
        
        if 'front_camera' in df.columns:
            df['selfie_camera_mp'] = df['front_camera'].apply(extract_camera_mp)
        elif 'selfie_camera_resolution' in df.columns:
            df['selfie_camera_mp'] = df['selfie_camera_resolution'].apply(extract_camera_mp)
        
        # Calculate camera score
        def get_camera_score(row):
            score = 0
            weights = {'camera_count': 20, 'primary_camera_mp': 50, 'selfie_camera_mp': 30}
            
            # Camera count score
            if not pd.isna(row.get('camera_count')) and row['camera_count'] > 0:
                camera_count_score = min(row['camera_count'], 4) / 4 * 100
                score += camera_count_score * weights['camera_count'] / 100
            
            # Primary camera score
            if not pd.isna(row.get('primary_camera_mp')):
                primary_camera_score = min(row['primary_camera_mp'] / 200 * 100, 100)
                score += primary_camera_score * weights['primary_camera_mp'] / 100
            
            # Selfie camera score
            if not pd.isna(row.get('selfie_camera_mp')):
                selfie_camera_score = min(row['selfie_camera_mp'] / 64 * 100, 100)
                score += selfie_camera_score * weights['selfie_camera_mp'] / 100
            
            return round(score, 2)
        
        df['camera_score'] = df.apply(get_camera_score, axis=1)
        
        return df
    
    def create_battery_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create battery-based features."""
        logger.info("Creating battery-based features")
        
        # Battery capacity in numeric format
        if 'capacity' in df.columns:
            df['battery_capacity_numeric'] = df['capacity'].str.extract('(\\d+)').astype(float)
        
        # Has fast charging
        if 'quick_charging' in df.columns:
            df['has_fast_charging'] = df['quick_charging'].notna()
        
        # Has wireless charging
        if 'wireless_charging' in df.columns:
            df['has_wireless_charging'] = df['wireless_charging'].notna()
        
        # Extract charging wattage
        def extract_wattage(value):
            if pd.isna(value):
                return None
            
            value_str = str(value).strip()
            if not value_str:
                return None
            
            wattage_match = re.search(r'(\\d+\\.?\\d*)\\s*W', value_str, re.IGNORECASE)
            if wattage_match:
                return float(wattage_match.group(1))
            
            return None
        
        if 'quick_charging' in df.columns:
            df['charging_wattage'] = df['quick_charging'].apply(extract_wattage)
        
        # Calculate battery score
        def get_battery_score(row):
            score = 0
            weights = {'capacity': 50, 'charging_wattage': 40, 'wireless_charging': 10}
            
            # Battery capacity score
            if not pd.isna(row.get('battery_capacity_numeric')):
                capacity_score = min(row['battery_capacity_numeric'] / 6000 * 100, 100)
                score += capacity_score * weights['capacity'] / 100
            
            # Charging speed score
            if not pd.isna(row.get('charging_wattage')):
                wattage_score = min(row['charging_wattage'] / 150 * 100, 100)
                score += wattage_score * weights['charging_wattage'] / 100
            
            # Wireless charging score
            if row.get('has_wireless_charging'):
                score += weights['wireless_charging']
            
            return round(score, 2)
        
        df['battery_score'] = df.apply(get_battery_score, axis=1)
        
        return df
    
    def create_brand_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create brand-based features."""
        logger.info("Creating brand-based features")
        
        def is_popular_brand(brand):
            if pd.isna(brand):
                return False
            return str(brand).strip() in settings.popular_brands
        
        if 'brand' in df.columns:
            df['is_popular_brand'] = df['brand'].apply(is_popular_brand)
        
        return df
    
    def create_release_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create release-based features."""
        logger.info("Creating release-based features")
        
        def clean_release_date(date_str):
            if pd.isna(date_str):
                return None
            
            date_str = str(date_str).strip()
            
            if date_str.lower() in ['not announced yet', 'not announced', 'tba', 'tbd']:
                return None
            
            try:
                if date_str.startswith('Exp.'):
                    date_str = date_str.replace('Exp.', '').strip()
                    date_formats = ['%d %B %Y', '%d %b %Y']
                elif '-' in date_str:
                    date_formats = ['%d-%b-%y']
                else:
                    date_formats = ['%d %B %Y', '%d %b %Y', '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y']
                
                for fmt in date_formats:
                    try:
                        return datetime.strptime(date_str, fmt)
                    except ValueError:
                        continue
                
                return None
            except:
                return None
        
        def is_new_release(release_date):
            if pd.isna(release_date):
                return False
            six_months_ago = datetime.now() - timedelta(days=180)
            return release_date >= six_months_ago
        
        def calculate_age_in_months(release_date):
            if pd.isna(release_date):
                return None
            try:
                age_days = (datetime.now() - release_date).days
                return round(age_days / 30.44, 2)
            except:
                return None
        
        def is_upcoming(status):
            if pd.isna(status):
                return False
            upcoming_statuses = ['upcoming', 'rumored', 'expected', 'announced', 'not announced yet', 'tba', 'tbd']
            return str(status).lower().strip() in upcoming_statuses
        
        if 'release_date' in df.columns:
            df['release_date_clean'] = df['release_date'].apply(clean_release_date)
            df['is_new_release'] = df['release_date_clean'].apply(is_new_release)
            df['age_in_months'] = df['release_date_clean'].apply(calculate_age_in_months)
        
        if 'status' in df.columns:
            df['is_upcoming'] = df['status'].apply(is_upcoming)
        
        return df
    
    def create_composite_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create composite features."""
        logger.info("Creating composite features")
        
        # Overall device score (weighted average of all scores)
        score_columns = ['performance_score', 'connectivity_score', 'camera_score', 'battery_score']
        available_scores = [col for col in score_columns if col in df.columns]
        
        if available_scores:
            # Use equal weights for available scores
            weights = {col: 1.0 / len(available_scores) for col in available_scores}
            
            df['overall_device_score'] = 0
            for col in available_scores:
                df['overall_device_score'] += df[col] * weights[col]
            
            df['overall_device_score'] = df['overall_device_score'].round(2)
        
        return df
    
    def engineer_features(self, df: pd.DataFrame, config: Optional[Dict[str, bool]] = None) -> pd.DataFrame:
        """
        Main feature engineering pipeline.
        
        Args:
            df: Input DataFrame
            config: Feature engineering configuration
            
        Returns:
            DataFrame with engineered features
        """
        logger.info(f"Starting feature engineering for {len(df)} records")
        
        if config is None:
            config = {
                'enable_price_categories': True,
                'enable_display_scores': True,
                'enable_camera_scores': True,
                'enable_battery_scores': True,
                'enable_brand_features': True,
                'enable_release_features': True,
                'enable_overall_scores': True,
            }
        
        try:
            # Price-based features
            if config.get('enable_price_categories', True):
                df = self.create_price_features(df)
            
            # Display-based features
            if config.get('enable_display_scores', True):
                df = self.create_display_features(df)
            
            # Camera-based features
            if config.get('enable_camera_scores', True):
                df = self.create_camera_features(df)
            
            # Battery-based features
            if config.get('enable_battery_scores', True):
                df = self.create_battery_features(df)
            
            # Performance-based features (with processor rankings)
            if config.get('enable_performance_scores', True):
                df = self.create_performance_features(df)
            
            # Brand-based features
            if config.get('enable_brand_features', True):
                df = self.create_brand_features(df)
            
            # Release-based features
            if config.get('enable_release_features', True):
                df = self.create_release_features(df)
            
            # Composite features
            if config.get('enable_overall_scores', True):
                df = self.create_composite_features(df)
            
            # Validate feature consistency
            validation_report = self.version_manager.validate_feature_consistency(df)
            if not validation_report["validation_passed"]:
                logger.warning(f"Feature validation issues detected: {validation_report}")
            
            # Calculate feature importance
            importance_scores = self.version_manager.calculate_feature_importance(df)
            logger.info(f"Calculated importance scores for {len(importance_scores)} features")
            
            logger.info(f"Feature engineering completed: {len(df.columns)} total columns")
            
        except Exception as e:
            logger.error(f"Error during feature engineering: {e}")
            raise
        
        return df
    
    def get_feature_documentation(self) -> Dict[str, Any]:
        """Get comprehensive feature documentation."""
        return self.version_manager.generate_feature_documentation()
    
    def get_feature_lineage(self, feature_name: str) -> Dict[str, Any]:
        """Get lineage information for a specific feature."""
        return self.version_manager.get_feature_lineage(feature_name)