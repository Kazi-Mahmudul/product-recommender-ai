"""
Pipeline Scheduler Module

Advanced scheduling and trigger mechanisms for the data pipeline:
- Configurable scheduling with multiple patterns
- External trigger support
- Conditional execution based on data freshness
- Manual trigger capabilities
- Maintenance window handling
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import os
import json

from airflow import DAG
from airflow.operators.python_operator import PythonOperator, BranchPythonOperator
from airflow.operators.bash_operator import BashOperator
from airflow.operators.dummy_operator import DummyOperator
from airflow.sensors.filesystem import FileSensor
from airflow.sensors.http_sensor import HttpSensor
from airflow.sensors.external_task_sensor import ExternalTaskSensor
from airflow.utils.dates import days_ago
from airflow.utils.task_group import TaskGroup
from airflow.models import Variable
from airflow.hooks.http_hook import HttpHook
from airflow.exceptions import AirflowException, AirflowSkipException
from airflow.utils.trigger_rule import TriggerRule

# Import our utilities
import sys
sys.path.append('/opt/airflow/dags')
from config.dag_config import get_config, get_service_url
from utils.dag_utils import PipelineHttpHook, get_pipeline_variable


class PipelineScheduler:
    """Advanced pipeline scheduler with multiple trigger mechanisms."""
    
    def __init__(self):
        self.config = get_config('main_pipeline')
        self.service_urls = get_config('service_urls')
        
    def should_run_pipeline(self, context: Dict[str, Any]) -> str:
        """Determine if pipeline should run based on various conditions."""
        execution_date = context['execution_date']
        
        # Check maintenance window
        if self._is_maintenance_window(execution_date):
            return 'skip_maintenance'
        
        # Check data freshness
        if not self._is_data_stale():
            return 'skip_fresh_data'
        
        # Check external dependencies
        if not self._check_external_dependencies():
            return 'skip_dependencies'
        
        # Check system health
        if not self._check_system_health():
            return 'skip_unhealthy'
        
        return 'run_pipeline'
    
    def _is_maintenance_window(self, execution_date: datetime) -> bool:
        """Check if current time is within maintenance window."""
        maintenance_config = get_pipeline_variable('maintenance_windows', [], deserialize_json=True)
        
        for window in maintenance_config:
            start_time = datetime.strptime(window['start'], '%H:%M').time()
            end_time = datetime.strptime(window['end'], '%H:%M').time()
            current_time = execution_date.time()
            
            if start_time <= current_time <= end_time:
                return True
        
        return False
    
    def _is_data_stale(self) -> bool:
        """Check if data is stale and needs refresh."""
        try:
            http_hook = PipelineHttpHook(self.service_urls['processor'])
            response = http_hook.get('/data/freshness')
            
            freshness_data = response.json()
            last_update = datetime.fromisoformat(freshness_data['last_update'])
            staleness_threshold = timedelta(hours=get_pipeline_variable('staleness_threshold_hours', 24))
            
            return (datetime.utcnow() - last_update) > staleness_threshold
            
        except Exception as e:
            # If we can't check freshness, assume data is stale
            return True
    
    def _check_external_dependencies(self) -> bool:
        """Check external dependencies before running pipeline."""
        dependencies = get_pipeline_variable('external_dependencies', [], deserialize_json=True)
        
        for dependency in dependencies:
            if dependency['type'] == 'http':
                try:
                    http_hook = PipelineHttpHook(dependency['url'])
                    response = http_hook.get(dependency.get('endpoint', '/health'))
                    if response.status_code != 200:
                        return False
                except Exception:
                    return False
            elif dependency['type'] == 'file':
                if not os.path.exists(dependency['path']):
                    return False
        
        return True
    
    def _check_system_health(self) -> bool:
        """Check overall system health before running pipeline."""
        try:
            for service_name, service_url in self.service_urls.items():
                http_hook = PipelineHttpHook(service_url)
                health_status = http_hook.health_check()
                if health_status['status'] != 'healthy':
                    return False
            return True
        except Exception:
            return False


# Create scheduler instance
scheduler = PipelineScheduler()

# Default arguments for scheduling DAG
default_args = {
    'owner': 'data-pipeline-scheduler',
    'depends_on_past': False,
    'start_date': days_ago(1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

# Scheduling DAG
dag = DAG(
    'pipeline_scheduler',
    default_args=default_args,
    description='Advanced pipeline scheduling and trigger management',
    schedule_interval=timedelta(minutes=15),  # Check every 15 minutes
    start_date=days_ago(1),
    catchup=False,
    max_active_runs=1,
    tags=['scheduler', 'triggers', 'automation'],
    doc_md=__doc__,
)


def check_trigger_conditions(**context) -> str:
    """Check all trigger conditions and decide execution path."""
    return scheduler.should_run_pipeline(context)


def trigger_main_pipeline(**context) -> Dict[str, Any]:
    """Trigger the main data pipeline DAG."""
    from airflow.api.common.experimental.trigger_dag import trigger_dag
    
    try:
        # Trigger the main pipeline DAG
        dag_run = trigger_dag(
            dag_id='main_data_pipeline',
            run_id=f"scheduled_{context['execution_date'].strftime('%Y%m%d_%H%M%S')}",
            conf={
                'triggered_by': 'scheduler',
                'trigger_reason': 'scheduled_execution',
                'execution_date': context['execution_date'].isoformat()
            }
        )
        
        result = {
            'status': 'triggered',
            'dag_run_id': dag_run.run_id,
            'trigger_time': datetime.utcnow().isoformat()
        }
        
        context['task_instance'].xcom_push(key='trigger_result', value=result)
        return result
        
    except Exception as e:
        raise AirflowException(f"Failed to trigger main pipeline: {str(e)}")


def handle_skip_reason(skip_reason: str, **context) -> Dict[str, Any]:
    """Handle different skip reasons and log appropriately."""
    skip_messages = {
        'skip_maintenance': 'Pipeline skipped: Maintenance window active',
        'skip_fresh_data': 'Pipeline skipped: Data is still fresh',
        'skip_dependencies': 'Pipeline skipped: External dependencies not met',
        'skip_unhealthy': 'Pipeline skipped: System health check failed'
    }
    
    message = skip_messages.get(skip_reason, f'Pipeline skipped: {skip_reason}')
    
    result = {
        'status': 'skipped',
        'reason': skip_reason,
        'message': message,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    context['task_instance'].xcom_push(key='skip_result', value=result)
    return result


def check_manual_triggers(**context) -> Dict[str, Any]:
    """Check for manual trigger requests."""
    manual_triggers = get_pipeline_variable('manual_triggers', [], deserialize_json=True)
    
    processed_triggers = []
    
    for trigger in manual_triggers:
        if trigger.get('status') == 'pending':
            try:
                # Process the manual trigger
                from airflow.api.common.experimental.trigger_dag import trigger_dag
                
                dag_run = trigger_dag(
                    dag_id=trigger.get('dag_id', 'main_data_pipeline'),
                    run_id=f"manual_{trigger['id']}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                    conf={
                        'triggered_by': 'manual',
                        'trigger_reason': trigger.get('reason', 'manual_execution'),
                        'user': trigger.get('user', 'unknown'),
                        'parameters': trigger.get('parameters', {})
                    }
                )
                
                trigger['status'] = 'processed'
                trigger['dag_run_id'] = dag_run.run_id
                trigger['processed_at'] = datetime.utcnow().isoformat()
                
                processed_triggers.append(trigger)
                
            except Exception as e:
                trigger['status'] = 'failed'
                trigger['error'] = str(e)
                trigger['processed_at'] = datetime.utcnow().isoformat()
                processed_triggers.append(trigger)
    
    # Update the manual triggers list
    if processed_triggers:
        remaining_triggers = [t for t in manual_triggers if t.get('status') == 'pending']
        set_pipeline_variable('manual_triggers', remaining_triggers, serialize_json=True)
    
    result = {
        'processed_count': len(processed_triggers),
        'processed_triggers': processed_triggers,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    context['task_instance'].xcom_push(key='manual_trigger_result', value=result)
    return result


def monitor_external_triggers(**context) -> Dict[str, Any]:
    """Monitor external trigger sources (webhooks, files, etc.)."""
    external_triggers = []
    
    # Check webhook triggers
    webhook_triggers = get_pipeline_variable('webhook_triggers', [], deserialize_json=True)
    for trigger in webhook_triggers:
        if trigger.get('status') == 'received':
            external_triggers.append({
                'type': 'webhook',
                'source': trigger.get('source', 'unknown'),
                'data': trigger.get('data', {}),
                'received_at': trigger.get('received_at')
            })
            trigger['status'] = 'processed'
    
    # Check file-based triggers
    file_trigger_path = get_pipeline_variable('file_trigger_path', '/opt/airflow/triggers')
    if os.path.exists(file_trigger_path):
        for filename in os.listdir(file_trigger_path):
            if filename.endswith('.trigger'):
                trigger_file = os.path.join(file_trigger_path, filename)
                try:
                    with open(trigger_file, 'r') as f:
                        trigger_data = json.load(f)
                    
                    external_triggers.append({
                        'type': 'file',
                        'source': filename,
                        'data': trigger_data,
                        'received_at': datetime.fromtimestamp(os.path.getmtime(trigger_file)).isoformat()
                    })
                    
                    # Move processed trigger file
                    processed_path = os.path.join(file_trigger_path, 'processed', filename)
                    os.makedirs(os.path.dirname(processed_path), exist_ok=True)
                    os.rename(trigger_file, processed_path)
                    
                except Exception as e:
                    # Log error but continue processing other triggers
                    pass
    
    # Process external triggers
    for trigger in external_triggers:
        try:
            from airflow.api.common.experimental.trigger_dag import trigger_dag
            
            dag_run = trigger_dag(
                dag_id='main_data_pipeline',
                run_id=f"external_{trigger['type']}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                conf={
                    'triggered_by': 'external',
                    'trigger_type': trigger['type'],
                    'trigger_source': trigger['source'],
                    'trigger_data': trigger['data']
                }
            )
            
            trigger['status'] = 'processed'
            trigger['dag_run_id'] = dag_run.run_id
            
        except Exception as e:
            trigger['status'] = 'failed'
            trigger['error'] = str(e)
    
    # Update webhook triggers
    if webhook_triggers:
        set_pipeline_variable('webhook_triggers', webhook_triggers, serialize_json=True)
    
    result = {
        'external_triggers_count': len(external_triggers),
        'external_triggers': external_triggers,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    context['task_instance'].xcom_push(key='external_trigger_result', value=result)
    return result


def update_schedule_config(**context) -> Dict[str, Any]:
    """Update scheduling configuration based on system performance."""
    # Get recent pipeline performance metrics
    try:
        http_hook = PipelineHttpHook(get_service_url('processor'))
        response = http_hook.get('/metrics/performance')
        performance_data = response.json()
        
        avg_execution_time = performance_data.get('avg_execution_time_minutes', 60)
        success_rate = performance_data.get('success_rate', 1.0)
        
        # Adjust scheduling based on performance
        current_interval = get_pipeline_variable('schedule_interval_minutes', 60)
        
        if success_rate < 0.8:  # Low success rate
            # Increase interval to reduce load
            new_interval = min(current_interval * 1.5, 240)  # Max 4 hours
        elif success_rate > 0.95 and avg_execution_time < 30:  # High performance
            # Decrease interval for more frequent updates
            new_interval = max(current_interval * 0.8, 30)  # Min 30 minutes
        else:
            new_interval = current_interval
        
        if new_interval != current_interval:
            set_pipeline_variable('schedule_interval_minutes', new_interval)
            
            result = {
                'status': 'updated',
                'old_interval': current_interval,
                'new_interval': new_interval,
                'reason': f'success_rate: {success_rate}, avg_time: {avg_execution_time}min'
            }
        else:
            result = {
                'status': 'unchanged',
                'interval': current_interval,
                'success_rate': success_rate,
                'avg_execution_time': avg_execution_time
            }
        
        context['task_instance'].xcom_push(key='schedule_update_result', value=result)
        return result
        
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }


# Start scheduling
start_scheduler = DummyOperator(
    task_id='start_scheduler',
    dag=dag,
    doc_md="Start scheduling cycle"
)

# Check trigger conditions
check_conditions = BranchPythonOperator(
    task_id='check_trigger_conditions',
    python_callable=check_trigger_conditions,
    dag=dag,
    doc_md="Check all trigger conditions and decide execution path"
)

# Pipeline execution branch
trigger_pipeline = PythonOperator(
    task_id='run_pipeline',
    python_callable=trigger_main_pipeline,
    dag=dag,
    doc_md="Trigger the main data pipeline"
)

# Skip branches for different reasons
skip_maintenance = PythonOperator(
    task_id='skip_maintenance',
    python_callable=lambda **context: handle_skip_reason('skip_maintenance', **context),
    dag=dag,
    doc_md="Handle maintenance window skip"
)

skip_fresh_data = PythonOperator(
    task_id='skip_fresh_data',
    python_callable=lambda **context: handle_skip_reason('skip_fresh_data', **context),
    dag=dag,
    doc_md="Handle fresh data skip"
)

skip_dependencies = PythonOperator(
    task_id='skip_dependencies',
    python_callable=lambda **context: handle_skip_reason('skip_dependencies', **context),
    dag=dag,
    doc_md="Handle dependencies not met skip"
)

skip_unhealthy = PythonOperator(
    task_id='skip_unhealthy',
    python_callable=lambda **context: handle_skip_reason('skip_unhealthy', **context),
    dag=dag,
    doc_md="Handle unhealthy system skip"
)

# Manual trigger monitoring
check_manual = PythonOperator(
    task_id='check_manual_triggers',
    python_callable=check_manual_triggers,
    dag=dag,
    doc_md="Check and process manual trigger requests"
)

# External trigger monitoring
check_external = PythonOperator(
    task_id='monitor_external_triggers',
    python_callable=monitor_external_triggers,
    dag=dag,
    doc_md="Monitor and process external triggers"
)

# Schedule configuration update
update_schedule = PythonOperator(
    task_id='update_schedule_config',
    python_callable=update_schedule_config,
    dag=dag,
    doc_md="Update scheduling configuration based on performance"
)

# Convergence point
schedule_complete = DummyOperator(
    task_id='schedule_complete',
    dag=dag,
    trigger_rule=TriggerRule.NONE_FAILED_OR_SKIPPED,
    doc_md="Scheduling cycle completion point"
)

# End scheduler
end_scheduler = DummyOperator(
    task_id='end_scheduler',
    dag=dag,
    doc_md="End scheduling cycle"
)

# Define task dependencies
start_scheduler >> check_conditions

# Branch connections
check_conditions >> [trigger_pipeline, skip_maintenance, skip_fresh_data, skip_dependencies, skip_unhealthy]

# Parallel monitoring tasks
start_scheduler >> [check_manual, check_external, update_schedule]

# All tasks converge to completion
[trigger_pipeline, skip_maintenance, skip_fresh_data, skip_dependencies, skip_unhealthy, 
 check_manual, check_external, update_schedule] >> schedule_complete >> end_scheduler