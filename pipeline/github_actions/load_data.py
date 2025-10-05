#!/usr/bin/env python3
"""
Data Loading Orchestrator for GitHub Actions Pipeline

This script coordinates the data loading phase including:
1. Database updates for processed data
2. Transaction management and rollback
3. Database consistency checks
4. Results reporting
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
    """Setup basic logging for the loading process"""
    import logging
    
    # Reduce logging verbosity in production
    log_level = getattr(logging, config.log_level)
    if config.pipeline_env == 'production':
        log_level = logging.WARNING  # Only show warnings and errors in production
    
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger(__name__)

def validate_processing_results(processing_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate that processing and direct database loading completed successfully.
    
    Args:
        processing_result: Result dictionary from the processing step
        
    Returns:
        Dictionary with validation results
    """
    logger = setup_logging()
    
    logger.info("🔍 Validating processing results...")
    
    # Check if processing was successful
    if processing_result.get('status') != 'success':
        return {
            'status': 'failed',
            'error': 'Processing step was not successful',
            'validation_type': 'processing_status'
        }
    
    # Check if direct database loading occurred
    if processing_result.get('database_loading_skipped'):
        logger.warning("⚠️ Direct database loading was skipped")
        return {
            'status': 'warning',
            'message': 'Direct database loading was skipped',
            'validation_type': 'database_loading_skipped',
            'skip_reason': processing_result.get('database_loading_skip_reason', 'Unknown')
        }
    
    # Check if database loading failed
    if processing_result.get('database_loading_failed'):
        return {
            'status': 'failed',
            'error': 'Direct database loading failed during processing',
            'validation_type': 'database_loading_failed'
        }
    
    # Validate database loading metrics
    records_processed = processing_result.get('records_processed', 0)
    records_inserted = processing_result.get('records_inserted', 0)
    records_updated = processing_result.get('records_updated', 0)
    
    total_loaded = records_inserted + records_updated
    
    if records_processed > 0 and total_loaded == 0:
        return {
            'status': 'failed',
            'error': f'No records were loaded to database despite processing {records_processed} records',
            'validation_type': 'no_records_loaded'
        }
    
    logger.info(f"✅ Processing validation successful")
    return {
        'status': 'success',
        'validation_type': 'processing_and_loading',
        'records_processed': records_processed,
        'records_inserted': records_inserted,
        'records_updated': records_updated,
        'total_loaded': total_loaded
    }

def validate_database_consistency(pipeline_run_id: str) -> Dict[str, Any]:
    """
    Validate database consistency after updates
    
    Args:
        pipeline_run_id: Pipeline run identifier
        
    Returns:
        Dictionary with validation results
    """
    logger = setup_logging()
    
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        
        logger.info("🔍 Validating database consistency...")
        
        conn = psycopg2.connect(config.database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Basic consistency checks
        checks = {}
        
        # 1. Count total records
        cursor.execute("SELECT COUNT(*) as total FROM phones")
        checks['total_records'] = cursor.fetchone()['total']
        
        # 2. Count recent updates
        cursor.execute("""
            SELECT COUNT(*) as recent 
            FROM phones 
            WHERE updated_at >= NOW() - INTERVAL '1 day'
        """)
        checks['recent_updates'] = cursor.fetchone()['recent']
        
        # 3. Check for duplicates
        cursor.execute("""
            SELECT COUNT(*) as duplicates
            FROM (
                SELECT name, COUNT(*) 
                FROM phones 
                GROUP BY name 
                HAVING COUNT(*) > 1
            ) dup
        """)
        checks['duplicate_names'] = cursor.fetchone()['duplicates']
        
        # 4. Check data completeness
        cursor.execute("""
            SELECT 
                COUNT(CASE WHEN name IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) as name_completeness,
                COUNT(CASE WHEN price IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) as price_completeness,
                COUNT(CASE WHEN brand IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) as brand_completeness
            FROM phones
        """)
        completeness = cursor.fetchone()
        checks['completeness'] = {
            'name': round(float(completeness['name_completeness']), 2),
            'price': round(float(completeness['price_completeness']), 2),
            'brand': round(float(completeness['brand_completeness']), 2)
        }
        
        cursor.close()
        conn.close()
        
        # Determine overall health
        health_score = 100
        issues = []
        
        if checks['duplicate_names'] > 0:
            health_score -= 10
            issues.append(f"{checks['duplicate_names']} duplicate names found")
        
        avg_completeness = sum(checks['completeness'].values()) / len(checks['completeness'])
        if avg_completeness < 90:
            health_score -= 20
            issues.append(f"Low data completeness: {avg_completeness:.1f}%")
        
        result = {
            'status': 'success',
            'health_score': max(0, health_score),
            'checks': checks,
            'issues': issues,
            'is_healthy': health_score >= 80
        }
        
        logger.info(f"✅ Database validation completed")
        logger.info(f"   Health score: {health_score}/100")
        
        if issues:
            logger.warning(f"⚠️ Issues found: {', '.join(issues)}")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Database validation failed: {str(e)}")
        return {
            'status': 'failed',
            'error': str(e),
            'health_score': 0,
            'is_healthy': False
        }

def main():
    """Main loading orchestrator"""
    parser = argparse.ArgumentParser(description='Data Loading Orchestrator')
    parser.add_argument('--pipeline-run-id', required=True, help='Pipeline run identifier')
    parser.add_argument('--processing-result', required=True, help='JSON string of processing results')
    parser.add_argument('--test-mode', type=str, default='false', help='Run in test mode')
    
    args = parser.parse_args()
    
    # Parse arguments
    test_mode = args.test_mode.lower() == 'true'
    
    try:
        processing_result = json.loads(args.processing_result)
    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse input JSON: {e}")
        sys.exit(1)
    
    logger = setup_logging()
    logger.info(f"🔧 Starting data loading orchestrator")
    logger.info(f"   Pipeline Run ID: {args.pipeline_run_id}")
    logger.info(f"   Test mode: {test_mode}")
    
    try:
        # Validate processing results
        validation_result = validate_processing_results(processing_result)
        
        if validation_result['status'] != 'success':
            logger.error(f"❌ Processing validation failed: {validation_result.get('error', 'Unknown error')}")
            
            # Set GitHub Actions output
            if 'GITHUB_OUTPUT' in os.environ:
                with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                    f.write(f"loading_result={json.dumps(validation_result)}\n")
            
            sys.exit(1)
        
        # Validate database consistency
        consistency_result = validate_database_consistency(args.pipeline_run_id)
        
        # Prepare final result
        result = {
            'status': 'success' if consistency_result['is_healthy'] else 'warning',
            'pipeline_run_id': args.pipeline_run_id,
            'timestamp': datetime.now().isoformat(),
            'test_mode': test_mode,
            'validation_result': validation_result,
            'consistency_result': consistency_result,
            'records_processed': validation_result.get('records_processed', 0),
            'records_inserted': validation_result.get('records_inserted', 0),
            'records_updated': validation_result.get('records_updated', 0)
        }
        
        # Set GitHub Actions output
        if 'GITHUB_OUTPUT' in os.environ:
            with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                f.write(f"loading_result={json.dumps(result)}\n")
        
        # Summary
        logger.info(f"🎯 Data loading completed: {result['status'].upper()}")
        logger.info(f"   Records processed: {result.get('records_processed', 0)}")
        logger.info(f"   Database health: {consistency_result['health_score']}/100")
        
        # Exit with appropriate code
        sys.exit(0 if result['status'] == 'success' else 1)
        
    except Exception as e:
        logger.error(f"❌ Data loading orchestrator failed: {str(e)}")
        
        # Set failed output for GitHub Actions
        failed_result = {
            'status': 'failed',
            'error': str(e),
            'pipeline_run_id': args.pipeline_run_id,
            'timestamp': datetime.now().isoformat(),
            'test_mode': test_mode
        }
        
        if 'GITHUB_OUTPUT' in os.environ:
            with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                f.write(f"loading_result={json.dumps(failed_result)}\n")
        
        sys.exit(1)

if __name__ == "__main__":
    main()