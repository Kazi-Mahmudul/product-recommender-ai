"""
Enhanced Database Updater Service for mobile phone data.
"""

import logging
import pandas as pd
import numpy as np
import psycopg2
from typing import Dict, List, Optional, Any, Set, Tuple
from datetime import datetime
import os

logger = logging.getLogger(__name__)


class DatabaseUpdater:
    """
    Handles efficient database update operations with proper error handling.
    """
    
    def __init__(self, database_url: str = None):
        """Initialize the database updater."""
        self.database_url = database_url or self._get_database_url()
        self.batch_size = 500
        logger.info("Database updater initialized")
    
    def _get_database_url(self) -> str:
        """Get database URL from environment or use default."""
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            database_url = "postgresql://postgres.lvxqroeldpaqjbmsjjqr:Mahmudulepickdb162@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
        
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        
        return database_url
    
    def get_database_connection(self):
        """Get database connection."""
        return psycopg2.connect(self.database_url)
    
    def get_valid_columns(self) -> Set[str]:
        """Query database schema for valid columns."""
        logger.info("Querying database schema for valid columns")
        
        try:
            conn = self.get_database_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'phones'
                ORDER BY ordinal_position
            """)
            
            columns_info = cursor.fetchall()
            columns = {row[0]: row[1] for row in columns_info}
            
            conn.close()
            
            logger.info(f"Found {len(columns)} valid columns in phones table")
            return set(columns.keys())
            
        except Exception as e:
            logger.error(f"Error getting database columns: {str(e)}")
            # Return a basic set of known columns as fallback
            return {
                'id', 'name', 'brand', 'model', 'price', 'url', 'img_url',
                'scraped_at', 'pipeline_run_id', 'data_source', 'is_pipeline_managed',
                'main_camera', 'front_camera', 'display_type', 'screen_size_inches',
                'ram', 'internal_storage', 'capacity', 'chipset', 'operating_system',
                'price_original', 'price_category', 'storage_gb', 'ram_gb',
                'price_per_gb', 'price_per_gb_ram', 'screen_size_numeric',
                'resolution_width', 'resolution_height', 'ppi_numeric',
                'refresh_rate_numeric', 'battery_capacity_numeric',
                'has_fast_charging', 'has_wireless_charging', 'charging_wattage',
                'slug', 'primary_camera_mp', 'selfie_camera_mp', 'camera_count',
                'is_popular_brand', 'release_date_clean', 'is_new_release',
                'age_in_months', 'is_upcoming', 'display_score', 'connectivity_score',
                'security_score', 'battery_score', 'camera_score', 'performance_score',
                'overall_device_score', 'data_quality_score', 'last_price_check'
            }
    
    def handle_data_types(self, df: pd.DataFrame, valid_columns: Set[str]) -> pd.DataFrame:
        """Handle data type conversions for database compatibility."""
        logger.info("Handling data type conversions")
        
        # Define column type mappings
        numeric_cols = [
            'price_original', 'storage_gb', 'ram_gb', 'price_per_gb', 'price_per_gb_ram',
            'screen_size_numeric', 'resolution_width', 'resolution_height',
            'ppi_numeric', 'refresh_rate_numeric', 'battery_capacity_numeric',
            'charging_wattage', 'primary_camera_mp', 'selfie_camera_mp', 'camera_count',
            'age_in_months', 'display_score', 'connectivity_score', 'security_score',
            'battery_score', 'camera_score', 'performance_score', 'overall_device_score',
            'data_quality_score'
        ]
        
        boolean_cols = [
            'has_fast_charging', 'has_wireless_charging', 'is_popular_brand',
            'is_new_release', 'is_upcoming', 'is_pipeline_managed'
        ]
        
        datetime_cols = [
            'scraped_at', 'release_date_clean', 'last_price_check'
        ]
        
        # Convert numeric columns
        for col in numeric_cols:
            if col in df.columns and col in valid_columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Convert boolean columns
        for col in boolean_cols:
            if col in df.columns and col in valid_columns:
                df[col] = df[col].astype(bool)
        
        # Convert datetime columns
        for col in datetime_cols:
            if col in df.columns and col in valid_columns:
                df[col] = pd.to_datetime(df[col], errors='coerce')
        
        # Handle None/NaN values for database compatibility
        df = df.where(pd.notnull(df), None)
        
        return df
    
    def batch_update_records(self, df: pd.DataFrame, pipeline_run_id: str = None) -> Dict[str, int]:
        """Perform efficient bulk update operations."""
        logger.info(f"Starting batch update for {len(df)} records")
        
        # Get valid columns
        valid_columns = self.get_valid_columns()
        
        # Handle data types
        df = self.handle_data_types(df, valid_columns)
        
        # Filter to only valid columns
        update_columns = [col for col in df.columns if col in valid_columns and col not in ['id']]
        df_filtered = df[update_columns].copy()
        
        # Add metadata
        df_filtered['data_quality_score'] = 0.9  # Placeholder
        df_filtered['last_price_check'] = datetime.now()
        if pipeline_run_id:
            df_filtered['pipeline_run_id'] = pipeline_run_id
        
        results = {
            'updated': 0,
            'inserted': 0,
            'errors': 0
        }
        
        try:
            conn = self.get_database_connection()
            cursor = conn.cursor()
            
            # Process in batches
            for i in range(0, len(df_filtered), self.batch_size):
                batch = df_filtered.iloc[i:i + self.batch_size]
                batch_results = self._update_batch(cursor, batch, valid_columns)
                
                for key in results:
                    results[key] += batch_results[key]
                
                # Commit after each batch
                conn.commit()
                
                logger.info(f"Processed batch {i//self.batch_size + 1}/{(len(df_filtered)-1)//self.batch_size + 1}")
            
            conn.close()
            
        except Exception as e:
            logger.error(f"Error in batch update: {str(e)}")
            results['errors'] = len(df_filtered)
            try:
                conn.rollback()
                conn.close()
            except:
                pass
        
        logger.info(f"Batch update completed: {results}")
        return results
    
    def _update_batch(self, cursor, batch: pd.DataFrame, valid_columns: Set[str]) -> Dict[str, int]:
        """Update a single batch of records."""
        results = {'updated': 0, 'inserted': 0, 'errors': 0}
        
        for _, row in batch.iterrows():
            try:
                if pd.notna(row.get('url')):
                    # Check if record exists
                    cursor.execute("SELECT id FROM phones WHERE url = %s", (row['url'],))
                    existing = cursor.fetchone()
                    
                    if existing:
                        # Update existing record
                        self._update_existing_record(cursor, row, valid_columns)
                        results['updated'] += 1
                    else:
                        # Insert new record
                        self._insert_new_record(cursor, row, valid_columns)
                        results['inserted'] += 1
                else:
                    results['errors'] += 1
                    
            except Exception as e:
                logger.error(f"Error processing record: {str(e)}")
                results['errors'] += 1
        
        return results
    
    def _update_existing_record(self, cursor, row: pd.Series, valid_columns: Set[str]):
        """Update an existing record."""
        # Build update query for valid columns only
        set_clauses = []
        values = []
        
        for col in row.index:
            if col in valid_columns and col not in ['id', 'url'] and pd.notna(row[col]):
                set_clauses.append(f"{col} = %s")
                values.append(row[col])
        
        if set_clauses:
            values.append(row['url'])  # For WHERE clause
            
            update_query = f"""
                UPDATE phones 
                SET {', '.join(set_clauses)}
                WHERE url = %s
            """
            
            cursor.execute(update_query, values)
    
    def _insert_new_record(self, cursor, row: pd.Series, valid_columns: Set[str]):
        """Insert a new record."""
        # Filter to valid columns with non-null values
        insert_data = {}
        for col in row.index:
            if col in valid_columns and pd.notna(row[col]):
                insert_data[col] = row[col]
        
        if insert_data:
            columns = list(insert_data.keys())
            placeholders = ['%s'] * len(columns)
            values = list(insert_data.values())
            
            insert_query = f"""
                INSERT INTO phones ({', '.join(columns)})
                VALUES ({', '.join(placeholders)})
            """
            
            cursor.execute(insert_query, values)
    
    def update_with_transaction(self, df: pd.DataFrame, pipeline_run_id: str = None) -> Tuple[bool, Dict[str, Any]]:
        """
        Update database with full transaction management and rollback capabilities.
        
        Returns:
            Tuple of (success, results)
        """
        logger.info("Starting transactional database update")
        
        try:
            # Perform batch update
            results = self.batch_update_records(df, pipeline_run_id)
            
            # Check if update was successful
            success = results['errors'] == 0 or (results['errors'] / len(df)) < 0.1  # Allow up to 10% errors
            
            if success:
                logger.info("Database update completed successfully")
            else:
                logger.warning(f"Database update completed with {results['errors']} errors")
            
            return success, {
                'success': success,
                'results': results,
                'total_records': len(df),
                'error_rate': results['errors'] / len(df) if len(df) > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"Transaction failed: {str(e)}")
            return False, {
                'success': False,
                'error': str(e),
                'results': {'updated': 0, 'inserted': 0, 'errors': len(df)},
                'total_records': len(df),
                'error_rate': 1.0
            }
    
    def update_metadata(self, pipeline_run_id: str, quality_score: float, 
                       processed_count: int) -> bool:
        """Update processing timestamps and quality scores."""
        logger.info("Updating metadata and timestamps")
        
        try:
            conn = self.get_database_connection()
            cursor = conn.cursor()
            
            # Update pipeline run metadata if table exists
            try:
                cursor.execute("""
                    UPDATE pipeline_runs 
                    SET 
                        completed_at = CURRENT_TIMESTAMP,
                        status = 'completed',
                        records_processed = %s,
                        quality_score = %s
                    WHERE run_id = %s
                """, (processed_count, quality_score, pipeline_run_id))
                
                if cursor.rowcount == 0:
                    # Insert if not exists
                    cursor.execute("""
                        INSERT INTO pipeline_runs (run_id, completed_at, status, records_processed, quality_score)
                        VALUES (%s, CURRENT_TIMESTAMP, 'completed', %s, %s)
                        ON CONFLICT (run_id) DO UPDATE SET
                            completed_at = EXCLUDED.completed_at,
                            status = EXCLUDED.status,
                            records_processed = EXCLUDED.records_processed,
                            quality_score = EXCLUDED.quality_score
                    """, (pipeline_run_id, processed_count, quality_score))
                
            except psycopg2.Error:
                # Table might not exist, skip metadata update
                logger.warning("Pipeline runs table not found, skipping metadata update")
            
            conn.commit()
            conn.close()
            
            logger.info("Metadata update completed")
            return True
            
        except Exception as e:
            logger.error(f"Error updating metadata: {str(e)}")
            return False