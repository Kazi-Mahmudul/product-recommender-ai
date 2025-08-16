"""
Unit tests for Enhanced Feature Engineer Service.
"""

import pytest
import pandas as pd
import numpy as np
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add the processor services to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'processor'))

from feature_engineer import FeatureEngineer


class TestFeatureEngineer:
    """Test cases for FeatureEngineer class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.engineer = FeatureEngineer()
        
        # Sample test data with all necessary columns
        self.sample_data = pd.DataFrame({
            'name': ['Samsung Galaxy S24', 'iPhone 15 Pro', 'Xiaomi 14'],
            'brand': ['Samsung', 'Apple', 'Xiaomi'],
            'price_original': [85000.0, 120000.0, 75000.0],
            'main_camera': ['50+12+10MP', '48MP', '50+50+50MP'],
            'front_camera': ['12MP', '12MP', '32MP'],
            'ram': ['8GB', '8 GB', '12GB'],
            'internal_storage': ['128GB', '256 GB', '256GB'],
            'capacity': ['4000mAh', '3274mAh', '4610mAh'],
            'quick_charging': ['25W', '20W', '90W'],
            'screen_size_inches': ['6.2"', '6.1 inches', '6.36"'],
            'display_resolution': ['1080x2340', '1179x2556', '1200x2670'],
            'pixel_density_ppi': ['422 ppi', '460ppi', '460 PPI'],
            'refresh_rate_hz': ['120Hz', '120 Hz', '120Hz'],
            'chipset': ['Snapdragon 8 Gen 3', 'Apple A17 Pro', 'Snapdragon 8 Gen 2'],
            'network': ['5G', '5G', '5G'],
            'wlan': ['Wi-Fi 6', 'Wi-Fi 6E', 'Wi-Fi 7'],
            'bluetooth': ['5.3', '5.3', '5.4'],
            'nfc': ['Yes', 'Yes', 'Yes'],
            'fingerprint_sensor': ['Ultrasonic', 'None', 'Optical'],
            'release_date': ['2024-01-15', '2023-09-15', '2024-02-20'],
            'status': ['Available', 'Available', 'Available']
        })
        
        # Mock processor rankings data
        self.mock_proc_df = pd.DataFrame({
            'rank': [1, 2, 3],
            'processor': ['Apple A17 Pro', 'Snapdragon 8 Gen 3', 'Snapdragon 8 Gen 2'],
            'processor_key': ['apple a17 pro', 'snapdragon 8 gen 3', 'snapdragon 8 gen 2']
        })
    
    def test_create_price_features(self):
        """Test price feature creation."""
        df = self.sample_data.copy()
        result = self.engineer.create_price_features(df)
        
        # Check storage and RAM conversion
        assert 'storage_gb' in result.columns
        assert 'ram_gb' in result.columns
        assert result['storage_gb'].iloc[0] == 128.0
        assert result['ram_gb'].iloc[0] == 8.0
        
        # Check price per GB calculations
        assert 'price_per_gb' in result.columns
        assert 'price_per_gb_ram' in result.columns
        assert result['price_per_gb'].iloc[0] == round(85000.0 / 128.0, 2)
        assert result['price_per_gb_ram'].iloc[0] == round(85000.0 / 8.0, 2)
    
    def test_create_display_features(self):
        """Test display feature creation."""
        df = self.sample_data.copy()
        result = self.engineer.create_display_features(df)
        
        # Check numeric conversions
        assert 'screen_size_numeric' in result.columns
        assert 'resolution_width' in result.columns
        assert 'resolution_height' in result.columns
        assert 'ppi_numeric' in result.columns
        assert 'refresh_rate_numeric' in result.columns
        
        assert result['screen_size_numeric'].iloc[0] == 6.2
        assert result['resolution_width'].iloc[0] == 1080.0
        assert result['resolution_height'].iloc[0] == 2340.0
        assert result['ppi_numeric'].iloc[0] == 422.0
        assert result['refresh_rate_numeric'].iloc[0] == 120.0
        
        # Check display score calculation
        assert 'display_score' in result.columns
        assert 0 <= result['display_score'].iloc[0] <= 100
    
    def test_get_display_score(self):
        """Test display score calculation logic."""
        # Test with known values
        phone = pd.Series({
            'display_resolution': '1080x2340',
            'pixel_density_ppi': '422 ppi',
            'refresh_rate_hz': '120Hz'
        })
        
        score = self.engineer.get_display_score(phone)
        assert isinstance(score, float)
        assert 0 <= score <= 100
        
        # Test with missing values
        phone_missing = pd.Series({
            'display_resolution': None,
            'pixel_density_ppi': None,
            'refresh_rate_hz': None
        })
        
        score_missing = self.engineer.get_display_score(phone_missing)
        assert score_missing == 0.0
    
    def test_create_camera_features(self):
        """Test camera feature creation."""
        df = self.sample_data.copy()
        result = self.engineer.create_camera_features(df)
        
        # Check camera MP extraction
        assert 'primary_camera_mp' in result.columns
        assert 'selfie_camera_mp' in result.columns
        assert result['primary_camera_mp'].iloc[0] == 50.0  # From '50+12+10MP'
        assert result['selfie_camera_mp'].iloc[0] == 12.0
        
        # Check camera count
        assert 'camera_count' in result.columns
        assert result['camera_count'].iloc[0] == 3  # From '50+12+10MP'
        assert result['camera_count'].iloc[1] == 1  # From '48MP'
        
        # Check camera score
        assert 'camera_score' in result.columns
        assert 0 <= result['camera_score'].iloc[0] <= 100
    
    def test_get_camera_score(self):
        """Test camera score calculation logic."""
        # Test with all camera features
        phone = pd.Series({
            'camera_count': 3,
            'primary_camera_mp': 50.0,
            'selfie_camera_mp': 12.0
        })
        
        score = self.engineer.get_camera_score(phone)
        assert isinstance(score, float)
        assert 0 <= score <= 100
        
        # Test calculation components
        expected_score = (
            (min(3, 4) / 4 * 100) * 0.20 +  # Camera count score
            (min(50.0 / 200 * 100, 100)) * 0.50 +  # Primary camera score
            (min(12.0 / 64 * 100, 100)) * 0.30  # Selfie camera score
        )
        assert abs(score - expected_score) < 0.1
    
    def test_create_battery_features(self):
        """Test battery feature creation."""
        df = self.sample_data.copy()
        result = self.engineer.create_battery_features(df)
        
        # Check battery capacity extraction
        assert 'battery_capacity_numeric' in result.columns
        assert result['battery_capacity_numeric'].iloc[0] == 4000.0
        
        # Check charging features
        assert 'has_fast_charging' in result.columns
        assert 'has_wireless_charging' in result.columns
        assert 'charging_wattage' in result.columns
        
        assert result['charging_wattage'].iloc[0] == 25.0
        assert result['charging_wattage'].iloc[2] == 90.0
        
        # Check battery score
        assert 'battery_score' in result.columns
        assert 0 <= result['battery_score'].iloc[0] <= 100
    
    def test_get_battery_score_percentile(self):
        """Test battery score calculation logic."""
        phone = pd.Series({
            'battery_capacity_numeric': 4000.0,
            'charging_wattage': 25.0
        })
        
        score = self.engineer.get_battery_score_percentile(phone)
        assert isinstance(score, float)
        assert 0 <= score <= 100
        
        # Test calculation
        expected_score = (
            min(4000.0/6000*100, 100) * 0.7 +  # Capacity score
            min(25.0/120*100, 100) * 0.3  # Charging speed score
        )
        assert abs(score - expected_score) < 0.1
    
    def test_calculate_performance_score(self):
        """Test performance score calculation."""
        phone = pd.Series({
            'chipset': 'Snapdragon 8 Gen 3',
            'ram_gb': 8.0,
            'internal_storage': '128GB UFS 3.1'
        })
        
        # Mock processor rankings service
        with patch.object(self.engineer.processor_rankings_service, 'get_processor_rank') as mock_rank:
            mock_rank.return_value = 2  # Rank 2 out of 300
            
            score = self.engineer.calculate_performance_score(phone, self.mock_proc_df)
            assert isinstance(score, float)
            assert 0 <= score <= 100
            
            # Should be high score for good processor and RAM
            assert score > 80
    
    def test_calculate_connectivity_score(self):
        """Test connectivity score calculation."""
        phone = pd.Series({
            'network': '5G',
            'wlan': 'Wi-Fi 6',
            'bluetooth': '5.3',
            'nfc': 'Yes'
        })
        
        score = self.engineer.calculate_connectivity_score(phone)
        assert isinstance(score, float)
        assert 0 <= score <= 100
        
        # Should include 5G (40), Wi-Fi 6 (24), NFC (15), Bluetooth 5.3 (11.5)
        expected_min = 40 + 24 + 15 + 5  # Conservative estimate
        assert score >= expected_min
    
    def test_calculate_security_score(self):
        """Test security score calculation."""
        # Test with ultrasonic fingerprint
        phone_ultrasonic = pd.Series({
            'finger_sensor_type': 'Ultrasonic',
            'face_unlock': 'Yes'
        })
        
        score_ultrasonic = self.engineer.calculate_security_score(phone_ultrasonic)
        assert score_ultrasonic >= 70  # Base 30 + Ultrasonic 40
        
        # Test with optical fingerprint
        phone_optical = pd.Series({
            'finger_sensor_type': 'Optical'
        })
        
        score_optical = self.engineer.calculate_security_score(phone_optical)
        assert score_optical >= 55  # Base 30 + Optical 25
    
    def test_create_brand_features(self):
        """Test brand feature creation."""
        df = self.sample_data.copy()
        result = self.engineer.create_brand_features(df)
        
        assert 'is_popular_brand' in result.columns
        assert result['is_popular_brand'].iloc[0] == True   # Samsung
        assert result['is_popular_brand'].iloc[1] == True   # Apple
        assert result['is_popular_brand'].iloc[2] == True   # Xiaomi
    
    def test_create_release_features(self):
        """Test release feature creation."""
        df = self.sample_data.copy()
        result = self.engineer.create_release_features(df)
        
        assert 'release_date_clean' in result.columns
        assert 'is_new_release' in result.columns
        assert 'age_in_months' in result.columns
        assert 'is_upcoming' in result.columns
        
        # Check date parsing
        assert pd.notna(result['release_date_clean'].iloc[0])
        
        # Check age calculation (should be positive)
        assert result['age_in_months'].iloc[0] >= 0
    
    def test_create_composite_features(self):
        """Test composite feature creation."""
        df = pd.DataFrame({
            'performance_score': [85.0, 90.0, 80.0],
            'display_score': [75.0, 85.0, 70.0],
            'camera_score': [80.0, 85.0, 90.0],
            'battery_score': [70.0, 65.0, 85.0],
            'connectivity_score': [85.0, 90.0, 80.0]
        })
        
        result = self.engineer.create_composite_features(df)
        
        assert 'overall_device_score' in result.columns
        
        # Check calculation (weighted average)
        expected_score = (
            85.0 * 0.35 +  # Performance
            75.0 * 0.20 +  # Display
            80.0 * 0.20 +  # Camera
            70.0 * 0.15 +  # Battery
            85.0 * 0.10    # Connectivity
        )
        assert abs(result['overall_device_score'].iloc[0] - expected_score) < 0.1
    
    @patch('feature_engineer.ProcessorRankingsService')
    def test_engineer_features_integration(self, mock_rankings_service):
        """Test the complete feature engineering pipeline."""
        # Mock the processor rankings service
        mock_service_instance = Mock()
        mock_service_instance.get_or_refresh_rankings.return_value = self.mock_proc_df
        mock_service_instance.get_processor_rank.return_value = 2  # Return a valid rank
        mock_rankings_service.return_value = mock_service_instance
        
        # Create new engineer with mocked service
        engineer = FeatureEngineer()
        engineer.processor_rankings_service = mock_service_instance
        
        df = self.sample_data.copy()
        result = engineer.engineer_features(df)
        
        # Check that all feature categories were created
        expected_columns = [
            'storage_gb', 'ram_gb', 'price_per_gb',
            'screen_size_numeric', 'resolution_width', 'display_score',
            'primary_camera_mp', 'camera_count', 'camera_score',
            'battery_capacity_numeric', 'charging_wattage', 'battery_score',
            'performance_score', 'connectivity_score', 'security_score',
            'is_popular_brand', 'release_date_clean', 'overall_device_score'
        ]
        
        for col in expected_columns:
            assert col in result.columns, f"Missing column: {col}"
        
        # Check that scores are within valid range
        score_columns = [
            'display_score', 'camera_score', 'battery_score',
            'performance_score', 'connectivity_score', 'security_score',
            'overall_device_score'
        ]
        
        for col in score_columns:
            assert result[col].min() >= 0, f"{col} has values below 0"
            assert result[col].max() <= 100, f"{col} has values above 100"
    
    def test_extract_wattage(self):
        """Test wattage extraction method."""
        assert self.engineer.extract_wattage('25W') == 25.0
        assert self.engineer.extract_wattage('90W fast charging') == 90.0
        assert self.engineer.extract_wattage('120W SuperVOOC') == 120.0
        assert self.engineer.extract_wattage('No fast charging') is None
        assert self.engineer.extract_wattage(None) is None
        assert self.engineer.extract_wattage('') is None
    
    def test_helper_methods(self):
        """Test helper methods for display metrics."""
        # Test resolution extraction
        assert self.engineer._extract_resolution_wh('1080x2340') == (1080, 2340)
        assert self.engineer._extract_resolution_wh('1179 x 2556') == (1179, 2556)
        assert self.engineer._extract_resolution_wh(None) is None
        
        # Test PPI extraction
        assert self.engineer._extract_ppi('422 ppi') == 422.0
        assert self.engineer._extract_ppi('460ppi') == 460.0
        assert self.engineer._extract_ppi(None) is None
        
        # Test refresh rate extraction
        assert self.engineer._extract_refresh_rate('120Hz') == 120.0
        assert self.engineer._extract_refresh_rate('90 Hz') == 90.0
        assert self.engineer._extract_refresh_rate(None) is None


if __name__ == '__main__':
    pytest.main([__file__])