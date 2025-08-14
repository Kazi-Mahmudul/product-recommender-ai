"""
Schedule Patterns Module

Predefined scheduling patterns and configurations for different scenarios:
- Production schedules
- Development schedules
- Custom business schedules
- Event-driven schedules
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List
from airflow.utils.dates import days_ago

# Base schedule patterns
SCHEDULE_PATTERNS = {
    'production_daily': {
        'schedule_interval': '0 2 * * *',  # Daily at 2 AM
        'description': 'Production daily schedule - runs every day at 2 AM',
        'max_active_runs': 1,
        'catchup': False,
        'retries': 5,
        'retry_delay': timedelta(minutes=10),
        'execution_timeout': timedelta(hours=3),
        'tags': ['production', 'daily'],
        'sla': timedelta(hours=4),
        'email_on_failure': True,
        'email_on_retry': False,
        'email_on_sla_miss': True
    },
    
    'production_hourly': {
        'schedule_interval': '0 * * * *',  # Every hour
        'description': 'Production hourly schedule - runs every hour',
        'max_active_runs': 1,
        'catchup': False,
        'retries': 3,
        'retry_delay': timedelta(minutes=5),
        'execution_timeout': timedelta(minutes=45),
        'tags': ['production', 'hourly'],
        'sla': timedelta(minutes=50),
        'email_on_failure': True,
        'email_on_retry': False,
        'email_on_sla_miss': True
    },
    
    'development_frequent': {
        'schedule_interval': timedelta(minutes=15),  # Every 15 minutes
        'description': 'Development frequent schedule - runs every 15 minutes',
        'max_active_runs': 1,
        'catchup': False,
        'retries': 1,
        'retry_delay': timedelta(minutes=2),
        'execution_timeout': timedelta(minutes=10),
        'tags': ['development', 'frequent'],
        'email_on_failure': False,
        'email_on_retry': False,
        'email_on_sla_miss': False
    },
    
    'business_hours_only': {
        'schedule_interval': '0 9-17 * * 1-5',  # Every hour from 9 AM to 5 PM, Monday to Friday
        'description': 'Business hours only - runs hourly during business hours',
        'max_active_runs': 1,
        'catchup': False,
        'retries': 3,
        'retry_delay': timedelta(minutes=5),
        'execution_timeout': timedelta(minutes=30),
        'tags': ['business-hours', 'weekdays'],
        'sla': timedelta(minutes=45),
        'email_on_failure': True,
        'email_on_retry': False,
        'email_on_sla_miss': True
    },
    
    'weekend_batch': {
        'schedule_interval': '0 6 * * 6,0',  # Saturday and Sunday at 6 AM
        'description': 'Weekend batch processing - runs on weekends',
        'max_active_runs': 1,
        'catchup': False,
        'retries': 5,
        'retry_delay': timedelta(minutes=15),
        'execution_timeout': timedelta(hours=6),
        'tags': ['weekend', 'batch'],
        'sla': timedelta(hours=8),
        'email_on_failure': True,
        'email_on_retry': True,
        'email_on_sla_miss': True
    },
    
    'manual_only': {
        'schedule_interval': None,  # Manual trigger only
        'description': 'Manual trigger only - no automatic scheduling',
        'max_active_runs': 3,
        'catchup': False,
        'retries': 3,
        'retry_delay': timedelta(minutes=5),
        'execution_timeout': timedelta(hours=2),
        'tags': ['manual', 'on-demand'],
        'email_on_failure': True,
        'email_on_retry': False,
        'email_on_sla_miss': False
    },
    
    'high_frequency': {
        'schedule_interval': timedelta(minutes=5),  # Every 5 minutes
        'description': 'High frequency schedule - runs every 5 minutes',
        'max_active_runs': 2,
        'catchup': False,
        'retries': 2,
        'retry_delay': timedelta(minutes=1),
        'execution_timeout': timedelta(minutes=4),
        'tags': ['high-frequency', 'real-time'],
        'sla': timedelta(minutes=6),
        'email_on_failure': False,  # Too frequent for email alerts
        'email_on_retry': False,
        'email_on_sla_miss': False
    },
    
    'low_frequency': {
        'schedule_interval': '0 2 1 * *',  # First day of every month at 2 AM
        'description': 'Low frequency schedule - runs monthly',
        'max_active_runs': 1,
        'catchup': True,  # Important for monthly processing
        'retries': 10,
        'retry_delay': timedelta(hours=1),
        'execution_timeout': timedelta(hours=12),
        'tags': ['monthly', 'batch'],
        'sla': timedelta(hours=24),
        'email_on_failure': True,
        'email_on_retry': True,
        'email_on_sla_miss': True
    }
}

# Event-driven schedule configurations
EVENT_DRIVEN_PATTERNS = {
    'data_arrival': {
        'trigger_type': 'file_sensor',
        'description': 'Triggered when new data files arrive',
        'sensor_config': {
            'filepath': '/opt/airflow/data/incoming/',
            'file_pattern': '*.csv',
            'timeout': 3600,  # 1 hour timeout
            'poke_interval': 60,  # Check every minute
            'mode': 'poke'
        },
        'execution_config': {
            'retries': 3,
            'retry_delay': timedelta(minutes=5),
            'execution_timeout': timedelta(hours=2)
        }
    },
    
    'external_api_update': {
        'trigger_type': 'http_sensor',
        'description': 'Triggered when external API indicates data update',
        'sensor_config': {
            'endpoint': '/api/data/status',
            'request_params': {'check': 'update_available'},
            'timeout': 1800,  # 30 minutes timeout
            'poke_interval': 300,  # Check every 5 minutes
            'mode': 'poke'
        },
        'execution_config': {
            'retries': 5,
            'retry_delay': timedelta(minutes=10),
            'execution_timeout': timedelta(hours=3)
        }
    },
    
    'database_change': {
        'trigger_type': 'sql_sensor',
        'description': 'Triggered when database changes are detected',
        'sensor_config': {
            'sql': 'SELECT COUNT(*) FROM source_table WHERE updated_at > NOW() - INTERVAL 1 HOUR',
            'conn_id': 'source_database',
            'timeout': 7200,  # 2 hours timeout
            'poke_interval': 600,  # Check every 10 minutes
            'mode': 'poke'
        },
        'execution_config': {
            'retries': 3,
            'retry_delay': timedelta(minutes=15),
            'execution_timeout': timedelta(hours=4)
        }
    },
    
    'webhook_trigger': {
        'trigger_type': 'webhook',
        'description': 'Triggered by external webhook calls',
        'webhook_config': {
            'endpoint': '/api/v1/trigger/webhook',
            'authentication': 'bearer_token',
            'allowed_sources': ['data_provider', 'monitoring_system', 'admin_panel']
        },
        'execution_config': {
            'retries': 2,
            'retry_delay': timedelta(minutes=3),
            'execution_timeout': timedelta(hours=1)
        }
    }
}

# Business-specific schedule patterns
BUSINESS_PATTERNS = {
    'ecommerce_peak_hours': {
        'schedule_interval': '0 8,12,16,20 * * *',  # 8 AM, 12 PM, 4 PM, 8 PM
        'description': 'E-commerce peak hours - runs during high traffic periods',
        'business_context': {
            'peak_hours': ['08:00', '12:00', '16:00', '20:00'],
            'timezone': 'UTC',
            'business_days_only': False
        }
    },
    
    'financial_end_of_day': {
        'schedule_interval': '0 18 * * 1-5',  # 6 PM on weekdays
        'description': 'Financial end-of-day processing',
        'business_context': {
            'market_close': '16:00',
            'processing_window': '18:00-22:00',
            'timezone': 'America/New_York',
            'business_days_only': True
        }
    },
    
    'retail_inventory_update': {
        'schedule_interval': '0 1,13 * * *',  # 1 AM and 1 PM daily
        'description': 'Retail inventory updates - twice daily',
        'business_context': {
            'morning_update': '01:00',
            'afternoon_update': '13:00',
            'timezone': 'UTC',
            'business_days_only': False
        }
    },
    
    'marketing_campaign_sync': {
        'schedule_interval': '0 */4 * * *',  # Every 4 hours
        'description': 'Marketing campaign data synchronization',
        'business_context': {
            'campaign_refresh_hours': 4,
            'timezone': 'UTC',
            'business_days_only': False
        }
    }
}

# Adaptive scheduling configurations
ADAPTIVE_PATTERNS = {
    'performance_based': {
        'base_interval': timedelta(hours=1),
        'min_interval': timedelta(minutes=30),
        'max_interval': timedelta(hours=4),
        'adaptation_rules': {
            'success_rate_threshold': 0.95,
            'avg_duration_threshold': 30,  # minutes
            'error_rate_threshold': 0.05,
            'scale_up_factor': 0.8,  # Decrease interval by 20%
            'scale_down_factor': 1.5  # Increase interval by 50%
        },
        'description': 'Adaptive scheduling based on pipeline performance'
    },
    
    'load_based': {
        'base_interval': timedelta(hours=2),
        'min_interval': timedelta(hours=1),
        'max_interval': timedelta(hours=8),
        'adaptation_rules': {
            'cpu_threshold': 80,  # percentage
            'memory_threshold': 85,  # percentage
            'queue_length_threshold': 5,
            'scale_up_factor': 0.7,
            'scale_down_factor': 2.0
        },
        'description': 'Adaptive scheduling based on system load'
    },
    
    'data_volume_based': {
        'base_interval': timedelta(hours=1),
        'min_interval': timedelta(minutes=15),
        'max_interval': timedelta(hours=6),
        'adaptation_rules': {
            'data_volume_threshold': 1000000,  # records
            'processing_time_threshold': 45,  # minutes
            'scale_up_factor': 0.6,
            'scale_down_factor': 1.8
        },
        'description': 'Adaptive scheduling based on data volume'
    }
}


def get_schedule_pattern(pattern_name: str, pattern_type: str = 'standard') -> Dict[str, Any]:
    """Get a specific schedule pattern configuration."""
    pattern_maps = {
        'standard': SCHEDULE_PATTERNS,
        'event_driven': EVENT_DRIVEN_PATTERNS,
        'business': BUSINESS_PATTERNS,
        'adaptive': ADAPTIVE_PATTERNS
    }
    
    pattern_map = pattern_maps.get(pattern_type, SCHEDULE_PATTERNS)
    return pattern_map.get(pattern_name, {})


def list_available_patterns(pattern_type: str = None) -> Dict[str, List[str]]:
    """List all available schedule patterns."""
    if pattern_type:
        pattern_maps = {
            'standard': SCHEDULE_PATTERNS,
            'event_driven': EVENT_DRIVEN_PATTERNS,
            'business': BUSINESS_PATTERNS,
            'adaptive': ADAPTIVE_PATTERNS
        }
        
        if pattern_type in pattern_maps:
            return {pattern_type: list(pattern_maps[pattern_type].keys())}
        else:
            return {}
    
    return {
        'standard': list(SCHEDULE_PATTERNS.keys()),
        'event_driven': list(EVENT_DRIVEN_PATTERNS.keys()),
        'business': list(BUSINESS_PATTERNS.keys()),
        'adaptive': list(ADAPTIVE_PATTERNS.keys())
    }


def create_custom_pattern(name: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """Create a custom schedule pattern."""
    required_fields = ['schedule_interval', 'description']
    
    for field in required_fields:
        if field not in config:
            raise ValueError(f"Required field '{field}' missing from custom pattern configuration")
    
    # Set default values for optional fields
    defaults = {
        'max_active_runs': 1,
        'catchup': False,
        'retries': 3,
        'retry_delay': timedelta(minutes=5),
        'execution_timeout': timedelta(hours=2),
        'tags': ['custom'],
        'email_on_failure': True,
        'email_on_retry': False,
        'email_on_sla_miss': True
    }
    
    custom_pattern = {**defaults, **config}
    custom_pattern['name'] = name
    custom_pattern['created_at'] = datetime.utcnow().isoformat()
    
    return custom_pattern


def validate_schedule_pattern(pattern: Dict[str, Any]) -> Dict[str, Any]:
    """Validate a schedule pattern configuration."""
    validation_result = {
        'valid': True,
        'errors': [],
        'warnings': []
    }
    
    # Check required fields
    required_fields = ['schedule_interval', 'description']
    for field in required_fields:
        if field not in pattern:
            validation_result['valid'] = False
            validation_result['errors'].append(f"Missing required field: {field}")
    
    # Validate schedule_interval
    if 'schedule_interval' in pattern:
        interval = pattern['schedule_interval']
        if interval is not None:
            if isinstance(interval, str):
                # Validate cron expression (basic validation)
                parts = interval.split()
                if len(parts) != 5:
                    validation_result['valid'] = False
                    validation_result['errors'].append("Invalid cron expression format")
            elif isinstance(interval, timedelta):
                # Validate timedelta
                if interval.total_seconds() < 60:  # Less than 1 minute
                    validation_result['warnings'].append("Very short interval may cause performance issues")
                elif interval.total_seconds() > 86400 * 7:  # More than 1 week
                    validation_result['warnings'].append("Very long interval may cause data staleness")
    
    # Validate timeout settings
    if 'execution_timeout' in pattern and 'retry_delay' in pattern:
        if pattern['execution_timeout'] < pattern['retry_delay']:
            validation_result['warnings'].append("Execution timeout is shorter than retry delay")
    
    # Validate retry settings
    if 'retries' in pattern:
        if pattern['retries'] > 10:
            validation_result['warnings'].append("High retry count may cause excessive resource usage")
        elif pattern['retries'] < 0:
            validation_result['valid'] = False
            validation_result['errors'].append("Retry count cannot be negative")
    
    return validation_result


def get_recommended_pattern(use_case: str, environment: str = 'production') -> Dict[str, Any]:
    """Get recommended schedule pattern based on use case and environment."""
    recommendations = {
        'production': {
            'data_warehouse_etl': 'production_daily',
            'real_time_analytics': 'high_frequency',
            'batch_processing': 'weekend_batch',
            'api_sync': 'business_hours_only',
            'monitoring': 'production_hourly'
        },
        'development': {
            'data_warehouse_etl': 'development_frequent',
            'real_time_analytics': 'development_frequent',
            'batch_processing': 'manual_only',
            'api_sync': 'development_frequent',
            'monitoring': 'development_frequent'
        },
        'testing': {
            'data_warehouse_etl': 'manual_only',
            'real_time_analytics': 'manual_only',
            'batch_processing': 'manual_only',
            'api_sync': 'manual_only',
            'monitoring': 'manual_only'
        }
    }
    
    env_recommendations = recommendations.get(environment, recommendations['production'])
    pattern_name = env_recommendations.get(use_case, 'production_daily')
    
    return get_schedule_pattern(pattern_name)