"""
GitHub Actions Pipeline Configuration

This module contains configuration settings for the GitHub Actions pipeline.
"""

import os
from typing import Dict, Any, Optional

class PipelineConfig:
    """Configuration class for GitHub Actions pipeline"""
    
    def __init__(self):
        self.pipeline_env = os.getenv('PIPELINE_ENV', 'production')
        self.log_level = os.getenv('LOG_LEVEL', 'INFO')
        self.batch_size = int(os.getenv('BATCH_SIZE', '50'))
        
    @property
    def database_url(self) -> str:
        """Get database URL from environment"""
        url = os.getenv('DATABASE_URL')
        if not url:
            raise ValueError("DATABASE_URL environment variable is required")
        
        # Convert postgres:// to postgresql:// if needed
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        
        return url
    
    @property
    def is_test_mode(self) -> bool:
        """Check if running in test mode"""
        return self.pipeline_env.lower() in ['test', 'testing', 'development']
    
    @property
    def scraper_config(self) -> Dict[str, Any]:
        """Configuration for scrapers"""
        return {
            'rate_limit_requests_per_minute': 60,  # Increased from 30 to 60
            'timeout_seconds': 30,
            'max_retries': 3,
            'retry_delay_seconds': 2,  # Reduced from 5 to 2
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
        }
    
    @property
    def processor_config(self) -> Dict[str, Any]:
        """Configuration for data processing"""
        return {
            'batch_size': self.batch_size,
            'quality_threshold': 0.85,
            'max_processing_time_minutes': 30
        }
    
    @property
    def database_config(self) -> Dict[str, Any]:
        """Configuration for database operations"""
        return {
            'connection_timeout': 30,
            'query_timeout': 60,
            'max_retries': 3,
            'batch_size': self.batch_size,
            'direct_loading_enabled': True,
            'transaction_timeout': 300  # 5 minutes for large datasets
        }
    
    def get_output_paths(self) -> Dict[str, str]:
        """Get output file paths (processed_data removed - now using direct database loading)"""
        return {
            'processor_rankings': 'pipeline/cache/processor_rankings.csv',
            'scraped_data': 'pipeline/cache/scraped_phones.csv',
            'logs': 'logs/pipeline.log'
        }

# Global configuration instance
config = PipelineConfig()