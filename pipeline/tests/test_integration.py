"""
Integration tests for the complete transformation pipeline.
"""

import pytest
import pandas as pd
import numpy as np
from unittest.mock import Mock, patch, MagicMock
import sys
import os
import tempfile
import sqlite3

# Add the processor services to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'processor'))

from data_cleaner import DataCleaner
from feature_engineer import FeatureEngineer
from data_quality_validator import DataQualityValidator
from database_updater import DatabaseUpdater


class TestPipelineIntegration:
    """Integration tests for the complete pipeline."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Real sample data from MobileDokan format
        self.real_sample_data = pd.DataFrame({
            'name': [
                'Samsung Galaxy S24 Ultra',
                'iPhone 15 Pro Max',
                'Xiaomi 14 Ultra',
                'OnePlus 12',
                'Google Pixel 8 Pro'
            ],
            'brand': ['Samsung', 'Apple', 'Xiaomi', 'OnePlus', 'Google'],
            'price': ['৳.135,000', '?.180,000', '৳95,000', '৳85,000', '৳110,000'],
            'url': [
                'https://www.mobiledokan.com/mobile/samsung-galaxy-s24-ultra',
                'https://www.mobiledokan.com/mobile/iphone-15-pro-max',
                'https://www.mobiledokan.com/mobile/xiaomi-14-ultra',
                'https://www.mobiledokan.com/mobile/oneplus-12',
                'https://www.mobiledokan.com/mobile/google-pixel-8-pro'
            ],
            'main_camera': ['200+50+12+10MP', '48+12+12MP', '50+50+50+50MP', '50+64+48MP', '50+48+48MP'],
            'front_camera': ['12MP', '12MP', '32MP', '32MP', '10.5MP'],
            'ram': ['12GB', '8GB', '16GB', '12GB', '12GB'],
            'internal_storage': ['256GB', '256GB', '512GB', '256GB', '128GB'],
            'capacity': ['5000mAh', '4441mAh', '5300mAh', '5400mAh', '5050mAh'],
            'quick_charging': ['45W', '27W', '90W', '100W', '30W'],
            'wireless_charging': ['15W', '15W', '50W', '50W', '23W'],
            'screen_size_inches': ['6.8"', '6.7"', '6.73"', '6.82"', '6.7"'],
            'display_resolution': ['1440x3120', '1290x2796', '1440x3200', '1440x3168', '1344x2992'],
            'pixel_density_ppi': ['501 ppi', '460 ppi', '522 ppi', '510 ppi', '489 ppi'],
            'refresh_rate_hz': ['120Hz', '120Hz', '120Hz', '120Hz', '120Hz'],
            'chipset': ['Snapdragon 8 Gen 3', 'Apple A17 Pro', 'Snapdragon 8 Gen 3', 'Snapdragon 8 Gen 3', 'Google Tensor G3'],
            'operating_system': ['Android 14', 'iOS 17', 'Android 14', 'Android 14', 'Android 14'],
            'network': ['5G', '5G', '5G', '5G', '5G'],
            'wlan': ['Wi-Fi 7', 'Wi-Fi 6E', 'Wi-Fi 7', 'Wi-Fi 7', 'Wi-Fi 6E'],
            'bluetooth': ['5.3', '5.3', '5.4', '5.3', '5.3'],
            'nfc': ['Yes', 'Yes', 'Yes', 'Yes', 'Yes'],
            'fingerprint_sensor': ['Ultrasonic', 'None', 'Optical', 'Optical', 'Optical'],
            'face_unlock': ['Yes', 'Face ID', 'Yes', 'Yes', 'Yes'],
            'release_date': ['2024-01-24', '2023-09-22', '2024-02-25', '2024-01-23', '2023-10-12'],
            'status': ['Available', 'Available', 'Available', 'Available', 'Available'],
            'camera_setup': ['Quad', 'Triple', 'Quad', 'Triple', 'Triple']
        })
        
        # Mock processor rankings
        self.mock_proc_df = pd.DataFrame({
            'rank': [1, 2, 3, 4, 5],
            'processor': ['Apple A17 Pro', 'Snapdragon 8 Gen 3', 'Google Tensor G3', 'Snapdragon 8 Gen 2', 'Dimensity 9300'],
            'processor_key': ['apple a17 pro', 'snapdragon 8 gen 3', 'google tensor g3', 'snapdragon 8 gen 2', 'dimensity 9300'],
            'rating': [95.5, 94.2, 88.5, 92.1, 91.8],
            'company': ['Apple', 'Qualcomm', 'Google', 'Qualcomm', 'MediaTek']
        })
    
    def test_complete_pipeline_flow(self):
        """Test the complete pipeline from raw data to final features."""
        # Step 1: Data Cleaning
        cleaner = DataCleaner()
        cleaned_df, cleaning_issues = cleaner.clean_dataframe(self.real_sample_data.copy())
        
        # Verify cleaning worked
        assert 'price_original' in cleaned_df.columns
        assert 'primary_camera_mp' in cleaned_df.columns
        assert 'battery_capacity_numeric' in cleaned_df.columns
        assert len(cleaning_issues) >= 0  # May have some issues, that's ok
        
        # Step 2: Feature Engineering
        with patch('feature_engineer.ProcessorRankingsService') as mock_rankings_service:
            mock_service_instance = Mock()
            mock_service_instance.get_or_refresh_rankings.return_value = self.mock_proc_df
            mock_rankings_service.return_value = mock_service_instance
            
            engineer = FeatureEngineer()
            engineer.processor_rankings_service = mock_service_instance
            
            processed_df = engineer.engineer_features(cleaned_df)
        
        # Verify feature engineering worked
        expected_features = [
            'storage_gb', 'ram_gb', 'price_per_gb', 'screen_size_numeric',
            'display_score', 'camera_score', 'battery_score', 'performance_score',
            'connectivity_score', 'security_score', 'overall_device_score',
            'is_popular_brand', 'slug'
        ]
        
        for feature in expected_features:
            assert feature in processed_df.columns, f"Missing feature: {feature}"
        
        # Step 3: Data Quality Validation
        validator = DataQualityValidator()
        validation_passed, quality_report = validator.validate_pipeline_data(processed_df)
        
        # Verify validation
        assert isinstance(validation_passed, bool)
        assert 'overall_quality_score' in quality_report
        assert 'completeness' in quality_report
        assert quality_report['total_records'] == len(processed_df)
        
        # Step 4: Verify data integrity
        self._verify_data_integrity(processed_df)
        
        return processed_df, quality_report
    
    def _verify_data_integrity(self, df):
        """Verify the integrity of processed data."""
        # Check that scores are within valid ranges
        score_columns = [
            'display_score', 'camera_score', 'battery_score',
            'performance_score', 'connectivity_score', 'security_score',
            'overall_device_score'
        ]
        
        for col in score_columns:
            if col in df.columns:
                valid_scores = df[col].dropna()
                if len(valid_scores) > 0:
                    assert valid_scores.min() >= 0, f"{col} has negative values"
                    assert valid_scores.max() <= 100, f"{col} has values > 100"
        
        # Check that numeric conversions worked
        if 'price_original' in df.columns:
            prices = df['price_original'].dropna()
            assert len(prices) > 0, "No prices were extracted"
            assert prices.min() > 0, "Invalid price values"
        
        if 'ram_gb' in df.columns:
            ram_values = df['ram_gb'].dropna()
            assert len(ram_values) > 0, "No RAM values were extracted"
            assert ram_values.min() > 0, "Invalid RAM values"
        
        # Check that camera features are reasonable
        if 'primary_camera_mp' in df.columns:
            camera_mp = df['primary_camera_mp'].dropna()
            if len(camera_mp) > 0:
                assert camera_mp.min() > 0, "Invalid camera MP values"
                assert camera_mp.max() <= 300, "Unrealistic camera MP values"
    
    @patch('database_updater.psycopg2')
    def test_database_integration(self, mock_psycopg2):
        """Test database integration with mocked database."""
        # Setup mock database connection
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor
        mock_psycopg2.connect.return_value = mock_conn
        
        # Mock database schema query
        mock_cursor.fetchall.return_value = [
            ('id',), ('name',), ('brand',), ('price_original',), ('overall_device_score',),
            ('display_score',), ('camera_score',), ('battery_score',), ('url',)
        ]
        
        # Process data first
        processed_df, _ = self.test_complete_pipeline_flow()
        
        # Test database update
        updater = DatabaseUpdater()
        success, results = updater.update_with_transaction(processed_df, 'test_run_123')
        
        # Verify database operations were called
        assert mock_psycopg2.connect.called
        assert mock_conn.cursor.called
        assert isinstance(results, dict)
        assert 'success' in results
    
    def test_error_handling_and_recovery(self):
        """Test error handling and recovery mechanisms."""
        # Test with problematic data
        problematic_data = pd.DataFrame({
            'name': ['Test Phone', None, ''],
            'price': ['invalid_price', '৳.50,000', None],
            'main_camera': ['invalid_camera', '48MP', None],
            'ram': ['invalid_ram', '8GB', None],
            'internal_storage': ['invalid_storage', '128GB', None]
        })
        
        # Data cleaning should handle errors gracefully
        cleaner = DataCleaner()
        cleaned_df, issues = cleaner.clean_dataframe(problematic_data)
        
        # Should not crash and should report issues
        assert len(cleaned_df) > 0
        assert len(issues) >= 0  # May have issues
        
        # Feature engineering should handle missing data
        with patch('feature_engineer.ProcessorRankingsService') as mock_rankings_service:
            mock_service_instance = Mock()
            mock_service_instance.get_or_refresh_rankings.return_value = self.mock_proc_df
            mock_rankings_service.return_value = mock_service_instance
            
            engineer = FeatureEngineer()
            engineer.processor_rankings_service = mock_service_instance
            
            # Should not crash with problematic data
            processed_df = engineer.engineer_features(cleaned_df)
            assert len(processed_df) > 0
    
    def test_performance_with_large_dataset(self):
        """Test pipeline performance with larger dataset."""
        # Create larger dataset by replicating sample data
        large_data = pd.concat([self.real_sample_data] * 20, ignore_index=True)
        
        # Add some variation to avoid exact duplicates
        for i in range(len(large_data)):
            large_data.loc[i, 'url'] = f"{large_data.loc[i, 'url']}-{i}"
            large_data.loc[i, 'name'] = f"{large_data.loc[i, 'name']} Variant {i}"
        
        import time
        start_time = time.time()
        
        # Process the large dataset
        cleaner = DataCleaner()
        cleaned_df, _ = cleaner.clean_dataframe(large_data)
        
        with patch('feature_engineer.ProcessorRankingsService') as mock_rankings_service:
            mock_service_instance = Mock()
            mock_service_instance.get_or_refresh_rankings.return_value = self.mock_proc_df
            mock_rankings_service.return_value = mock_service_instance
            
            engineer = FeatureEngineer()
            engineer.processor_rankings_service = mock_service_instance
            
            processed_df = engineer.engineer_features(cleaned_df)
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        # Should process reasonably quickly (less than 30 seconds for 100 records)
        assert processing_time < 30, f"Processing took too long: {processing_time} seconds"
        assert len(processed_df) == len(large_data)
        
        # Verify all expected features are present
        expected_features = [
            'price_original', 'overall_device_score', 'display_score',
            'camera_score', 'battery_score', 'performance_score'
        ]
        
        for feature in expected_features:
            assert feature in processed_df.columns
    
    def test_data_quality_validation_comprehensive(self):
        """Test comprehensive data quality validation."""
        # Process sample data
        processed_df, quality_report = self.test_complete_pipeline_flow()
        
        # Detailed quality checks
        assert quality_report['total_records'] > 0
        assert quality_report['total_columns'] > 0
        assert 0 <= quality_report['overall_quality_score'] <= 100
        
        # Check completeness metrics
        completeness = quality_report['completeness']
        assert 'field_completeness' in completeness
        assert 'overall_completeness' in completeness
        assert 0 <= completeness['overall_completeness'] <= 1
        
        # Check validation issues
        validation_issues = quality_report['validation_issues']
        assert 'field_issues' in validation_issues
        assert 'range_issues' in validation_issues
        assert isinstance(validation_issues['field_issues'], list)
        assert isinstance(validation_issues['range_issues'], list)
        
        # Check anomalies
        anomalies = quality_report['anomalies']
        assert 'outliers' in anomalies
        assert 'suspicious_values' in anomalies
        assert 'duplicate_names' in anomalies
    
    def test_processor_rankings_integration(self):
        """Test processor rankings integration."""
        with patch('feature_engineer.ProcessorRankingsService') as mock_rankings_service:
            mock_service_instance = Mock()
            mock_service_instance.get_or_refresh_rankings.return_value = self.mock_proc_df
            mock_service_instance.get_processor_rank.side_effect = lambda df, name: {
                'Apple A17 Pro': 1,
                'Snapdragon 8 Gen 3': 2,
                'Google Tensor G3': 3
            }.get(name, None)
            mock_rankings_service.return_value = mock_service_instance
            
            engineer = FeatureEngineer()
            engineer.processor_rankings_service = mock_service_instance
            
            # Test performance score calculation
            phone = pd.Series({
                'chipset': 'Apple A17 Pro',
                'ram_gb': 8.0,
                'internal_storage': '256GB UFS 4.0'
            })
            
            score = engineer.calculate_performance_score(phone, self.mock_proc_df)
            
            # Should get high score for top-tier processor
            assert score > 85, f"Expected high performance score, got {score}"
            assert score <= 100
    
    def test_end_to_end_with_real_mobiledokan_format(self):
        """Test end-to-end pipeline with real MobileDokan data format."""
        # This test uses the exact format that comes from MobileDokan scraper
        mobiledokan_format = pd.DataFrame({
            'name': ['Samsung Galaxy S24 Ultra 5G'],
            'brand': ['Samsung'],
            'model': ['Galaxy S24 Ultra 5G'],
            'price': ['৳.1,35,000'],
            'url': ['https://www.mobiledokan.com/mobile/samsung-galaxy-s24-ultra-5g'],
            'img_url': ['https://www.mobiledokan.com/images/samsung-galaxy-s24-ultra.jpg'],
            'main_camera': ['200+50+12+10MP'],
            'front_camera': ['12MP'],
            'ram': ['12GB'],
            'internal_storage': ['256GB'],
            'capacity': ['5000mAh'],
            'quick_charging': ['45W'],
            'wireless_charging': ['15W'],
            'screen_size_inches': ['6.8"'],
            'display_resolution': ['1440x3120'],
            'pixel_density_ppi': ['501 ppi'],
            'refresh_rate_hz': ['120Hz'],
            'chipset': ['Snapdragon 8 Gen 3'],
            'operating_system': ['Android 14'],
            'network': ['5G'],
            'wlan': ['Wi-Fi 7'],
            'bluetooth': ['5.3'],
            'nfc': ['Yes'],
            'fingerprint_sensor': ['Ultrasonic'],
            'release_date': ['2024-01-24'],
            'status': ['Available'],
            'scraped_at': ['2024-01-25 10:30:00'],
            'data_source': ['MobileDokan'],
            'is_pipeline_managed': [True]
        })
        
        # Run complete pipeline
        processed_df, quality_report = self._run_complete_pipeline(mobiledokan_format)
        
        # Verify specific transformations for MobileDokan format
        assert processed_df['price_original'].iloc[0] == 135000.0
        assert processed_df['primary_camera_mp'].iloc[0] == 200.0
        assert processed_df['camera_count'].iloc[0] == 4
        assert processed_df['ram_gb'].iloc[0] == 12.0
        assert processed_df['storage_gb'].iloc[0] == 256.0
        assert processed_df['battery_capacity_numeric'].iloc[0] == 5000.0
        assert processed_df['charging_wattage'].iloc[0] == 45.0
        
        # Verify scores are calculated
        assert 0 <= processed_df['overall_device_score'].iloc[0] <= 100
        assert processed_df['is_popular_brand'].iloc[0] == True
        assert processed_df['slug'].iloc[0] is not None
    
    def _run_complete_pipeline(self, data):
        """Helper method to run complete pipeline."""
        # Step 1: Clean data
        cleaner = DataCleaner()
        cleaned_df, _ = cleaner.clean_dataframe(data.copy())
        
        # Step 2: Engineer features
        with patch('feature_engineer.ProcessorRankingsService') as mock_rankings_service:
            mock_service_instance = Mock()
            mock_service_instance.get_or_refresh_rankings.return_value = self.mock_proc_df
            mock_rankings_service.return_value = mock_service_instance
            
            engineer = FeatureEngineer()
            engineer.processor_rankings_service = mock_service_instance
            
            processed_df = engineer.engineer_features(cleaned_df)
        
        # Step 3: Validate quality
        validator = DataQualityValidator()
        validation_passed, quality_report = validator.validate_pipeline_data(processed_df)
        
        return processed_df, quality_report


if __name__ == '__main__':
    pytest.main([__file__])