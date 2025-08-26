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
    
    logging.basicConfig(
        level=getattr(logging, config.log_level),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger(__name__)

def load_processed_data() -> Optional[object]:
    """Load processed data from CSV file"""
    logger = setup_logging()
    
    try:
        import pandas as pd
        processed_file = config.get_output_paths()['processed_data']
        
        if os.path.exists(processed_file):
            df = pd.read_csv(processed_file)
            logger.info(f"✅ Loaded processed data: {len(df)} records")
            return df
        else:
            logger.warning("⚠️ Processed data file not found")
            return None
            
    except Exception as e:
        logger.error(f"❌ Failed to load processed data: {str(e)}")
        return None

def update_database_with_enhanced_pipeline(df: object, pipeline_run_id: str) -> Dict[str, Any]:
    """
    Update database using enhanced pipeline services
    
    Args:
        df: Processed data DataFrame
        pipeline_run_id: Pipeline run identifier
        
    Returns:
        Dictionary with update results
    """
    logger = setup_logging()
    
    try:
        # Try to import enhanced database updater
        try:
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'processor'))
            from database_updater import DatabaseUpdater
            
            logger.info("✅ Enhanced database updater loaded")
            
            updater = DatabaseUpdater()
            start_time = time.time()
            
            success, results = updater.update_with_transaction(df, pipeline_run_id)
            
            execution_time = time.time() - start_time
            
            if success:
                update_results = results.get('results', {})
                
                result = {
                    'status': 'success',
                    'method': 'enhanced',
                    'records_processed': len(df),
                    'records_inserted': update_results.get('inserted', 0),
                    'records_updated': update_results.get('updated', 0),
                    'records_errors': update_results.get('errors', 0),
                    'execution_time_seconds': round(execution_time, 2),
                    'database_operations': update_results
                }
                
                logger.info(f"✅ Enhanced database update completed successfully!")
                logger.info(f"   Records inserted: {result['records_inserted']}")
                logger.info(f"   Records updated: {result['records_updated']}")
                logger.info(f"   Records with errors: {result['records_errors']}")
                
                return result
            else:
                error_msg = results.get('error', 'Unknown database error')
                logger.error(f"❌ Enhanced database update failed: {error_msg}")
                
                return {
                    'status': 'failed',
                    'method': 'enhanced',
                    'error': error_msg,
                    'records_processed': len(df),
                    'execution_time_seconds': round(execution_time, 2)
                }
                
        except ImportError as e:
            logger.warning(f"⚠️ Enhanced database updater not available: {e}")
            logger.info("   Falling back to basic database operations")
            
            return update_database_basic(df, pipeline_run_id)
            
    except Exception as e:
        logger.error(f"❌ Database update failed: {str(e)}")
        import traceback
        logger.error(f"   Error details: {traceback.format_exc()}")
        
        return {
            'status': 'failed',
            'method': 'enhanced',
            'error': str(e),
            'records_processed': len(df) if df is not None else 0
        }

def update_database_basic(df: object, pipeline_run_id: str) -> Dict[str, Any]:
    """
    Basic database update fallback
    
    Args:
        df: Processed data DataFrame
        pipeline_run_id: Pipeline run identifier
        
    Returns:
        Dictionary with update results
    """
    logger = setup_logging()
    
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        import pandas as pd
        
        logger.info("🔧 Starting basic database update...")
        
        start_time = time.time()
        
        # Connect to database
        conn = psycopg2.connect(config.database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        inserted_count = 0
        updated_count = 0
        error_count = 0
        
        try:
            # Process records in batches
            batch_size = config.database_config['batch_size']
            
            for i in range(0, len(df), batch_size):
                batch = df.iloc[i:i+batch_size]
                logger.info(f"   Processing batch {i//batch_size + 1}: {len(batch)} records")
                
                for _, row in batch.iterrows():
                    try:
                        # Check if record exists (by name or URL)
                        cursor.execute("""
                            SELECT id FROM phones 
                            WHERE name = %s OR url = %s
                            LIMIT 1
                        """, (row.get('name'), row.get('url')))
                        
                        existing = cursor.fetchone()
                        
                        if existing:
                            # Update existing record
                            update_fields = []
                            update_values = []
                            
                            # Update key fields
                            for field in ['price', 'brand', 'model', 'ram', 'internal_storage', 'main_camera', 'front_camera']:
                                if field in row and pd.notna(row[field]):
                                    update_fields.append(f"{field} = %s")
                                    update_values.append(row[field])
                            
                            if update_fields:
                                update_values.append(existing['id'])
                                cursor.execute(f"""
                                    UPDATE phones 
                                    SET {', '.join(update_fields)}, updated_at = NOW()
                                    WHERE id = %s
                                """, update_values)
                                updated_count += 1
                        else:
                            # Insert new record
                            insert_fields = []
                            insert_values = []
                            placeholders = []
                            
                            # Insert key fields
                            for field in ['name', 'brand', 'model', 'price', 'url', 'img_url', 'ram', 'internal_storage', 'main_camera', 'front_camera']:
                                if field in row and pd.notna(row[field]):
                                    insert_fields.append(field)
                                    insert_values.append(row[field])
                                    placeholders.append('%s')
                            
                            if insert_fields:
                                cursor.execute(f"""
                                    INSERT INTO phones ({', '.join(insert_fields)}, created_at, updated_at)
                                    VALUES ({', '.join(placeholders)}, NOW(), NOW())
                                """, insert_values)
                                inserted_count += 1
                                
                    except Exception as row_error:
                        logger.warning(f"   Error processing row: {str(row_error)}")
                        error_count += 1
                        continue
                
                # Commit batch
                conn.commit()
            
            execution_time = time.time() - start_time
            
            result = {
                'status': 'success',
                'method': 'basic',
                'records_processed': len(df),
                'records_inserted': inserted_count,
                'records_updated': updated_count,
                'records_errors': error_count,
                'execution_time_seconds': round(execution_time, 2)
            }
            
            logger.info(f"✅ Basic database update completed successfully!")
            logger.info(f"   Records inserted: {inserted_count}")
            logger.info(f"   Records updated: {updated_count}")
            logger.info(f"   Records with errors: {error_count}")
            
            return result
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"❌ Basic database update failed: {str(e)}")
        import traceback
        logger.error(f"   Error details: {traceback.format_exc()}")
        
        return {
            'status': 'failed',
            'method': 'basic',
            'error': str(e),
            'records_processed': len(df) if df is not None else 0
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
        logger.info(f"   Total records: {checks['total_records']}")
        logger.info(f"   Recent updates: {checks['recent_updates']}")
        
        if issues:
            logger.warning(f"   Issues found: {len(issues)}")
            for issue in issues:
                logger.warning(f"     - {issue}")
        
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
        print(f"❌ Failed to parse processing result JSON: {e}")
        sys.exit(1)
    
    logger = setup_logging()
    logger.info(f"💾 Starting data loading orchestrator")
    logger.info(f"   Pipeline Run ID: {args.pipeline_run_id}")
    logger.info(f"   Test mode: {test_mode}")
    logger.info(f"   Processing status: {processing_result.get('status', 'unknown')}")
    
    try:
        # Check if we have data to load
        if processing_result.get('status') != 'success':
            logger.error("❌ Cannot load data: processing was not successful")
            
            failed_result = {
                'status': 'failed',
                'error': 'No data to load - processing failed',
                'pipeline_run_id': args.pipeline_run_id,
                'timestamp': datetime.now().isoformat(),
                'records_processed': 0,
                'records_inserted': 0,
                'records_updated': 0
            }
            
            # Set GitHub Actions output
            if 'GITHUB_OUTPUT' in os.environ:
                with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                    f.write(f"loading_result={json.dumps(failed_result)}\n")
            
            sys.exit(1)
        
        # Load processed data
        if test_mode:
            logger.info("🧪 Test mode: Simulating data loading...")
            
            result = {
                'status': 'success',
                'method': 'test_simulation',
                'pipeline_run_id': args.pipeline_run_id,
                'timestamp': datetime.now().isoformat(),
                'records_processed': processing_result.get('records_processed', 0),
                'records_inserted': 5,
                'records_updated': 10,
                'records_errors': 0,
                'execution_time_seconds': 2.5,
                'test_mode': True
            }
            
        else:
            logger.info("📊 Loading processed data...")
            df = load_processed_data()
            
            if df is None or len(df) == 0:
                logger.warning("⚠️ No processed data found")
                
                result = {
                    'status': 'success',
                    'method': 'no_data',
                    'pipeline_run_id': args.pipeline_run_id,
                    'timestamp': datetime.now().isoformat(),
                    'records_processed': 0,
                    'records_inserted': 0,
                    'records_updated': 0,
                    'records_errors': 0,
                    'message': 'No data to load'
                }
            else:
                # Update database
                logger.info(f"💾 Updating database with {len(df)} records...")
                result = update_database_with_enhanced_pipeline(df, args.pipeline_run_id)
                result['pipeline_run_id'] = args.pipeline_run_id
                result['timestamp'] = datetime.now().isoformat()
                
                # Validate database consistency (if update was successful)
                if result['status'] == 'success':
                    logger.info("🔍 Validating database consistency...")
                    validation_result = validate_database_consistency(args.pipeline_run_id)
                    result['validation'] = validation_result
        
        # Set GitHub Actions output
        if 'GITHUB_OUTPUT' in os.environ:
            with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                f.write(f"loading_result={json.dumps(result)}\n")
        
        # Summary
        logger.info(f"🎯 Data loading completed with status: {result['status'].upper()}")
        logger.info(f"   Records processed: {result.get('records_processed', 0)}")
        logger.info(f"   Records inserted: {result.get('records_inserted', 0)}")
        logger.info(f"   Records updated: {result.get('records_updated', 0)}")
        
        if 'validation' in result:
            validation = result['validation']
            logger.info(f"   Database health: {validation.get('health_score', 0)}/100")
        
        # Exit with appropriate code
        sys.exit(0 if result['status'] == 'success' else 1)
        
    except Exception as e:
        logger.error(f"❌ Data loading orchestrator failed: {str(e)}")
        import traceback
        logger.error(f"   Error details: {traceback.format_exc()}")
        
        # Set failed output for GitHub Actions
        failed_result = {
            'status': 'failed',
            'error': str(e),
            'pipeline_run_id': args.pipeline_run_id,
            'timestamp': datetime.now().isoformat(),
            'records_processed': 0,
            'records_inserted': 0,
            'records_updated': 0
        }
        
        if 'GITHUB_OUTPUT' in os.environ:
            with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                f.write(f"loading_result={json.dumps(failed_result)}\n")
        
        sys.exit(1)

if __name__ == "__main__":
    main()