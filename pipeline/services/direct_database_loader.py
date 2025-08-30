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
from psycopg2 import sql, IntegrityError

# Import the new dynamic field detection system
try:
    from .update_field_generator import UpdateFieldGenerator
    from .column_classifier import ColumnClassifier
    from .update_logger import UpdateLogger, FieldUpdateTracker, UpdateResult
    ENHANCED_FIELD_DETECTION = True
except ImportError as e:
    # Try absolute imports as fallback
    try:
        from pipeline.services.update_field_generator import UpdateFieldGenerator
        from pipeline.services.column_classifier import ColumnClassifier
        from pipeline.services.update_logger import UpdateLogger, FieldUpdateTracker, UpdateResult
        ENHANCED_FIELD_DETECTION = True
    except ImportError as e2:
        ENHANCED_FIELD_DETECTION = False
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Enhanced field detection not available: {e}, {e2}")


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
        
        # Initialize enhanced field detection system
        if ENHANCED_FIELD_DETECTION:
            self.field_generator = UpdateFieldGenerator(database_url)
            self.column_classifier = ColumnClassifier()
            self.update_logger = UpdateLogger(f"{__name__}.DirectDatabaseLoader")
            self.field_tracker = FieldUpdateTracker()
            self.logger.info("✅ Enhanced field detection and logging system initialized")
        else:
            self.field_generator = None
            self.column_classifier = None
            self.update_logger = None
            self.field_tracker = None
            self.logger.warning("⚠️ Enhanced field detection not available, using fallback mode")
        
        # Comprehensive fallback fields (includes feature-engineered columns)
        self.fallback_phone_fields = [
            # Basic phone fields
            'name', 'brand', 'model', 'price', 'url', 'img_url', 
            'ram', 'internal_storage', 'storage', 'internal',
            'main_camera', 'front_camera', 'primary_camera_resolution', 'selfie_camera_resolution',
            'display_resolution', 'screen_size_inches', 'pixel_density_ppi', 'refresh_rate_hz',
            'capacity', 'battery_capacity', 'quick_charging', 'wireless_charging', 'charging',
            'processor', 'chipset', 'network', 'technology', 'wlan', 'wifi', 'bluetooth', 'nfc',
            'fingerprint', 'finger_sensor_type', 'biometrics', 'security',
            'release_date', 'status', 'camera_setup', 'company',
            
            # Feature-engineered columns (the ones that were missing!)
            'performance_score', 'display_score', 'battery_score', 'camera_score',
            'connectivity_score', 'security_score', 'overall_device_score',
            'storage_gb', 'ram_gb', 'price_original', 'price_per_gb', 'price_per_gb_ram',
            'screen_size_numeric', 'resolution_width', 'resolution_height', 
            'ppi_numeric', 'refresh_rate_numeric', 'battery_capacity_numeric',
            'primary_camera_mp', 'selfie_camera_mp', 'camera_count',
            'charging_wattage', 'has_fast_charging', 'has_wireless_charging',
            'is_popular_brand', 'is_new_release', 'is_upcoming', 'age_in_months',
            'price_category', 'processor_rank', 'slug', 'release_date_clean',
            
            # Metadata fields
            'scraped_at', 'pipeline_run_id', 'data_source', 
            'data_quality_score', 'is_pipeline_managed', 'last_price_check'
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
        
        # Start enhanced logging session if available
        if self.update_logger:
            session_description = f"Direct database loading: {len(processed_df)} records (Pipeline: {pipeline_run_id})"
            self.update_logger.start_update_session(session_description)
        
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
                
                # Check if too many errors occurred (excluding duplicate handling)
                error_threshold = 0.25  # 25% error threshold (more lenient since we handle duplicates)
                total_operations = len(new_records) + len(update_records)
                error_rate = total_errors / total_operations if total_operations > 0 else 0
                
                if error_rate > error_threshold and total_operations > 0:
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
                
                # Enhanced logging summary if available
                if self.update_logger and self.field_tracker:
                    try:
                        # Create comprehensive update result
                        field_summary = self.field_tracker.get_update_summary()
                        
                        update_result = UpdateResult(
                            total_records=len(processed_df),
                            successful_updates=inserted_count + updated_count,
                            failed_updates=total_errors,
                            updated_field_counts=field_summary['field_update_counts'],
                            skipped_fields=[],  # Will be populated by schema validation
                            error_details=[],   # Could be enhanced with detailed error tracking
                            execution_time_seconds=execution_time,
                            feature_engineered_updates=field_summary['category_stats'].get('feature_engineered', 0),
                            basic_field_updates=field_summary['category_stats'].get('basic_fields', 0),
                            metadata_updates=field_summary['category_stats'].get('metadata', 0)
                        )
                        
                        self.update_logger.log_field_update_summary(update_result)
                        self.update_logger.end_update_session(update_result)
                        
                        # Log performance metrics
                        records_per_second = len(processed_df) / execution_time if execution_time > 0 else 0
                        fields_per_second = field_summary['total_field_updates'] / execution_time if execution_time > 0 else 0
                        self.update_logger.log_performance_metrics(records_per_second, fields_per_second)
                        
                    except Exception as e:
                        self.logger.warning(f"⚠️ Enhanced logging summary failed: {str(e)}")
                
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
    
    def _get_all_available_columns(self, df: pd.DataFrame) -> List[str]:
        """
        Get all available columns from DataFrame, excluding system fields.
        This is used as ultimate fallback when enhanced detection fails.
        
        Args:
            df: DataFrame to analyze
            
        Returns:
            List of all updatable column names
        """
        # Exclude system fields that should never be updated
        excluded_fields = {'id'}
        
        # Get all columns except excluded ones
        available_columns = [col for col in df.columns if col not in excluded_fields]
        
        self.logger.info(f"🔄 Fallback: Using all available columns ({len(available_columns)} fields)")
        return available_columns
    
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
        
        # Get existing records by URL (primary identifier)
        urls = df['url'].dropna().unique().tolist()
        
        if not urls:
            self.logger.warning("⚠️ No URLs found in data, treating all as new records")
            return df, pd.DataFrame()
        
        # Query existing records in batches to avoid parameter limits
        existing_urls = set()
        batch_size = 1000  # PostgreSQL parameter limit
        
        for i in range(0, len(urls), batch_size):
            batch_urls = urls[i:i+batch_size]
            placeholders = ','.join(['%s'] * len(batch_urls))
            
            query = f"""
            SELECT DISTINCT url
            FROM phones 
            WHERE url IN ({placeholders})
            """
            
            cursor.execute(query, batch_urls)
            batch_existing = cursor.fetchall()
            existing_urls.update(record['url'] for record in batch_existing if record['url'])
        
        self.logger.info(f"   Found {len(existing_urls)} existing URLs in database")
        
        # Split DataFrame into new and update records based on URL
        new_mask = ~df['url'].isin(existing_urls)
        new_records = df[new_mask].copy()
        update_records = df[~new_mask].copy()
        
        self.logger.info(f"   Records to insert: {len(new_records)}")
        self.logger.info(f"   Records to update: {len(update_records)}")
        
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
        """Insert new records with comprehensive field detection and error tracking."""
        if len(new_records) == 0:
            return 0, 0
        
        self.logger.info(f"📝 Inserting {len(new_records)} new records with enhanced field detection...")
        
        inserted_count = 0
        error_count = 0
        field_insert_stats = {}
        
        # Generate insertable fields using enhanced system if available
        if self.field_generator:
            try:
                update_strategy = self.field_generator.generate_update_strategy(new_records, cursor, 'phones')
                insertable_columns = update_strategy['final_updatable_columns']
                
                self.logger.info(f"📊 Enhanced Insert Strategy:")
                self.logger.info(f"   Total insertable columns: {len(insertable_columns)}")
                
            except Exception as e:
                self.logger.warning(f"⚠️ Enhanced field detection failed for inserts, using comprehensive fallback: {str(e)}")
                insertable_columns = self._get_all_available_columns(new_records)
        else:
            self.logger.warning("⚠️ Enhanced system not available for inserts, using comprehensive fallback")
            insertable_columns = self._get_all_available_columns(new_records)
        
        # Process in batches
        for i in range(0, len(new_records), self.batch_size):
            batch = new_records.iloc[i:i+self.batch_size]
            batch_num = i // self.batch_size + 1
            total_batches = (len(new_records) + self.batch_size - 1) // self.batch_size
            
            self.logger.info(f"   Processing insert batch {batch_num}/{total_batches}: {len(batch)} records")
            
            for _, row in batch.iterrows():
                try:
                    # Prepare insert data using dynamic field detection
                    insert_fields = []
                    insert_values = []
                    placeholders = []
                    
                    # Use enhanced field detection if available
                    if self.field_generator:
                        try:
                            record_insertable_fields = self.field_generator.generate_updatable_fields(
                                new_records, row, cursor, 'phones'
                            )
                        except Exception as e:
                            self.logger.debug(f"Field generation failed for insert record, using fallback: {str(e)}")
                            record_insertable_fields = insertable_columns
                    else:
                        record_insertable_fields = insertable_columns
                    
                    # Add available fields with data (excluding timestamp fields that we'll add manually)
                    for field in record_insertable_fields:
                        if field in row and pd.notna(row[field]) and field not in ['created_at', 'updated_at']:
                            # Validate data type before adding to prevent transaction aborts
                            try:
                                value = row[field]
                                # Basic validation - skip obviously invalid values
                                if isinstance(value, str) and value.lower() in ['nan', 'null', 'none', '']:
                                    continue
                                
                                insert_fields.append(field)
                                insert_values.append(value)
                                placeholders.append('%s')
                                
                                # Track field insert statistics
                                if field not in field_insert_stats:
                                    field_insert_stats[field] = 0
                                field_insert_stats[field] += 1
                                
                            except Exception as e:
                                self.logger.debug(f"Skipping invalid field {field}: {str(e)}")
                                continue
                    
                    # Always add timestamp fields (ensure they're only added once)
                    insert_fields.extend(['created_at', 'updated_at'])
                    insert_values.extend([datetime.now(), datetime.now()])
                    placeholders.extend(['%s', '%s'])
                    
                    if insert_fields:
                        # Check if record already exists before inserting
                        cursor.execute("SELECT id FROM phones WHERE url = %s LIMIT 1", (row.get('url'),))
                        existing = cursor.fetchone()
                        
                        if existing:
                            self.logger.debug(f"   Record with URL already exists, skipping insert")
                            continue
                        
                        insert_query = f"""
                        INSERT INTO phones ({', '.join(insert_fields)})
                        VALUES ({', '.join(placeholders)})
                        """
                        
                        # Use savepoint for individual record to prevent transaction abort
                        cursor.execute("SAVEPOINT insert_record")
                        try:
                            cursor.execute(insert_query, insert_values)
                            cursor.execute("RELEASE SAVEPOINT insert_record")
                            inserted_count += 1
                        except Exception as insert_error:
                            cursor.execute("ROLLBACK TO SAVEPOINT insert_record")
                            raise insert_error
                        
                except IntegrityError as e:
                    if "duplicate key value violates unique constraint" in str(e):
                        self.logger.debug(f"   Duplicate record detected, skipping: {str(e)}")
                        # This is expected for duplicates, don't count as error
                    else:
                        self.logger.warning(f"   ⚠️ Integrity error inserting record: {str(e)}")
                        error_count += 1
                except Exception as e:
                    self.logger.warning(f"   ⚠️ Failed to insert record: {str(e)}")
                    error_count += 1
                    continue
        
        # Log comprehensive insert statistics
        self.logger.info(f"   ✅ Successfully inserted {inserted_count} records ({error_count} errors)")
        
        if field_insert_stats:
            # Log top inserted fields
            sorted_fields = sorted(field_insert_stats.items(), key=lambda x: x[1], reverse=True)
            self.logger.info(f"   📊 Field Insert Statistics (top 10):")
            for field, count in sorted_fields[:10]:
                percentage = (count / inserted_count * 100) if inserted_count > 0 else 0
                self.logger.info(f"      {field}: {count} inserts ({percentage:.1f}%)")
            
            if len(sorted_fields) > 10:
                self.logger.info(f"      ... and {len(sorted_fields) - 10} more fields")
        
        return inserted_count, error_count
    
    def _update_existing_records_with_error_tracking(self, cursor, update_records: pd.DataFrame) -> Tuple[int, int]:
        """Update existing records with comprehensive field detection and error tracking."""
        if len(update_records) == 0:
            return 0, 0
        
        self.logger.info(f"🔄 Updating {len(update_records)} existing records with enhanced field detection...")
        
        updated_count = 0
        error_count = 0
        field_update_stats = {}
        
        # Generate update strategy if enhanced system is available
        if self.field_generator:
            try:
                update_strategy = self.field_generator.generate_update_strategy(update_records, cursor, 'phones')
                updatable_columns = update_strategy['final_updatable_columns']
                
                self.logger.info(f"📊 Enhanced Update Strategy:")
                self.logger.info(f"   Total updatable columns: {len(updatable_columns)}")
                self.logger.info(f"   Feature-engineered: {update_strategy['statistics']['feature_engineered_percentage']:.1f}%")
                self.logger.info(f"   Basic fields: {update_strategy['statistics']['basic_fields_percentage']:.1f}%")
                
                # Log recommendations
                for recommendation in update_strategy['recommendations']:
                    self.logger.info(f"   {recommendation}")
                    
            except Exception as e:
                self.logger.warning(f"⚠️ Enhanced field detection failed, using comprehensive fallback: {str(e)}")
                # Use comprehensive fallback that includes feature columns
                updatable_columns = self._get_all_available_columns(update_records)
        else:
            self.logger.warning("⚠️ Enhanced system not available, using comprehensive fallback")
            # Use comprehensive fallback that includes all available columns
            updatable_columns = self._get_all_available_columns(update_records)
        
        # Process in batches
        for i in range(0, len(update_records), self.batch_size):
            batch = update_records.iloc[i:i+self.batch_size]
            batch_num = i // self.batch_size + 1
            total_batches = (len(update_records) + self.batch_size - 1) // self.batch_size
            
            self.logger.info(f"   Processing update batch {batch_num}/{total_batches}: {len(batch)} records")
            
            for _, row in batch.iterrows():
                try:
                    # Find existing record by URL (primary identifier)
                    cursor.execute("""
                        SELECT id FROM phones 
                        WHERE url = %s
                        LIMIT 1
                    """, (row.get('url'),))
                    
                    existing = cursor.fetchone()
                    if not existing:
                        self.logger.debug(f"   Record not found for update: {row.get('url', 'No URL')}")
                        error_count += 1
                        continue
                    
                    # Prepare update data using dynamic field detection
                    update_fields = []
                    update_values = []
                    
                    # Use enhanced field detection if available
                    if self.field_generator:
                        try:
                            record_updatable_fields = self.field_generator.generate_updatable_fields(
                                update_records, row, cursor, 'phones'
                            )
                        except Exception as e:
                            self.logger.debug(f"Field generation failed for record, using fallback: {str(e)}")
                            record_updatable_fields = updatable_columns
                    else:
                        record_updatable_fields = updatable_columns
                    
                    # Build update statement with all available fields
                    for field in record_updatable_fields:
                        if field in row and pd.notna(row[field]) and field != 'updated_at':  # Skip updated_at from dynamic list
                            # Validate data type before adding to prevent transaction aborts
                            try:
                                value = row[field]
                                # Basic validation - skip obviously invalid values
                                if isinstance(value, str) and value.lower() in ['nan', 'null', 'none', '']:
                                    continue
                                
                                update_fields.append(f"{field} = %s")
                                update_values.append(value)
                                
                                # Track field update statistics
                                if field not in field_update_stats:
                                    field_update_stats[field] = 0
                                field_update_stats[field] += 1
                                
                            except Exception as e:
                                self.logger.debug(f"Skipping invalid field {field}: {str(e)}")
                                continue
                    
                    # Always update timestamp metadata (ensure it's only added once)
                    update_fields.append('updated_at = %s')
                    update_values.append(datetime.now())
                    
                    if update_fields:
                        update_query = f"""
                        UPDATE phones 
                        SET {', '.join(update_fields)}
                        WHERE id = %s
                        """
                        
                        update_values.append(existing['id'])
                        
                        # Use savepoint for individual record to prevent transaction abort
                        cursor.execute("SAVEPOINT update_record")
                        try:
                            cursor.execute(update_query, update_values)
                            cursor.execute("RELEASE SAVEPOINT update_record")
                            updated_count += 1
                        except Exception as update_error:
                            cursor.execute("ROLLBACK TO SAVEPOINT update_record")
                            raise update_error
                        
                except Exception as e:
                    self.logger.warning(f"   ⚠️ Failed to update record: {str(e)}")
                    error_count += 1
                    continue
        
        # Log comprehensive update statistics
        self.logger.info(f"   ✅ Successfully updated {updated_count} records ({error_count} errors)")
        
        if field_update_stats:
            # Log top updated fields
            sorted_fields = sorted(field_update_stats.items(), key=lambda x: x[1], reverse=True)
            self.logger.info(f"   📊 Field Update Statistics (top 10):")
            for field, count in sorted_fields[:10]:
                percentage = (count / updated_count * 100) if updated_count > 0 else 0
                self.logger.info(f"      {field}: {count} updates ({percentage:.1f}%)")
            
            if len(sorted_fields) > 10:
                self.logger.info(f"      ... and {len(sorted_fields) - 10} more fields")
        
        return updated_count, error_count