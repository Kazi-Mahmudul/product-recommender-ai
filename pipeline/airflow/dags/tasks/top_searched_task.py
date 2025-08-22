"""
Top Searched Phones Task for Airflow DAG

This module provides a Python function that can be used as a task in an Airflow DAG
to run the top searched phones pipeline.
"""

import os
import sys
from datetime import datetime
from typing import Dict, Any

# Add the project root to the Python path
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, project_root)

from pipeline.top_searched import TopSearchedPipeline


def run_top_searched_pipeline(**context) -> Dict[str, Any]:
    """
    Run the top searched phones pipeline as an Airflow task.
    
    Args:
        **context: Airflow context dictionary
        
    Returns:
        Dict containing the result of the pipeline execution
    """
    try:
        print("Starting top searched phones pipeline...")
        
        # Create and run the pipeline
        pipeline = TopSearchedPipeline()
        pipeline.run(limit=10)
        
        result = {
            'status': 'success',
            'message': 'Top searched phones pipeline completed successfully',
            'timestamp': datetime.utcnow().isoformat(),
            'records_updated': 10  # We're updating 10 records
        }
        
        # Store result in XCom for downstream tasks (if running in Airflow context)
        if 'task_instance' in context:
            context['task_instance'].xcom_push(key='top_searched_result', value=result)
        
        print("Top searched phones pipeline completed successfully")
        return result
        
    except Exception as e:
        error_msg = f"Top searched phones pipeline failed: {str(e)}"
        print(error_msg)
        
        result = {
            'status': 'failed',
            'error': str(e),
            'message': error_msg,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Store error result in XCom (if running in Airflow context)
        if 'task_instance' in context:
            context['task_instance'].xcom_push(key='top_searched_result', value=result)
        
        # Re-raise the exception so Airflow can handle the failure
        raise Exception(error_msg)