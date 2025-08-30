#!/usr/bin/env python3
"""
Processor Data Loader with Cache-First Strategy
"""

import sys
import os
import logging
from datetime import datetime, timedelta
from typing import Optional

# Add project paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from pipeline.cache.cache_manager import CacheManager
from pipeline.database.processor_db import ProcessorDatabase
from pipeline.models.processor_models import ProcessorCacheInfo, ProcessorDataResponse

class ProcessorDataLoader:
    """Main class for loading processor data with cache-first strategy"""
    
    def __init__(self, max_cache_age_days: int = 20):
        self.max_cache_age_days = max_cache_age_days
        self.cache_manager = CacheManager(max_cache_age_days)
        self.db = ProcessorDatabase()
        self.logger = logging.getLogger(__name__)
        
    def load_processor_data(self, force_refresh: bool = False) -> ProcessorDataResponse:
        """
        Load processor data using cache-first strategy
        
        Args:
            force_refresh: If True, bypass cache and force fresh scraping
            
        Returns:
            ProcessorDataResponse with data and cache information
        """
        self.logger.info("🔍 Loading processor data...")
        
        # Check cache status
        cache_info = self.cache_manager.get_cache_info()
        self.cache_manager.log_cache_status()
        
        # Decide whether to use cache or scrape fresh data
        use_cache = not force_refresh and cache_info.has_data and cache_info.is_valid
        
        if use_cache:
            return self._load_from_cache()
        else:
            return self._load_with_scraping_fallback(force_refresh, cache_info)
    
    def _load_from_cache(self) -> ProcessorDataResponse:
        """Load data from cache"""
        self.logger.info("📊 Using cached processor data")
        
        try:
            df, last_updated = self.db.get_cached_processor_data()
            
            if df is not None and not df.empty:
                cache_age = (datetime.now() - last_updated).total_seconds() / (24 * 3600)
                next_refresh = last_updated + timedelta(days=self.max_cache_age_days)
                
                cache_info = ProcessorCacheInfo(
                    has_cached_data=True,
                    cache_age_days=cache_age,
                    last_updated=last_updated,
                    next_refresh_due=next_refresh,
                    data_source='cached',
                    total_processors=len(df),
                    is_cache_valid=True
                )
                
                return ProcessorDataResponse(
                    data=df,
                    cache_info=cache_info,
                    success=True,
                    message=f"Loaded {len(df)} processors from cache (age: {cache_age:.1f} days)",
                    fallback_used=False
                )
            else:
                return self._handle_no_data("No cached data available")
                
        except Exception as e:
            self.logger.error(f"Failed to load cached data: {e}")
            return self._handle_no_data(f"Cache loading failed: {e}")
    
    def _load_with_scraping_fallback(self, force_refresh: bool, cache_info) -> ProcessorDataResponse:
        """Attempt fresh scraping with fallback to cache"""
        
        if force_refresh:
            self.logger.info("🔄 Force refresh requested - attempting fresh scraping")
        else:
            self.logger.info("🔄 Cache is stale or missing - attempting fresh scraping")
        
        # Try to scrape fresh data
        fresh_data = self._attempt_fresh_scraping()
        
        if fresh_data is not None:
            # Fresh scraping succeeded
            return self._handle_fresh_data_success(fresh_data)
        else:
            # Fresh scraping failed - try fallback to cached data
            return self._handle_scraping_failure(cache_info)
    
    def _attempt_fresh_scraping(self) -> Optional:
        """Attempt to scrape fresh processor data"""
        try:
            # Import here to avoid circular imports
            from pipeline.scrapers.processor_scraper import ProcessorRankingScraper
            
            self.logger.info("🌐 Attempting fresh processor scraping...")
            
            # Use the simple scraper first (faster and more reliable)
            scraper = ProcessorRankingScraper(requests_per_minute=0)
            df = scraper.scrape_all_pages(max_pages=None, timeout_minutes=3)
            
            if not df.empty:
                self.logger.info(f"✅ Fresh scraping successful: {len(df)} processors")
                return df
            else:
                self.logger.warning("⚠️ Fresh scraping returned no data")
                return None
                
        except Exception as e:
            self.logger.error(f"❌ Fresh scraping failed: {e}")
            return None
    
    def _handle_fresh_data_success(self, df) -> ProcessorDataResponse:
        """Handle successful fresh data scraping"""
        try:
            # Save fresh data to database
            success = self.db.save_processor_data_with_metadata(df)
            
            if success:
                self.cache_manager.mark_cache_updated()
                self.logger.info("💾 Fresh data saved to database")
            else:
                self.logger.warning("⚠️ Failed to save fresh data to database")
            
            # Create cache info for fresh data
            cache_info = ProcessorCacheInfo(
                has_cached_data=True,
                cache_age_days=0.0,
                last_updated=datetime.now(),
                next_refresh_due=datetime.now() + timedelta(days=self.max_cache_age_days),
                data_source='fresh',
                total_processors=len(df),
                is_cache_valid=True
            )
            
            return ProcessorDataResponse(
                data=df,
                cache_info=cache_info,
                success=True,
                message=f"Scraped {len(df)} fresh processors",
                fallback_used=False
            )
            
        except Exception as e:
            self.logger.error(f"Failed to handle fresh data: {e}")
            return self._handle_no_data(f"Fresh data processing failed: {e}")
    
    def _handle_scraping_failure(self, cache_info) -> ProcessorDataResponse:
        """Handle scraping failure with fallback to cached data"""
        
        if cache_info.has_data:
            # Use stale cached data as fallback
            self.logger.warning(f"⚠️ Using stale cached data (age: {cache_info.age_days:.1f} days)")
            
            try:
                df, last_updated = self.db.get_cached_processor_data()
                
                if df is not None and not df.empty:
                    fallback_cache_info = ProcessorCacheInfo(
                        has_cached_data=True,
                        cache_age_days=cache_info.age_days,
                        last_updated=cache_info.last_updated,
                        next_refresh_due=cache_info.next_refresh_due,
                        data_source='stale_fallback',
                        total_processors=len(df),
                        is_cache_valid=False
                    )
                    
                    return ProcessorDataResponse(
                        data=df,
                        cache_info=fallback_cache_info,
                        success=True,
                        message=f"Using stale cached data ({len(df)} processors, age: {cache_info.age_days:.1f} days)",
                        fallback_used=True
                    )
                else:
                    return self._handle_no_data("Cached data exists but could not be loaded")
                    
            except Exception as e:
                self.logger.error(f"Failed to load fallback cache: {e}")
                return self._handle_no_data(f"Fallback cache loading failed: {e}")
        else:
            # No cached data available
            return self._handle_no_data("No cached data available and scraping failed")
    
    def _handle_no_data(self, message: str) -> ProcessorDataResponse:
        """Handle case where no data is available"""
        import pandas as pd
        
        self.logger.error(f"❌ {message}")
        
        cache_info = ProcessorCacheInfo(
            has_cached_data=False,
            cache_age_days=0.0,
            last_updated=None,
            next_refresh_due=None,
            data_source='none',
            total_processors=0,
            is_cache_valid=False
        )
        
        return ProcessorDataResponse(
            data=pd.DataFrame(),
            cache_info=cache_info,
            success=False,
            message=message,
            fallback_used=False
        )
    
    def get_data_freshness_info(self) -> dict:
        """Get information about data freshness"""
        cache_info = self.cache_manager.get_cache_info()
        return cache_info.__dict__ if hasattr(cache_info, '__dict__') else {}
    
    def schedule_next_refresh(self):
        """Log when the next refresh is scheduled"""
        cache_info = self.cache_manager.get_cache_info()
        
        if cache_info.has_data and cache_info.next_refresh_due:
            days_until_refresh = (cache_info.next_refresh_due - datetime.now()).total_seconds() / (24 * 3600)
            self.logger.info(f"📅 Next refresh scheduled in {days_until_refresh:.1f} days ({cache_info.next_refresh_due})")
        else:
            self.logger.info("📅 No refresh schedule (no cached data)")