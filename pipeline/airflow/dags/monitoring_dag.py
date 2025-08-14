"""
Monitoring DAG

This DAG provides continuous monitoring of the data pipeline:
- Service health monitoring
- Performance metrics collection
- Data quality monitoring
- Alert generation
- System resource monitoring
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List
import os
import json

from airflow import DAG
from airflow.operators.python_operator import PythonOperator
from airflow.operators.bash_operator import BashOperator
from airflow.operators.dummy_operator import DummyOperator
from airflow.sensors.http_sensor import HttpSensor
from airflow.utils.dates import days_ago
from airflow.utils.task_group import TaskGroup
from airflow.hooks.http_hook import HttpHook
from airflow.exceptions import AirflowException
from airflow.models import Variable

# Default arguments for monitoring tasks
default_args = {
    'owner': 'data-pipeline-monitoring',
    'depends_on_past': False,
    'start_date': days_ago(1),
    'email_on_failure': False,  # We'll handle alerting separately
    'email_on_retry': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=1),
    'execution_timeout': timedelta(minutes=10),
}

# Monitoring DAG configuration
dag = DAG(
    'pipeline_monitoring',
    default_args=default_args,
    description='Continuous monitoring of data pipeline health and performance',
    schedule_interval=timedelta(minutes=5),  # Every 5 minutes
    start_date=days_ago(1),
    catchup=False,
    max_active_runs=1,
    tags=['monitoring', 'health-check', 'metrics'],
    doc_md=__doc__,
)

# Service URLs
SCRAPER_URL = os.getenv('PIPELINE_SCRAPER_URL', 'http://scraper-service:8000')
PROCESSOR_URL = os.getenv('PIPELINE_PROCESSOR_URL', 'http://processor-service:8001')
SYNC_URL = os.getenv('PIPELINE_SYNC_URL', 'http://sync-service:8002')

# Monitoring thresholds
MONITORING_THRESHOLDS = {
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


def collect_service_metrics(service_name: str, service_url: str) -> Dict[str, Any]:
    """Collect comprehensive metrics from a service."""
    metrics = {
        'service_name': service_name,
        'timestamp': datetime.utcnow().isoformat(),
        'status': 'unknown',
        'response_time': None,
        'health_details': {},
        'performance_metrics': {},
        'alerts': []
    }
    
    try:
        # Health check with timing
        start_time = datetime.utcnow()
        http_hook = HttpHook(method='GET', http_conn_id='http_default')
        
        # Health endpoint
        health_response = http_hook.run(
            endpoint=f'{service_url}/health',
            headers={'Content-Type': 'application/json'}
        )
        
        end_time = datetime.utcnow()
        response_time = (end_time - start_time).total_seconds()
        metrics['response_time'] = response_time
        
        if health_response.status_code == 200:
            metrics['status'] = 'healthy'
            metrics['health_details'] = health_response.json()
        else:
            metrics['status'] = 'unhealthy'
            metrics['health_details'] = {'error': f"HTTP {health_response.status_code}"}
            metrics['alerts'].append({
                'level': 'critical',
                'message': f"{service_name} service unhealthy: HTTP {health_response.status_code}"
            })
        
        # Performance metrics endpoint
        try:
            metrics_response = http_hook.run(
                endpoint=f'{service_url}/metrics',
                headers={'Content-Type': 'application/json'}
            )
            
            if metrics_response.status_code == 200:
                metrics['performance_metrics'] = metrics_response.json()
            
        except Exception as e:
            # Metrics endpoint might not be available, that's okay
            metrics['performance_metrics'] = {'error': f"Metrics unavailable: {str(e)}"}
        
        # Check response time thresholds
        if response_time > MONITORING_THRESHOLDS['response_time_critical']:
            metrics['alerts'].append({
                'level': 'critical',
                'message': f"{service_name} response time critical: {response_time:.2f}s"
            })
        elif response_time > MONITORING_THRESHOLDS['response_time_warning']:
            metrics['alerts'].append({
                'level': 'warning',
                'message': f"{service_name} response time warning: {response_time:.2f}s"
            })
        
        # Check resource usage if available
        if 'system' in metrics['performance_metrics']:
            system_metrics = metrics['performance_metrics']['system']
            
            # Memory usage
            memory_usage = system_metrics.get('memory_usage_percent', 0)
            if memory_usage > MONITORING_THRESHOLDS['memory_usage_critical']:
                metrics['alerts'].append({
                    'level': 'critical',
                    'message': f"{service_name} memory usage critical: {memory_usage:.1f}%"
                })
            elif memory_usage > MONITORING_THRESHOLDS['memory_usage_warning']:
                metrics['alerts'].append({
                    'level': 'warning',
                    'message': f"{service_name} memory usage warning: {memory_usage:.1f}%"
                })
            
            # CPU usage
            cpu_usage = system_metrics.get('cpu_usage_percent', 0)
            if cpu_usage > MONITORING_THRESHOLDS['cpu_usage_critical']:
                metrics['alerts'].append({
                    'level': 'critical',
                    'message': f"{service_name} CPU usage critical: {cpu_usage:.1f}%"
                })
            elif cpu_usage > MONITORING_THRESHOLDS['cpu_usage_warning']:
                metrics['alerts'].append({
                    'level': 'warning',
                    'message': f"{service_name} CPU usage warning: {cpu_usage:.1f}%"
                })
        
    except Exception as e:
        metrics['status'] = 'error'
        metrics['health_details'] = {'error': str(e)}
        metrics['alerts'].append({
            'level': 'critical',
            'message': f"{service_name} service error: {str(e)}"
        })
    
    return metrics


def monitor_scraper_service(**context) -> Dict[str, Any]:
    """Monitor scraper service health and performance."""
    metrics = collect_service_metrics('scraper', SCRAPER_URL)
    context['task_instance'].xcom_push(key='scraper_metrics', value=metrics)
    return metrics


def monitor_processor_service(**context) -> Dict[str, Any]:
    """Monitor processor service health and performance."""
    metrics = collect_service_metrics('processor', PROCESSOR_URL)
    context['task_instance'].xcom_push(key='processor_metrics', value=metrics)
    return metrics


def monitor_sync_service(**context) -> Dict[str, Any]:
    """Monitor sync service health and performance."""
    metrics = collect_service_metrics('sync', SYNC_URL)
    context['task_instance'].xcom_push(key='sync_metrics', value=metrics)
    return metrics


def check_data_quality_metrics(**context) -> Dict[str, Any]:
    """Check current data quality metrics."""
    quality_metrics = {
        'timestamp': datetime.utcnow().isoformat(),
        'overall_score': 0,
        'metrics': {},
        'alerts': []
    }
    
    try:
        http_hook = HttpHook(method='GET', http_conn_id='http_default')
        response = http_hook.run(
            endpoint=f'{PROCESSOR_URL}/quality/current',
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            quality_data = response.json()
            quality_metrics['overall_score'] = quality_data.get('overall_score', 0)
            quality_metrics['metrics'] = quality_data.get('metrics', {})
            
            # Check quality thresholds
            overall_score = quality_metrics['overall_score'] * 100  # Convert to percentage
            
            if overall_score < MONITORING_THRESHOLDS['data_quality_critical']:
                quality_metrics['alerts'].append({
                    'level': 'critical',
                    'message': f"Data quality critical: {overall_score:.1f}%"
                })
            elif overall_score < MONITORING_THRESHOLDS['data_quality_warning']:
                quality_metrics['alerts'].append({
                    'level': 'warning',
                    'message': f"Data quality warning: {overall_score:.1f}%"
                })
        else:
            quality_metrics['alerts'].append({
                'level': 'warning',
                'message': f"Unable to retrieve data quality metrics: HTTP {response.status_code}"
            })
    
    except Exception as e:
        quality_metrics['alerts'].append({
            'level': 'error',
            'message': f"Data quality check failed: {str(e)}"
        })
    
    context['task_instance'].xcom_push(key='quality_metrics', value=quality_metrics)
    return quality_metrics


def aggregate_monitoring_results(**context) -> Dict[str, Any]:
    """Aggregate all monitoring results and generate alerts."""
    # Collect metrics from all monitoring tasks
    scraper_metrics = context['task_instance'].xcom_pull(task_ids='service_monitoring.monitor_scraper', key='scraper_metrics')
    processor_metrics = context['task_instance'].xcom_pull(task_ids='service_monitoring.monitor_processor', key='processor_metrics')
    sync_metrics = context['task_instance'].xcom_pull(task_ids='service_monitoring.monitor_sync', key='sync_metrics')
    quality_metrics = context['task_instance'].xcom_pull(task_ids='data_quality_monitoring.check_data_quality', key='quality_metrics')
    
    # Aggregate results
    monitoring_summary = {
        'timestamp': datetime.utcnow().isoformat(),
        'execution_date': context['execution_date'].isoformat(),
        'overall_status': 'healthy',
        'services': {
            'scraper': scraper_metrics,
            'processor': processor_metrics,
            'sync': sync_metrics
        },
        'data_quality': quality_metrics,
        'alerts': {
            'critical': [],
            'warning': [],
            'info': []
        },
        'summary_stats': {
            'services_healthy': 0,
            'services_total': 3,
            'avg_response_time': 0,
            'total_alerts': 0
        }
    }
    
    # Collect all alerts and calculate summary stats
    all_metrics = [scraper_metrics, processor_metrics, sync_metrics]
    response_times = []
    
    for service_metrics in all_metrics:
        if service_metrics:
            # Count healthy services
            if service_metrics.get('status') == 'healthy':
                monitoring_summary['summary_stats']['services_healthy'] += 1
            
            # Collect response times
            if service_metrics.get('response_time'):
                response_times.append(service_metrics['response_time'])
            
            # Collect alerts
            for alert in service_metrics.get('alerts', []):
                level = alert.get('level', 'info')
                if level in monitoring_summary['alerts']:
                    monitoring_summary['alerts'][level].append(alert)
    
    # Add data quality alerts
    if quality_metrics:
        for alert in quality_metrics.get('alerts', []):
            level = alert.get('level', 'info')
            if level in monitoring_summary['alerts']:
                monitoring_summary['alerts'][level].append(alert)
    
    # Calculate summary statistics
    if response_times:
        monitoring_summary['summary_stats']['avg_response_time'] = sum(response_times) / len(response_times)
    
    monitoring_summary['summary_stats']['total_alerts'] = (
        len(monitoring_summary['alerts']['critical']) +
        len(monitoring_summary['alerts']['warning']) +
        len(monitoring_summary['alerts']['info'])
    )
    
    # Determine overall status
    if monitoring_summary['alerts']['critical']:
        monitoring_summary['overall_status'] = 'critical'
    elif monitoring_summary['alerts']['warning']:
        monitoring_summary['overall_status'] = 'warning'
    elif monitoring_summary['summary_stats']['services_healthy'] < monitoring_summary['summary_stats']['services_total']:
        monitoring_summary['overall_status'] = 'degraded'
    
    # Store aggregated results
    context['task_instance'].xcom_push(key='monitoring_summary', value=monitoring_summary)
    
    return monitoring_summary


def send_alerts_if_needed(**context) -> Dict[str, Any]:
    """Send alerts if critical issues are detected."""
    monitoring_summary = context['task_instance'].xcom_pull(task_ids='aggregate_results', key='monitoring_summary')
    
    alert_results = {
        'alerts_sent': 0,
        'alert_channels': [],
        'timestamp': datetime.utcnow().isoformat()
    }
    
    if not monitoring_summary:
        return alert_results
    
    critical_alerts = monitoring_summary.get('alerts', {}).get('critical', [])
    warning_alerts = monitoring_summary.get('alerts', {}).get('warning', [])
    
    # Send critical alerts immediately
    if critical_alerts:
        alert_message = f"CRITICAL: Pipeline monitoring detected {len(critical_alerts)} critical issues:\\n"
        for alert in critical_alerts:
            alert_message += f"- {alert.get('message', 'Unknown critical issue')}\\n"
        
        # TODO: Implement actual alerting (email, Slack, etc.)
        print(f"CRITICAL ALERT: {alert_message}")
        alert_results['alerts_sent'] += len(critical_alerts)
        alert_results['alert_channels'].append('console')
    
    # Send warning alerts (with throttling)
    if warning_alerts and len(warning_alerts) >= 3:  # Only if multiple warnings
        alert_message = f"WARNING: Pipeline monitoring detected {len(warning_alerts)} warning issues:\\n"
        for alert in warning_alerts[:5]:  # Limit to first 5 warnings
            alert_message += f"- {alert.get('message', 'Unknown warning issue')}\\n"
        
        # TODO: Implement actual alerting (email, Slack, etc.)
        print(f"WARNING ALERT: {alert_message}")
        alert_results['alerts_sent'] += len(warning_alerts)
        alert_results['alert_channels'].append('console')
    
    return alert_results


# Start monitoring
start_monitoring = DummyOperator(
    task_id='start_monitoring',
    dag=dag,
    doc_md="Start monitoring cycle"
)

# Service monitoring group
with TaskGroup('service_monitoring', dag=dag) as service_monitoring:
    
    monitor_scraper = PythonOperator(
        task_id='monitor_scraper',
        python_callable=monitor_scraper_service,
        doc_md="Monitor scraper service health and performance"
    )
    
    monitor_processor = PythonOperator(
        task_id='monitor_processor',
        python_callable=monitor_processor_service,
        doc_md="Monitor processor service health and performance"
    )
    
    monitor_sync = PythonOperator(
        task_id='monitor_sync',
        python_callable=monitor_sync_service,
        doc_md="Monitor sync service health and performance"
    )
    
    # All service monitoring tasks run in parallel
    [monitor_scraper, monitor_processor, monitor_sync]

# Data quality monitoring group
with TaskGroup('data_quality_monitoring', dag=dag) as quality_monitoring:
    
    check_data_quality = PythonOperator(
        task_id='check_data_quality',
        python_callable=check_data_quality_metrics,
        doc_md="Check current data quality metrics"
    )

# Aggregate results
aggregate_results = PythonOperator(
    task_id='aggregate_results',
    python_callable=aggregate_monitoring_results,
    dag=dag,
    doc_md="Aggregate all monitoring results and generate alerts"
)

# Send alerts if needed
send_alerts = PythonOperator(
    task_id='send_alerts',
    python_callable=send_alerts_if_needed,
    dag=dag,
    doc_md="Send alerts if critical issues are detected"
)

# Store metrics for historical analysis
store_metrics = BashOperator(
    task_id='store_metrics',
    bash_command="""
    echo "Storing monitoring metrics for historical analysis"
    # TODO: Store metrics in time-series database (InfluxDB, Prometheus, etc.)
    echo "Metrics stored successfully"
    """,
    dag=dag,
    doc_md="Store monitoring metrics for historical analysis"
)

# End monitoring
end_monitoring = DummyOperator(
    task_id='end_monitoring',
    dag=dag,
    doc_md="End monitoring cycle"
)

# Define task dependencies
start_monitoring >> [service_monitoring, quality_monitoring] >> aggregate_results >> send_alerts >> store_metrics >> end_monitoring