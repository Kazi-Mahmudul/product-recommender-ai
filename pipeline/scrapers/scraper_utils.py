#!/usr/bin/env python3
"""
Common scraping utilities and helpers

This module contains shared utilities for web scraping operations
including caching, rate limiting, and error handling.
"""

import os
import time
import json
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
import logging

def setup_scraper_logging(name: str = __name__, level: str = 'INFO') -> logging.Logger:
    """Setup logging for scrapers"""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    return logging.getLogger(name)

class CacheManager:
    """
    Simple file-based cache manager for scraping results
    """
    
    def __init__(self, cache_dir: str = 'cache'):
        self.cache_dir = cache_dir
        self.logger = setup_scraper_logging(f"{__name__}.CacheManager")
        
        # Ensure cache directory exists
        os.makedirs(cache_dir, exist_ok=True)
    
    def _get_cache_path(self, key: str) -> str:
        """Get cache file path for a key"""
        # Create a safe filename from the key
        safe_key = hashlib.md5(key.encode()).hexdigest()
        return os.path.join(self.cache_dir, f"{safe_key}.json")
    
    def get(self, key: str, max_age_hours: int = 24) -> Optional[Any]:
        """
        Get cached data if it exists and is not expired
        
        Args:
            key: Cache key
            max_age_hours: Maximum age in hours before cache expires
            
        Returns:
            Cached data or None if not found/expired
        """
        cache_path = self._get_cache_path(key)
        
        if not os.path.exists(cache_path):
            return None
        
        try:
            # Check file age
            file_age_hours = (time.time() - os.path.getmtime(cache_path)) / 3600
            
            if file_age_hours > max_age_hours:
                self.logger.debug(f"Cache expired for key '{key}' (age: {file_age_hours:.1f}h)")
                return None
            
            # Load cached data
            with open(cache_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            self.logger.debug(f"Cache hit for key '{key}' (age: {file_age_hours:.1f}h)")
            return data
            
        except Exception as e:
            self.logger.warning(f"Error reading cache for key '{key}': {str(e)}")
            return None
    
    def set(self, key: str, data: Any) -> bool:
        """
        Store data in cache
        
        Args:
            key: Cache key
            data: Data to cache
            
        Returns:
            True if successful, False otherwise
        """
        cache_path = self._get_cache_path(key)
        
        try:
            with open(cache_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            self.logger.debug(f"Cached data for key '{key}'")
            return True
            
        except Exception as e:
            self.logger.error(f"Error caching data for key '{key}': {str(e)}")
            return False
    
    def clear(self, key: Optional[str] = None) -> bool:
        """
        Clear cache for a specific key or all cache
        
        Args:
            key: Specific key to clear, or None to clear all
            
        Returns:
            True if successful
        """
        try:
            if key:
                cache_path = self._get_cache_path(key)
                if os.path.exists(cache_path):
                    os.remove(cache_path)
                    self.logger.info(f"Cleared cache for key '{key}'")
            else:
                # Clear all cache files
                for filename in os.listdir(self.cache_dir):
                    if filename.endswith('.json'):
                        os.remove(os.path.join(self.cache_dir, filename))
                self.logger.info("Cleared all cache")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error clearing cache: {str(e)}")
            return False

class RateLimiter:
    """
    Rate limiter for web scraping to avoid being blocked
    """
    
    def __init__(self, requests_per_minute: int = 30, min_delay: float = 1.0, max_delay: float = 5.0):
        self.requests_per_minute = requests_per_minute
        self.min_delay = min_delay
        self.max_delay = max_delay
        self.request_times = []
        self.logger = setup_scraper_logging(f"{__name__}.RateLimiter")
    
    def wait(self):
        """Wait if necessary to respect rate limits"""
        import random
        
        now = time.time()
        
        # Remove requests older than 1 minute
        self.request_times = [t for t in self.request_times if now - t < 60]
        
        # Check if we need to wait
        if len(self.request_times) >= self.requests_per_minute:
            sleep_time = 60 - (now - self.request_times[0])
            if sleep_time > 0:
                self.logger.info(f"⏳ Rate limiting: waiting {sleep_time:.1f} seconds...")
                time.sleep(sleep_time)
        
        # Add random delay to appear more human-like
        delay = random.uniform(self.min_delay, self.max_delay)
        time.sleep(delay)
        
        # Record this request
        self.request_times.append(now)

class ProcessorRankingsCache:
    """
    Specialized cache manager for processor rankings with fallback mechanisms
    """
    
    def __init__(self, cache_file: str = 'data_cleaning/processor_rankings.csv'):
        self.cache_file = cache_file
        self.logger = setup_scraper_logging(f"{__name__}.ProcessorRankingsCache")
    
    def is_cache_fresh(self, max_age_days: int = 7) -> bool:
        """
        Check if cached processor rankings are fresh
        
        Args:
            max_age_days: Maximum age in days
            
        Returns:
            True if cache is fresh, False otherwise
        """
        if not os.path.exists(self.cache_file):
            return False
        
        file_age_days = (time.time() - os.path.getmtime(self.cache_file)) / (24 * 3600)
        return file_age_days < max_age_days
    
    def get_cache_age_days(self) -> Optional[float]:
        """
        Get the age of the cache file in days
        
        Returns:
            Age in days or None if file doesn't exist
        """
        if not os.path.exists(self.cache_file):
            return None
        
        return (time.time() - os.path.getmtime(self.cache_file)) / (24 * 3600)
    
    def load_cached_rankings(self) -> Optional[object]:
        """
        Load cached processor rankings
        
        Returns:
            DataFrame with processor rankings or None if not available
        """
        try:
            import pandas as pd
            
            if os.path.exists(self.cache_file):
                df = pd.read_csv(self.cache_file)
                
                # Validate required columns
                required_columns = ['rank', 'processor', 'rating', 'company', 'processor_key']
                missing_columns = [col for col in required_columns if col not in df.columns]
                
                if missing_columns:
                    self.logger.warning(f"Cache file missing columns: {missing_columns}")
                    return None
                
                self.logger.info(f"✅ Loaded cached processor rankings: {len(df)} processors")
                return df
            else:
                self.logger.info("No cached processor rankings found")
                return None
                
        except Exception as e:
            self.logger.error(f"Error loading cached processor rankings: {str(e)}")
            return None
    
    def save_rankings(self, df: object) -> bool:
        """
        Save processor rankings to cache
        
        Args:
            df: DataFrame with processor rankings
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(self.cache_file), exist_ok=True)
            
            # Save to CSV
            df.to_csv(self.cache_file, index=False)
            
            self.logger.info(f"💾 Saved processor rankings cache: {len(df)} processors")
            return True
            
        except Exception as e:
            self.logger.error(f"Error saving processor rankings cache: {str(e)}")
            return False
    
    def create_fallback_data(self) -> object:
        """
        Create minimal fallback processor data if scraping fails
        
        Returns:
            DataFrame with basic processor data
        """
        import pandas as pd
        
        self.logger.warning("🔄 Creating fallback processor rankings data")
        
        # Basic processor data for common mobile processors
        fallback_data = [
            {'rank': 1, 'processor': 'Snapdragon 8 Gen 3', 'rating': '92 A', 'antutu10': 2000000, 'company': 'Qualcomm', 'processor_key': 'snapdragon 8 gen 3'},
            {'rank': 2, 'processor': 'A17 Pro', 'rating': '93 A+', 'antutu10': 1800000, 'company': 'Apple', 'processor_key': 'a17 pro'},
            {'rank': 3, 'processor': 'Dimensity 9300', 'rating': '91 A', 'antutu10': 1900000, 'company': 'MediaTek', 'processor_key': 'dimensity 9300'},
            {'rank': 4, 'processor': 'Snapdragon 8 Gen 2', 'rating': '89 A', 'antutu10': 1700000, 'company': 'Qualcomm', 'processor_key': 'snapdragon 8 gen 2'},
            {'rank': 5, 'processor': 'A16 Bionic', 'rating': '90 A', 'antutu10': 1600000, 'company': 'Apple', 'processor_key': 'a16 bionic'},
            {'rank': 6, 'processor': 'Exynos 2400', 'rating': '87 A', 'antutu10': 1500000, 'company': 'Samsung', 'processor_key': 'exynos 2400'},
            {'rank': 7, 'processor': 'Snapdragon 7 Gen 3', 'rating': '75 A', 'antutu10': 1200000, 'company': 'Qualcomm', 'processor_key': 'snapdragon 7 gen 3'},
            {'rank': 8, 'processor': 'Dimensity 8200', 'rating': '74 A', 'antutu10': 1100000, 'company': 'MediaTek', 'processor_key': 'dimensity 8200'},
            {'rank': 9, 'processor': 'Snapdragon 778G', 'rating': '65 B', 'antutu10': 900000, 'company': 'Qualcomm', 'processor_key': 'snapdragon 778g'},
            {'rank': 10, 'processor': 'Helio G99', 'rating': '45 C', 'antutu10': 400000, 'company': 'MediaTek', 'processor_key': 'helio g99'}
        ]
        
        df = pd.DataFrame(fallback_data)
        
        # Add missing columns with default values
        df['geekbench6'] = '2000 / 5000'  # Default geekbench scores
        df['cores'] = '8 (1+3+4)'  # Default core configuration
        df['clock'] = '3000 MHz'  # Default clock speed
        df['gpu'] = 'Integrated GPU'  # Default GPU
        
        self.logger.info(f"Created fallback data with {len(df)} processors")
        return df

def get_user_agent() -> str:
    """Get a realistic user agent string"""
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

def safe_extract_text(element, default: str = '') -> str:
    """
    Safely extract text from a web element
    
    Args:
        element: Web element
        default: Default value if extraction fails
        
    Returns:
        Extracted text or default value
    """
    try:
        return element.text.strip() if element else default
    except Exception:
        return default

def safe_extract_attribute(element, attribute: str, default: str = '') -> str:
    """
    Safely extract attribute from a web element
    
    Args:
        element: Web element
        attribute: Attribute name
        default: Default value if extraction fails
        
    Returns:
        Extracted attribute or default value
    """
    try:
        return element.get_attribute(attribute) if element else default
    except Exception:
        return default

def normalize_processor_name(name: str) -> str:
    """
    Normalize processor name for matching
    
    Args:
        name: Processor name
        
    Returns:
        Normalized processor name
    """
    import re
    
    if not name:
        return ''
    
    # Convert to lowercase
    normalized = str(name).lower()
    
    # Remove company names
    normalized = re.sub(r'\b(qualcomm|mediatek|apple|samsung|google|huawei|hisilicon|unisoc)\b', '', normalized)
    
    # Replace non-alphanumeric with spaces
    normalized = re.sub(r'[^a-z0-9]+', ' ', normalized)
    
    # Normalize whitespace
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    
    return normalized

def validate_processor_data(df: object) -> Dict[str, Any]:
    """
    Validate processor rankings data
    
    Args:
        df: DataFrame with processor data
        
    Returns:
        Validation results dictionary
    """
    logger = setup_scraper_logging(f"{__name__}.validate_processor_data")
    
    try:
        validation = {
            'is_valid': True,
            'total_records': len(df),
            'issues': [],
            'warnings': []
        }
        
        # Check required columns
        required_columns = ['rank', 'processor', 'rating', 'company', 'processor_key']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            validation['is_valid'] = False
            validation['issues'].append(f"Missing required columns: {missing_columns}")
        
        # Check for empty data
        if len(df) == 0:
            validation['is_valid'] = False
            validation['issues'].append("No processor data found")
        
        # Check for duplicate ranks
        if 'rank' in df.columns:
            duplicate_ranks = df['rank'].duplicated().sum()
            if duplicate_ranks > 0:
                validation['warnings'].append(f"Found {duplicate_ranks} duplicate ranks")
        
        # Check data completeness
        if 'processor' in df.columns:
            empty_processors = df['processor'].isna().sum()
            if empty_processors > 0:
                validation['warnings'].append(f"Found {empty_processors} empty processor names")
        
        # Check company distribution
        if 'company' in df.columns:
            companies = df['company'].value_counts()
            validation['companies'] = companies.to_dict()
            
            if len(companies) < 3:
                validation['warnings'].append(f"Only {len(companies)} companies found, expected more diversity")
        
        logger.info(f"Validation completed: {'✅ VALID' if validation['is_valid'] else '❌ INVALID'}")
        
        if validation['issues']:
            for issue in validation['issues']:
                logger.error(f"   Issue: {issue}")
        
        if validation['warnings']:
            for warning in validation['warnings']:
                logger.warning(f"   Warning: {warning}")
        
        return validation
        
    except Exception as e:
        logger.error(f"Error during validation: {str(e)}")
        return {
            'is_valid': False,
            'total_records': 0,
            'issues': [f"Validation error: {str(e)}"],
            'warnings': []
        }

# Export commonly used functions
__all__ = [
    'setup_scraper_logging',
    'CacheManager',
    'RateLimiter',
    'ProcessorRankingsCache',
    'get_user_agent',
    'safe_extract_text',
    'safe_extract_attribute',
    'normalize_processor_name',
    'validate_processor_data'
]