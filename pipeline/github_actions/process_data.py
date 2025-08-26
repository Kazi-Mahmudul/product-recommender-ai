#!/usr/bin/env python3
"""
Data Processing Orchestrator for GitHub Actions Pipeline

This script coordinates the data processing phase including:
1. Data cleaning and validation
2. Feature engineering
3. Quality validation
4. Results preparation for loading
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from typing import Dict, Any, Optional

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from pipeline.config.github_actions_config import config

def setup_logging():
    """Setup basic logging for the processing"""
    import logging
    
    logging.basicConfig(
        level=getattr(logging, config.log_level),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger(__name__)

def load_processor_rankings() -> Optional[object]:
    """Load processor rankings data for feature engineering"""
    logger = setup_logging()
    
    try:
        import pandas as pd
        processor_file = config.get_output_paths()['processor_rankings']
        
        if os.path.exists(processor_file):
            df = pd.read_csv(processor_file)
            logger.info(f"✅ Loaded processor rankings: {len(df)} processors")
            return df
        else:
            logger.warning("⚠️ Processor rankings file not found, performance scoring may be limited")
            return None
            
    except Exception as e:
        logger.error(f"❌ Failed to load processor rankings: {str(e)}")
        return None

def get_scraped_data_from_database(pipeline_run_id: str) -> Optional[object]:
    """Get scraped data from database for processing"""
    logger = setup_logging()
    
    try:
        import pandas as pd
        import psycopg2
        
        # Connect to database
        conn = psycopg2.connect(config.database_url)
        
        # Query for recently scraped data
        query = """
        SELECT * FROM phones 
        WHERE updated_at >= NOW() - INTERVAL '1 day'
        OR created_at >= NOW() - INTERVAL '1 day'
        ORDER BY updated_at DESC, created_at DESC
        """
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        logger.info(f"✅ Retrieved {len(df)} records from database for processing")
        return df
        
    except Exception as e:
        logger.error(f"❌ Failed to retrieve data from database: {str(e)}")
        return None

def process_data_with_pipeline(df: object, processor_df: Optional[object] = None, test_mode: bool = False) -> Dict[str, Any]:
    """
    Process data using the enhanced pipeline services
    
    Args:
        df: Raw data DataFrame
        processor_df: Processor rankings DataFrame
        test_mode: Whether running in test mode
        
    Returns:
        Dictionary with processing results
    """
    logger = setup_logging()
    
    try:
        # Try to import enhanced pipeline services
        try:
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'processor'))
            from data_cleaner import DataCleaner
            from feature_engineer import FeatureEngineer
            from data_quality_validator import DataQualityValidator
            
            enhanced_pipeline = True
            logger.info("✅ Enhanced pipeline services loaded")
            
        except ImportError as e:
            logger.warning(f"⚠️ Enhanced pipeline services not available: {e}")
            logger.info("   Using basic processing fallback")
            enhanced_pipeline = False
        
        start_time = time.time()
        
        if enhanced_pipeline:
            # Use enhanced pipeline
            logger.info("🧹 Starting enhanced data cleaning...")
            cleaner = DataCleaner()
            cleaned_df, cleaning_issues = cleaner.clean_dataframe(df)
            
            logger.info(f"   Cleaning completed: {len(cleaning_issues)} issues found")
            
            logger.info("⚙️ Starting feature engineering...")
            engineer = FeatureEngineer()
            processed_df = engineer.engineer_features(cleaned_df, processor_df)
            
            logger.info(f"   Feature engineering completed: {len(processed_df.columns)} total columns")
            
            logger.info("✅ Starting quality validation...")
            validator = DataQualityValidator()
            passed, quality_report = validator.validate_pipeline_data(processed_df)
            
            quality_score = quality_report.get('overall_quality_score', 0.0)
            logger.info(f"   Quality validation: {'PASSED' if passed else 'FAILED'} (Score: {quality_score:.2f})")
            
            result = {
                'status': 'success',
                'processing_method': 'enhanced',
                'records_processed': int(len(processed_df)),
                'quality_score': float(quality_score),
                'quality_passed': bool(passed),
                'cleaning_issues_count': int(len(cleaning_issues)),
                'features_generated': int(len(processed_df.columns)),
                'execution_time_seconds': round(time.time() - start_time, 2),
                'quality_report': quality_report,
                'cleaning_issues': cleaning_issues[:10] if cleaning_issues else []  # First 10 issues
            }
            
        else:
            # Use basic processing fallback
            logger.info("🔧 Starting basic data processing...")
            
            # Basic cleaning
            processed_df = df.copy()
            
            # Basic feature engineering using the clean_transform_pipeline
            try:
                # Add data_cleaning to path
                data_cleaning_path = os.path.join(os.path.dirname(__file__), '..', '..', 'data_cleaning')
                if data_cleaning_path not in sys.path:
                    sys.path.insert(0, data_cleaning_path)
                
                logger.info(f"   Importing from: {data_cleaning_path}")
                from clean_transform_pipeline import engineer_features
                logger.info("   ✅ Successfully imported engineer_features")
                
                if processor_df is not None:
                    logger.info("   Starting feature engineering with processor rankings...")
                    processed_df = engineer_features(processed_df, processor_df)
                    logger.info("   ✅ Applied feature engineering with processor rankings")
                else:
                    logger.info("   Starting basic feature engineering...")
                    processed_df = engineer_features(processed_df, None)
                    logger.info("   ✅ Applied basic feature engineering")
                
            except ImportError as e:
                logger.error(f"   ❌ Feature engineering import failed: {e}")
                logger.error(f"   Path attempted: {data_cleaning_path}")
                logger.warning("   Using raw data")
                import traceback
                logger.error(f"   Traceback: {traceback.format_exc()}")
            except Exception as e:
                logger.error(f"   ❌ Feature engineering execution failed: {e}")
                logger.warning("   Using raw data")
                import traceback
                logger.error(f"   Traceback: {traceback.format_exc()}")
            
            # Basic quality estimation
            completeness = float(processed_df.notna().mean().mean())
            quality_score = completeness * 100
            
            result = {
                'status': 'success',
                'processing_method': 'basic',
                'records_processed': int(len(processed_df)),
                'quality_score': round(float(quality_score), 2),
                'quality_passed': bool(quality_score >= 70),
                'cleaning_issues_count': 0,
                'features_generated': int(len(processed_df.columns)),
                'execution_time_seconds': round(time.time() - start_time, 2),
                'completeness': round(float(completeness), 3)
            }
        
        # Store processed data temporarily (for loading phase)
        if not test_mode:
            processed_file = config.get_output_paths()['processed_data']
            os.makedirs(os.path.dirname(processed_file), exist_ok=True)
            processed_df.to_csv(processed_file, index=False)
            logger.info(f"   Processed data saved to: {processed_file}")
        
        logger.info(f"✅ Data processing completed successfully!")
        logger.info(f"   Records processed: {result['records_processed']}")
        logger.info(f"   Quality score: {result['quality_score']:.2f}")
        logger.info(f"   Features generated: {result['features_generated']}")
        logger.info(f"   Execution time: {result['execution_time_seconds']:.2f} seconds")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Data processing failed: {str(e)}")
        import traceback
        logger.error(f"   Error details: {traceback.format_exc()}")
        
        return {
            'status': 'failed',
            'processing_method': 'unknown',
            'error': str(e),
            'records_processed': 0,
            'quality_score': 0.0,
            'execution_time_seconds': round(time.time() - start_time, 2) if 'start_time' in locals() else 0
        }

def main():
    """Main processing orchestrator"""
    parser = argparse.ArgumentParser(description='Data Processing Orchestrator')
    parser.add_argument('--pipeline-run-id', required=True, help='Pipeline run identifier')
    parser.add_argument('--scraping-result', required=True, help='JSON string of scraping results')
    parser.add_argument('--processor-result', required=True, help='JSON string of processor results')
    parser.add_argument('--test-mode', type=str, default='false', help='Run in test mode')
    
    args = parser.parse_args()
    
    # Parse arguments
    test_mode = args.test_mode.lower() == 'true'
    
    try:
        scraping_result = json.loads(args.scraping_result)
        processor_result = json.loads(args.processor_result)
    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse input JSON: {e}")
        sys.exit(1)
    
    logger = setup_logging()
    logger.info(f"🔧 Starting data processing orchestrator")
    logger.info(f"   Pipeline Run ID: {args.pipeline_run_id}")
    logger.info(f"   Test mode: {test_mode}")
    logger.info(f"   Scraping status: {scraping_result.get('status', 'unknown')}")
    logger.info(f"   Processor status: {processor_result.get('status', 'unknown')}")
    
    try:
        # Check if we have data to process
        if scraping_result.get('status') != 'success':
            logger.error("❌ Cannot process data: scraping was not successful")
            
            failed_result = {
                'status': 'failed',
                'error': 'No data to process - scraping failed',
                'pipeline_run_id': args.pipeline_run_id,
                'timestamp': datetime.now().isoformat(),
                'records_processed': 0,
                'quality_score': 0.0
            }
            
            # Set GitHub Actions output
            if 'GITHUB_OUTPUT' in os.environ:
                with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                    f.write(f"processing_result={json.dumps(failed_result)}\n")
            
            sys.exit(1)
        
        # Load processor rankings if available
        processor_df = None
        if processor_result.get('status') == 'success':
            processor_df = load_processor_rankings()
        
        # Get scraped data from database
        logger.info("📊 Retrieving scraped data from database...")
        df = get_scraped_data_from_database(args.pipeline_run_id)
        
        if df is None or len(df) == 0:
            logger.warning("⚠️ No data found in database, creating sample processing result")
            
            # Create a minimal success result for testing
            result = {
                'status': 'success',
                'processing_method': 'no_data',
                'pipeline_run_id': args.pipeline_run_id,
                'timestamp': datetime.now().isoformat(),
                'records_processed': 0,
                'quality_score': 100.0,
                'quality_passed': True,
                'message': 'No data to process'
            }
        else:
            # Process the data
            logger.info(f"📊 Processing {len(df)} records...")
            result = process_data_with_pipeline(df, processor_df, test_mode)
            result['pipeline_run_id'] = args.pipeline_run_id
            result['timestamp'] = datetime.now().isoformat()
        
        # Convert numpy types to native Python types for JSON serialization
        def convert_numpy_types(obj):
            """Convert numpy types to native Python types for JSON serialization"""
            if hasattr(obj, 'item'):  # numpy scalar
                return obj.item()
            elif isinstance(obj, dict):
                return {k: convert_numpy_types(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_numpy_types(v) for v in obj]
            else:
                return obj
        
        # Convert result to JSON-serializable format
        json_safe_result = convert_numpy_types(result)
        
        # Set GitHub Actions output
        if 'GITHUB_OUTPUT' in os.environ:
            with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                f.write(f"processing_result={json.dumps(json_safe_result)}\n")
        
        # Summary
        logger.info(f"🎯 Data processing completed with status: {result['status'].upper()}")
        logger.info(f"   Records processed: {result.get('records_processed', 0)}")
        logger.info(f"   Quality score: {result.get('quality_score', 0):.2f}")
        
        # Exit with appropriate code
        sys.exit(0 if result['status'] == 'success' else 1)
        
    except Exception as e:
        logger.error(f"❌ Data processing orchestrator failed: {str(e)}")
        import traceback
        logger.error(f"   Error details: {traceback.format_exc()}")
        
        # Set failed output for GitHub Actions
        failed_result = {
            'status': 'failed',
            'error': str(e),
            'pipeline_run_id': args.pipeline_run_id,
            'timestamp': datetime.now().isoformat(),
            'records_processed': 0,
            'quality_score': 0.0
        }
        
        if 'GITHUB_OUTPUT' in os.environ:
            with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                f.write(f"processing_result={json.dumps(failed_result)}\n")
        
        sys.exit(1)

if __name__ == "__main__":
    main()