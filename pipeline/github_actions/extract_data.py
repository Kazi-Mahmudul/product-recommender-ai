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
    
    logging.basicConfig(
        level=getattr(logging, config.log_level),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
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
        logger.info(f"   Max pages: {max_pages or 'ALL'}")
        logger.info(f"   Test mode: {test_mode}")
        
        # Initialize scraper
        scraper = MobileDokanScraper(database_url=config.database_url)
        
        # Adjust max_pages for test mode
        if test_mode and max_pages is None:
            max_pages = 2
            logger.info(f"   Test mode: Limited to {max_pages} pages")
        
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
            'test_mode': test_mode,
            'max_pages': max_pages,
            'products_processed': 0,
            'products_inserted': 0,
            'products_updated': 0,
            'pages_scraped': 0
        }

def scrape_processor_rankings(pipeline_run_id: str, force_update: bool = False, test_mode: bool = False) -> Dict[str, Any]:
    """
    Scrape processor rankings data
    
    Args:
        pipeline_run_id: Unique identifier for this pipeline run
        force_update: Whether to force update even if cache is fresh
        test_mode: Whether to run in test mode
        
    Returns:
        Dictionary with processor scraping results
    """
    logger = setup_logging()
    
    try:
        logger.info(f"🔧 Starting processor rankings scraping (Run ID: {pipeline_run_id})")
        logger.info(f"   Force update: {force_update}")
        logger.info(f"   Test mode: {test_mode}")
        
        # Check if we should use cached data
        processor_file = config.get_output_paths()['processor_rankings']
        use_cache = False
        
        if os.path.exists(processor_file) and not force_update:
            # Check file age (use cache if less than 7 days old)
            file_age_days = (time.time() - os.path.getmtime(processor_file)) / (24 * 3600)
            if file_age_days < 7:
                use_cache = True
                logger.info(f"   Using cached processor rankings (age: {file_age_days:.1f} days)")
        
        if use_cache:
            # Use cached data
            import pandas as pd
            df = pd.read_csv(processor_file)
            
            result = {
                'status': 'success',
                'pipeline_run_id': pipeline_run_id,
                'source': 'cache',
                'processors_count': len(df),
                'timestamp': datetime.now().isoformat(),
                'test_mode': test_mode,
                'cache_age_days': round(file_age_days, 1)
            }
            
            logger.info(f"✅ Using cached processor rankings: {len(df)} processors")
            
        else:
            # Scrape fresh data
            try:
                from pipeline.scrapers.processor_scraper import ProcessorRankingScraper
                
                scraper = ProcessorRankingScraper()
                start_time = time.time()
                
                # Limit pages in test mode
                max_pages = 2 if test_mode else None
                
                df = scraper.scrape_all_pages(max_pages=max_pages)
                
                # Save to file
                os.makedirs(os.path.dirname(processor_file), exist_ok=True)
                df.to_csv(processor_file, index=False)
                
                execution_time = time.time() - start_time
                
                result = {
                    'status': 'success',
                    'pipeline_run_id': pipeline_run_id,
                    'source': 'scraped',
                    'processors_count': len(df),
                    'execution_time_seconds': round(execution_time, 2),
                    'timestamp': datetime.now().isoformat(),
                    'test_mode': test_mode,
                    'max_pages': max_pages
                }
                
                logger.info(f"✅ Processor rankings scraped successfully!")
                logger.info(f"   Processors found: {len(df)}")
                logger.info(f"   Execution time: {execution_time:.2f} seconds")
                
            except ImportError:
                logger.warning("⚠️ Processor scraper not available, using fallback")
                # Fallback: ensure we have some processor data
                if not os.path.exists(processor_file):
                    logger.error("❌ No processor rankings file found and scraper unavailable")
                    raise Exception("Processor rankings unavailable")
                
                # Use existing file
                import pandas as pd
                df = pd.read_csv(processor_file)
                
                result = {
                    'status': 'success',
                    'pipeline_run_id': pipeline_run_id,
                    'source': 'fallback',
                    'processors_count': len(df),
                    'timestamp': datetime.now().isoformat(),
                    'test_mode': test_mode,
                    'warning': 'Used fallback processor data'
                }
                
                logger.info(f"✅ Using fallback processor rankings: {len(df)} processors")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Processor rankings scraping failed: {str(e)}")
        import traceback
        logger.error(f"   Error details: {traceback.format_exc()}")
        
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
    parser.add_argument('--max-pages', type=str, help='Maximum pages to scrape (empty = all)')
    parser.add_argument('--skip-processor-rankings', type=str, default='false', help='Skip processor rankings')
    parser.add_argument('--test-mode', type=str, default='false', help='Run in test mode')
    
    args = parser.parse_args()
    
    # Parse arguments
    max_pages = None
    if args.max_pages and args.max_pages.strip():
        try:
            max_pages = int(args.max_pages)
        except ValueError:
            print(f"Warning: Invalid max_pages value '{args.max_pages}', using default")
    
    # For scheduled runs, we'll check all pages but use smart update detection
    # This ensures we don't miss updates on any page while being efficient
    if max_pages is None:
        logger.info("   No max_pages specified - will check all pages with smart update detection")
    
    skip_processor = args.skip_processor_rankings.lower() == 'true'
    test_mode = args.test_mode.lower() == 'true'
    
    logger = setup_logging()
    logger.info(f"🚀 Starting data extraction orchestrator")
    logger.info(f"   Pipeline Run ID: {args.pipeline_run_id}")
    logger.info(f"   Max pages: {max_pages or 'ALL'}")
    logger.info(f"   Skip processor rankings: {skip_processor}")
    logger.info(f"   Test mode: {test_mode}")
    
    # Results container
    results = {
        'pipeline_run_id': args.pipeline_run_id,
        'timestamp': datetime.now().isoformat(),
        'test_mode': test_mode
    }
    
    try:
        # 1. Scrape mobile data
        logger.info("📱 Phase 1: Mobile data extraction")
        mobile_result = scrape_mobile_data(
            pipeline_run_id=args.pipeline_run_id,
            max_pages=max_pages,
            test_mode=test_mode
        )
        results['mobile_scraping'] = mobile_result
        
        # 2. Scrape processor rankings (if not skipped)
        if not skip_processor:
            logger.info("🔧 Phase 2: Processor rankings extraction")
            processor_result = scrape_processor_rankings(
                pipeline_run_id=args.pipeline_run_id,
                force_update=False,
                test_mode=test_mode
            )
            results['processor_scraping'] = processor_result
        else:
            logger.info("⏭️ Phase 2: Skipped processor rankings extraction")
            results['processor_scraping'] = {
                'status': 'skipped',
                'pipeline_run_id': args.pipeline_run_id,
                'timestamp': datetime.now().isoformat()
            }
        
        # 3. Determine overall status
        mobile_success = mobile_result.get('status') == 'success'
        processor_success = results['processor_scraping'].get('status') in ['success', 'skipped']
        
        overall_status = 'success' if mobile_success and processor_success else 'partial'
        if not mobile_success:
            overall_status = 'failed'
        
        results['overall_status'] = overall_status
        
        # 4. Output results for GitHub Actions
        scraping_result_json = json.dumps(mobile_result)
        processor_result_json = json.dumps(results['processor_scraping'])
        
        # Set GitHub Actions outputs
        if 'GITHUB_OUTPUT' in os.environ:
            with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                f.write(f"scraping_result={scraping_result_json}\n")
                f.write(f"processor_result={processor_result_json}\n")
        
        # 5. Summary
        logger.info(f"🎯 Data extraction completed with status: {overall_status.upper()}")
        
        if mobile_success:
            logger.info(f"   Mobile data: {mobile_result.get('products_processed', 0)} products processed")
        
        if processor_success and results['processor_scraping'].get('status') == 'success':
            logger.info(f"   Processor data: {results['processor_scraping'].get('processors_count', 0)} processors")
        
        # Exit with appropriate code
        sys.exit(0 if overall_status in ['success', 'partial'] else 1)
        
    except Exception as e:
        logger.error(f"❌ Data extraction orchestrator failed: {str(e)}")
        import traceback
        logger.error(f"   Error details: {traceback.format_exc()}")
        
        # Set failed outputs for GitHub Actions
        failed_result = {
            'status': 'failed',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }
        
        if 'GITHUB_OUTPUT' in os.environ:
            with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                f.write(f"scraping_result={json.dumps(failed_result)}\n")
                f.write(f"processor_result={json.dumps(failed_result)}\n")
        
        sys.exit(1)

if __name__ == "__main__":
    main()