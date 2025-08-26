#!/usr/bin/env python3
"""
Common utilities for GitHub Actions Pipeline

This module contains shared utilities and helper functions used across
the GitHub Actions pipeline orchestrators.
"""

import json
import os
import sys
import time
from datetime import datetime
from typing import Dict, Any, Optional, List
import logging

def setup_logging(name: str = __name__, level: str = 'INFO') -> logging.Logger:
    """
    Setup standardized logging for pipeline components
    
    Args:
        name: Logger name
        level: Logging level (DEBUG, INFO, WARN, ERROR)
        
    Returns:
        Configured logger instance
    """
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger(name)

def set_github_output(key: str, value: Any) -> None:
    """
    Set GitHub Actions output variable
    
    Args:
        key: Output variable name
        value: Output value (will be JSON serialized if not string)
    """
    if 'GITHUB_OUTPUT' in os.environ:
        output_value = value if isinstance(value, str) else json.dumps(value)
        with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
            f.write(f"{key}={output_value}\n")

def get_environment_info() -> Dict[str, Any]:
    """
    Get information about the current environment
    
    Returns:
        Dictionary with environment information
    """
    return {
        'python_version': sys.version,
        'platform': sys.platform,
        'cwd': os.getcwd(),
        'pipeline_env': os.getenv('PIPELINE_ENV', 'unknown'),
        'log_level': os.getenv('LOG_LEVEL', 'INFO'),
        'batch_size': os.getenv('BATCH_SIZE', '50'),
        'github_actions': 'GITHUB_ACTIONS' in os.environ,
        'timestamp': datetime.now().isoformat()
    }

def validate_database_connection(database_url: str, timeout: int = 10) -> Dict[str, Any]:
    """
    Validate database connection
    
    Args:
        database_url: Database connection string
        timeout: Connection timeout in seconds
        
    Returns:
        Dictionary with validation results
    """
    try:
        import psycopg2
        
        # Convert postgres:// to postgresql:// if needed
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        
        conn = psycopg2.connect(database_url, connect_timeout=timeout)
        cursor = conn.cursor()
        cursor.execute('SELECT 1')
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        return {
            'status': 'success',
            'connected': True,
            'test_query_result': result[0] if result else None,
            'message': 'Database connection successful'
        }
        
    except Exception as e:
        return {
            'status': 'failed',
            'connected': False,
            'error': str(e),
            'message': f'Database connection failed: {str(e)}'
        }

def retry_with_backoff(func, max_retries: int = 3, initial_delay: float = 1.0, backoff_factor: float = 2.0, exceptions: tuple = (Exception,)):
    """
    Retry a function with exponential backoff
    
    Args:
        func: Function to retry
        max_retries: Maximum number of retry attempts
        initial_delay: Initial delay in seconds
        backoff_factor: Multiplier for delay between retries
        exceptions: Tuple of exceptions to catch and retry on
        
    Returns:
        Function result or raises the last exception
    """
    delay = initial_delay
    last_exception = None
    
    for attempt in range(max_retries + 1):
        try:
            return func()
        except exceptions as e:
            last_exception = e
            if attempt < max_retries:
                time.sleep(delay)
                delay *= backoff_factor
            else:
                raise last_exception

def format_execution_time(seconds: float) -> str:
    """
    Format execution time in a human-readable format
    
    Args:
        seconds: Time in seconds
        
    Returns:
        Formatted time string
    """
    if seconds < 60:
        return f"{seconds:.1f} seconds"
    elif seconds < 3600:
        minutes = seconds / 60
        return f"{minutes:.1f} minutes"
    else:
        hours = seconds / 3600
        return f"{hours:.1f} hours"

def create_pipeline_summary(results: Dict[str, Any]) -> str:
    """
    Create a formatted pipeline execution summary
    
    Args:
        results: Dictionary containing pipeline results
        
    Returns:
        Formatted summary string
    """
    summary_lines = []
    summary_lines.append("## 📊 Pipeline Execution Summary")
    summary_lines.append("")
    
    # Basic info
    if 'pipeline_run_id' in results:
        summary_lines.append(f"**Run ID:** {results['pipeline_run_id']}")
    
    if 'timestamp' in results:
        summary_lines.append(f"**Timestamp:** {results['timestamp']}")
    
    summary_lines.append("")
    
    # Phase results
    phases = [
        ('extraction', '📱 Data Extraction'),
        ('processing', '🔧 Data Processing'),
        ('loading', '💾 Data Loading'),
        ('top_searched', '🔍 Top Searched Update')
    ]
    
    for phase_key, phase_name in phases:
        if phase_key in results:
            phase_result = results[phase_key]
            status = phase_result.get('status', 'unknown')
            
            if status == 'success':
                summary_lines.append(f"✅ **{phase_name}:** SUCCESS")
            elif status == 'failed':
                summary_lines.append(f"❌ **{phase_name}:** FAILED")
            else:
                summary_lines.append(f"⚠️ **{phase_name}:** {status.upper()}")
    
    summary_lines.append("")
    
    # Metrics
    if 'metrics' in results:
        metrics = results['metrics']
        summary_lines.append("### 📈 Metrics")
        
        for key, value in metrics.items():
            formatted_key = key.replace('_', ' ').title()
            summary_lines.append(f"- **{formatted_key}:** {value}")
    
    return "\n".join(summary_lines)

def safe_json_loads(json_string: str, default: Any = None) -> Any:
    """
    Safely parse JSON string with fallback
    
    Args:
        json_string: JSON string to parse
        default: Default value if parsing fails
        
    Returns:
        Parsed JSON or default value
    """
    try:
        return json.loads(json_string)
    except (json.JSONDecodeError, TypeError):
        return default

def ensure_directory_exists(file_path: str) -> None:
    """
    Ensure the directory for a file path exists
    
    Args:
        file_path: Path to file (directory will be created)
    """
    directory = os.path.dirname(file_path)
    if directory and not os.path.exists(directory):
        os.makedirs(directory, exist_ok=True)

def get_file_age_days(file_path: str) -> Optional[float]:
    """
    Get the age of a file in days
    
    Args:
        file_path: Path to file
        
    Returns:
        Age in days or None if file doesn't exist
    """
    if not os.path.exists(file_path):
        return None
    
    file_time = os.path.getmtime(file_path)
    current_time = time.time()
    age_seconds = current_time - file_time
    return age_seconds / (24 * 3600)

def truncate_string(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """
    Truncate a string to a maximum length
    
    Args:
        text: Text to truncate
        max_length: Maximum length
        suffix: Suffix to add if truncated
        
    Returns:
        Truncated string
    """
    if len(text) <= max_length:
        return text
    
    return text[:max_length - len(suffix)] + suffix

def log_system_info(logger: logging.Logger) -> None:
    """
    Log system and environment information
    
    Args:
        logger: Logger instance to use
    """
    env_info = get_environment_info()
    
    logger.info("🖥️ System Information:")
    logger.info(f"   Python: {env_info['python_version'].split()[0]}")
    logger.info(f"   Platform: {env_info['platform']}")
    logger.info(f"   Working Directory: {env_info['cwd']}")
    logger.info(f"   Pipeline Environment: {env_info['pipeline_env']}")
    logger.info(f"   Log Level: {env_info['log_level']}")
    logger.info(f"   Batch Size: {env_info['batch_size']}")
    logger.info(f"   GitHub Actions: {env_info['github_actions']}")

def create_error_result(error: Exception, pipeline_run_id: str, component: str) -> Dict[str, Any]:
    """
    Create a standardized error result dictionary
    
    Args:
        error: Exception that occurred
        pipeline_run_id: Pipeline run identifier
        component: Component name where error occurred
        
    Returns:
        Standardized error result dictionary
    """
    return {
        'status': 'failed',
        'error': str(error),
        'component': component,
        'pipeline_run_id': pipeline_run_id,
        'timestamp': datetime.now().isoformat(),
        'error_type': type(error).__name__
    }

def create_success_result(pipeline_run_id: str, component: str, **kwargs) -> Dict[str, Any]:
    """
    Create a standardized success result dictionary
    
    Args:
        pipeline_run_id: Pipeline run identifier
        component: Component name
        **kwargs: Additional result data
        
    Returns:
        Standardized success result dictionary
    """
    result = {
        'status': 'success',
        'component': component,
        'pipeline_run_id': pipeline_run_id,
        'timestamp': datetime.now().isoformat()
    }
    result.update(kwargs)
    return result

class PipelineTimer:
    """Context manager for timing pipeline operations"""
    
    def __init__(self, operation_name: str, logger: Optional[logging.Logger] = None):
        self.operation_name = operation_name
        self.logger = logger
        self.start_time = None
        self.end_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        if self.logger:
            self.logger.info(f"⏱️ Starting {self.operation_name}...")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.end_time = time.time()
        duration = self.end_time - self.start_time
        
        if self.logger:
            if exc_type is None:
                self.logger.info(f"✅ {self.operation_name} completed in {format_execution_time(duration)}")
            else:
                self.logger.error(f"❌ {self.operation_name} failed after {format_execution_time(duration)}")
    
    @property
    def duration(self) -> Optional[float]:
        """Get the duration in seconds"""
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return None

# Export commonly used functions
__all__ = [
    'setup_logging',
    'set_github_output',
    'get_environment_info',
    'validate_database_connection',
    'retry_with_backoff',
    'format_execution_time',
    'create_pipeline_summary',
    'safe_json_loads',
    'ensure_directory_exists',
    'get_file_age_days',
    'truncate_string',
    'log_system_info',
    'create_error_result',
    'create_success_result',
    'PipelineTimer'
]