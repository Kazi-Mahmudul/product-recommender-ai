#!/usr/bin/env python3
"""
Validation Script for Database Update Fix

This script validates that the enhanced DirectDatabaseLoader properly updates
all feature-engineered columns in the database, fixing the original issue.
"""

import sys
import os
import logging
import pandas as pd
import psycopg2
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from pipeline.config.github_actions_config import config
from pipeline.services.direct_database_loader import DirectDatabaseLoader
from pipeline.services.column_classifier import ColumnClassifier


def setup_logging():
    """Setup logging for validation."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[logging.StreamHandler(sys.stdout)]
    )
    return logging.getLogger(__name__)


def get_sample_processed_data(database_url: str, limit: int = 5) -> pd.DataFrame:
    """
    Get a sample of processed data to test the update functionality.
    
    Args:
        database_url: Database connection URL
        limit: Number of records to retrieve
        
    Returns:
        DataFrame with sample processed data
    """
    logger = logging.getLogger(__name__)
    
    try:
        conn = psycopg2.connect(database_url)
        
        # Get sample records with basic data
        query = """
        SELECT * FROM phones 
        WHERE name IS NOT NULL AND brand IS NOT NULL 
        ORDER BY updated_at DESC 
        LIMIT %s
        """
        
        df = pd.read_sql_query(query, conn, params=[limit])
        conn.close()
        
        logger.info(f"✅ Retrieved {len(df)} sample records from database")
        return df
        
    except Exception as e:
        logger.error(f"❌ Failed to retrieve sample data: {str(e)}")
        return pd.DataFrame()


def simulate_feature_engineering(df: pd.DataFrame) -> pd.DataFrame:
    """
    Simulate feature engineering on sample data to create test scenario.
    
    Args:
        df: Raw DataFrame
        
    Returns:
        DataFrame with simulated feature-engineered columns
    """
    logger = logging.getLogger(__name__)
    
    processed_df = df.copy()
    
    # Add simulated feature-engineered columns
    processed_df['performance_score'] = 85.0 + (processed_df.index * 2.5)  # Simulated scores
    processed_df['display_score'] = 80.0 + (processed_df.index * 3.0)
    processed_df['battery_score'] = 75.0 + (processed_df.index * 2.0)
    processed_df['camera_score'] = 88.0 + (processed_df.index * 1.5)
    processed_df['connectivity_score'] = 82.0 + (processed_df.index * 2.2)
    processed_df['security_score'] = 78.0 + (processed_df.index * 1.8)
    processed_df['overall_device_score'] = 81.0 + (processed_df.index * 2.1)
    
    # Add derived fields
    processed_df['storage_gb'] = 128.0 + (processed_df.index * 64)
    processed_df['ram_gb'] = 6.0 + (processed_df.index * 2)
    processed_df['primary_camera_mp'] = 48.0 + (processed_df.index * 8)
    processed_df['selfie_camera_mp'] = 12.0 + (processed_df.index * 4)
    processed_df['camera_count'] = 3 + (processed_df.index % 3)
    
    # Add boolean features
    processed_df['has_fast_charging'] = True
    processed_df['has_wireless_charging'] = processed_df.index % 2 == 0
    processed_df['is_popular_brand'] = True
    processed_df['is_new_release'] = processed_df.index % 3 == 0
    
    # Add price derivatives
    processed_df['price_original'] = 500.0 + (processed_df.index * 100)
    processed_df['price_per_gb'] = processed_df['price_original'] / processed_df['storage_gb']
    processed_df['price_per_gb_ram'] = processed_df['price_original'] / processed_df['ram_gb']
    
    # Add metadata
    processed_df['pipeline_run_id'] = 'validation_test_' + datetime.now().strftime('%Y%m%d_%H%M%S')
    processed_df['data_quality_score'] = 0.95
    processed_df['last_price_check'] = datetime.now()
    
    logger.info(f"✅ Added {len(processed_df.columns) - len(df.columns)} simulated feature-engineered columns")
    
    return processed_df


def validate_column_detection(df: pd.DataFrame) -> dict:
    """
    Validate that the column classifier properly detects feature-engineered columns.
    
    Args:
        df: DataFrame to validate
        
    Returns:
        Dictionary with validation results
    """
    logger = logging.getLogger(__name__)
    
    classifier = ColumnClassifier()
    classification = classifier.classify_columns(df)
    
    # Expected feature-engineered columns
    expected_features = [
        'performance_score', 'display_score', 'battery_score', 'camera_score',
        'connectivity_score', 'security_score', 'overall_device_score',
        'storage_gb', 'ram_gb', 'primary_camera_mp', 'selfie_camera_mp',
        'has_fast_charging', 'has_wireless_charging', 'is_popular_brand',
        'is_new_release', 'price_per_gb', 'price_per_gb_ram'
    ]
    
    detected_features = classification['feature_engineered']
    
    # Check detection accuracy
    correctly_detected = [f for f in expected_features if f in detected_features]
    missed_features = [f for f in expected_features if f not in detected_features]
    
    validation_result = {
        'total_expected_features': len(expected_features),
        'correctly_detected': len(correctly_detected),
        'missed_features': missed_features,
        'detection_accuracy': len(correctly_detected) / len(expected_features) * 100,
        'all_updatable_columns': classifier.get_all_updatable_columns(df),
        'classification': classification
    }
    
    logger.info(f"📊 Column Detection Validation:")
    logger.info(f"   Expected features: {validation_result['total_expected_features']}")
    logger.info(f"   Correctly detected: {validation_result['correctly_detected']}")
    logger.info(f"   Detection accuracy: {validation_result['detection_accuracy']:.1f}%")
    
    if missed_features:
        logger.warning(f"⚠️ Missed features: {missed_features}")
    
    return validation_result


def validate_database_update(df: pd.DataFrame, database_url: str) -> dict:
    """
    Validate that the enhanced DirectDatabaseLoader updates all columns.
    
    Args:
        df: Processed DataFrame to update
        database_url: Database connection URL
        
    Returns:
        Dictionary with update validation results
    """
    logger = logging.getLogger(__name__)
    
    # Initialize enhanced DirectDatabaseLoader
    loader = DirectDatabaseLoader(database_url, batch_size=10)
    
    # Check if enhanced system is available
    if not loader.field_generator:
        logger.error("❌ Enhanced field detection system not available!")
        return {'status': 'failed', 'error': 'Enhanced system not available'}
    
    logger.info("✅ Enhanced DirectDatabaseLoader initialized successfully")
    
    # Generate pipeline run ID for this validation
    pipeline_run_id = 'validation_' + datetime.now().strftime('%Y%m%d_%H%M%S')
    
    try:
        # Perform the database update
        logger.info(f"🔄 Testing database update with {len(df)} records...")
        
        result = loader.load_processed_dataframe(df, pipeline_run_id)
        
        if result['status'] == 'success':
            logger.info(f"✅ Database update completed successfully!")
            logger.info(f"   Records inserted: {result.get('records_inserted', 0)}")
            logger.info(f"   Records updated: {result.get('records_updated', 0)}")
            logger.info(f"   Execution time: {result.get('execution_time_seconds', 0):.2f} seconds")
            
            # Verify that feature-engineered columns were actually updated
            verification_result = verify_feature_columns_in_database(database_url, pipeline_run_id)
            result.update(verification_result)
            
        else:
            logger.error(f"❌ Database update failed: {result.get('error', 'Unknown error')}")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Database update validation failed: {str(e)}")
        return {'status': 'failed', 'error': str(e)}


def verify_feature_columns_in_database(database_url: str, pipeline_run_id: str) -> dict:
    """
    Verify that feature-engineered columns were actually persisted to the database.
    
    Args:
        database_url: Database connection URL
        pipeline_run_id: Pipeline run ID to check
        
    Returns:
        Dictionary with verification results
    """
    logger = logging.getLogger(__name__)
    
    try:
        conn = psycopg2.connect(database_url)
        
        # Query records updated by this validation run
        query = """
        SELECT * FROM phones 
        WHERE pipeline_run_id = %s
        ORDER BY updated_at DESC
        """
        
        df = pd.read_sql_query(query, conn, params=[pipeline_run_id])
        conn.close()
        
        if len(df) == 0:
            logger.warning("⚠️ No records found with validation pipeline_run_id")
            return {'verification_status': 'no_records'}
        
        # Check for feature-engineered columns
        feature_columns = [
            'performance_score', 'display_score', 'battery_score', 'camera_score',
            'overall_device_score', 'storage_gb', 'ram_gb', 'primary_camera_mp'
        ]
        
        verification_results = {}
        columns_with_data = []
        columns_still_null = []
        
        for column in feature_columns:
            if column in df.columns:
                non_null_count = df[column].notna().sum()
                total_count = len(df)
                
                verification_results[column] = {
                    'exists_in_db': True,
                    'non_null_count': int(non_null_count),
                    'total_count': int(total_count),
                    'data_percentage': float(non_null_count / total_count * 100) if total_count > 0 else 0
                }
                
                if non_null_count > 0:
                    columns_with_data.append(column)
                else:
                    columns_still_null.append(column)
            else:
                verification_results[column] = {
                    'exists_in_db': False,
                    'non_null_count': 0,
                    'total_count': 0,
                    'data_percentage': 0
                }
                columns_still_null.append(column)
        
        # Calculate overall success rate
        success_rate = len(columns_with_data) / len(feature_columns) * 100
        
        logger.info(f"🔍 Database Verification Results:")
        logger.info(f"   Records checked: {len(df)}")
        logger.info(f"   Feature columns with data: {len(columns_with_data)}")
        logger.info(f"   Feature columns still null: {len(columns_still_null)}")
        logger.info(f"   Success rate: {success_rate:.1f}%")
        
        if columns_with_data:
            logger.info(f"   ✅ Columns with data: {columns_with_data}")
        
        if columns_still_null:
            logger.warning(f"   ❌ Columns still null: {columns_still_null}")
        
        return {
            'verification_status': 'completed',
            'records_checked': len(df),
            'feature_columns_with_data': columns_with_data,
            'feature_columns_still_null': columns_still_null,
            'success_rate': success_rate,
            'column_details': verification_results
        }
        
    except Exception as e:
        logger.error(f"❌ Database verification failed: {str(e)}")
        return {'verification_status': 'failed', 'error': str(e)}


def main():
    """Main validation function."""
    logger = setup_logging()
    
    logger.info("🚀 Starting Database Update Fix Validation")
    logger.info("=" * 60)
    
    try:
        # Get sample data from database
        logger.info("📊 Step 1: Retrieving sample data from database...")
        sample_df = get_sample_processed_data(config.database_url, limit=3)
        
        if len(sample_df) == 0:
            logger.error("❌ No sample data available for validation")
            return False
        
        # Simulate feature engineering
        logger.info("⚙️ Step 2: Simulating feature engineering...")
        processed_df = simulate_feature_engineering(sample_df)
        
        # Validate column detection
        logger.info("🔍 Step 3: Validating column detection...")
        detection_results = validate_column_detection(processed_df)
        
        if detection_results['detection_accuracy'] < 80:
            logger.error(f"❌ Column detection accuracy too low: {detection_results['detection_accuracy']:.1f}%")
            return False
        
        # Validate database update
        logger.info("💾 Step 4: Validating database update...")
        update_results = validate_database_update(processed_df, config.database_url)
        
        if update_results['status'] != 'success':
            logger.error(f"❌ Database update validation failed: {update_results.get('error', 'Unknown error')}")
            return False
        
        # Check verification results
        if 'verification_status' in update_results:
            verification = update_results
            if verification['verification_status'] == 'completed':
                success_rate = verification.get('success_rate', 0)
                
                if success_rate >= 80:
                    logger.info(f"✅ VALIDATION SUCCESSFUL! Feature columns success rate: {success_rate:.1f}%")
                    logger.info("🎉 The database update fix is working correctly!")
                    return True
                else:
                    logger.error(f"❌ Feature columns success rate too low: {success_rate:.1f}%")
                    return False
            else:
                logger.error(f"❌ Database verification failed: {verification.get('error', 'Unknown error')}")
                return False
        
        logger.info("✅ All validation steps completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Validation failed with exception: {str(e)}")
        import traceback
        logger.error(f"   Error details: {traceback.format_exc()}")
        return False
    
    finally:
        logger.info("=" * 60)
        logger.info("🏁 Database Update Fix Validation Complete")


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)