#!/usr/bin/env python3
"""
Production-ready mobile phone data processing pipeline.
Usage: python production_pipeline.py <input_csv_path>
"""

import pandas as pd
from datetime import datetime
import sys
import os
import logging

# Add services to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'services', 'processor'))

from data_cleaner import DataCleaner
from feature_engineer import FeatureEngineer
from data_quality_validator import DataQualityValidator
from database_updater import DatabaseUpdater

def setup_logging():
    """Setup production logging."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('pipeline.log'),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

def run_production_pipeline(input_csv_path, run_id=None):
    """
    Run the complete production pipeline on input data.
    
    Args:
        input_csv_path (str): Path to input CSV file
        run_id (str, optional): Custom run ID for tracking
    
    Returns:
        tuple: (success: bool, results: dict)
    """
    logger = setup_logging()
    
    if run_id is None:
        run_id = f"prod_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    logger.info(f"🚀 Starting production pipeline run: {run_id}")
    logger.info(f"📁 Input file: {input_csv_path}")
    
    try:
        # Step 1: Load data
        logger.info("📊 Loading input data...")
        raw_df = pd.read_csv(input_csv_path)
        logger.info(f"   Loaded {len(raw_df)} records with {len(raw_df.columns)} columns")
        
        # Step 2: Data cleaning
        logger.info("🧹 Starting data cleaning...")
        cleaner = DataCleaner()
        cleaned_df, issues = cleaner.clean_dataframe(raw_df)
        logger.info(f"   Cleaning completed: {len(issues)} issues found, {len(cleaned_df.columns)} columns")
        
        if issues:
            logger.warning(f"   Data cleaning issues: {issues[:5]}...")  # Show first 5 issues
        
        # Step 3: Feature engineering
        logger.info("⚙️ Starting feature engineering...")
        engineer = FeatureEngineer()
        processed_df = engineer.engineer_features(cleaned_df)
        logger.info(f"   Feature engineering completed: {len(processed_df.columns)} total columns")
        
        # Log key feature statistics
        if 'overall_device_score' in processed_df.columns:
            avg_score = processed_df['overall_device_score'].mean()
            logger.info(f"   Average device score: {avg_score:.2f}/100")
        
        # Step 4: Quality validation
        logger.info("✅ Starting quality validation...")
        validator = DataQualityValidator()
        passed, report = validator.validate_pipeline_data(processed_df)
        
        quality_score = report['overall_quality_score']
        logger.info(f"   Quality validation: {'PASSED' if passed else 'FAILED'} (Score: {quality_score:.2f})")
        logger.info(f"   Completeness: {report['completeness']['overall_completeness']:.2f}")
        
        if not passed:
            logger.warning(f"   Quality issues: {len(report['validation_issues']['field_issues'])} field issues, {len(report['validation_issues']['range_issues'])} range issues")
            
            # In production, you might want to proceed with warnings or halt
            # For now, we'll proceed with a warning
            logger.warning("   ⚠️ Proceeding with quality warnings...")
        
        # Step 5: Database update
        logger.info("💾 Starting database update...")
        updater = DatabaseUpdater()
        success, results = updater.update_with_transaction(processed_df, run_id)
        
        if success:
            inserted = results['results']['inserted']
            updated = results['results']['updated']
            errors = results['results']['errors']
            
            logger.info(f"   Database update completed successfully!")
            logger.info(f"   📊 Results: {inserted} inserted, {updated} updated, {errors} errors")
            
            # Final summary
            logger.info("🎉 PIPELINE COMPLETED SUCCESSFULLY!")
            logger.info(f"   Run ID: {run_id}")
            logger.info(f"   Records processed: {len(processed_df)}")
            logger.info(f"   Quality score: {quality_score:.2f}")
            logger.info(f"   Database records: {inserted + updated}")
            
            return True, {
                'run_id': run_id,
                'records_processed': len(processed_df),
                'quality_score': quality_score,
                'database_results': results['results'],
                'issues': issues
            }
        else:
            logger.error(f"   ❌ Database update failed: {results.get('error', 'Unknown error')}")
            return False, {
                'run_id': run_id,
                'error': 'Database update failed',
                'details': results
            }
            
    except FileNotFoundError:
        error_msg = f"Input file not found: {input_csv_path}"
        logger.error(f"❌ {error_msg}")
        return False, {'error': error_msg}
        
    except pd.errors.EmptyDataError:
        error_msg = f"Input file is empty: {input_csv_path}"
        logger.error(f"❌ {error_msg}")
        return False, {'error': error_msg}
        
    except Exception as e:
        error_msg = f"Pipeline failed with error: {str(e)}"
        logger.error(f"❌ {error_msg}")
        logger.exception("Full error details:")
        return False, {'error': error_msg, 'exception': str(e)}

def validate_input_file(file_path):
    """Validate input file exists and has required columns."""
    if not os.path.exists(file_path):
        return False, f"File does not exist: {file_path}"
    
    try:
        df = pd.read_csv(file_path, nrows=1)  # Read just first row to check columns
        
        # Check for minimum required columns
        required_columns = ['name', 'brand', 'price']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            return False, f"Missing required columns: {missing_columns}"
        
        return True, "File validation passed"
        
    except Exception as e:
        return False, f"Error reading file: {str(e)}"

def main():
    """Main entry point for production pipeline."""
    if len(sys.argv) != 2:
        print("Usage: python production_pipeline.py <input_csv_path>")
        print("\nExample:")
        print("  python production_pipeline.py scraped_phones.csv")
        sys.exit(1)
    
    input_file = sys.argv[1]
    
    # Validate input file
    valid, message = validate_input_file(input_file)
    if not valid:
        print(f"❌ Input validation failed: {message}")
        sys.exit(1)
    
    print(f"✅ Input validation passed: {message}")
    
    # Run pipeline
    success, results = run_production_pipeline(input_file)
    
    if success:
        print(f"\n🎉 Pipeline completed successfully!")
        print(f"   Run ID: {results['run_id']}")
        print(f"   Records processed: {results['records_processed']}")
        print(f"   Quality score: {results['quality_score']:.2f}")
        print(f"   Database records: {results['database_results']['inserted'] + results['database_results']['updated']}")
        
        if results['issues']:
            print(f"   ⚠️ Data issues found: {len(results['issues'])}")
        
        sys.exit(0)
    else:
        print(f"\n❌ Pipeline failed: {results['error']}")
        sys.exit(1)

if __name__ == "__main__":
    main()