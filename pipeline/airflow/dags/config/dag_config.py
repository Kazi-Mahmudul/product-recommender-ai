"""
DAG Configuration Module

Centralized configuration for all Airflow DAGs in the data pipeline.
"""

import os
from datetime import timedelta
from typing import Dict, Any

# Environment-based configuration
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
DEBUG_MODE = os.getenv('DEBUG_MODE', 'false').lower() == 'true'

# Service URLs
SERVICE_URLS = {
    'scraper': os.getenv('PIPELINE_SCRAPER_URL', 'http://scraper-service:8000'),
    'processor': os.getenv('PIPELINE_PROCESSOR_URL', 'http://processor-service:8001'),
    'sync': os.getenv('PIPELINE_SYNC_URL', 'http://sync-service:8002'),
}

# Email configuration
EMAIL_CONFIG = {
    'enabled': os.getenv('EMAIL_ALERTS_ENABLED', 'false').lower() == 'true',
    'smtp_host': os.getenv('SMTP_HOST', 'localhost'),
    'smtp_port': int(os.getenv('SMTP_PORT', '587')),
    'smtp_user': os.getenv('SMTP_USER', ''),
    'smtp_password': os.getenv('SMTP_PASSWORD', ''),
    'from_email': os.getenv('SMTP_MAIL_FROM', 'airflow@pipeline.local'),
    'admin_emails': os.getenv('ADMIN_EMAILS', '').split(',') if os.getenv('ADMIN_EMAILS') else [],
}

# Slack configuration
SLACK_CONFIG = {
    'enabled': os.getenv('SLACK_ALERTS_ENABLED', 'false').lower() == 'true',
    'webhook_url': os.getenv('SLACK_WEBHOOK_URL', ''),
    'channel': os.getenv('SLACK_CHANNEL', '#data-pipeline'),
    'username': os.getenv('SLACK_USERNAME', 'Airflow Pipeline'),
}

# Default arguments for different DAG types
DEFAULT_ARGS_BASE = {
    'owner': 'data-pipeline',
    'depends_on_past': False,
    'email_on_failure': EMAIL_CONFIG['enabled'],
    'email_on_retry': False,
    'email': EMAIL_CONFIG['admin_emails'],
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'retry_exponential_backoff': True,
    'max_retry_delay': timedelta(minutes=30),
}

# Main pipeline DAG configuration
MAIN_PIPELINE_CONFIG = {
    'dag_id': 'main_data_pipeline',
    'description': 'Main data pipeline for mobile phone data processing',
    'schedule_interval': '0 2 * * *',  # Daily at 2 AM
    'max_active_runs': 1,
    'catchup': False,
    'tags': ['data-pipeline', 'mobile-phones', 'etl'],
    'default_args': {
        **DEFAULT_ARGS_BASE,
        'execution_timeout': timedelta(hours=2),
    },
    'timeouts': {
        'scraper': 300,  # 5 minutes
        'processor': 600,  # 10 minutes
        'sync': 300,  # 5 minutes
    },
    'batch_sizes': {
        'processor': 1000,
        'sync': 500,
    },
    'quality_thresholds': {
        'minimum_score': 0.95,
        'completeness': 0.90,
        'accuracy': 0.95,
        'consistency': 0.90,
    }
}

# Utilities DAG configuration
UTILITIES_CONFIG = {
    'dag_id': 'pipeline_utilities',
    'description': 'Utility operations for pipeline maintenance and monitoring',
    'schedule_interval': None,  # Manual trigger only
    'max_active_runs': 1,
    'catchup': False,
    'tags': ['utilities', 'maintenance', 'admin'],
    'default_args': {
        **DEFAULT_ARGS_BASE,
        'retries': 1,
        'retry_delay': timedelta(minutes=2),
        'execution_timeout': timedelta(minutes=30),
    }
}

# Monitoring DAG configuration
MONITORING_CONFIG = {
    'dag_id': 'pipeline_monitoring',
    'description': 'Continuous monitoring of data pipeline health and performance',
    'schedule_interval': timedelta(minutes=5),  # Every 5 minutes
    'max_active_runs': 1,
    'catchup': False,
    'tags': ['monitoring', 'health-check', 'metrics'],
    'default_args': {
        **DEFAULT_ARGS_BASE,
        'email_on_failure': False,  # Handle alerting separately
        'retries': 2,
        'retry_delay': timedelta(minutes=1),
        'execution_timeout': timedelta(minutes=10),
    },
    'thresholds': {
        'response_time_warning': 5.0,  # seconds
        'response_time_critical': 10.0,  # seconds
        'memory_usage_warning': 80.0,  # percentage
        'memory_usage_critical': 90.0,  # percentage
        'cpu_usage_warning': 80.0,  # percentage
        'cpu_usage_critical': 90.0,  # percentage
        'disk_usage_warning': 80.0,  # percentage
        'disk_usage_critical': 90.0,  # percentage
        'data_quality_warning': 85.0,  # percentage
        'data_quality_critical': 75.0,  # percentage
    }
}

# Data quality configuration
DATA_QUALITY_CONFIG = {
    'checks': {
        'completeness': {
            'required_fields': ['name', 'price', 'brand', 'model'],
            'threshold': 0.95
        },
        'accuracy': {
            'price_range': {'min': 0, 'max': 100000},  # Price in currency units
            'brand_whitelist': ['Samsung', 'Apple', 'Xiaomi', 'Huawei', 'OnePlus', 'Oppo', 'Vivo'],
            'threshold': 0.90
        },
        'consistency': {
            'duplicate_threshold': 0.05,  # Max 5% duplicates
            'format_checks': True,
            'threshold': 0.95
        },
        'freshness': {
            'max_age_hours': 24,  # Data should not be older than 24 hours
            'threshold': 0.90
        }
    },
    'reporting': {
        'generate_reports': True,
        'store_history': True,
        'alert_on_degradation': True
    }
}

# Performance configuration
PERFORMANCE_CONFIG = {
    'scraping': {
        'rate_limit': float(os.getenv('SCRAPER_RATE_LIMIT', '1.0')),  # Requests per second
        'concurrent_requests': int(os.getenv('SCRAPER_CONCURRENT_REQUESTS', '5')),
        'timeout': int(os.getenv('SCRAPER_TIMEOUT', '30')),
        'retry_attempts': int(os.getenv('SCRAPER_RETRY_ATTEMPTS', '3')),
        'backoff_factor': float(os.getenv('SCRAPER_BACKOFF_FACTOR', '2.0')),
    },
    'processing': {
        'batch_size': int(os.getenv('PROCESSOR_BATCH_SIZE', '1000')),
        'parallel_workers': int(os.getenv('PROCESSOR_WORKERS', '4')),
        'memory_limit': os.getenv('PROCESSOR_MEMORY_LIMIT', '2G'),
        'timeout': int(os.getenv('PROCESSOR_TIMEOUT', '600')),
    },
    'sync': {
        'batch_size': int(os.getenv('SYNC_BATCH_SIZE', '500')),
        'connection_pool_size': int(os.getenv('SYNC_POOL_SIZE', '10')),
        'timeout': int(os.getenv('SYNC_TIMEOUT', '300')),
        'max_retries': int(os.getenv('SYNC_MAX_RETRIES', '3')),
    }
}

# Security configuration
SECURITY_CONFIG = {
    'api_keys': {
        'scraper_api_key': os.getenv('SCRAPER_API_KEY', ''),
        'processor_api_key': os.getenv('PROCESSOR_API_KEY', ''),
        'sync_api_key': os.getenv('SYNC_API_KEY', ''),
    },
    'encryption': {
        'enabled': os.getenv('ENCRYPTION_ENABLED', 'true').lower() == 'true',
        'key': os.getenv('ENCRYPTION_KEY', ''),
    },
    'authentication': {
        'required': os.getenv('AUTH_REQUIRED', 'true').lower() == 'true',
        'token_expiry': int(os.getenv('AUTH_TOKEN_EXPIRY', '3600')),  # 1 hour
    }
}

# Logging configuration
LOGGING_CONFIG = {
    'level': os.getenv('LOGGING_LEVEL', 'INFO'),
    'format': os.getenv('LOGGING_FORMAT', '[%(asctime)s] {%(filename)s:%(lineno)d} %(levelname)s - %(message)s'),
    'structured': os.getenv('STRUCTURED_LOGGING', 'true').lower() == 'true',
    'retention_days': int(os.getenv('LOG_RETENTION_DAYS', '30')),
    'max_file_size': os.getenv('LOG_MAX_FILE_SIZE', '100MB'),
}

# Backup configuration
BACKUP_CONFIG = {
    'enabled': os.getenv('BACKUP_ENABLED', 'true').lower() == 'true',
    'schedule': os.getenv('BACKUP_SCHEDULE', '0 2 * * *'),  # Daily at 2 AM
    'retention_days': int(os.getenv('BACKUP_RETENTION_DAYS', '7')),
    'storage_path': os.getenv('BACKUP_STORAGE_PATH', '/opt/airflow/backups'),
    'compression': os.getenv('BACKUP_COMPRESSION', 'gzip'),
}

# Environment-specific overrides
if ENVIRONMENT == 'production':
    # Production-specific settings
    MAIN_PIPELINE_CONFIG['default_args']['retries'] = 5
    MAIN_PIPELINE_CONFIG['default_args']['retry_delay'] = timedelta(minutes=10)
    MONITORING_CONFIG['schedule_interval'] = timedelta(minutes=2)  # More frequent monitoring
    
elif ENVIRONMENT == 'development':
    # Development-specific settings
    MAIN_PIPELINE_CONFIG['default_args']['retries'] = 1
    MAIN_PIPELINE_CONFIG['default_args']['retry_delay'] = timedelta(minutes=1)
    MONITORING_CONFIG['schedule_interval'] = timedelta(minutes=10)  # Less frequent monitoring
    
elif ENVIRONMENT == 'testing':
    # Testing-specific settings
    MAIN_PIPELINE_CONFIG['default_args']['retries'] = 0
    MAIN_PIPELINE_CONFIG['schedule_interval'] = None  # Manual trigger only
    MONITORING_CONFIG['schedule_interval'] = None  # Manual trigger only


def get_config(config_name: str) -> Dict[str, Any]:
    """Get configuration by name."""
    configs = {
        'main_pipeline': MAIN_PIPELINE_CONFIG,
        'utilities': UTILITIES_CONFIG,
        'monitoring': MONITORING_CONFIG,
        'data_quality': DATA_QUALITY_CONFIG,
        'performance': PERFORMANCE_CONFIG,
        'security': SECURITY_CONFIG,
        'logging': LOGGING_CONFIG,
        'backup': BACKUP_CONFIG,
        'email': EMAIL_CONFIG,
        'slack': SLACK_CONFIG,
        'service_urls': SERVICE_URLS,
    }
    
    return configs.get(config_name, {})


def get_service_url(service_name: str) -> str:
    """Get service URL by name."""
    return SERVICE_URLS.get(service_name, '')


def is_production() -> bool:
    """Check if running in production environment."""
    return ENVIRONMENT == 'production'


def is_development() -> bool:
    """Check if running in development environment."""
    return ENVIRONMENT == 'development'


def is_testing() -> bool:
    """Check if running in testing environment."""
    return ENVIRONMENT == 'testing'