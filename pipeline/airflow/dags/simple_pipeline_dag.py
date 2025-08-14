"""
Simple Pipeline DAG - Minimal version for testing
"""

from datetime import datetime, timedelta
from typing import Dict, Any
import os

from airflow import DAG
from airflow.operators.python_operator import PythonOperator
from airflow.operators.bash_operator import BashOperator
from airflow.operators.dummy_operator import DummyOperator
from airflow.utils.dates import days_ago

# Default arguments
default_args = {
    'owner': 'data-pipeline',
    'depends_on_past': False,
    'start_date': days_ago(1),
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=2),
}

# DAG configuration
dag = DAG(
    'simple_pipeline_test',
    default_args=default_args,
    description='Simple pipeline test DAG',
    schedule_interval=None,  # Manual trigger only
    start_date=days_ago(1),
    catchup=False,
    max_active_runs=1,
    tags=['test', 'simple'],
)

def simple_task(**context):
    """Simple task that just prints and returns success"""
    print(f"Task executed successfully at {datetime.now()}")
    print(f"DAG run ID: {context['dag_run'].run_id}")
    print(f"Execution date: {context['execution_date']}")
    
    result = {
        'status': 'success',
        'message': 'Task completed successfully',
        'timestamp': datetime.now().isoformat()
    }
    
    return result

def scraping_task(**context):
    """Simulate scraping task"""
    print("Starting scraping simulation...")
    
    result = {
        'status': 'success',
        'records_count': 50,
        'message': 'Scraping completed successfully (simulated)',
        'timestamp': datetime.now().isoformat()
    }
    
    context['task_instance'].xcom_push(key='scraping_result', value=result)
    print(f"Scraping completed: {result['records_count']} records")
    return result

def processing_task(**context):
    """Simulate processing task"""
    print("Starting processing simulation...")
    
    # Get scraping results
    scraping_result = context['task_instance'].xcom_pull(task_ids='scraping_task', key='scraping_result')
    print(f"Retrieved scraping result: {scraping_result}")
    
    result = {
        'status': 'success',
        'records_processed': scraping_result.get('records_count', 0) if scraping_result else 0,
        'quality_score': 0.92,
        'message': 'Processing completed successfully (simulated)',
        'timestamp': datetime.now().isoformat()
    }
    
    context['task_instance'].xcom_push(key='processing_result', value=result)
    print(f"Processing completed: {result['records_processed']} records processed")
    return result

def sync_task(**context):
    """Simulate sync task"""
    print("Starting sync simulation...")
    
    # Get processing results
    processing_result = context['task_instance'].xcom_pull(task_ids='processing_task', key='processing_result')
    print(f"Retrieved processing result: {processing_result}")
    
    result = {
        'status': 'success',
        'records_synced': processing_result.get('records_processed', 0) if processing_result else 0,
        'message': 'Sync completed successfully (simulated)',
        'timestamp': datetime.now().isoformat()
    }
    
    context['task_instance'].xcom_push(key='sync_result', value=result)
    print(f"Sync completed: {result['records_synced']} records synced")
    return result

# Define tasks
start_task = DummyOperator(
    task_id='start',
    dag=dag
)

validation_task = PythonOperator(
    task_id='validation_task',
    python_callable=simple_task,
    dag=dag
)

scraping_task_op = PythonOperator(
    task_id='scraping_task',
    python_callable=scraping_task,
    dag=dag
)

processing_task_op = PythonOperator(
    task_id='processing_task',
    python_callable=processing_task,
    dag=dag
)

sync_task_op = PythonOperator(
    task_id='sync_task',
    python_callable=sync_task,
    dag=dag
)

validation_bash = BashOperator(
    task_id='bash_validation',
    bash_command='echo "Bash task completed successfully"',
    dag=dag
)

end_task = DummyOperator(
    task_id='end',
    dag=dag
)

# Define task dependencies
start_task >> validation_task >> scraping_task_op >> processing_task_op >> sync_task_op >> validation_bash >> end_task