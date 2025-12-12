#!/usr/bin/env python3
"""
GitHub Actions Pipeline Simulator

This script simulates the complete GitHub Actions pipeline workflow:
1. Extract data (scrape 5 pages)
2. Process data (feature engineering)
3. Load data (database updates)
4. Update top searched phones
"""

import sys
import os
import json
import time
from datetime import datetime
from typing import Dict, Any

# Add the project root to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

# Configure logging
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def generate_pipeline_run_id() -> str:
    """Generate a unique pipeline run ID"""
    return f"local_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

def extract_data(pipeline_run_id: str, max_pages: int = 10) -> Dict[str, Any]:
    """
    Phase 1: Extract data by scraping mobile phone data
    
    Args:
        pipeline_run_id: Unique identifier for this pipeline run
        max_pages: Maximum number of pages to scrape
        
    Returns:
        Dictionary with extraction results
    """
    logger.info("📱 Phase 1: Data Extraction")
    
    try:
        from pipeline.scrapers.mobile_scrapers import MobileDokanScraper
        
        # Initialize scraper
        scraper = MobileDokanScraper()
        logger.info("✅ Scraper initialized successfully")
        
        # Start scraping
        start_time = time.time()
        scraping_result = scraper.scrape_and_store(
            max_pages=max_pages,
            pipeline_run_id=pipeline_run_id,
            check_updates=True,
            batch_size=10
        )
        
        execution_time = time.time() - start_time
        
        # Prepare result
        result = {
            'status': 'success',
            'pipeline_run_id': pipeline_run_id,
            'execution_time_seconds': round(execution_time, 2),
            'timestamp': datetime.now().isoformat(),
            'max_pages': max_pages,
            'scraping_details': scraping_result
        }
        
        # Extract key metrics
        if scraping_result:
            result.update({
                'products_processed': scraping_result.get('products_processed', 0),
                'products_inserted': scraping_result.get('products_inserted', 0),
                'products_updated': scraping_result.get('products_updated', 0),
                'pages_scraped': scraping_result.get('pages_scraped', scraping_result.get('pages_with_products', 0))
            })
        
        logger.info(f"✅ MobileDokan scraping completed successfully!")
        logger.info(f"   Products processed: {result.get('products_processed', 0)}")
        logger.info(f"   Products inserted: {result.get('products_inserted', 0)}")
        logger.info(f"   Products updated: {result.get('products_updated', 0)}")
        logger.info(f"   Pages scraped: {result.get('pages_scraped', 0)}")
        logger.info(f"   Execution time: {execution_time:.2f} seconds")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ MobileDokan scraping failed: {str(e)}")
        import traceback
        logger.error(f"   Error details: {traceback.format_exc()}")
        
        return {
            'status': 'failed',
            'pipeline_run_id': pipeline_run_id,
            'error': str(e),
            'timestamp': datetime.now().isoformat(),
            'max_pages': max_pages,
            'products_processed': 0,
            'products_inserted': 0,
            'products_updated': 0,
            'pages_scraped': 0
        }

def process_data(pipeline_run_id: str, scraping_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Phase 2: Process data (feature engineering and database loading)
    
    Args:
        pipeline_run_id: Pipeline run identifier
        scraping_result: Results from the extraction phase
        
    Returns:
        Dictionary with processing results
    """
    logger.info("🔧 Phase 2: Data Processing")
    
    try:
        # Import the processing orchestrator
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "process_data", 
            os.path.join(os.path.dirname(__file__), '..', 'github_actions', 'process_data.py')
        )
        process_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(process_module)
        
        # Create mock processor result (no processor rankings update)
        processor_result = {
            'status': 'skipped',
            'pipeline_run_id': pipeline_run_id,
            'timestamp': datetime.now().isoformat()
        }
        
        # Process the data using the existing logic
        df = process_module.get_scraped_data_from_database(pipeline_run_id)
        
        if df is None or len(df) == 0:
            logger.warning("⚠️ No data found in database for processing")
            
            result = {
                'status': 'success',
                'processing_method': 'no_data',
                'pipeline_run_id': pipeline_run_id,
                'timestamp': datetime.now().isoformat(),
                'records_processed': 0,
                'quality_score': 100.0,
                'quality_passed': True,
                'message': 'No data to process'
            }
        else:
            # Load processor rankings if available
            processor_df = process_module.load_processor_rankings()
            
            # Process the data
            logger.info(f"📊 Processing {len(df)} records...")
            result = process_module.process_data_with_pipeline(df, processor_df, pipeline_run_id, test_mode=False)
            result['pipeline_run_id'] = pipeline_run_id
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
            result = convert_numpy_types(result)
        
        logger.info(f"✅ Data processing completed successfully!")
        logger.info(f"   Records processed: {result.get('records_processed', 0)}")
        logger.info(f"   Quality score: {result.get('quality_score', 0):.2f}")
        logger.info(f"   Features generated: {result.get('features_generated', 0)}")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Data processing failed: {str(e)}")
        import traceback
        logger.error(f"   Error details: {traceback.format_exc()}")
        
        return {
            'status': 'failed',
            'processing_method': 'unknown',
            'error': str(e),
            'pipeline_run_id': pipeline_run_id,
            'timestamp': datetime.now().isoformat(),
            'records_processed': 0,
            'quality_score': 0.0,
            'execution_time_seconds': 0
        }

def load_data(pipeline_run_id: str, processing_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Phase 3: Load data (validation and consistency checks)
    
    Args:
        pipeline_run_id: Pipeline run identifier
        processing_result: Results from the processing phase
        
    Returns:
        Dictionary with loading results
    """
    logger.info("🔍 Phase 3: Data Loading and Validation")
    
    try:
        # Import the loading orchestrator
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "load_data", 
            os.path.join(os.path.dirname(__file__), '..', 'github_actions', 'load_data.py')
        )
        load_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(load_module)
        
        # Validate processing results (database loading now happens in processing step)
        validation_result = load_module.validate_processing_results(processing_result)
        
        result = {
            'status': validation_result['status'],
            'method': 'validation_only',
            'pipeline_run_id': pipeline_run_id,
            'timestamp': datetime.now().isoformat(),
            'validation': validation_result
        }
        
        # Copy metrics from processing result if validation was successful
        if validation_result['status'] == 'success':
            result.update({
                'records_processed': validation_result.get('records_processed', 0),
                'records_inserted': validation_result.get('records_inserted', 0),
                'records_updated': validation_result.get('records_updated', 0),
                'total_loaded': validation_result.get('total_loaded', 0)
            })
            
            # Perform additional database consistency checks
            logger.info("🔍 Performing database consistency validation...")
            consistency_result = load_module.validate_database_consistency(pipeline_run_id)
            result['consistency_validation'] = consistency_result
        else:
            # If validation failed, copy error information
            result.update({
                'error': validation_result.get('error', 'Validation failed'),
                'validation_type': validation_result.get('validation_type', 'unknown'),
                'records_processed': 0,
                'records_inserted': 0,
                'records_updated': 0
            })
        
        logger.info(f"✅ Data loading validation completed!")
        logger.info(f"   Status: {result['status'].upper()}")
        logger.info(f"   Records processed: {result.get('records_processed', 0)}")
        logger.info(f"   Records inserted: {result.get('records_inserted', 0)}")
        logger.info(f"   Records updated: {result.get('records_updated', 0)}")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Data loading validation failed: {str(e)}")
        import traceback
        logger.error(f"   Error details: {traceback.format_exc()}")
        
        return {
            'status': 'failed',
            'error': str(e),
            'pipeline_run_id': pipeline_run_id,
            'timestamp': datetime.now().isoformat(),
            'records_processed': 0,
            'records_inserted': 0,
            'records_updated': 0
        }

def update_top_searched(pipeline_run_id: str) -> Dict[str, Any]:
    """
    Phase 4: Update top searched phones
    
    Args:
        pipeline_run_id: Pipeline run identifier
        
    Returns:
        Dictionary with top searched update results
    """
    logger.info("📈 Phase 4: Update Top Searched Phones")
    
    try:
        # Import the top searched orchestrator
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "update_top_searched", 
            os.path.join(os.path.dirname(__file__), '..', 'github_actions', 'update_top_searched.py')
        )
        top_searched_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(top_searched_module)
        
        # Run the top searched pipeline
        result = top_searched_module.run_top_searched_pipeline(
            pipeline_run_id=pipeline_run_id,
            test_mode=False,
            limit=10
        )
        
        logger.info(f"✅ Top searched phones update completed!")
        logger.info(f"   Status: {result['status'].upper()}")
        logger.info(f"   Phones updated: {result.get('phones_updated', 0)}")
        logger.info(f"   Method: {result.get('method', 'unknown')}")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Top searched phones update failed: {str(e)}")
        import traceback
        logger.error(f"   Error details: {traceback.format_exc()}")
        
        return {
            'status': 'failed',
            'error': str(e),
            'pipeline_run_id': pipeline_run_id,
            'timestamp': datetime.now().isoformat(),
            'phones_updated': 0
        }

def main():
    """Main pipeline orchestrator"""
    logger.info("🚀 Starting GitHub Actions Pipeline Simulator")
    
    # Generate pipeline run ID
    pipeline_run_id = generate_pipeline_run_id()
    logger.info(f"   Pipeline Run ID: {pipeline_run_id}")
    
    # Results container
    results = {
        'pipeline_run_id': pipeline_run_id,
        'timestamp': datetime.now().isoformat()
    }
    
    try:
        # Phase 1: Extract data
        scraping_result = extract_data(pipeline_run_id, max_pages=10)
        results['extraction'] = scraping_result
        
        if scraping_result['status'] != 'success':
            logger.error("❌ Pipeline failed at extraction phase")
            sys.exit(1)
        
        # Phase 2: Process data
        processing_result = process_data(pipeline_run_id, scraping_result)
        results['processing'] = processing_result
        
        if processing_result['status'] != 'success':
            logger.error("❌ Pipeline failed at processing phase")
            sys.exit(1)
        
        # Phase 3: Load data
        loading_result = load_data(pipeline_run_id, processing_result)
        results['loading'] = loading_result
        
        if loading_result['status'] != 'success':
            logger.error("❌ Pipeline failed at loading phase")
            sys.exit(1)
        
        # Phase 4: Update top searched
        top_searched_result = update_top_searched(pipeline_run_id)
        results['top_searched'] = top_searched_result
        
        if top_searched_result['status'] != 'success':
            logger.error("❌ Pipeline failed at top searched phase")
            sys.exit(1)
        
        # Summary
        logger.info("🎉 GitHub Actions Pipeline Completed Successfully!")
        logger.info("📊 Pipeline Summary:")
        logger.info(f"   Pipeline Run ID: {pipeline_run_id}")
        logger.info(f"   Execution Time: {datetime.now().isoformat()}")
        logger.info("")
        logger.info("📱 Extraction Phase:")
        logger.info(f"   Status: {scraping_result['status'].upper()}")
        logger.info(f"   Pages Scraped: {scraping_result.get('pages_scraped', 0)}")
        logger.info(f"   Products Processed: {scraping_result.get('products_processed', 0)}")
        logger.info(f"   Products Inserted: {scraping_result.get('products_inserted', 0)}")
        logger.info(f"   Products Updated: {scraping_result.get('products_updated', 0)}")
        logger.info(f"   Execution Time: {scraping_result.get('execution_time_seconds', 0):.2f}s")
        logger.info("")
        logger.info("🔧 Processing Phase:")
        logger.info(f"   Status: {processing_result['status'].upper()}")
        logger.info(f"   Records Processed: {processing_result.get('records_processed', 0)}")
        logger.info(f"   Quality Score: {processing_result.get('quality_score', 0):.2f}")
        logger.info(f"   Features Generated: {processing_result.get('features_generated', 0)}")
        logger.info(f"   Execution Time: {processing_result.get('execution_time_seconds', 0):.2f}s")
        logger.info("")
        logger.info("🔍 Loading Phase:")
        logger.info(f"   Status: {loading_result['status'].upper()}")
        logger.info(f"   Records Processed: {loading_result.get('records_processed', 0)}")
        logger.info(f"   Records Inserted: {loading_result.get('records_inserted', 0)}")
        logger.info(f"   Records Updated: {loading_result.get('records_updated', 0)}")
        logger.info("")
        logger.info("📈 Top Searched Phase:")
        logger.info(f"   Status: {top_searched_result['status'].upper()}")
        logger.info(f"   Phones Updated: {top_searched_result.get('phones_updated', 0)}")
        logger.info(f"   Method: {top_searched_result.get('method', 'unknown')}")
        
        sys.exit(0)
        
    except Exception as e:
        logger.error(f"❌ Pipeline orchestrator failed: {str(e)}")
        import traceback
        logger.error(f"   Error details: {traceback.format_exc()}")
        sys.exit(1)

if __name__ == "__main__":
    main()