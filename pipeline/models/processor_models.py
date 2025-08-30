#!/usr/bin/env python3
"""
Data models for processor caching system
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
import pandas as pd

@dataclass
class ProcessorCacheInfo:
    """Information about processor cache status"""
    has_cached_data: bool
    cache_age_days: float
    last_updated: Optional[datetime]
    next_refresh_due: Optional[datetime]
    data_source: str  # 'fresh', 'cached', 'stale_fallback'
    total_processors: int
    is_cache_valid: bool
    
    def to_dict(self) -> dict:
        """Convert to dictionary for logging/serialization"""
        return {
            'has_cached_data': self.has_cached_data,
            'cache_age_days': round(self.cache_age_days, 2),
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
            'next_refresh_due': self.next_refresh_due.isoformat() if self.next_refresh_due else None,
            'data_source': self.data_source,
            'total_processors': self.total_processors,
            'is_cache_valid': self.is_cache_valid
        }

@dataclass
class ProcessorDataResponse:
    """Response containing processor data and cache information"""
    data: pd.DataFrame
    cache_info: ProcessorCacheInfo
    success: bool
    message: str
    fallback_used: bool
    
    def __post_init__(self):
        """Validate data after initialization"""
        if self.success and self.data.empty:
            self.success = False
            self.message = "No processor data available"
    
    def get_summary(self) -> dict:
        """Get summary information for logging"""
        return {
            'success': self.success,
            'data_rows': len(self.data) if not self.data.empty else 0,
            'fallback_used': self.fallback_used,
            'message': self.message,
            'cache_info': self.cache_info.to_dict()
        }