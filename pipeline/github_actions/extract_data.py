#!/usr/bin/env python3
"""
Data Extraction Orchestrator for GitHub Actions Pipeline

This script coordinates the data extraction phase including:
1. MobileDokan scraping
2. Processor rankings scraping
3. Error handling and retry logic
4. Results aggregation
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
from pipeline.scrapers.mobile_scrapers import MobileDokanScraper

def setup_logging():
    """Setup basic logging for the extraction process"""
    import logging
    
    # Reduce logging verbosity in production
    log_level = getattr(logging, config.log_level)
    if config.environment == 'production':
        log_level = logging.WARNING  # Only show warnings and errors in production
    
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger(__name__)

def scrape_mobile_data(pipeline_run_id: str, max_pages: Optional[int] = None, test_mode: bool = False) -> Dict[str, Any]:
    """
    Scrape mobile phone data from MobileDokan
    
    Args:
        pipeline_run_id: Unique identifier for this pipeline run
        max_pages: Maximum number of pages to scrape (None = all pages)
        test_mode: Whether to run in test mode with limited data
        
    Returns:
        Dictionary with scraping results
    """
    logger = setup_logging()
    
    try:
        logger.info(f"🚀 Starting MobileDokan scraping (Run ID: {pipeline_run_id})")
        
        # Initialize scraper
        scraper = MobileDokanScraper(database_url=config.database_url)
        
        # Adjust max_pages for test mode
        if test_mode and max_pages is None:
            max_pages = 2
            logger.debug(f"   Test mode: Limited to {max_pages} pages")
        
        # Start scraping
        start_time = time.time()
        scraping_result = scraper.scrape_and_store(
            max_pages=max_pages,
            pipeline_run_id=pipeline_run_id,
            check_updates=True,
            batch_size=config.batch_size
        )
        
        execution_time = time.time() - start_time
        
        # Prepare result
        result = {
            'status': 'success',
            'pipeline_run_id': pipeline_run_id,
            'execution_time_seconds': round(execution_time, 2),
            'timestamp': datetime.now().isoformat(),
            'test_mode': test_mode,
            'max_pages': max_pages,
            'scraping_details': scraping_result
        }
        
        # Extract key metrics
        if scraping_result:
            result.update({
                'products_processed': scraping_result.get('products_processed', 0),
                'products_inserted': scraping_result.get('products_inserted', 0),
                'products_updated': scraping_result.get('products_updated', 0),
                'pages_scraped': scraping_result.get('pages_scraped', 0)
            })
        
        logger.info(f"✅ MobileDokan scraping completed!")
        logger.info(f"   Products: {result.get('products_processed', 0)} processed")
        logger.info(f"   Pages: {result.get('pages_scraped', 0)} scraped")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ MobileDokan scraping failed: {str(e)}")
        
        return {
            'status': 'failed',
            'pipeline_run_id': pipeline_run_id,
            'error': str(e),
            'timestamp': datetime.now().isoformat(),
            'test_mode': test_mode,
            'max_pages': max_pages,
            'products_processed': 0,
            'products_inserted': 0,
            'products_updated': 0,
            'pages_scraped': 0
        }

def scrape_processor_rankings(pipeline_run_id: str, force_update: bool = False, test_mode: bool = False) -> Dict[str, Any]:
    """
    Scrape processor rankings data using cache-first strategy (20-day caching)
    
    Args:
        pipeline_run_id: Unique identifier for this pipeline run
        force_update: Whether to force update even if cache is fresh
        test_mode: Whether to run in test mode
        
    Returns:
        Dictionary with processor scraping results
    """
    logger = setup_logging()
    
    try:
        logger.info(f"🔧 Starting processor rankings with cache-first strategy (Run ID: {pipeline_run_id})")
        
        start_time = time.time()
        
        # Use the new cache-first data loader
        try:
            from pipeline.loaders.processor_loader import ProcessorDataLoader
            
            # Initialize loader with 20-day cache
            cache_age_days = 20
            loader = ProcessorDataLoader(max_cache_age_days=cache_age_days)
            
            # Load data using cache-first strategy
            response = loader.load_processor_data(force_refresh=force_update)
            
            execution_time = time.time() - start_time
            
            if response.success:
                df = response.data
                cache_info = response.cache_info
                
                # Save to CSV file for backward compatibility
                processor_file = config.get_output_paths()['processor_rankings']
                os.makedirs(os.path.dirname(processor_file), exist_ok=True)
                df.to_csv(processor_file, index=False)
                
                # Prepare result
                result = {
                    'status': 'success',
                    'pipeline_run_id': pipeline_run_id,
                    'source': cache_info.data_source,
                    'processors_count': len(df),
                    'execution_time_seconds': round(execution_time, 2),
                    'timestamp': datetime.now().isoformat(),
                    'test_mode': test_mode,
                    'cache_age_days': round(cache_info.cache_age_days, 1),
                    'cache_valid': cache_info.is_cache_valid,
                    'fallback_used': response.fallback_used
                }
                
                # Log success details
                logger.info(f"✅ Processor rankings loaded successfully!")
                logger.info(f"   Source: {cache_info.data_source}")
                logger.info(f"   Processors: {len(df)}")
                
                if response.fallback_used:
                    logger.warning(f"⚠️ Fallback used")
                
                return result
                
            else:
                # Cache-first strategy failed completely
                logger.error(f"❌ Processor rankings loading failed: {response.message}")
                return {
                    'status': 'failed',
                    'pipeline_run_id': pipeline_run_id,
                    'error': response.message,
                    'timestamp': datetime.now().isoformat(),
                    'test_mode': test_mode,
                    'processors_count': 0
                }
                
        except ImportError as e:
            logger.error(f"❌ ProcessorDataLoader not available: {str(e)}")
            return {
                'status': 'failed',
                'pipeline_run_id': pipeline_run_id,
                'error': f"ProcessorDataLoader not available: {str(e)}",
                'timestamp': datetime.now().isoformat(),
                'test_mode': test_mode,
                'processors_count': 0
            }
            
    except Exception as e:
        logger.error(f"❌ Processor rankings scraping failed: {str(e)}")
        return {
            'status': 'failed',
            'pipeline_run_id': pipeline_run_id,
            'error': str(e),
            'timestamp': datetime.now().isoformat(),
            'test_mode': test_mode,
            'processors_count': 0
        }

def main():
    """Main extraction orchestrator"""
    parser = argparse.ArgumentParser(description='Data Extraction Orchestrator')
    parser.add_argument('--pipeline-run-id', required=True, help='Pipeline run identifier')
    parser.add_argument('--max-pages', type=str, help='Maximum pages to scrape')
    parser.add_argument('--skip-processor-rankings', type=str, default='false', help='Skip processor rankings update')
    parser.add_argument('--test-mode', type=str, default='false', help='Run in test mode')
    
    args = parser.parse_args()
    
    # Parse arguments
    max_pages = int(args.max_pages) if args.max_pages and args.max_pages.isdigit() else None
    skip_processor_rankings = args.skip_processor_rankings.lower() == 'true'
    test_mode = args.test_mode.lower() == 'true'
    
    logger = setup_logging()
    logger.info(f"🔧 Starting data extraction orchestrator")
    logger.info(f"   Pipeline Run ID: {args.pipeline_run_id}")
    logger.info(f"   Test mode: {test_mode}")
    logger.info(f"   Skip processor rankings: {skip_processor_rankings}")
    
    try:
        # Scrape mobile data
        scraping_result = scrape_mobile_data(args.pipeline_run_id, max_pages, test_mode)
        
        # Scrape processor rankings unless skipped
        processor_result = {
            'status': 'skipped',
            'message': 'Processor rankings update skipped by user request'
        }
        
        if not skip_processor_rankings:
            processor_result = scrape_processor_rankings(args.pipeline_run_id, force_update=False, test_mode=test_mode)
        else:
            logger.info("⏭️ Skipping processor rankings update as requested")
        
        # Prepare final results
        results = {
            'scraping_result': scraping_result,
            'processor_result': processor_result,
            'pipeline_run_id': args.pipeline_run_id,
            'timestamp': datetime.now().isoformat()
        }
        
        # Convert to JSON-serializable format
        def convert_numpy_types(obj):
            """Convert numpy types to native Python types for JSON serialization"""
            if hasattr(obj, 'item'):
                return obj.item()
            elif isinstance(obj, dict):
                return {k: convert_numpy_types(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_numpy_types(v) for v in obj]
            else:
                return obj
        
        json_safe_results = convert_numpy_types(results)
        
        # Set GitHub Actions output
        if 'GITHUB_OUTPUT' in os.environ:
            with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                f.write(f"scraping_result={json.dumps(json_safe_results['scraping_result'])}\n")
                f.write(f"processor_result={json.dumps(json_safe_results['processor_result'])}\n")
        
        # Summary
        logger.info(f"🎯 Data extraction completed")
        logger.info(f"   Mobile scraping: {scraping_result['status'].upper()}")
        logger.info(f"   Processor scraping: {processor_result['status'].upper()}")
        
        # Exit with appropriate code
        scraping_success = scraping_result['status'] == 'success'
        processor_success = processor_result['status'] in ['success', 'skipped']
        
        sys.exit(0 if scraping_success and processor_success else 1)
        
    except Exception as e:
        logger.error(f"❌ Data extraction orchestrator failed: {str(e)}")
        
        # Set failed outputs for GitHub Actions
        failed_result = {
            'status': 'failed',
            'error': str(e),
            'pipeline_run_id': args.pipeline_run_id,
            'timestamp': datetime.now().isoformat()
        }
        
        if 'GITHUB_OUTPUT' in os.environ:
            with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                f.write(f"scraping_result={json.dumps(failed_result)}\n")
                f.write(f"processor_result={json.dumps(failed_result)}\n")
        
        sys.exit(1)

if __name__ == "__main__":
    main()