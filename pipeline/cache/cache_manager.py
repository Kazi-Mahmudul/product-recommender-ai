#!/usr/bin/env python3
"""
Cache Manager for Processor Rankings
"""

import os
import psycopg2
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from dataclasses import dataclass

@dataclass
class CacheInfo:
    """Information about cached data"""
    has_data: bool
    age_days: float
    last_updated: Optional[datetime]
    total_processors: int
    is_valid: bool
    next_refresh_due: Optional[datetime]

class CacheManager:
    """Manages cache validation and metadata for processor rankings"""
    
    def __init__(self, max_age_days: int = 20):
        self.max_age_days = max_age_days
        self.logger = logging.getLogger(__name__)
        
    def get_cache_info(self) -> CacheInfo:
        """Get comprehensive cache information"""
        try:
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                self.logger.warning("DATABASE_URL not set")
                return CacheInfo(False, 0, None, 0, False, None)
            
            if database_url.startswith("postgres://"):
                database_url = database_url.replace("postgres://", "postgresql://", 1)
            
            conn = psycopg2.connect(database_url)
            cursor = conn.cursor()
            
            # Get cache metadata
            cursor.execute("""
                SELECT MAX(last_updated) as latest_update,
                       COUNT(*) as total_processors
                FROM processor_rankings
            """)
            
            result = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if result and result[0] and result[1] > 0:
                last_updated = result[0]
                total_processors = result[1]
                age_days = (datetime.now() - last_updated).total_seconds() / (24 * 3600)
                is_valid = age_days <= self.max_age_days
                next_refresh = last_updated + timedelta(days=self.max_age_days)
                
                return CacheInfo(
                    has_data=True,
                    age_days=age_days,
                    last_updated=last_updated,
                    total_processors=total_processors,
                    is_valid=is_valid,
                    next_refresh_due=next_refresh
                )
            else:
                return CacheInfo(False, 0, None, 0, False, None)
                
        except Exception as e:
            self.logger.error(f"Failed to get cache info: {e}")
            return CacheInfo(False, 0, None, 0, False, None)
    
    def is_cache_valid(self) -> bool:
        """Check if cache is valid (within max age)"""
        cache_info = self.get_cache_info()
        return cache_info.is_valid
    
    def get_cache_age_days(self) -> Optional[float]:
        """Get cache age in days"""
        cache_info = self.get_cache_info()
        return cache_info.age_days if cache_info.has_data else None
    
    def mark_cache_updated(self) -> bool:
        """Mark cache as updated with current timestamp"""
        try:
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                return False
            
            if database_url.startswith("postgres://"):
                database_url = database_url.replace("postgres://", "postgresql://", 1)
            
            conn = psycopg2.connect(database_url)
            cursor = conn.cursor()
            
            # Update all records with current timestamp
            cursor.execute("""
                UPDATE processor_rankings 
                SET last_updated = CURRENT_TIMESTAMP,
                    data_source = 'scraped'
            """)
            
            conn.commit()
            cursor.close()
            conn.close()
            
            self.logger.info("✅ Cache timestamp updated")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to update cache timestamp: {e}")
            return False
    
    def log_cache_status(self):
        """Log current cache status"""
        cache_info = self.get_cache_info()
        
        if cache_info.has_data:
            status = "VALID" if cache_info.is_valid else "STALE"
            self.logger.info(f"📊 Cache Status: {status}")
            self.logger.info(f"   Age: {cache_info.age_days:.1f} days")
            self.logger.info(f"   Processors: {cache_info.total_processors}")
            self.logger.info(f"   Last Updated: {cache_info.last_updated}")
            if cache_info.next_refresh_due:
                self.logger.info(f"   Next Refresh Due: {cache_info.next_refresh_due}")
        else:
            self.logger.info("📭 No cached data available")