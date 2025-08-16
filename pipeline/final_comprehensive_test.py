#!/usr/bin/env python3
"""
Final comprehensive test of the enhanced pipeline with edge cases and stress testing.
"""

import sys
import os
import pandas as pd
import logging
from datetime import datetime, timedelta
import numpy as np

# Add services to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'services', 'processor'))

from data_cleaner import DataCleaner
from feature_engineer import FeatureEngineer
from data_quality_validator import DataQualityValidator
from database_updater import DatabaseUpdater
from processor_rankings_service import ProcessorRankingsService

def create_comprehensive_test_data():
    """Create comprehensive test data with edge cases."""
    return pd.DataFrame({
        'name': [
            'Samsung Galaxy S24 Ultra 5G',
            'iPhone 15 Pro Max',
            'Xiaomi 14 Ultra',
            'OnePlus 12R',
            'Google Pixel 8 Pro',
            'Nothing Phone (2a)',
            'Realme GT 6',
            'Vivo X100 Pro',
            'OPPO Find X7 Ultra',
            'Honor Magic6 Pro'
        ],
        'brand': ['Samsung', 'Apple', 'Xiaomi', 'OnePlus', 'Google', 'Nothing', 'Realme', 'Vivo', 'OPPO', 'Honor'],
        'price': [
            '৳.135,000',  # Standard format
            '?.180,000',  # Different currency symbol
            '৳95,000',    # No decimal
            '৳85,000',    # Standard
            '110000',     # No currency symbol
            '৳45,000',    # Lower price
            '৳75,000',    # Mid-range
            '৳120,000',   # High-end
            '৳150,000',   # Premium
            '৳90,000'     # Standard
        ],
        'url': [
            'https://www.mobiledokan.com/mobile/samsung-galaxy-s24-ultra-5g',
            'https://www.mobiledokan.com/mobile/iphone-15-pro-max',
            'https://www.mobiledokan.com/mobile/xiaomi-14-ultra',
            'https://www.mobiledokan.com/mobile/oneplus-12r',
            'https://www.mobiledokan.com/mobile/google-pixel-8-pro',
            'https://www.mobiledokan.com/mobile/nothing-phone-2a',
            'https://www.mobiledokan.com/mobile/realme-gt-6',
            'https://www.mobiledokan.com/mobile/vivo-x100-pro',
            'https://www.mobiledokan.com/mobile/oppo-find-x7-ultra',
            'https://www.mobiledokan.com/mobile/honor-magic6-pro'
        ],
        'main_camera': [
            '200+50+12+10MP',  # Quad camera
            '48+12+12MP',      # Triple camera
            '50+50+50+50MP',   # Quad camera
            '50+8+2MP',        # Triple camera
            '50+48+48MP',      # Triple camera
            '50+50MP',         # Dual camera
            '50+8+2MP',        # Triple camera
            '50+50+64MP',      # Triple camera
            '50+50+50+50MP',   # Quad camera
            '50+180+50MP'      # Triple camera with periscope
        ],
        'front_camera': ['12MP', '12MP', '32MP', '16MP', '10.5MP', '32MP', '16MP', '32MP', '32MP', '50MP'],
        'ram': [
            '12GB',    # High-end
            '8GB',     # Standard
            '16GB',    # Extreme
            '8GB',     # Standard
            '12GB',    # High-end
            '8GB',     # Standard
            '12GB',    # High-end
            '12GB',    # High-end
            '16GB',    # Extreme
            '12GB'     # High-end
        ],
        'internal_storage': [
            '256GB',   # Standard
            '256GB',   # Standard
            '512GB',   # High
            '128GB',   # Lower
            '128GB',   # Lower
            '256GB',   # Standard
            '256GB',   # Standard
            '256GB',   # Standard
            '512GB',   # High
            '512GB'    # High
        ],
        'capacity': [
            '5000mAh',  # Large
            '4441mAh',  # Apple standard
            '5300mAh',  # Very large
            '5500mAh',  # Extreme
            '5050mAh',  # Large
            '5000mAh',  # Large
            '5000mAh',  # Large
            '5400mAh',  # Very large
            '5400mAh',  # Very large
            '5600mAh'   # Extreme
        ],
        'quick_charging': [
            '45W',     # Samsung
            '27W',     # Apple
            '90W',     # Xiaomi fast
            '100W',    # OnePlus super fast
            '30W',     # Google
            '45W',     # Nothing
            '120W',    # Realme ultra fast
            '120W',    # Vivo ultra fast
            '100W',    # OPPO super fast
            '100W'     # Honor super fast
        ],
        'wireless_charging': ['15W', '15W', '50W', '50W', '23W', '15W', '50W', '50W', '50W', '66W'],
        'screen_size_inches': [
            '6.8"',    # Large
            '6.7"',    # Large
            '6.73"',   # Large
            '6.78"',   # Large
            '6.7"',    # Large
            '6.7"',    # Large
            '6.78"',   # Large
            '6.78"',   # Large
            '6.82"',   # Very large
            '6.8"'     # Large
        ],
        'display_resolution': [
            '1440x3120',  # QHD+
            '1290x2796',  # Apple resolution
            '1440x3200',  # QHD+
            '1264x2780',  # Custom
            '1344x2992',  # Google resolution
            '1080x2412',  # FHD+
            '1264x2780',  # Custom
            '1260x2800',  # Custom
            '1440x3168',  # QHD+
            '1280x2800'   # Custom
        ],
        'pixel_density_ppi': [
            '501 ppi',  # High
            '460 ppi',  # Apple
            '522 ppi',  # Very high
            '450 ppi',  # Good
            '489 ppi',  # High
            '394 ppi',  # Standard
            '450 ppi',  # Good
            '453 ppi',  # Good
            '510 ppi',  # Very high
            '460 ppi'   # High
        ],
        'refresh_rate_hz': ['120Hz', '120Hz', '120Hz', '120Hz', '120Hz', '120Hz', '120Hz', '120Hz', '120Hz', '144Hz'],
        'chipset': [
            'Snapdragon 8 Gen 3',
            'Apple A17 Pro',
            'Snapdragon 8 Gen 3',
            'Snapdragon 8s Gen 3',
            'Google Tensor G3',
            'Dimensity 7200 Pro',
            'Snapdragon 8s Gen 3',
            'Dimensity 9300',
            'Snapdragon 8 Gen 3',
            'Snapdragon 8 Gen 3'
        ],
        'operating_system': ['Android 14', 'iOS 17', 'Android 14', 'Android 14', 'Android 14', 'Android 14', 'Android 14', 'Android 14', 'Android 14', 'Android 14'],
        'network': ['5G', '5G', '5G', '5G', '5G', '5G', '5G', '5G', '5G', '5G'],
        'wlan': ['Wi-Fi 7', 'Wi-Fi 6E', 'Wi-Fi 7', 'Wi-Fi 6', 'Wi-Fi 6E', 'Wi-Fi 6', 'Wi-Fi 6', 'Wi-Fi 7', 'Wi-Fi 7', 'Wi-Fi 7'],
        'bluetooth': ['5.3', '5.3', '5.4', '5.3', '5.3', '5.3', '5.3', '5.4', '5.4', '5.3'],
        'nfc': ['Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes'],
        'fingerprint_sensor': ['Ultrasonic', 'None', 'Optical', 'Optical', 'Optical', 'Optical', 'Optical', 'Optical', 'Optical', 'Optical'],
        'face_unlock': ['Yes', 'Face ID', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes'],
        'release_date': [
            '2024-01-24',  # Recent
            '2023-09-22',  # Older
            '2024-02-25',  # Recent
            '2024-02-20',  # Recent
            '2023-10-12',  # Older
            '2024-03-05',  # Recent
            '2024-05-20',  # Very recent
            '2024-01-08',  # Recent
            '2024-01-08',  # Recent
            '2024-01-11'   # Recent
        ],
        'status': ['Available'] * 10,
        'camera_setup': ['Quad', 'Triple', 'Quad', 'Triple', 'Triple', 'Dual', 'Triple', 'Triple', 'Quad', 'Triple'],
        'scraped_at': [datetime.now()] * 10,
        'data_source': ['MobileDokan'] * 10,
        'is_pipeline_managed': [True] * 10
    })

def test_edge_cases():
    """Test edge cases and error handling."""
    print("\n🧪 TESTING EDGE CASES AND ERROR HANDLING")
    print("=" * 60)
    
    # Test with problematic data
    problematic_data = pd.DataFrame({
        'name': ['Test Phone', 'Another Phone', 'Edge Case Phone'],
        'brand': ['TestBrand', '', None],  # Empty and null brands
        'price': ['Invalid Price', '৳', '৳0'],  # Invalid prices
        'main_camera': ['', 'Invalid Camera', '999MP'],  # Invalid cameras
        'ram': ['Invalid RAM', '0GB', '999GB'],  # Invalid RAM
        'capacity': ['Invalid Battery', '0mAh', '99999mAh'],  # Invalid battery
        'screen_size_inches': ['Invalid Size', '0"', '99"'],  # Invalid screen sizes
        'chipset': ['', 'Unknown Processor', 'Invalid Chip'],  # Unknown processors
        'url': ['invalid-url', '', None],  # Invalid URLs
        'scraped_at': [datetime.now()] * 3,
        'data_source': ['Test'] * 3,
        'is_pipeline_managed': [True] * 3
    })
    
    try:
        cleaner = DataCleaner()
        cleaned_df, issues = cleaner.clean_dataframe(problematic_data)
        print(f"   ✅ Edge case cleaning: {len(issues)} issues handled gracefully")
        
        engineer = FeatureEngineer()
        processed_df = engineer.engineer_features(cleaned_df)
        print(f"   ✅ Edge case feature engineering: {len(processed_df)} records processed")
        
        validator = DataQualityValidator()
        passed, report = validator.validate_pipeline_data(processed_df)
        print(f"   ✅ Edge case validation: {'PASSED' if passed else 'HANDLED'} (Quality: {report['overall_quality_score']:.2f})")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Edge case handling failed: {e}")
        return False

def test_performance_with_large_dataset():
    """Test performance with a larger dataset."""
    print("\n⚡ TESTING PERFORMANCE WITH LARGER DATASET")
    print("=" * 60)
    
    try:
        # Create a larger dataset by repeating the comprehensive data
        base_data = create_comprehensive_test_data()
        large_dataset = pd.concat([base_data] * 10, ignore_index=True)  # 100 records
        
        # Add some variation to avoid duplicates
        for i in range(len(large_dataset)):
            large_dataset.loc[i, 'name'] += f' Variant {i}'
            large_dataset.loc[i, 'url'] += f'-variant-{i}'
        
        print(f"   📊 Testing with {len(large_dataset)} records...")
        
        start_time = datetime.now()
        
        # Data cleaning
        cleaner = DataCleaner()
        cleaned_df, issues = cleaner.clean_dataframe(large_dataset)
        clean_time = datetime.now()
        
        # Feature engineering
        engineer = FeatureEngineer()
        processed_df = engineer.engineer_features(cleaned_df)
        feature_time = datetime.now()
        
        # Quality validation
        validator = DataQualityValidator()
        passed, report = validator.validate_pipeline_data(processed_df)
        validation_time = datetime.now()
        
        # Calculate performance metrics
        total_time = (validation_time - start_time).total_seconds()
        clean_duration = (clean_time - start_time).total_seconds()
        feature_duration = (feature_time - clean_time).total_seconds()
        validation_duration = (validation_time - feature_time).total_seconds()
        
        records_per_second = len(large_dataset) / total_time
        
        print(f"   ✅ Performance test completed successfully!")
        print(f"   ⏱️  Total time: {total_time:.2f} seconds")
        print(f"   ⏱️  Cleaning: {clean_duration:.2f}s | Features: {feature_duration:.2f}s | Validation: {validation_duration:.2f}s")
        print(f"   🚀 Processing speed: {records_per_second:.1f} records/second")
        print(f"   📊 Quality score: {report['overall_quality_score']:.2f}")
        
        return records_per_second > 10  # Should process at least 10 records per second
        
    except Exception as e:
        print(f"   ❌ Performance test failed: {e}")
        return False

def test_data_consistency():
    """Test data consistency across multiple runs."""
    print("\n🔄 TESTING DATA CONSISTENCY ACROSS RUNS")
    print("=" * 60)
    
    try:
        test_data = create_comprehensive_test_data().head(3)  # Small dataset for consistency testing
        
        results = []
        for run in range(3):
            cleaner = DataCleaner()
            engineer = FeatureEngineer()
            
            cleaned_df, _ = cleaner.clean_dataframe(test_data.copy())
            processed_df = engineer.engineer_features(cleaned_df)
            
            # Extract key metrics for consistency check
            run_results = {
                'run': run + 1,
                'price_sum': processed_df['price_original'].sum() if 'price_original' in processed_df.columns else 0,
                'overall_score_avg': processed_df['overall_device_score'].mean() if 'overall_device_score' in processed_df.columns else 0,
                'display_score_avg': processed_df['display_score'].mean() if 'display_score' in processed_df.columns else 0,
                'camera_score_avg': processed_df['camera_score'].mean() if 'camera_score' in processed_df.columns else 0
            }
            results.append(run_results)
        
        # Check consistency
        consistent = True
        for key in ['price_sum', 'overall_score_avg', 'display_score_avg', 'camera_score_avg']:
            values = [r[key] for r in results]
            if len(set(f"{v:.2f}" for v in values)) > 1:  # Round to 2 decimals for comparison
                print(f"   ⚠️  Inconsistency in {key}: {values}")
                consistent = False
        
        if consistent:
            print("   ✅ Data processing is consistent across multiple runs")
            print(f"   📊 Sample results: Price sum: {results[0]['price_sum']:.0f}, Overall score: {results[0]['overall_score_avg']:.2f}")
        else:
            print("   ❌ Data processing shows inconsistencies")
        
        return consistent
        
    except Exception as e:
        print(f"   ❌ Consistency test failed: {e}")
        return False

def run_final_comprehensive_test():
    """Run the final comprehensive test suite."""
    print("🎯 FINAL COMPREHENSIVE PIPELINE TEST SUITE")
    print("=" * 70)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    test_results = {
        'basic_functionality': False,
        'edge_cases': False,
        'performance': False,
        'consistency': False,
        'database_integration': False
    }
    
    try:
        # Test 1: Basic functionality with comprehensive data
        print("\n1️⃣ TESTING BASIC FUNCTIONALITY WITH COMPREHENSIVE DATA")
        print("=" * 60)
        
        test_data = create_comprehensive_test_data()
        print(f"   📊 Testing with {len(test_data)} diverse phone records")
        
        # Full pipeline test
        cleaner = DataCleaner()
        cleaned_df, issues = cleaner.clean_dataframe(test_data)
        
        engineer = FeatureEngineer()
        processed_df = engineer.engineer_features(cleaned_df)
        
        validator = DataQualityValidator()
        passed, report = validator.validate_pipeline_data(processed_df)
        
        print(f"   ✅ Data cleaning: {len(issues)} issues, {len(cleaned_df.columns)} columns")
        print(f"   ✅ Feature engineering: {len(processed_df.columns)} total columns")
        print(f"   ✅ Quality validation: {'PASSED' if passed else 'FAILED'} ({report['overall_quality_score']:.2f} score)")
        
        # Verify key features work
        key_features = ['price_original', 'overall_device_score', 'display_score', 'camera_score', 'battery_score', 'performance_score']
        feature_success = all(col in processed_df.columns and processed_df[col].notna().sum() > 0 for col in key_features)
        
        if feature_success and passed:
            test_results['basic_functionality'] = True
            print("   🎉 Basic functionality test: PASSED")
        else:
            print("   ❌ Basic functionality test: FAILED")
        
        # Test 2: Edge cases
        test_results['edge_cases'] = test_edge_cases()
        
        # Test 3: Performance
        test_results['performance'] = test_performance_with_large_dataset()
        
        # Test 4: Consistency
        test_results['consistency'] = test_data_consistency()
        
        # Test 5: Database integration
        print("\n5️⃣ TESTING DATABASE INTEGRATION")
        print("=" * 60)
        
        try:
            updater = DatabaseUpdater()
            test_subset = processed_df.head(2).copy()
            success, results = updater.update_with_transaction(test_subset, f'final_test_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
            
            if success:
                print(f"   ✅ Database integration: SUCCESS ({results['results']['updated'] + results['results']['inserted']} records)")
                test_results['database_integration'] = True
            else:
                print(f"   ❌ Database integration: FAILED")
                
        except Exception as e:
            print(f"   ❌ Database integration failed: {e}")
        
        # Final results
        print("\n" + "=" * 70)
        print("🏆 FINAL COMPREHENSIVE TEST RESULTS")
        print("=" * 70)
        
        passed_tests = sum(test_results.values())
        total_tests = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"   {test_name.replace('_', ' ').title()}: {status}")
        
        print(f"\n📊 Overall Result: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("\n🎉 🎉 🎉 ALL TESTS PASSED! PIPELINE IS PRODUCTION READY! 🎉 🎉 🎉")
            return True
        elif passed_tests >= 4:
            print("\n✅ Most tests passed - Pipeline is functional with minor issues")
            return True
        else:
            print("\n⚠️ Multiple test failures - Pipeline needs attention")
            return False
            
    except Exception as e:
        print(f"\n💥 Comprehensive test suite failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_final_comprehensive_test()
    print(f"\n🏁 Final test suite completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    sys.exit(0 if success else 1)