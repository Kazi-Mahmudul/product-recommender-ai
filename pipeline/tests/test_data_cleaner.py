"""
Unit tests for Enhanced Data Cleaner Service.
"""

import pytest
import pandas as pd
import numpy as np
from unittest.mock import Mock, patch
import sys
import os

# Add the processor services to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'processor'))

from data_cleaner import DataCleaner


class TestDataCleaner:
    """Test cases for DataCleaner class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.cleaner = DataCleaner()
        
        # Sample test data
        self.sample_data = pd.DataFrame({
            'name': ['Samsung Galaxy S24', 'iPhone 15 Pro', 'Xiaomi 14'],
            'price': ['৳.85,000', '?.120,000', '৳75,000'],
            'main_camera': ['50+12+10MP', '48MP', '50+50+50MP'],
            'front_camera': ['12MP', '12MP', '32MP'],
            'ram': ['8GB', '8 GB', '12GB'],
            'internal_storage': ['128GB', '256 GB', '256GB'],
            'capacity': ['4000mAh', '3274mAh', '4610mAh'],
            'quick_charging': ['25W', '20W', '90W'],
            'screen_size_inches': ['6.2"', '6.1 inches', '6.36"'],
            'display_resolution': ['1080x2340', '1179 x 2556', '1200x2670'],
            'pixel_density_ppi': ['422 ppi', '460ppi', '460 PPI'],
            'refresh_rate_hz': ['120Hz', '120 Hz', '120Hz']
        })
    
    def test_clean_price_data(self):
        """Test price data cleaning with various currency formats."""
        df = self.sample_data.copy()
        result = self.cleaner.clean_price_data(df)
        
        # Check that currency symbols are removed
        assert '৳' not in result['price'].iloc[0]
        assert '?' not in result['price'].iloc[1]
        
        # Check that price_original is created with numeric values
        assert 'price_original' in result.columns
        assert result['price_original'].iloc[0] == 85000.0
        assert result['price_original'].iloc[1] == 120000.0
        assert result['price_original'].iloc[2] == 75000.0
    
    def test_create_price_categories(self):
        """Test price category creation."""
        df = pd.DataFrame({
            'price_original': [15000, 35000, 55000, 85000, 150000]
        })
        result = self.cleaner.create_price_categories(df)
        
        assert 'price_category' in result.columns
        assert result['price_category'].iloc[0] == 'Budget'
        assert result['price_category'].iloc[1] == 'Mid-range'
        assert result['price_category'].iloc[2] == 'Upper Mid-range'
        assert result['price_category'].iloc[3] == 'Premium'
        assert result['price_category'].iloc[4] == 'Flagship'
    
    def test_convert_to_gb(self):
        """Test storage conversion to GB."""
        # Test GB values
        assert self.cleaner.convert_to_gb('128GB') == 128.0
        assert self.cleaner.convert_to_gb('256 GB') == 256.0
        
        # Test MB values
        assert self.cleaner.convert_to_gb('512MB') == 0.5
        assert self.cleaner.convert_to_gb('1024 MB') == 1.0
        
        # Test TB values
        assert self.cleaner.convert_to_gb('1TB') == 1024.0
        
        # Test invalid values
        assert self.cleaner.convert_to_gb(None) is None
        assert self.cleaner.convert_to_gb('') is None
    
    def test_convert_ram_to_gb(self):
        """Test RAM conversion to GB."""
        assert self.cleaner.convert_ram_to_gb('8GB') == 8.0
        assert self.cleaner.convert_ram_to_gb('12 GB') == 12.0
        assert self.cleaner.convert_ram_to_gb('4096MB') == 4.0
        assert self.cleaner.convert_ram_to_gb('16') == 16.0  # Assume GB if no unit
        assert self.cleaner.convert_ram_to_gb(None) is None
    
    def test_extract_display_metrics(self):
        """Test display metrics extraction."""
        df = self.sample_data.copy()
        result = self.cleaner.extract_display_metrics(df)
        
        # Check screen size numeric
        assert 'screen_size_numeric' in result.columns
        assert result['screen_size_numeric'].iloc[0] == 6.2
        assert result['screen_size_numeric'].iloc[1] == 6.1
        
        # Check resolution extraction
        assert 'resolution_width' in result.columns
        assert 'resolution_height' in result.columns
        assert result['resolution_width'].iloc[0] == 1080.0
        assert result['resolution_height'].iloc[0] == 2340.0
        
        # Check PPI extraction
        assert 'ppi_numeric' in result.columns
        assert result['ppi_numeric'].iloc[0] == 422.0
        assert result['ppi_numeric'].iloc[1] == 460.0
        
        # Check refresh rate extraction
        assert 'refresh_rate_numeric' in result.columns
        assert result['refresh_rate_numeric'].iloc[0] == 120.0
    
    def test_extract_camera_mp(self):
        """Test camera MP extraction."""
        # Test multi-camera format
        assert self.cleaner.extract_camera_mp('50+12+10MP') == 50.0
        assert self.cleaner.extract_camera_mp('48+8+2MP') == 48.0
        
        # Test single camera format
        assert self.cleaner.extract_camera_mp('48MP') == 48.0
        assert self.cleaner.extract_camera_mp('12MP') == 12.0
        
        # Test without MP suffix
        assert self.cleaner.extract_camera_mp('50') == 50.0
        
        # Test invalid values
        assert self.cleaner.extract_camera_mp(None) is None
        assert self.cleaner.extract_camera_mp('') is None
    
    def test_get_camera_count(self):
        """Test camera count extraction."""
        # Test text-based detection
        assert self.cleaner.get_camera_count('Triple', None) == 3
        assert self.cleaner.get_camera_count('Dual camera', None) == 2
        assert self.cleaner.get_camera_count('Quad cameras', None) == 4
        
        # Test MP-based detection
        assert self.cleaner.get_camera_count(None, '50+12+10MP') == 3
        assert self.cleaner.get_camera_count(None, '48+8MP') == 2
        assert self.cleaner.get_camera_count(None, '48MP') == 1
        
        # Test invalid values
        assert self.cleaner.get_camera_count(None, None) is None
    
    def test_normalize_camera_data(self):
        """Test camera data normalization."""
        df = self.sample_data.copy()
        result = self.cleaner.normalize_camera_data(df)
        
        # Check primary camera MP extraction
        assert 'primary_camera_mp' in result.columns
        assert result['primary_camera_mp'].iloc[0] == 50.0  # From '50+12+10MP'
        assert result['primary_camera_mp'].iloc[1] == 48.0  # From '48MP'
        
        # Check selfie camera MP extraction
        assert 'selfie_camera_mp' in result.columns
        assert result['selfie_camera_mp'].iloc[0] == 12.0
        assert result['selfie_camera_mp'].iloc[2] == 32.0
        
        # Check camera count
        assert 'camera_count' in result.columns
        assert result['camera_count'].iloc[0] == 3  # From '50+12+10MP'
        assert result['camera_count'].iloc[1] == 1  # From '48MP'
    
    def test_extract_wattage(self):
        """Test charging wattage extraction."""
        assert self.cleaner.extract_wattage('25W') == 25.0
        assert self.cleaner.extract_wattage('90W fast charging') == 90.0
        assert self.cleaner.extract_wattage('120W') == 120.0
        assert self.cleaner.extract_wattage('No fast charging') is None
        assert self.cleaner.extract_wattage(None) is None
    
    def test_clean_battery_data(self):
        """Test battery data cleaning."""
        df = self.sample_data.copy()
        result = self.cleaner.clean_battery_data(df)
        
        # Check battery capacity extraction
        assert 'battery_capacity_numeric' in result.columns
        assert result['battery_capacity_numeric'].iloc[0] == 4000.0
        assert result['battery_capacity_numeric'].iloc[1] == 3274.0
        
        # Check fast charging detection
        assert 'has_fast_charging' in result.columns
        assert result['has_fast_charging'].iloc[0] == True
        
        # Check charging wattage extraction
        assert 'charging_wattage' in result.columns
        assert result['charging_wattage'].iloc[0] == 25.0
        assert result['charging_wattage'].iloc[2] == 90.0
    
    def test_generate_slugs(self):
        """Test slug generation."""
        df = pd.DataFrame({
            'name': ['Samsung Galaxy S24', 'iPhone 15 Pro', 'Xiaomi 14 Ultra']
        })
        
        # Test the actual slug generation (uses fallback since slugify not available)
        result = self.cleaner.generate_slugs(df)
        
        assert 'slug' in result.columns
        assert result['slug'].iloc[0] == 'samsung-galaxy-s24'
        assert result['slug'].iloc[1] == 'iphone-15-pro'
        assert result['slug'].iloc[2] == 'xiaomi-14-ultra'
    
    def test_generate_slugs_fallback(self):
        """Test slug generation fallback without slugify library."""
        df = pd.DataFrame({
            'name': ['Samsung Galaxy S24!', 'iPhone 15 Pro (Max)', 'Test@Phone#123']
        })
        
        # Test fallback slug creation
        assert self.cleaner._create_simple_slug('Samsung Galaxy S24!') == 'samsung-galaxy-s24'
        assert self.cleaner._create_simple_slug('iPhone 15 Pro (Max)') == 'iphone-15-pro-max'
        assert self.cleaner._create_simple_slug('Test@Phone#123') == 'test-phone-123'
        assert self.cleaner._create_simple_slug(None) is None
    
    def test_clean_dataframe_integration(self):
        """Test the complete data cleaning pipeline."""
        df = self.sample_data.copy()
        cleaned_df, issues = self.cleaner.clean_dataframe(df)
        
        # Check that all cleaning steps were applied
        assert 'price_original' in cleaned_df.columns
        assert 'price_category' in cleaned_df.columns
        assert 'screen_size_numeric' in cleaned_df.columns
        assert 'primary_camera_mp' in cleaned_df.columns
        assert 'battery_capacity_numeric' in cleaned_df.columns
        assert 'slug' in cleaned_df.columns
        
        # Check that data types are handled
        assert cleaned_df['price_original'].dtype in [np.float64, float]
        assert cleaned_df['screen_size_numeric'].dtype in [np.float64, float]
        
        # Check that issues list is returned
        assert isinstance(issues, list)
    
    def test_get_data_quality_metrics(self):
        """Test data quality metrics calculation."""
        df = pd.DataFrame({
            'col1': [1, 2, None, 4],
            'col2': [1, None, None, 4],
            'col3': [1, 2, 3, 4]
        })
        
        metrics = self.cleaner.get_data_quality_metrics(df)
        
        assert 'total_records' in metrics
        assert 'total_columns' in metrics
        assert 'field_completeness' in metrics
        assert 'overall_completeness' in metrics
        
        assert metrics['total_records'] == 4
        assert metrics['total_columns'] == 3
        assert metrics['field_completeness']['col1'] == 0.75  # 3/4
        assert metrics['field_completeness']['col2'] == 0.5   # 2/4
        assert metrics['field_completeness']['col3'] == 1.0   # 4/4
        assert metrics['overall_completeness'] == 0.75  # Average of 0.75, 0.5, 1.0


if __name__ == '__main__':
    pytest.main([__file__])