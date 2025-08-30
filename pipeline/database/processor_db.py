#!/usr/bin/env python3
"""
Database operations for processor rankings with cache support
"""

import os
import psycopg2
import pandas as pd
import logging
import re
from datetime import datetime
from typing import Optional, Tuple

class ProcessorDatabase:
    """Database operations for processor rankings"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
    def get_connection(self):
        """Get database connection"""
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            raise Exception("DATABASE_URL not set")
        
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        
        return psycopg2.connect(database_url)
    
    def get_cached_processor_data(self) -> Tuple[Optional[pd.DataFrame], Optional[datetime]]:
        """Retrieve cached processor data with metadata"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Get processor data with metadata
            cursor.execute("""
                SELECT processor_name, processor_key, rank, rating, antutu10, 
                       geekbench6, cores, clock, gpu, company, last_updated
                FROM processor_rankings
                ORDER BY rank
            """)
            
            rows = cursor.fetchall()
            
            if not rows:
                cursor.close()
                conn.close()
                return None, None
            
            # Convert to DataFrame
            columns = ['processor', 'processor_key', 'rank', 'rating', 'antutu10',
                      'geekbench6', 'cores', 'clock', 'gpu', 'company', 'last_updated']
            
            df = pd.DataFrame(rows, columns=columns)
            
            # Get the most recent update timestamp
            last_updated = df['last_updated'].max()
            
            # Remove the timestamp column from the data
            df = df.drop('last_updated', axis=1)
            
            cursor.close()
            conn.close()
            
            self.logger.info(f"📊 Retrieved {len(df)} cached processors")
            return df, last_updated
            
        except Exception as e:
            self.logger.error(f"Failed to retrieve cached data: {e}")
            return None, None
    
    def save_processor_data_with_metadata(self, df: pd.DataFrame) -> bool:
        """Save processor data with cache metadata"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Clear existing data
            cursor.execute("DELETE FROM processor_rankings")
            self.logger.info("🗑️ Cleared existing processor rankings")
            
            # Prepare data for insertion
            processors = []
            for _, row in df.iterrows():
                # Clean processor name
                processor_name = str(row['processor']).replace('\n', ' ').strip()
                
                # Extract numeric rating
                rating = None
                if pd.notna(row['rating']):
                    rating_str = str(row['rating'])
                    rating_match = re.search(r'(\d+(?:\.\d+)?)', rating_str)
                    if rating_match:
                        rating = float(rating_match.group(1))
                
                # Extract geekbench6 score
                geekbench6 = None
                if pd.notna(row['geekbench6']):
                    geekbench6_str = str(row['geekbench6'])
                    geekbench6_match = re.search(r'(\d+)', geekbench6_str)
                    if geekbench6_match:
                        geekbench6 = int(geekbench6_match.group(1))
                
                processors.append((
                    processor_name,
                    str(row['processor_key']),
                    int(row['rank']) if pd.notna(row['rank']) else None,
                    rating,
                    int(row['antutu10']) if pd.notna(row['antutu10']) else None,
                    geekbench6,
                    str(row['cores']) if pd.notna(row['cores']) else None,
                    str(row['clock']) if pd.notna(row['clock']) else None,
                    str(row['gpu']) if pd.notna(row['gpu']) else None,
                    str(row['company']) if pd.notna(row['company']) else None
                ))
            
            # Insert new data with metadata
            insert_query = """
                INSERT INTO processor_rankings 
                (processor_name, processor_key, rank, rating, antutu10, geekbench6, 
                 cores, clock, gpu, company, last_updated, data_source)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, 'scraped')
            """
            
            cursor.executemany(insert_query, processors)
            conn.commit()
            
            self.logger.info(f"💾 Saved {len(processors)} processors with metadata")
            
            cursor.close()
            conn.close()
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to save processor data: {e}")
            return False
    
    def get_last_update_timestamp(self) -> Optional[datetime]:
        """Get the timestamp of the most recent data update"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("SELECT MAX(last_updated) FROM processor_rankings")
            result = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            return result[0] if result and result[0] else None
            
        except Exception as e:
            self.logger.error(f"Failed to get last update timestamp: {e}")
            return None
    
    def get_cache_stats(self) -> dict:
        """Get cache statistics"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_processors,
                    MAX(last_updated) as last_updated,
                    MIN(last_updated) as oldest_update,
                    COUNT(DISTINCT data_source) as source_types
                FROM processor_rankings
            """)
            
            result = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if result:
                return {
                    'total_processors': result[0],
                    'last_updated': result[1],
                    'oldest_update': result[2],
                    'source_types': result[3]
                }
            else:
                return {'total_processors': 0}
                
        except Exception as e:
            self.logger.error(f"Failed to get cache stats: {e}")
            return {'total_processors': 0}