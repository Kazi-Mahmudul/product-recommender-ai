#!/usr/bin/env python3
"""
Direct Database Loader for GitHub Actions Pipeline

This module provides direct in-memory database loading functionality,
eliminating the need for intermediate CSV files in the data pipeline.
"""

import logging
import time
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, Tuple, List
import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import sql


class DirectDatabaseLoader:
    """
    Direct database loader that takes processed DataFrames and loads them
    directly into the database with transaction management and error handling.
    """
    
    def __init__(self, database_url: str, batch_size: int = 50, max_retries: int = 3):
        """
        Initialize the DirectDatabaseLoader.
        
        Args:
            database_url: PostgreSQL database connection URL
            batch_size: Number of records to process in each batch
            max_retries: Maximum number of retry attempts for failed operations
        """
        self.database_url = database_url
        self.batch_size = batch_size
        self.max_retries = max_retries
        self.logger = logging.getLogger(__name__)
        
        # Fields that are commonly available in the phones table
        self.phone_fields = [
            'name', 'brand', 'model', 'price', 'url', 'img_url', 
            'ram', 'internal_storage', 'main_camera', 'front_camera',
            'scraped_at', 'pipeline_run_id', 'data_source', 
            'data_quality_score', 'is_pipeline_managed'
        ]
    
    def load_processed_dataframe(self, processed_df: pd.DataFrame, pipeline_run_id: str) -> Dict[str, Any]:
        """
        Load processed DataFrame directly into the database with transaction management.
        
        Args:
            processed_df: Fully processed DataFrame with all engineered features
            pipeline_run_id: Unique identifier for this pipeline run
            
        Returns:
            Dictionary with loading results and metrics
        """
        start_time = time.time()
        transaction_id = str(uuid.uuid4())
        
        self.logger.info(f"🚀 Starting direct database loading for {len(processed_df)} records")
        self.logger.info(f"   Transaction ID: {transaction_id}")
        self.logger.info(f"   Pipeline Run ID: {pipeline_run_id}")
        
        # Retry logic for database operations
        conn = None
        cursor = None
        
        for attempt in range(self.max_retries):
            try:
                # Connect to database with timeout
                conn = psycopg2.connect(
                    self.database_url,
                    connect_timeout=30,
                    options='-c statement_timeout=300000'  # 5 minute statement timeout
                )
                conn.autocommit = False  # Enable transaction mode
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                
                self.logger.info(f"✅ Database connection established (attempt {attempt + 1})")
                break
                
            except psycopg2.OperationalError as e:
                if attempt < self.max_retries - 1:
                    wait_time = 2 ** attempt  # Exponential backoff
                    self.logger.warning(f"⚠️ Database connection failed (attempt {attempt + 1}), retrying in {wait_time}s: {str(e)}")
                    time.sleep(wait_time)
                    continue
                else:
                    self.logger.error(f"❌ Database connection failed after {self.max_retries} attempts: {str(e)}")
                    return self._create_error_result(e, transaction_id, len(processed_df), time.time() - start_time, False)
            except Exception as e:
                self.logger.error(f"❌ Unexpected database connection error: {str(e)}")
                return self._create_error_result(e, transaction_id, len(processed_df), time.time() - start_time, False)
        
        if conn is None or cursor is None:
            error = Exception("Failed to establish database connection after all retry attempts")
            return self._create_error_result(error, transaction_id, len(processed_df), time.time() - start_time, False)
        
        try:
            
            try:
                # Begin transaction
                self.logger.info("📊 Beginning database transaction...")
                cursor.execute("BEGIN")
                
                # Add pipeline metadata to DataFrame
                processed_df = self._add_pipeline_metadata(processed_df, pipeline_run_id)
                
                # Validate DataFrame before processing
                if len(processed_df) == 0:
                    self.logger.warning("⚠️ No records to process")
                    conn.rollback()
                    return self._create_success_result(transaction_id, 0, 0, 0, time.time() - start_time)
                
                # Check for memory constraints
                memory_limit_mb = 500  # 500MB limit
                df_memory_mb = processed_df.memory_usage(deep=True).sum() / 1024 / 1024
                
                if df_memory_mb > memory_limit_mb:
                    self.logger.warning(f"⚠️ Large dataset detected ({df_memory_mb:.1f}MB), processing in smaller batches")
                    # Reduce batch size for large datasets
                    original_batch_size = self.batch_size
                    self.batch_size = max(10, self.batch_size // 2)
                    self.logger.info(f"   Reduced batch size from {original_batch_size} to {self.batch_size}")
                
                # Identify new records and updates
                new_records, update_records = self._identify_record_operations(cursor, processed_df)
                
                self.logger.info(f"   Records to insert: {len(new_records)}")
                self.logger.info(f"   Records to update: {len(update_records)}")
                
                # Perform database operations with error tracking
                inserted_count, insert_errors = self._insert_new_records_with_error_tracking(cursor, new_records)
                updated_count, update_errors = self._update_existing_records_with_error_tracking(cursor, update_records)
                
                total_errors = insert_errors + update_errors
                
                # Check if too many errors occurred
                error_threshold = 0.1  # 10% error threshold
                total_operations = len(new_records) + len(update_records)
                error_rate = total_errors / total_operations if total_operations > 0 else 0
                
                if error_rate > error_threshold:
                    self.logger.error(f"❌ Error rate too high: {error_rate:.2%} ({total_errors}/{total_operations})")
                    conn.rollback()
                    return self._create_error_result(
                        Exception(f"Error rate too high: {error_rate:.2%}"),
                        transaction_id, len(processed_df), time.time() - start_time, True
                    )
                
                # Commit transaction
                conn.commit()
                self.logger.info("✅ Database transaction committed successfully")
                
                execution_time = time.time() - start_time
                
                result = self._create_success_result(
                    transaction_id, len(processed_df), inserted_count, 
                    updated_count, execution_time, total_errors,
                    (len(new_records) + len(update_records) + self.batch_size - 1) // self.batch_size
                )
                
                self.logger.info(f"✅ Direct database loading completed successfully!")
                self.logger.info(f"   Records inserted: {inserted_count}")
                self.logger.info(f"   Records updated: {updated_count}")
                self.logger.info(f"   Execution time: {execution_time:.2f} seconds")
                
                return result
                
            except Exception as e:
                # Rollback transaction on any error
                conn.rollback()
                self.logger.error(f"❌ Database transaction rolled back due to error: {str(e)}")
                
                return self._create_error_result(e, transaction_id, len(processed_df), time.time() - start_time, True)
                
            finally:
                cursor.close()
                conn.close()
                
        except Exception as e:
            self.logger.error(f"❌ Database connection failed: {str(e)}")
            return self._create_error_result(e, transaction_id, len(processed_df), time.time() - start_time, False)
    
    def _add_pipeline_metadata(self, df: pd.DataFrame, pipeline_run_id: str) -> pd.DataFrame:
        """Add pipeline metadata to the DataFrame."""
        df = df.copy()
        
        # Add pipeline metadata
        df['pipeline_run_id'] = pipeline_run_id
        df['scraped_at'] = datetime.now()
        df['data_source'] = 'github_actions_pipeline'
        df['is_pipeline_managed'] = True
        
        # Add data quality score if available from processing
        if 'quality_score' not in df.columns:
            df['data_quality_score'] = 0.85  # Default quality score
        else:
            df['data_quality_score'] = df['quality_score']
        
        return df
    
    def _identify_record_operations(self, cursor, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Identify which records need to be inserted vs updated.
        
        Args:
            cursor: Database cursor
            df: Processed DataFrame
            
        Returns:
            Tuple of (new_records_df, update_records_df)
        """
        self.logger.info("🔍 Identifying new records and updates...")
        
        # Get existing records by URL and name (primary identifiers)
        urls = df['url'].dropna().tolist()
        names = df['name'].dropna().tolist()
        
        if not urls and not names:
            self.logger.warning("⚠️ No URLs or names found in data, treating all as new records")
            return df, pd.DataFrame()
        
        # Query existing records
        placeholders_url = ','.join(['%s'] * len(urls)) if urls else "''"
        placeholders_name = ','.join(['%s'] * len(names)) if names else "''"
        
        query = f"""
        SELECT id, name, url, brand, model, price, updated_at
        FROM phones 
        WHERE url IN ({placeholders_url}) OR name IN ({placeholders_name})
        """
        
        params = urls + names
        cursor.execute(query, params)
        existing_records = cursor.fetchall()
        
        self.logger.info(f"   Found {len(existing_records)} existing records in database")
        
        # Create sets for fast lookup
        existing_urls = {record['url'] for record in existing_records if record['url']}
        existing_names = {record['name'] for record in existing_records if record['name']}
        
        # Split DataFrame into new and update records
        new_mask = ~(df['url'].isin(existing_urls) | df['name'].isin(existing_names))
        new_records = df[new_mask].copy()
        update_records = df[~new_mask].copy()
        
        return new_records, update_records
    
# Old insert/update methods removed - now using error tracking versions
    
    def _create_error_result(self, error: Exception, transaction_id: str, 
                           records_count: int, execution_time: float, 
                           rollback_successful: bool) -> Dict[str, Any]:
        """Create standardized error result dictionary."""
        import traceback
        
        error_type = 'database_connection'
        if 'transaction' in str(error).lower():
            error_type = 'transaction_error'
        elif 'processing' in str(error).lower():
            error_type = 'processing_error'
        
        return {
            'status': 'failed',
            'method': 'direct_loading',
            'error_type': error_type,
            'error_message': str(error),
            'failed_at_step': 'database_loading',
            'records_processed_before_failure': 0,
            'records_inserted': 0,
            'records_updated': 0,
            'records_errors': records_count,
            'execution_time_seconds': round(execution_time, 2),
            'database_operations': {
                'transaction_id': transaction_id,
                'batch_operations': 0,
                'rollback_occurred': rollback_successful
            },
            'rollback_successful': rollback_successful,
            'retry_recommended': error_type == 'database_connection',
            'error_details': traceback.format_exc()
        }
    
    def _create_success_result(self, transaction_id: str, records_processed: int, 
                             inserted_count: int, updated_count: int, execution_time: float,
                             error_count: int = 0, batch_operations: int = 0) -> Dict[str, Any]:
        """Create standardized success result dictionary."""
        return {
            'status': 'success',
            'method': 'direct_loading',
            'records_processed': records_processed,
            'records_inserted': inserted_count,
            'records_updated': updated_count,
            'records_errors': error_count,
            'execution_time_seconds': round(execution_time, 2),
            'database_operations': {
                'transaction_id': transaction_id,
                'batch_operations': batch_operations,
                'rollback_occurred': False
            }
        }
    
    def _insert_new_records_with_error_tracking(self, cursor, new_records: pd.DataFrame) -> Tuple[int, int]:
        """Insert new records with error tracking."""
        if len(new_records) == 0:
            return 0, 0
        
        self.logger.info(f"📝 Inserting {len(new_records)} new records...")
        
        inserted_count = 0
        error_count = 0
        
        # Process in batches
        for i in range(0, len(new_records), self.batch_size):
            batch = new_records.iloc[i:i+self.batch_size]
            batch_num = i // self.batch_size + 1
            total_batches = (len(new_records) + self.batch_size - 1) // self.batch_size
            
            self.logger.info(f"   Processing insert batch {batch_num}/{total_batches}: {len(batch)} records")
            
            for _, row in batch.iterrows():
                try:
                    # Prepare insert data
                    insert_fields = []
                    insert_values = []
                    placeholders = []
                    
                    # Add available fields
                    for field in self.phone_fields:
                        if field in row and pd.notna(row[field]):
                            insert_fields.append(field)
                            insert_values.append(row[field])
                            placeholders.append('%s')
                    
                    # Add timestamp fields
                    insert_fields.extend(['created_at', 'updated_at'])
                    insert_values.extend([datetime.now(), datetime.now()])
                    placeholders.extend(['%s', '%s'])
                    
                    if insert_fields:
                        insert_query = f"""
                        INSERT INTO phones ({', '.join(insert_fields)})
                        VALUES ({', '.join(placeholders)})
                        """
                        
                        cursor.execute(insert_query, insert_values)
                        inserted_count += 1
                        
                except Exception as e:
                    self.logger.warning(f"   ⚠️ Failed to insert record: {str(e)}")
                    error_count += 1
                    continue
        
        self.logger.info(f"   ✅ Successfully inserted {inserted_count} records ({error_count} errors)")
        return inserted_count, error_count
    
    def _update_existing_records_with_error_tracking(self, cursor, update_records: pd.DataFrame) -> Tuple[int, int]:
        """Update existing records with error tracking."""
        if len(update_records) == 0:
            return 0, 0
        
        self.logger.info(f"🔄 Updating {len(update_records)} existing records...")
        
        updated_count = 0
        error_count = 0
        
        # Process in batches
        for i in range(0, len(update_records), self.batch_size):
            batch = update_records.iloc[i:i+self.batch_size]
            batch_num = i // self.batch_size + 1
            total_batches = (len(update_records) + self.batch_size - 1) // self.batch_size
            
            self.logger.info(f"   Processing update batch {batch_num}/{total_batches}: {len(batch)} records")
            
            for _, row in batch.iterrows():
                try:
                    # Find existing record by URL or name
                    cursor.execute("""
                        SELECT id FROM phones 
                        WHERE url = %s OR name = %s
                        LIMIT 1
                    """, (row.get('url'), row.get('name')))
                    
                    existing = cursor.fetchone()
                    if not existing:
                        error_count += 1
                        continue
                    
                    # Prepare update data
                    update_fields = []
                    update_values = []
                    
                    # Update key fields that might have changed
                    updateable_fields = ['price', 'brand', 'model', 'ram', 'internal_storage', 
                                       'main_camera', 'front_camera', 'img_url', 'data_quality_score']
                    
                    for field in updateable_fields:
                        if field in row and pd.notna(row[field]):
                            update_fields.append(f"{field} = %s")
                            update_values.append(row[field])
                    
                    # Always update pipeline metadata (this is correct for production)
                    # The issue was that we tested with production data
                    update_fields.extend([
                        'pipeline_run_id = %s',
                        'scraped_at = %s', 
                        'updated_at = %s'
                    ])
                    update_values.extend([
                        row.get('pipeline_run_id'),
                        row.get('scraped_at', datetime.now()),
                        datetime.now()
                    ])
                    
                    if update_fields:
                        update_query = f"""
                        UPDATE phones 
                        SET {', '.join(update_fields)}
                        WHERE id = %s
                        """
                        
                        update_values.append(existing['id'])
                        cursor.execute(update_query, update_values)
                        updated_count += 1
                        
                except Exception as e:
                    self.logger.warning(f"   ⚠️ Failed to update record: {str(e)}")
                    error_count += 1
                    continue
        
        self.logger.info(f"   ✅ Successfully updated {updated_count} records ({error_count} errors)")
        return updated_count, error_count