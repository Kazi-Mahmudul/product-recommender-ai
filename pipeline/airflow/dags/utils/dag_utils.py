"""
DAG Utilities Module

Common utilities and helper functions for Airflow DAGs.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from airflow.hooks.http_hook import HttpHook
from airflow.exceptions import AirflowException
from airflow.models import Variable
from airflow.utils.email import send_email

# Configure logging
logger = logging.getLogger(__name__)


class PipelineHttpHook:
    """Enhanced HTTP hook with retry logic and error handling."""
    
    def __init__(self, base_url: str, timeout: int = 30, retries: int = 3):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.session = requests.Session()
        
        # Configure retry strategy
        retry_strategy = Retry(
            total=retries,
            backoff_factor=2,
            status_forcelist=[429, 500, 502, 503, 504],
            method_whitelist=["HEAD", "GET", "OPTIONS", "POST", "PUT", "DELETE"]
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
    
    def get(self, endpoint: str, params: Optional[Dict] = None, headers: Optional[Dict] = None) -> requests.Response:
        """Make GET request with retry logic."""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = headers or {'Content-Type': 'application/json'}
        
        try:
            response = self.session.get(url, params=params, headers=headers, timeout=self.timeout)
            response.raise_for_status()
            return response
        except requests.exceptions.RequestException as e:
            logger.error(f"GET request failed for {url}: {str(e)}")
            raise AirflowException(f"HTTP GET failed: {str(e)}")
    
    def post(self, endpoint: str, data: Optional[Dict] = None, json_data: Optional[Dict] = None, 
             headers: Optional[Dict] = None) -> requests.Response:
        """Make POST request with retry logic."""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = headers or {'Content-Type': 'application/json'}
        
        try:
            response = self.session.post(
                url, 
                data=data, 
                json=json_data, 
                headers=headers, 
                timeout=self.timeout
            )
            response.raise_for_status()
            return response
        except requests.exceptions.RequestException as e:
            logger.error(f"POST request failed for {url}: {str(e)}")
            raise AirflowException(f"HTTP POST failed: {str(e)}")
    
    def health_check(self) -> Dict[str, Any]:
        """Perform health check on the service."""
        try:
            response = self.get('/health')
            return {
                'status': 'healthy',
                'response_time': response.elapsed.total_seconds(),
                'details': response.json() if response.content else {}
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'details': {}
            }


def validate_service_response(response: requests.Response, expected_status: int = 200) -> Dict[str, Any]:
    """Validate service response and extract data."""
    if response.status_code != expected_status:
        raise AirflowException(f"Unexpected status code: {response.status_code}, expected: {expected_status}")
    
    try:
        return response.json()
    except json.JSONDecodeError:
        raise AirflowException("Invalid JSON response from service")


def check_data_quality(data: Dict[str, Any], quality_checks: Dict[str, Any]) -> Dict[str, Any]:
    """Perform data quality checks on pipeline data."""
    quality_results = {
        'overall_score': 0.0,
        'checks': {},
        'passed': True,
        'issues': []
    }
    
    total_checks = len(quality_checks)
    passed_checks = 0
    
    for check_name, check_config in quality_checks.items():
        check_result = {
            'passed': True,
            'score': 1.0,
            'details': {}
        }
        
        try:
            if check_name == 'completeness':
                check_result = _check_completeness(data, check_config)
            elif check_name == 'accuracy':
                check_result = _check_accuracy(data, check_config)
            elif check_name == 'consistency':
                check_result = _check_consistency(data, check_config)
            elif check_name == 'freshness':
                check_result = _check_freshness(data, check_config)
            else:
                logger.warning(f"Unknown quality check: {check_name}")
                continue
            
            if check_result['passed']:
                passed_checks += 1
            else:
                quality_results['passed'] = False
                quality_results['issues'].append(f"{check_name}: {check_result.get('details', {}).get('message', 'Check failed')}")
            
            quality_results['checks'][check_name] = check_result
            
        except Exception as e:
            logger.error(f"Quality check {check_name} failed: {str(e)}")
            check_result = {
                'passed': False,
                'score': 0.0,
                'details': {'error': str(e)}
            }
            quality_results['checks'][check_name] = check_result
            quality_results['issues'].append(f"{check_name}: {str(e)}")
    
    # Calculate overall score
    if total_checks > 0:
        quality_results['overall_score'] = sum(
            check['score'] for check in quality_results['checks'].values()
        ) / total_checks
    
    return quality_results


def _check_completeness(data: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
    """Check data completeness."""
    required_fields = config.get('required_fields', [])
    threshold = config.get('threshold', 0.95)
    
    if 'records' not in data:
        return {
            'passed': False,
            'score': 0.0,
            'details': {'message': 'No records found in data'}
        }
    
    records = data['records']
    total_records = len(records)
    
    if total_records == 0:
        return {
            'passed': False,
            'score': 0.0,
            'details': {'message': 'No records to check'}
        }
    
    field_completeness = {}
    for field in required_fields:
        complete_count = sum(1 for record in records if record.get(field) is not None and record.get(field) != '')
        completeness = complete_count / total_records
        field_completeness[field] = completeness
    
    overall_completeness = sum(field_completeness.values()) / len(required_fields) if required_fields else 1.0
    
    return {
        'passed': overall_completeness >= threshold,
        'score': overall_completeness,
        'details': {
            'overall_completeness': overall_completeness,
            'field_completeness': field_completeness,
            'threshold': threshold,
            'total_records': total_records
        }
    }


def _check_accuracy(data: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
    """Check data accuracy."""
    threshold = config.get('threshold', 0.90)
    price_range = config.get('price_range', {})
    brand_whitelist = config.get('brand_whitelist', [])
    
    records = data.get('records', [])
    total_records = len(records)
    
    if total_records == 0:
        return {
            'passed': False,
            'score': 0.0,
            'details': {'message': 'No records to check'}
        }
    
    accuracy_issues = 0
    
    for record in records:
        # Check price range
        if price_range and 'price' in record:
            try:
                price = float(record['price'])
                if price < price_range.get('min', 0) or price > price_range.get('max', float('inf')):
                    accuracy_issues += 1
            except (ValueError, TypeError):
                accuracy_issues += 1
        
        # Check brand whitelist
        if brand_whitelist and 'brand' in record:
            if record['brand'] not in brand_whitelist:
                accuracy_issues += 1
    
    accuracy_score = max(0.0, (total_records - accuracy_issues) / total_records)
    
    return {
        'passed': accuracy_score >= threshold,
        'score': accuracy_score,
        'details': {
            'accuracy_score': accuracy_score,
            'issues_found': accuracy_issues,
            'total_records': total_records,
            'threshold': threshold
        }
    }


def _check_consistency(data: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
    """Check data consistency."""
    threshold = config.get('threshold', 0.95)
    duplicate_threshold = config.get('duplicate_threshold', 0.05)
    
    records = data.get('records', [])
    total_records = len(records)
    
    if total_records == 0:
        return {
            'passed': False,
            'score': 0.0,
            'details': {'message': 'No records to check'}
        }
    
    # Check for duplicates (simplified - based on name and brand)
    seen_items = set()
    duplicates = 0
    
    for record in records:
        item_key = f"{record.get('name', '')}-{record.get('brand', '')}"
        if item_key in seen_items:
            duplicates += 1
        else:
            seen_items.add(item_key)
    
    duplicate_rate = duplicates / total_records
    consistency_score = max(0.0, 1.0 - (duplicate_rate / duplicate_threshold))
    
    return {
        'passed': consistency_score >= threshold and duplicate_rate <= duplicate_threshold,
        'score': consistency_score,
        'details': {
            'consistency_score': consistency_score,
            'duplicate_rate': duplicate_rate,
            'duplicates_found': duplicates,
            'total_records': total_records,
            'threshold': threshold
        }
    }


def _check_freshness(data: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
    """Check data freshness."""
    threshold = config.get('threshold', 0.90)
    max_age_hours = config.get('max_age_hours', 24)
    
    # Check when data was last updated
    last_updated = data.get('metadata', {}).get('last_updated')
    if not last_updated:
        return {
            'passed': False,
            'score': 0.0,
            'details': {'message': 'No last_updated timestamp found'}
        }
    
    try:
        if isinstance(last_updated, str):
            last_updated = datetime.fromisoformat(last_updated.replace('Z', '+00:00'))
        
        age_hours = (datetime.utcnow() - last_updated.replace(tzinfo=None)).total_seconds() / 3600
        freshness_score = max(0.0, 1.0 - (age_hours / max_age_hours))
        
        return {
            'passed': freshness_score >= threshold,
            'score': freshness_score,
            'details': {
                'freshness_score': freshness_score,
                'age_hours': age_hours,
                'max_age_hours': max_age_hours,
                'last_updated': last_updated.isoformat(),
                'threshold': threshold
            }
        }
    except Exception as e:
        return {
            'passed': False,
            'score': 0.0,
            'details': {'error': f"Failed to parse timestamp: {str(e)}"}
        }


def send_pipeline_alert(subject: str, message: str, alert_level: str = 'info', 
                       context: Optional[Dict] = None) -> bool:
    """Send pipeline alert via configured channels."""
    try:
        # Email alert
        email_config = Variable.get("email_config", {}, deserialize_json=True)
        if email_config.get('enabled', False):
            send_email(
                to=email_config.get('admin_emails', []),
                subject=f"[{alert_level.upper()}] {subject}",
                html_content=f"<h3>{subject}</h3><p>{message}</p>",
                files=None
            )
        
        # Slack alert (placeholder - would need actual Slack integration)
        slack_config = Variable.get("slack_config", {}, deserialize_json=True)
        if slack_config.get('enabled', False):
            # TODO: Implement Slack webhook integration
            logger.info(f"Slack alert: {subject} - {message}")
        
        return True
    except Exception as e:
        logger.error(f"Failed to send alert: {str(e)}")
        return False


def create_execution_report(context: Dict[str, Any], results: Dict[str, Any]) -> Dict[str, Any]:
    """Create comprehensive execution report."""
    report = {
        'execution_id': context.get('dag_run', {}).run_id,
        'dag_id': context.get('dag', {}).dag_id,
        'task_id': context.get('task', {}).task_id,
        'execution_date': context.get('execution_date', datetime.utcnow()).isoformat(),
        'start_time': context.get('task_instance', {}).start_date.isoformat() if context.get('task_instance', {}).start_date else None,
        'end_time': datetime.utcnow().isoformat(),
        'status': 'success' if results.get('success', True) else 'failed',
        'results': results,
        'metadata': {
            'airflow_version': context.get('var', {}).get('value', {}).get('airflow_version', 'unknown'),
            'environment': Variable.get("environment", "unknown"),
            'pipeline_version': Variable.get("pipeline_version", "unknown")
        }
    }
    
    # Calculate execution duration
    if report['start_time'] and report['end_time']:
        start = datetime.fromisoformat(report['start_time'])
        end = datetime.fromisoformat(report['end_time'])
        report['duration_seconds'] = (end - start).total_seconds()
    
    return report


def store_execution_metrics(report: Dict[str, Any]) -> bool:
    """Store execution metrics for monitoring and analysis."""
    try:
        # TODO: Implement metrics storage (InfluxDB, Prometheus, etc.)
        logger.info(f"Storing execution metrics: {json.dumps(report, indent=2)}")
        return True
    except Exception as e:
        logger.error(f"Failed to store execution metrics: {str(e)}")
        return False


def get_pipeline_variable(key: str, default: Any = None, deserialize_json: bool = False) -> Any:
    """Get pipeline variable with error handling."""
    try:
        return Variable.get(key, default, deserialize_json=deserialize_json)
    except Exception as e:
        logger.warning(f"Failed to get variable {key}: {str(e)}")
        return default


def set_pipeline_variable(key: str, value: Any, serialize_json: bool = False) -> bool:
    """Set pipeline variable with error handling."""
    try:
        Variable.set(key, value, serialize_json=serialize_json)
        return True
    except Exception as e:
        logger.error(f"Failed to set variable {key}: {str(e)}")
        return False


def retry_on_failure(max_retries: int = 3, delay: int = 5, backoff: float = 2.0):
    """Decorator for retrying functions on failure."""
    def decorator(func: Callable) -> Callable:
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries:
                        wait_time = delay * (backoff ** attempt)
                        logger.warning(f"Attempt {attempt + 1} failed: {str(e)}. Retrying in {wait_time} seconds...")
                        import time
                        time.sleep(wait_time)
                    else:
                        logger.error(f"All {max_retries + 1} attempts failed. Last error: {str(e)}")
            
            raise last_exception
        
        return wrapper
    return decorator


def format_duration(seconds: float) -> str:
    """Format duration in human-readable format."""
    if seconds < 60:
        return f"{seconds:.1f}s"
    elif seconds < 3600:
        minutes = seconds / 60
        return f"{minutes:.1f}m"
    else:
        hours = seconds / 3600
        return f"{hours:.1f}h"


def truncate_string(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """Truncate string to maximum length."""
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix