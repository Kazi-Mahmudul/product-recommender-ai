"""
Performance and load tests for the transformation pipeline.
"""

import pytest
import pandas as pd
import numpy as np
import time
import psutil
import os
from unittest.mock import Mock, patch
import sys

# Add the processor services to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'processor'))

from data_cleaner import DataCleaner
from feature_engineer import FeatureEngineer
from data_quality_validator import DataQualityValidator


class TestPerformance:
    """Performance and load tests for the pipeline."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Base sample data for scaling
        self.base_data = pd.DataFrame({
            'name': ['Samsung Galaxy S24', 'iPhone 15 Pro', 'Xiaomi 14'],
            'brand': ['Samsung', 'Apple', 'Xiaomi'],
            'price': ['৳.85,000', '?.120,000', '৳75,000'],
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
            'url': [
                'https://example.com/phone1',
                'https://example.com/phone2', 
                'https://example.com/phone3'
            ]
        })
        
        # Mock processor rankings
        self.mock_proc_df = pd.DataFrame({
            'rank': [1, 2, 3],
            'processor': ['Apple A17 Pro', 'Snapdragon 8 Gen 3', 'Snapdragon 8 Gen 2'],
            'processor_key': ['apple a17 pro', 'snapdragon 8 gen 3', 'snapdragon 8 gen 2']
        })
    
    def create_large_dataset(self, size: int) -> pd.DataFrame:
        """Create a large dataset by replicating and varying base data."""
        # Calculate how many times to replicate
        replications = (size // len(self.base_data)) + 1
        
        # Replicate the base data
        large_df = pd.concat([self.base_data] * replications, ignore_index=True)
        
        # Add variations to avoid exact duplicates
        for i in range(len(large_df)):
            large_df.loc[i, 'url'] = f"https://example.com/phone{i}"
            large_df.loc[i, 'name'] = f"{large_df.loc[i, 'name']} Variant {i}"
            
            # Add some price variation
            if 'price' in large_df.columns:
                base_price = 50000 + (i * 1000) % 100000
                large_df.loc[i, 'price'] = f'৳.{base_price:,}'
        
        # Trim to exact size
        return large_df.head(size)
    
    def measure_memory_usage(self):
        """Get current memory usage in MB."""
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / 1024 / 1024
    
    @pytest.mark.performance
    def test_data_cleaning_performance_100_records(self):
        """Test data cleaning performance with 100 records."""
        data = self.create_large_dataset(100)
        cleaner = DataCleaner()
        
        start_time = time.time()
        start_memory = self.measure_memory_usage()
        
        cleaned_df, issues = cleaner.clean_dataframe(data)
        
        end_time = time.time()
        end_memory = self.measure_memory_usage()
        
        execution_time = end_time - start_time
        memory_used = end_memory - start_memory
        
        # Performance assertions
        assert execution_time < 5.0, f"Data cleaning took too long: {execution_time:.2f}s"
        assert memory_used < 100, f"Memory usage too high: {memory_used:.2f}MB"
        assert len(cleaned_df) == 100
        
        print(f"Data cleaning (100 records): {execution_time:.2f}s, {memory_used:.2f}MB")
    
    @pytest.mark.performance
    def test_data_cleaning_performance_1000_records(self):
        """Test data cleaning performance with 1000 records."""
        data = self.create_large_dataset(1000)
        cleaner = DataCleaner()
        
        start_time = time.time()
        start_memory = self.measure_memory_usage()
        
        cleaned_df, issues = cleaner.clean_dataframe(data)
        
        end_time = time.time()
        end_memory = self.measure_memory_usage()
        
        execution_time = end_time - start_time
        memory_used = end_memory - start_memory
        
        # Performance assertions (more lenient for larger dataset)
        assert execution_time < 15.0, f"Data cleaning took too long: {execution_time:.2f}s"
        assert memory_used < 200, f"Memory usage too high: {memory_used:.2f}MB"
        assert len(cleaned_df) == 1000
        
        print(f"Data cleaning (1000 records): {execution_time:.2f}s, {memory_used:.2f}MB")
    
    @pytest.mark.performance
    def test_feature_engineering_performance_100_records(self):
        """Test feature engineering performance with 100 records."""
        data = self.create_large_dataset(100)
        
        # Clean data first
        cleaner = DataCleaner()
        cleaned_df, _ = cleaner.clean_dataframe(data)
        
        # Mock processor rankings service
        with patch('feature_engineer.ProcessorRankingsService') as mock_rankings_service:
            mock_service_instance = Mock()
            mock_service_instance.get_or_refresh_rankings.return_value = self.mock_proc_df
            mock_rankings_service.return_value = mock_service_instance
            
            engineer = FeatureEngineer()
            engineer.processor_rankings_service = mock_service_instance
            
            start_time = time.time()
            start_memory = self.measure_memory_usage()
            
            processed_df = engineer.engineer_features(cleaned_df)
            
            end_time = time.time()
            end_memory = self.measure_memory_usage()
        
        execution_time = end_time - start_time
        memory_used = end_memory - start_memory
        
        # Performance assertions
        assert execution_time < 10.0, f"Feature engineering took too long: {execution_time:.2f}s"
        assert memory_used < 150, f"Memory usage too high: {memory_used:.2f}MB"
        assert len(processed_df) == 100
        
        print(f"Feature engineering (100 records): {execution_time:.2f}s, {memory_used:.2f}MB")
    
    @pytest.mark.performance
    def test_feature_engineering_performance_1000_records(self):
        """Test feature engineering performance with 1000 records."""
        data = self.create_large_dataset(1000)
        
        # Clean data first
        cleaner = DataCleaner()
        cleaned_df, _ = cleaner.clean_dataframe(data)
        
        # Mock processor rankings service
        with patch('feature_engineer.ProcessorRankingsService') as mock_rankings_service:
            mock_service_instance = Mock()
            mock_service_instance.get_or_refresh_rankings.return_value = self.mock_proc_df
            mock_rankings_service.return_value = mock_service_instance
            
            engineer = FeatureEngineer()
            engineer.processor_rankings_service = mock_service_instance
            
            start_time = time.time()
            start_memory = self.measure_memory_usage()
            
            processed_df = engineer.engineer_features(cleaned_df)
            
            end_time = time.time()
            end_memory = self.measure_memory_usage()
        
        execution_time = end_time - start_time
        memory_used = end_memory - start_memory
        
        # Performance assertions (more lenient for larger dataset)
        assert execution_time < 30.0, f"Feature engineering took too long: {execution_time:.2f}s"
        assert memory_used < 300, f"Memory usage too high: {memory_used:.2f}MB"
        assert len(processed_df) == 1000
        
        print(f"Feature engineering (1000 records): {execution_time:.2f}s, {memory_used:.2f}MB")
    
    @pytest.mark.performance
    def test_data_quality_validation_performance(self):
        """Test data quality validation performance."""
        data = self.create_large_dataset(500)
        
        # Process data first
        cleaner = DataCleaner()
        cleaned_df, _ = cleaner.clean_dataframe(data)
        
        with patch('feature_engineer.ProcessorRankingsService') as mock_rankings_service:
            mock_service_instance = Mock()
            mock_service_instance.get_or_refresh_rankings.return_value = self.mock_proc_df
            mock_rankings_service.return_value = mock_service_instance
            
            engineer = FeatureEngineer()
            engineer.processor_rankings_service = mock_service_instance
            processed_df = engineer.engineer_features(cleaned_df)
        
        # Test validation performance
        validator = DataQualityValidator()
        
        start_time = time.time()
        start_memory = self.measure_memory_usage()
        
        validation_passed, quality_report = validator.validate_pipeline_data(processed_df)
        
        end_time = time.time()
        end_memory = self.measure_memory_usage()
        
        execution_time = end_time - start_time
        memory_used = end_memory - start_memory
        
        # Performance assertions
        assert execution_time < 5.0, f"Data validation took too long: {execution_time:.2f}s"
        assert memory_used < 50, f"Memory usage too high: {memory_used:.2f}MB"
        assert isinstance(validation_passed, bool)
        assert 'overall_quality_score' in quality_report
        
        print(f"Data validation (500 records): {execution_time:.2f}s, {memory_used:.2f}MB")
    
    @pytest.mark.performance
    def test_end_to_end_pipeline_performance(self):
        """Test complete end-to-end pipeline performance."""
        data = self.create_large_dataset(200)
        
        start_time = time.time()
        start_memory = self.measure_memory_usage()
        
        # Step 1: Data Cleaning
        cleaner = DataCleaner()
        cleaned_df, _ = cleaner.clean_dataframe(data)
        
        # Step 2: Feature Engineering
        with patch('feature_engineer.ProcessorRankingsService') as mock_rankings_service:
            mock_service_instance = Mock()
            mock_service_instance.get_or_refresh_rankings.return_value = self.mock_proc_df
            mock_rankings_service.return_value = mock_service_instance
            
            engineer = FeatureEngineer()
            engineer.processor_rankings_service = mock_service_instance
            processed_df = engineer.engineer_features(cleaned_df)
        
        # Step 3: Data Quality Validation
        validator = DataQualityValidator()
        validation_passed, quality_report = validator.validate_pipeline_data(processed_df)
        
        end_time = time.time()
        end_memory = self.measure_memory_usage()
        
        total_execution_time = end_time - start_time
        total_memory_used = end_memory - start_memory
        
        # Performance assertions for complete pipeline
        assert total_execution_time < 20.0, f"Complete pipeline took too long: {total_execution_time:.2f}s"
        assert total_memory_used < 250, f"Memory usage too high: {total_memory_used:.2f}MB"
        assert len(processed_df) == 200
        
        # Calculate throughput
        records_per_second = len(processed_df) / total_execution_time
        
        print(f"End-to-end pipeline (200 records): {total_execution_time:.2f}s, {total_memory_used:.2f}MB")
        print(f"Throughput: {records_per_second:.2f} records/second")
        
        # Minimum throughput requirement
        assert records_per_second >= 5.0, f"Throughput too low: {records_per_second:.2f} records/second"
    
    @pytest.mark.performance
    def test_memory_efficiency_with_chunked_processing(self):
        """Test memory efficiency with chunked processing simulation."""
        # Simulate processing large dataset in chunks
        chunk_size = 100
        total_records = 500
        
        start_memory = self.measure_memory_usage()
        max_memory_used = 0
        
        cleaner = DataCleaner()
        
        with patch('feature_engineer.ProcessorRankingsService') as mock_rankings_service:
            mock_service_instance = Mock()
            mock_service_instance.get_or_refresh_rankings.return_value = self.mock_proc_df
            mock_rankings_service.return_value = mock_service_instance
            
            engineer = FeatureEngineer()
            engineer.processor_rankings_service = mock_service_instance
            
            for i in range(0, total_records, chunk_size):
                # Create chunk
                chunk_data = self.create_large_dataset(min(chunk_size, total_records - i))
                
                # Process chunk
                cleaned_chunk, _ = cleaner.clean_dataframe(chunk_data)
                processed_chunk = engineer.engineer_features(cleaned_chunk)
                
                # Measure memory after processing chunk
                current_memory = self.measure_memory_usage()
                memory_used = current_memory - start_memory
                max_memory_used = max(max_memory_used, memory_used)
                
                # Simulate releasing chunk from memory
                del chunk_data, cleaned_chunk, processed_chunk
        
        # Memory should not grow excessively with chunked processing
        assert max_memory_used < 200, f"Max memory usage too high: {max_memory_used:.2f}MB"
        
        print(f"Chunked processing max memory usage: {max_memory_used:.2f}MB")
    
    @pytest.mark.performance
    def test_score_calculation_performance(self):
        """Test performance of individual score calculations."""
        data = self.create_large_dataset(1000)
        
        # Prepare data
        cleaner = DataCleaner()
        cleaned_df, _ = cleaner.clean_dataframe(data)
        
        with patch('feature_engineer.ProcessorRankingsService') as mock_rankings_service:
            mock_service_instance = Mock()
            mock_service_instance.get_or_refresh_rankings.return_value = self.mock_proc_df
            mock_rankings_service.return_value = mock_service_instance
            
            engineer = FeatureEngineer()
            engineer.processor_rankings_service = mock_service_instance
            
            # Test individual score calculation performance
            test_phone = cleaned_df.iloc[0]
            
            # Display score
            start_time = time.time()
            for _ in range(100):  # Run 100 times to measure
                engineer.get_display_score(test_phone)
            display_time = time.time() - start_time
            
            # Camera score
            start_time = time.time()
            for _ in range(100):
                engineer.get_camera_score(test_phone)
            camera_time = time.time() - start_time
            
            # Battery score
            start_time = time.time()
            for _ in range(100):
                engineer.get_battery_score_percentile(test_phone)
            battery_time = time.time() - start_time
            
            # Performance assertions (per calculation should be very fast)
            assert display_time < 0.1, f"Display score calculation too slow: {display_time:.4f}s for 100 calls"
            assert camera_time < 0.1, f"Camera score calculation too slow: {camera_time:.4f}s for 100 calls"
            assert battery_time < 0.1, f"Battery score calculation too slow: {battery_time:.4f}s for 100 calls"
            
            print(f"Score calculation performance (100 calls each):")
            print(f"  Display: {display_time:.4f}s")
            print(f"  Camera: {camera_time:.4f}s")
            print(f"  Battery: {battery_time:.4f}s")
    
    @pytest.mark.performance
    def test_concurrent_processing_simulation(self):
        """Test performance under simulated concurrent processing."""
        import threading
        import queue
        
        # Create multiple datasets
        datasets = [self.create_large_dataset(50) for _ in range(4)]
        results_queue = queue.Queue()
        
        def process_dataset(data, thread_id):
            """Process a dataset in a separate thread."""
            try:
                start_time = time.time()
                
                cleaner = DataCleaner()
                cleaned_df, _ = cleaner.clean_dataframe(data)
                
                with patch('feature_engineer.ProcessorRankingsService') as mock_rankings_service:
                    mock_service_instance = Mock()
                    mock_service_instance.get_or_refresh_rankings.return_value = self.mock_proc_df
                    mock_rankings_service.return_value = mock_service_instance
                    
                    engineer = FeatureEngineer()
                    engineer.processor_rankings_service = mock_service_instance
                    processed_df = engineer.engineer_features(cleaned_df)
                
                end_time = time.time()
                execution_time = end_time - start_time
                
                results_queue.put({
                    'thread_id': thread_id,
                    'execution_time': execution_time,
                    'records_processed': len(processed_df),
                    'success': True
                })
                
            except Exception as e:
                results_queue.put({
                    'thread_id': thread_id,
                    'error': str(e),
                    'success': False
                })
        
        # Start concurrent processing
        start_time = time.time()
        threads = []
        
        for i, data in enumerate(datasets):
            thread = threading.Thread(target=process_dataset, args=(data, i))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        total_time = time.time() - start_time
        
        # Collect results
        results = []
        while not results_queue.empty():
            results.append(results_queue.get())
        
        # Verify all threads completed successfully
        successful_results = [r for r in results if r.get('success', False)]
        assert len(successful_results) == 4, f"Not all threads completed successfully: {len(successful_results)}/4"
        
        # Performance assertions
        assert total_time < 15.0, f"Concurrent processing took too long: {total_time:.2f}s"
        
        total_records = sum(r['records_processed'] for r in successful_results)
        throughput = total_records / total_time
        
        print(f"Concurrent processing: {total_time:.2f}s, {throughput:.2f} records/second")
        
        # Should maintain reasonable throughput under concurrent load
        assert throughput >= 10.0, f"Concurrent throughput too low: {throughput:.2f} records/second"


if __name__ == '__main__':
    # Run performance tests
    pytest.main([__file__, '-m', 'performance', '-v'])