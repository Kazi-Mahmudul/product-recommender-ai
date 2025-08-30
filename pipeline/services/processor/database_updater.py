"""
Database Updater Module

Provides database update functionality for the processing pipeline.
"""

import pandas as pd
import psycopg2
from typing import Dict, Any, Tuple, List
import logging
from datetime import datetime
import os

logger = logging.getLogger(__name__)


class DatabaseUpdater:
    """Database update service for mobile phone data"""
    
    def __init__(self, database_url: str = None):
        self.database_url = database_url or os.getenv('DATABASE_URL')
        if self.database_url and self.database_url.startswith("postgres://"):
            self.database_url = self.database_url.replace("postgres://", "postgresql://", 1)
    
    def get_database_connection(self):
        """Get database connection"""
        return psycopg2.connect(self.database_url)
    
    def get_valid_database_columns(self) -> set:
        """Get valid columns from the phones table"""
        try:
            conn = self.get_database_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'phones'
            """)
            
            columns = {row[0] for row in cursor.fetchall()}
            conn.close()
            return columns
            
        except Exception as e:
            logger.error(f"Error getting database columns: {str(e)}")
            # Return a basic set of known columns as fallback
            return {
                'name', 'brand', 'model', 'price', 'url', 'img_url',
                'scraped_at', 'pipeline_run_id', 'data_source', 'is_pipeline_managed',
                'main_camera', 'front_camera', 'camera_count', 'primary_camera_mp', 
                'selfie_camera_mp', 'camera_score'
            }
    
    def update_with_transaction(self, df: pd.DataFrame, pipeline_run_id: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Update database with processed DataFrame using transaction
        
        Args:
            df: Processed DataFrame with enhanced features
            pipeline_run_id: Pipeline run ID for tracking
            
        Returns:
            Tuple of (success, results_dict)
        """
        try:
            conn = self.get_database_connection()
            cursor = conn.cursor()
            
            # Get valid database columns
            valid_columns = self.get_valid_database_columns()
            
            results = {
                'inserted': 0,
                'updated': 0,
                'errors': 0,
                'error_details': []
            }
            
            current_time = datetime.now()
            
            # Process each row
            for idx, row in df.iterrows():
                try:
                    # Prepare data for insertion/update
                    data = {
                        'scraped_at': current_time,
                        'pipeline_run_id': pipeline_run_id,
                        'data_source': 'MobileDokan',
                        'is_pipeline_managed': True,
                        'updated_at': current_time
                    }
                    
                    # Add all row data, but only for columns that exist in the database
                    for col in df.columns:
                        if col in valid_columns and pd.notna(row[col]):
                            data[col] = row[col]
                    
                    # Ensure URL exists for checking duplicates
                    if 'url' not in data or not data['url']:
                        logger.warning(f"Skipping row {idx}: No URL provided")
                        continue
                    
                    # Check if product already exists
                    cursor.execute("SELECT id FROM phones WHERE url = %s", (data['url'],))
                    existing = cursor.fetchone()
                    
                    if existing:
                        # Update existing record
                        update_fields = []
                        update_values = []
                        
                        for key, value in data.items():
                            if key != 'url' and key != 'created_at':  # Don't update URL or created_at
                                update_fields.append(f"{key} = %s")
                                update_values.append(value)
                        
                        if update_fields:  # Only update if there are fields to update
                            update_values.append(data['url'])  # For WHERE clause
                            
                            update_query = f"""
                                UPDATE phones 
                                SET {', '.join(update_fields)}
                                WHERE url = %s
                            """
                            
                            cursor.execute(update_query, update_values)
                            results['updated'] += 1
                    else:
                        # Insert new record
                        data['created_at'] = current_time
                        
                        columns = list(data.keys())
                        placeholders = ['%s'] * len(columns)
                        values = list(data.values())
                        
                        insert_query = f"""
                            INSERT INTO phones ({', '.join(columns)})
                            VALUES ({', '.join(placeholders)})
                        """
                        
                        cursor.execute(insert_query, values)
                        results['inserted'] += 1
                        
                except Exception as e:
                    error_msg = f"Error processing row {idx}: {str(e)}"
                    logger.error(error_msg)
                    results['errors'] += 1
                    results['error_details'].append(error_msg)
                    continue
            
            # Commit all changes
            conn.commit()
            conn.close()
            
            logger.info(f"Database update completed: {results['inserted']} inserted, {results['updated']} updated, {results['errors']} errors")
            
            return True, {'results': results}
            
        except Exception as e:
            error_msg = f"Database transaction failed: {str(e)}"
            logger.error(error_msg)
            return False, {'error': error_msg}