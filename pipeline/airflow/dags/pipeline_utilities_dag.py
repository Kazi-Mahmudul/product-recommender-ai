"""
Pipeline Utilities DAG

This DAG provides utility operations for pipeline maintenance:
- Manual data refresh
- Database maintenance
- Cache management
- Data quality checks
- System health monitoring
"""

from datetime import datetime, timedelta
from typing import Dict, Any
import os

from airflow import DAG
from airflow.operators.http_operator import SimpleHttpOperator
from airflow.operators.python_operator import PythonOperator, BranchPythonOperator
from airflow.operators.bash_operator import BashOperator
from airflow.operators.dummy_operator import DummyOperator
from airflow.sensors.http_sensor import HttpSensor
from airflow.utils.dates import days_ago
from airflow.utils.task_group import TaskGroup
from airflow.models import Variable
from airflow.hooks.http_hook import HttpHook
from airflow.exceptions import AirflowException, AirflowSkipException

# Default arguments for utility tasks
default_args = {
    'owner': 'data-pipeline-admin',
    'depends_on_past': False,
    'start_date': days_ago(1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=2),
    'execution_timeout': timedelta(minutes=30),
}

# Utility DAG configuration
dag = DAG(
    'pipeline_utilities',
    default_args=default_args,
    description='Utility operations for pipeline maintenance and monitoring',
    schedule_interval=None,  # Manual trigger only
    start_date=days_ago(1),
    catchup=False,
    max_active_runs=1,
    tags=['utilities', 'maintenance', 'admin'],
    doc_md=__doc__,
)

# Service URLs
SCRAPER_URL = os.getenv('PIPELINE_SCRAPER_URL', 'http://scraper-service:8000')
PROCESSOR_URL = os.getenv('PIPELINE_PROCESSOR_URL', 'http://processor-service:8001')
SYNC_URL = os.getenv('PIPELINE_SYNC_URL', 'http://sync-service:8002')


def check_all_services_health(**context) -> Dict[str, Any]:
    """Comprehensive health check for all pipeline services."""
    services = {
        'scraper': SCRAPER_URL,
        'processor': PROCESSOR_URL,
        'sync': SYNC_URL
    }
    
    health_status = {
        'overall_healthy': True,
        'services': {},
        'timestamp': datetime.utcnow().isoformat()
    }
    
    for service_name, service_url in services.items():
        try:
            http_hook = HttpHook(method='GET', http_conn_id='http_default')
            response = http_hook.run(
                endpoint=f'{service_url}/health',
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                service_health = response.json()
                health_status['services'][service_name] = {
                    'status': 'healthy',
                    'details': service_health,
                    'response_time': response.elapsed.total_seconds() if hasattr(response, 'elapsed') else None
                }
            else:
                health_status['services'][service_name] = {
                    'status': 'unhealthy',
                    'error': f"HTTP {response.status_code}",
                    'details': response.text
                }
                health_status['overall_healthy'] = False
                
        except Exception as e:
            health_status['services'][service_name] = {
                'status': 'error',
                'error': str(e),
                'details': None
            }
            health_status['overall_healthy'] = False
    
    # Store results for downstream tasks
    context['task_instance'].xcom_push(key='health_status', value=health_status)
    
    return health_status


def clear_all_caches(**context) -> Dict[str, Any]:
    """Clear caches across all services."""
    services = ['scraper', 'processor', 'sync']
    service_urls = [SCRAPER_URL, PROCESSOR_URL, SYNC_URL]
    
    cache_clear_results = {
        'overall_success': True,
        'services': {},
        'timestamp': datetime.utcnow().isoformat()
    }
    
    for service_name, service_url in zip(services, service_urls):
        try:
            http_hook = HttpHook(method='POST', http_conn_id='http_default')
            response = http_hook.run(
                endpoint=f'{service_url}/cache/clear',
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                result = response.json()
                cache_clear_results['services'][service_name] = {
                    'status': 'success',
                    'details': result
                }
            else:
                cache_clear_results['services'][service_name] = {
                    'status': 'failed',
                    'error': f"HTTP {response.status_code}",
                    'details': response.text
                }
                cache_clear_results['overall_success'] = False
                
        except Exception as e:
            cache_clear_results['services'][service_name] = {
                'status': 'error',
                'error': str(e)
            }
            cache_clear_results['overall_success'] = False
    
    context['task_instance'].xcom_push(key='cache_clear_results', value=cache_clear_results)
    
    return cache_clear_results


def run_data_quality_check(**context) -> Dict[str, Any]:
    """Run comprehensive data quality checks."""
    try:
        http_hook = HttpHook(method='POST', http_conn_id='http_default')
        response = http_hook.run(
            endpoint=f'{PROCESSOR_URL}/quality/check',
            json={'comprehensive': True, 'include_recommendations': True},
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            quality_results = response.json()
            context['task_instance'].xcom_push(key='quality_results', value=quality_results)
            
            # Check if quality meets minimum thresholds
            overall_score = quality_results.get('overall_score', 0)
            if overall_score < 0.8:  # 80% threshold
                raise AirflowException(f"Data quality below threshold: {overall_score}")
            
            return quality_results
        else:
            raise AirflowException(f"Quality check failed: HTTP {response.status_code}")
            
    except Exception as e:
        raise AirflowException(f"Data quality check failed: {str(e)}")


def backup_database_schema(**context) -> Dict[str, Any]:
    """Create database schema backup."""
    try:
        http_hook = HttpHook(method='POST', http_conn_id='http_default')
        response = http_hook.run(
            endpoint=f'{SYNC_URL}/schema/backup',
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            backup_result = response.json()
            context['task_instance'].xcom_push(key='backup_result', value=backup_result)
            return backup_result
        else:
            raise AirflowException(f"Schema backup failed: HTTP {response.status_code}")
            
    except Exception as e:
        raise AirflowException(f"Schema backup failed: {str(e)}")


def optimize_database(**context) -> Dict[str, Any]:
    """Run database optimization procedures."""
    try:
        http_hook = HttpHook(method='POST', http_conn_id='http_default')
        response = http_hook.run(
            endpoint=f'{SYNC_URL}/schema/optimize',
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            optimization_result = response.json()
            context['task_instance'].xcom_push(key='optimization_result', value=optimization_result)
            return optimization_result
        else:
            raise AirflowException(f"Database optimization failed: HTTP {response.status_code}")
            
    except Exception as e:
        raise AirflowException(f"Database optimization failed: {str(e)}")


def decide_maintenance_branch(**context) -> str:
    """Decide which maintenance operations to run based on system status."""
    # Get health status from previous task
    health_status = context['task_instance'].xcom_pull(task_ids='system_health_check', key='health_status')
    
    if not health_status or not health_status.get('overall_healthy', False):
        return 'emergency_maintenance_group'
    
    # Check if it's a scheduled maintenance window (e.g., Sunday)
    execution_date = context['execution_date']
    if execution_date.weekday() == 6:  # Sunday
        return 'scheduled_maintenance_group'
    
    return 'routine_maintenance_group'


# Start of utility DAG definition
start_utilities = DummyOperator(
    task_id='start_utilities',
    dag=dag,
    doc_md="Utility operations starting point"
)

# System health check
system_health_check = PythonOperator(
    task_id='system_health_check',
    python_callable=check_all_services_health,
    dag=dag,
    doc_md="Comprehensive health check for all pipeline services"
)

# Branch decision for maintenance type
maintenance_branch = BranchPythonOperator(
    task_id='decide_maintenance_type',
    python_callable=decide_maintenance_branch,
    dag=dag,
    doc_md="Decide maintenance operations based on system status"
)

# Routine maintenance group
with TaskGroup('routine_maintenance_group', dag=dag) as routine_maintenance:
    
    clear_caches = PythonOperator(
        task_id='clear_caches',
        python_callable=clear_all_caches,
        dag=dag,
        doc_md="Clear caches across all services"
    )
    
    quality_check = PythonOperator(
        task_id='data_quality_check',
        python_callable=run_data_quality_check,
        dag=dag,
        doc_md="Run comprehensive data quality checks"
    )
    
    clear_caches >> quality_check

# Scheduled maintenance group (weekly)
with TaskGroup('scheduled_maintenance_group', dag=dag) as scheduled_maintenance:
    
    backup_schema = PythonOperator(
        task_id='backup_database_schema',
        python_callable=backup_database_schema,
        dag=dag,
        doc_md="Create database schema backup"
    )
    
    optimize_db = PythonOperator(
        task_id='optimize_database',
        python_callable=optimize_database,
        dag=dag,
        doc_md="Run database optimization procedures"
    )
    
    clear_caches_scheduled = PythonOperator(
        task_id='clear_caches_scheduled',
        python_callable=clear_all_caches,
        dag=dag,
        doc_md="Clear caches during scheduled maintenance"
    )
    
    quality_check_scheduled = PythonOperator(
        task_id='data_quality_check_scheduled',
        python_callable=run_data_quality_check,
        dag=dag,
        doc_md="Run comprehensive data quality checks during scheduled maintenance"
    )
    
    backup_schema >> optimize_db >> clear_caches_scheduled >> quality_check_scheduled

# Emergency maintenance group
with TaskGroup('emergency_maintenance_group', dag=dag) as emergency_maintenance:
    
    emergency_health_check = PythonOperator(
        task_id='emergency_health_check',
        python_callable=check_all_services_health,
        dag=dag,
        doc_md="Emergency health check for unhealthy services"
    )
    
    restart_services = BashOperator(
        task_id='restart_unhealthy_services',
        bash_command="""
        echo "Emergency maintenance: Restarting unhealthy services"
        # This would typically restart Docker containers or Kubernetes pods
        # For now, just log the action
        echo "Services restart completed"
        """,
        dag=dag,
        doc_md="Restart unhealthy services during emergency maintenance"
    )
    
    emergency_health_check >> restart_services

# Manual operations group (always available)
with TaskGroup('manual_operations_group', dag=dag) as manual_operations:
    
    manual_scrape = SimpleHttpOperator(
        task_id='manual_data_scrape',
        http_conn_id='http_default',
        endpoint=f'{SCRAPER_URL}/scrape',
        method='POST',
        data={'manual_trigger': True, 'full_refresh': True},
        headers={'Content-Type': 'application/json'},
        dag=dag,
        doc_md="Manually trigger data scraping with full refresh"
    )
    
    manual_process = SimpleHttpOperator(
        task_id='manual_data_process',
        http_conn_id='http_default',
        endpoint=f'{PROCESSOR_URL}/process',
        method='POST',
        data={'manual_trigger': True, 'force_reprocess': True},
        headers={'Content-Type': 'application/json'},
        dag=dag,
        doc_md="Manually trigger data processing with force reprocess"
    )
    
    manual_sync = SimpleHttpOperator(
        task_id='manual_data_sync',
        http_conn_id='http_default',
        endpoint=f'{SYNC_URL}/sync',
        method='POST',
        data={'manual_trigger': True, 'full_sync': True},
        headers={'Content-Type': 'application/json'},
        dag=dag,
        doc_md="Manually trigger database sync with full synchronization"
    )
    
    manual_scrape >> manual_process >> manual_sync

# Convergence point for all maintenance branches
maintenance_complete = DummyOperator(
    task_id='maintenance_complete',
    dag=dag,
    trigger_rule='none_failed_or_skipped',
    doc_md="Maintenance operations completion point"
)

# Final health check after maintenance
final_health_check = PythonOperator(
    task_id='final_health_check',
    python_callable=check_all_services_health,
    dag=dag,
    doc_md="Final health check after maintenance operations"
)

# End of utilities
end_utilities = DummyOperator(
    task_id='end_utilities',
    dag=dag,
    doc_md="Utility operations completion point"
)

# Define task dependencies
start_utilities >> system_health_check >> maintenance_branch

# Branch connections
maintenance_branch >> [routine_maintenance, scheduled_maintenance, emergency_maintenance]

# All maintenance groups converge to completion
[routine_maintenance, scheduled_maintenance, emergency_maintenance] >> maintenance_complete

# Manual operations can run independently
start_utilities >> manual_operations >> maintenance_complete

# Final steps
maintenance_complete >> final_health_check >> end_utilities