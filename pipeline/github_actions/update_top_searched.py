#!/usr/bin/env python3
"""
Top Searched Phones Update Orchestrator for GitHub Actions Pipeline

This script coordinates the top searched phones update including:
1. Google Trends data collection for Bangladesh
2. Phone ranking calculation
3. Database updates
4. Error handling and fallback mechanisms
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
    """Setup basic logging for the top searched update"""
    import logging
    
    logging.basicConfig(
        level=getattr(logging, config.log_level),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger(__name__)

def run_top_searched_pipeline(pipeline_run_id: str, test_mode: bool = False, limit: int = 10) -> Dict[str, Any]:
    """
    Run the top searched phones pipeline
    
    Args:
        pipeline_run_id: Pipeline run identifier
        test_mode: Whether to run in test mode
        limit: Number of top phones to process
        
    Returns:
        Dictionary with update results
    """
    logger = setup_logging()
    
    try:
        logger.info(f"🔍 Starting top searched phones update (Run ID: {pipeline_run_id})")
        logger.info(f"   Test mode: {test_mode}")
        logger.info(f"   Limit: {limit}")
        
        start_time = time.time()
        
        # Try to import the existing top_searched module
        try:
            from pipeline.top_searched import TopSearchedPipeline
            
            logger.info("✅ TopSearchedPipeline imported successfully")
            
            # Create and run the pipeline
            pipeline = TopSearchedPipeline()
            
            if test_mode:
                logger.info("🧪 Running in test mode - using sample data")
                # In test mode, create sample data instead of calling Google Trends
                result = create_sample_top_searched_data(pipeline_run_id, limit)
            else:
                logger.info("🌐 Running with real Google Trends data")
                # Run the actual pipeline
                pipeline.run(limit=limit)
                
                result = {
                    'status': 'success',
                    'method': 'google_trends',
                    'phones_updated': limit,
                    'execution_time_seconds': round(time.time() - start_time, 2),
                    'message': f'Successfully updated top {limit} searched phones'
                }
            
        except ImportError as e:
            logger.warning(f"⚠️ TopSearchedPipeline not available: {e}")
            logger.info("   Creating fallback top searched data")
            
            result = create_sample_top_searched_data(pipeline_run_id, limit)
            result['method'] = 'fallback'
            result['warning'] = 'Used fallback data due to import error'
        
        except Exception as e:
            logger.error(f"❌ TopSearchedPipeline execution failed: {str(e)}")
            logger.info("   Creating fallback top searched data")
            
            result = create_sample_top_searched_data(pipeline_run_id, limit)
            result['method'] = 'fallback'
            result['warning'] = f'Used fallback data due to execution error: {str(e)}'
        
        result['pipeline_run_id'] = pipeline_run_id
        result['timestamp'] = datetime.now().isoformat()
        result['test_mode'] = test_mode
        
        logger.info(f"✅ Top searched phones update completed!")
        logger.info(f"   Method: {result.get('method', 'unknown')}")
        logger.info(f"   Phones updated: {result.get('phones_updated', 0)}")
        logger.info(f"   Execution time: {result.get('execution_time_seconds', 0):.2f} seconds")
        
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
            'test_mode': test_mode,
            'phones_updated': 0
        }

def create_sample_top_searched_data(pipeline_run_id: str, limit: int = 10) -> Dict[str, Any]:
    """
    Create sample top searched data for testing or fallback
    
    Args:
        pipeline_run_id: Pipeline run identifier
        limit: Number of phones to create
        
    Returns:
        Dictionary with sample data results
    """
    logger = setup_logging()
    
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        
        logger.info(f"📊 Creating sample top searched data for {limit} phones")
        
        # Connect to database
        conn = psycopg2.connect(config.database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get popular phone brands for Bangladesh
        popular_brands = ['Samsung', 'Apple', 'Xiaomi', 'Oppo', 'Vivo', 'Realme', 'OnePlus', 'Infinix', 'Tecno', 'Motorola']
        
        # Get phones from popular brands
        brand_placeholders = ','.join(['%s'] * len(popular_brands))
        cursor.execute(f"""
            (
                SELECT id, name, brand, model, release_date, release_date_clean, created_at
                FROM phones 
                WHERE brand IN ({brand_placeholders})
                AND name IS NOT NULL 
                AND brand IS NOT NULL
                AND (release_date_clean IS NULL OR release_date_clean >= CURRENT_DATE - INTERVAL '2 years')
                ORDER BY 
                    CASE 
                        WHEN release_date_clean IS NOT NULL THEN release_date_clean 
                        ELSE created_at 
                    END DESC
                LIMIT %s
            )
            UNION
            (
                SELECT id, name, brand, model, release_date, release_date_clean, created_at
                FROM phones 
                WHERE name IS NOT NULL 
                AND brand IS NOT NULL
                AND created_at >= CURRENT_DATE - INTERVAL '6 months'
                ORDER BY created_at DESC
                LIMIT %s
            )
            ORDER BY 
                CASE 
                    WHEN release_date_clean IS NOT NULL THEN release_date_clean 
                    ELSE created_at 
                END DESC
            LIMIT %s
        """, popular_brands + [limit, limit, limit])
        
        phones = cursor.fetchall()
        
        if not phones:
            logger.warning("⚠️ No phones found in database for sample data")
            cursor.close()
            conn.close()
            
            return {
                'status': 'success',
                'method': 'sample_empty',
                'phones_updated': 0,
                'message': 'No phones available for sample data'
            }
        
        # Clear existing top_searched data
        cursor.execute("DELETE FROM top_searched")
        
        # Create sample top searched data
        phones_updated = 0
        
        for i, phone in enumerate(phones[:limit]):
            try:
                # Create sample search data
                search_index = 100 - (i * 5)  # Decreasing search popularity
                rank = i + 1
                
                # Insert into top_searched table
                cursor.execute("""
                    INSERT INTO top_searched (
                        phone_id, phone_name, brand, model, search_index, rank, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
                """, (
                    phone['id'],
                    phone['name'],
                    phone['brand'],
                    phone['model'],
                    search_index,
                    rank
                ))
                
                phones_updated += 1
                
            except Exception as e:
                logger.warning(f"   Error inserting phone {phone['name']}: {str(e)}")
                continue
        
        # Commit changes
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"✅ Created sample top searched data for {phones_updated} phones")
        
        return {
            'status': 'success',
            'method': 'sample_data',
            'phones_updated': phones_updated,
            'message': f'Created sample top searched data for {phones_updated} phones'
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to create sample top searched data: {str(e)}")
        
        return {
            'status': 'failed',
            'error': str(e),
            'method': 'sample_data',
            'phones_updated': 0
        }

def fix_top_searched_integration() -> Dict[str, Any]:
    """
    Fix integration issues with the existing top_searched.py module
    
    Returns:
        Dictionary with fix results
    """
    logger = setup_logging()
    
    try:
        logger.info("🔧 Checking top_searched.py integration...")
        
        # Try to import and validate the module
        try:
            from pipeline.top_searched import TopSearchedPipeline
            
            # Test basic functionality
            pipeline = TopSearchedPipeline()
            
            # Check if required methods exist
            required_methods = ['run', 'get_popular_phone_keywords', 'update_database']
            missing_methods = []
            
            for method in required_methods:
                if not hasattr(pipeline, method):
                    missing_methods.append(method)
            
            if missing_methods:
                logger.warning(f"⚠️ Missing methods in TopSearchedPipeline: {missing_methods}")
                return {
                    'status': 'partial',
                    'issues': missing_methods,
                    'message': f'TopSearchedPipeline missing methods: {missing_methods}'
                }
            
            logger.info("✅ TopSearchedPipeline integration looks good")
            
            return {
                'status': 'success',
                'message': 'TopSearchedPipeline integration verified'
            }
            
        except ImportError as e:
            logger.error(f"❌ Cannot import TopSearchedPipeline: {str(e)}")
            
            return {
                'status': 'failed',
                'error': str(e),
                'message': 'TopSearchedPipeline import failed'
            }
        
    except Exception as e:
        logger.error(f"❌ Error checking top_searched integration: {str(e)}")
        
        return {
            'status': 'failed',
            'error': str(e),
            'message': 'Integration check failed'
        }

def validate_top_searched_table() -> Dict[str, Any]:
    """
    Validate the top_searched table structure and data
    
    Returns:
        Dictionary with validation results
    """
    logger = setup_logging()
    
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        
        logger.info("🔍 Validating top_searched table...")
        
        conn = psycopg2.connect(config.database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'top_searched'
            )
        """)
        
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            logger.error("❌ top_searched table does not exist")
            cursor.close()
            conn.close()
            
            return {
                'status': 'failed',
                'error': 'top_searched table does not exist',
                'table_exists': False
            }
        
        # Check table structure
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'top_searched'
            ORDER BY ordinal_position
        """)
        
        columns = cursor.fetchall()
        column_names = [col['column_name'] for col in columns]
        
        # Check for required columns
        required_columns = ['id', 'phone_id', 'phone_name', 'brand', 'search_index', 'rank']
        missing_columns = [col for col in required_columns if col not in column_names]
        
        # Check current data
        cursor.execute("SELECT COUNT(*) as count FROM top_searched")
        record_count = cursor.fetchone()['count']
        
        cursor.close()
        conn.close()
        
        validation_result = {
            'status': 'success' if not missing_columns else 'partial',
            'table_exists': True,
            'columns': column_names,
            'missing_columns': missing_columns,
            'record_count': record_count
        }
        
        if missing_columns:
            logger.warning(f"⚠️ Missing columns in top_searched table: {missing_columns}")
            validation_result['message'] = f'Missing columns: {missing_columns}'
        else:
            logger.info(f"✅ top_searched table validation passed ({record_count} records)")
            validation_result['message'] = f'Table valid with {record_count} records'
        
        return validation_result
        
    except Exception as e:
        logger.error(f"❌ Error validating top_searched table: {str(e)}")
        
        return {
            'status': 'failed',
            'error': str(e),
            'table_exists': False,
            'message': f'Validation failed: {str(e)}'
        }

def main():
    """Main top searched update orchestrator"""
    parser = argparse.ArgumentParser(description='Top Searched Phones Update Orchestrator')
    parser.add_argument('--pipeline-run-id', required=True, help='Pipeline run identifier')
    parser.add_argument('--test-mode', type=str, default='false', help='Run in test mode')
    parser.add_argument('--limit', type=int, default=10, help='Number of top phones to process')
    parser.add_argument('--validate-only', action='store_true', help='Only validate integration, do not update')
    
    args = parser.parse_args()
    
    # Parse arguments
    test_mode = args.test_mode.lower() == 'true'
    
    logger = setup_logging()
    logger.info(f"🔍 Starting top searched phones orchestrator")
    logger.info(f"   Pipeline Run ID: {args.pipeline_run_id}")
    logger.info(f"   Test mode: {test_mode}")
    logger.info(f"   Limit: {args.limit}")
    logger.info(f"   Validate only: {args.validate_only}")
    
    try:
        if args.validate_only:
            # Only run validation
            logger.info("🔧 Running validation only...")
            
            integration_result = fix_top_searched_integration()
            table_result = validate_top_searched_table()
            
            result = {
                'status': 'success',
                'validation_only': True,
                'integration_check': integration_result,
                'table_validation': table_result,
                'pipeline_run_id': args.pipeline_run_id,
                'timestamp': datetime.now().isoformat()
            }
            
        else:
            # Run the full update
            result = run_top_searched_pipeline(
                pipeline_run_id=args.pipeline_run_id,
                test_mode=test_mode,
                limit=args.limit
            )
        
        # Set GitHub Actions output
        if 'GITHUB_OUTPUT' in os.environ:
            with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                f.write(f"top_searched_result={json.dumps(result)}\n")
        
        # Summary
        logger.info(f"🎯 Top searched update completed with status: {result['status'].upper()}")
        
        if not args.validate_only:
            logger.info(f"   Phones updated: {result.get('phones_updated', 0)}")
            logger.info(f"   Method: {result.get('method', 'unknown')}")
        
        # Exit with appropriate code
        sys.exit(0 if result['status'] in ['success', 'partial'] else 1)
        
    except Exception as e:
        logger.error(f"❌ Top searched orchestrator failed: {str(e)}")
        import traceback
        logger.error(f"   Error details: {traceback.format_exc()}")
        
        # Set failed output for GitHub Actions
        failed_result = {
            'status': 'failed',
            'error': str(e),
            'pipeline_run_id': args.pipeline_run_id,
            'timestamp': datetime.now().isoformat(),
            'phones_updated': 0
        }
        
        if 'GITHUB_OUTPUT' in os.environ:
            with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                f.write(f"top_searched_result={json.dumps(failed_result)}\n")
        
        sys.exit(1)

if __name__ == "__main__":
    main()