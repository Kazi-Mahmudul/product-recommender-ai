"""
Pipeline Trigger API

REST API for external systems to trigger pipeline execution:
- Webhook endpoints for external triggers
- Manual trigger management
- Schedule configuration
- Trigger status monitoring
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import json
import uuid
import os

from flask import Flask, request, jsonify
from airflow.models import Variable
from airflow.api.common.experimental.trigger_dag import trigger_dag
from airflow.exceptions import AirflowException

# Import our utilities
import sys
sys.path.append('/opt/airflow/dags')
from utils.dag_utils import get_pipeline_variable, set_pipeline_variable

app = Flask(__name__)

# API Configuration
API_CONFIG = {
    'version': '1.0.0',
    'name': 'Pipeline Trigger API',
    'description': 'REST API for triggering and managing data pipeline execution'
}

# Authentication (simple token-based for now)
API_TOKEN = os.getenv('PIPELINE_API_TOKEN', 'default-token-change-in-production')


def authenticate_request() -> bool:
    """Simple token-based authentication."""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]  # Remove 'Bearer ' prefix
        return token == API_TOKEN
    return False


def create_response(data: Any, status_code: int = 200, message: str = None) -> tuple:
    """Create standardized API response."""
    response = {
        'timestamp': datetime.utcnow().isoformat(),
        'status': 'success' if status_code < 400 else 'error',
        'data': data
    }
    
    if message:
        response['message'] = message
    
    return jsonify(response), status_code


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return create_response({
        'status': 'healthy',
        'api_version': API_CONFIG['version'],
        'timestamp': datetime.utcnow().isoformat()
    })


@app.route('/api/v1/info', methods=['GET'])
def api_info():
    """Get API information."""
    return create_response(API_CONFIG)


@app.route('/api/v1/trigger/manual', methods=['POST'])
def trigger_manual():
    """Manually trigger pipeline execution."""
    if not authenticate_request():
        return create_response({'error': 'Unauthorized'}, 401)
    
    try:
        data = request.get_json() or {}
        
        # Generate unique trigger ID
        trigger_id = str(uuid.uuid4())
        
        # Create trigger record
        trigger_record = {
            'id': trigger_id,
            'type': 'manual',
            'status': 'pending',
            'user': data.get('user', 'api'),
            'reason': data.get('reason', 'Manual API trigger'),
            'parameters': data.get('parameters', {}),
            'dag_id': data.get('dag_id', 'main_data_pipeline'),
            'created_at': datetime.utcnow().isoformat(),
            'priority': data.get('priority', 'normal')
        }
        
        # Add to manual triggers queue
        manual_triggers = get_pipeline_variable('manual_triggers', [], deserialize_json=True)
        manual_triggers.append(trigger_record)
        set_pipeline_variable('manual_triggers', manual_triggers, serialize_json=True)
        
        return create_response({
            'trigger_id': trigger_id,
            'status': 'queued',
            'message': 'Manual trigger queued for processing'
        })
        
    except Exception as e:
        return create_response({'error': str(e)}, 500)


@app.route('/api/v1/trigger/webhook', methods=['POST'])
def trigger_webhook():
    """Handle webhook triggers from external systems."""
    if not authenticate_request():
        return create_response({'error': 'Unauthorized'}, 401)
    
    try:
        data = request.get_json() or {}
        
        # Generate unique trigger ID
        trigger_id = str(uuid.uuid4())
        
        # Create webhook trigger record
        webhook_record = {
            'id': trigger_id,
            'type': 'webhook',
            'status': 'received',
            'source': data.get('source', 'unknown'),
            'event': data.get('event', 'data_update'),
            'data': data.get('data', {}),
            'received_at': datetime.utcnow().isoformat(),
            'priority': data.get('priority', 'normal')
        }
        
        # Add to webhook triggers queue
        webhook_triggers = get_pipeline_variable('webhook_triggers', [], deserialize_json=True)
        webhook_triggers.append(webhook_record)
        set_pipeline_variable('webhook_triggers', webhook_triggers, serialize_json=True)
        
        return create_response({
            'trigger_id': trigger_id,
            'status': 'received',
            'message': 'Webhook trigger received and queued for processing'
        })
        
    except Exception as e:
        return create_response({'error': str(e)}, 500)


@app.route('/api/v1/trigger/immediate', methods=['POST'])
def trigger_immediate():
    """Immediately trigger pipeline execution (bypasses queue)."""
    if not authenticate_request():
        return create_response({'error': 'Unauthorized'}, 401)
    
    try:
        data = request.get_json() or {}
        
        # Generate run ID
        run_id = f"immediate_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        
        # Trigger DAG immediately
        dag_run = trigger_dag(
            dag_id=data.get('dag_id', 'main_data_pipeline'),
            run_id=run_id,
            conf={
                'triggered_by': 'api_immediate',
                'trigger_reason': data.get('reason', 'Immediate API trigger'),
                'user': data.get('user', 'api'),
                'parameters': data.get('parameters', {}),
                'priority': 'high'
            }
        )
        
        return create_response({
            'dag_run_id': dag_run.run_id,
            'status': 'triggered',
            'message': 'Pipeline triggered immediately'
        })
        
    except Exception as e:
        return create_response({'error': str(e)}, 500)


@app.route('/api/v1/trigger/status/<trigger_id>', methods=['GET'])
def get_trigger_status(trigger_id: str):
    """Get status of a specific trigger."""
    if not authenticate_request():
        return create_response({'error': 'Unauthorized'}, 401)
    
    try:
        # Check manual triggers
        manual_triggers = get_pipeline_variable('manual_triggers', [], deserialize_json=True)
        for trigger in manual_triggers:
            if trigger['id'] == trigger_id:
                return create_response(trigger)
        
        # Check webhook triggers
        webhook_triggers = get_pipeline_variable('webhook_triggers', [], deserialize_json=True)
        for trigger in webhook_triggers:
            if trigger['id'] == trigger_id:
                return create_response(trigger)
        
        return create_response({'error': 'Trigger not found'}, 404)
        
    except Exception as e:
        return create_response({'error': str(e)}, 500)


@app.route('/api/v1/triggers/pending', methods=['GET'])
def get_pending_triggers():
    """Get all pending triggers."""
    if not authenticate_request():
        return create_response({'error': 'Unauthorized'}, 401)
    
    try:
        pending_triggers = []
        
        # Get pending manual triggers
        manual_triggers = get_pipeline_variable('manual_triggers', [], deserialize_json=True)
        pending_triggers.extend([t for t in manual_triggers if t.get('status') == 'pending'])
        
        # Get pending webhook triggers
        webhook_triggers = get_pipeline_variable('webhook_triggers', [], deserialize_json=True)
        pending_triggers.extend([t for t in webhook_triggers if t.get('status') == 'received'])
        
        return create_response({
            'pending_count': len(pending_triggers),
            'triggers': pending_triggers
        })
        
    except Exception as e:
        return create_response({'error': str(e)}, 500)


@app.route('/api/v1/schedule/config', methods=['GET'])
def get_schedule_config():
    """Get current scheduling configuration."""
    if not authenticate_request():
        return create_response({'error': 'Unauthorized'}, 401)
    
    try:
        config = {
            'schedule_interval_minutes': get_pipeline_variable('schedule_interval_minutes', 60),
            'staleness_threshold_hours': get_pipeline_variable('staleness_threshold_hours', 24),
            'maintenance_windows': get_pipeline_variable('maintenance_windows', [], deserialize_json=True),
            'external_dependencies': get_pipeline_variable('external_dependencies', [], deserialize_json=True),
            'auto_scaling_enabled': get_pipeline_variable('auto_scaling_enabled', True),
            'max_concurrent_runs': get_pipeline_variable('max_concurrent_runs', 1)
        }
        
        return create_response(config)
        
    except Exception as e:
        return create_response({'error': str(e)}, 500)


@app.route('/api/v1/schedule/config', methods=['PUT'])
def update_schedule_config():
    """Update scheduling configuration."""
    if not authenticate_request():
        return create_response({'error': 'Unauthorized'}, 401)
    
    try:
        data = request.get_json() or {}
        updated_fields = []
        
        # Update allowed configuration fields
        allowed_fields = [
            'schedule_interval_minutes',
            'staleness_threshold_hours',
            'maintenance_windows',
            'external_dependencies',
            'auto_scaling_enabled',
            'max_concurrent_runs'
        ]
        
        for field in allowed_fields:
            if field in data:
                serialize_json = field in ['maintenance_windows', 'external_dependencies']
                set_pipeline_variable(field, data[field], serialize_json=serialize_json)
                updated_fields.append(field)
        
        return create_response({
            'updated_fields': updated_fields,
            'message': f'Updated {len(updated_fields)} configuration fields'
        })
        
    except Exception as e:
        return create_response({'error': str(e)}, 500)


@app.route('/api/v1/schedule/maintenance', methods=['POST'])
def add_maintenance_window():
    """Add a maintenance window."""
    if not authenticate_request():
        return create_response({'error': 'Unauthorized'}, 401)
    
    try:
        data = request.get_json() or {}
        
        if 'start' not in data or 'end' not in data:
            return create_response({'error': 'start and end times are required'}, 400)
        
        maintenance_windows = get_pipeline_variable('maintenance_windows', [], deserialize_json=True)
        
        new_window = {
            'id': str(uuid.uuid4()),
            'start': data['start'],  # Format: "HH:MM"
            'end': data['end'],      # Format: "HH:MM"
            'description': data.get('description', 'Maintenance window'),
            'days': data.get('days', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
            'created_at': datetime.utcnow().isoformat(),
            'active': data.get('active', True)
        }
        
        maintenance_windows.append(new_window)
        set_pipeline_variable('maintenance_windows', maintenance_windows, serialize_json=True)
        
        return create_response({
            'window_id': new_window['id'],
            'message': 'Maintenance window added successfully'
        })
        
    except Exception as e:
        return create_response({'error': str(e)}, 500)


@app.route('/api/v1/schedule/maintenance/<window_id>', methods=['DELETE'])
def remove_maintenance_window(window_id: str):
    """Remove a maintenance window."""
    if not authenticate_request():
        return create_response({'error': 'Unauthorized'}, 401)
    
    try:
        maintenance_windows = get_pipeline_variable('maintenance_windows', [], deserialize_json=True)
        
        # Find and remove the window
        updated_windows = [w for w in maintenance_windows if w.get('id') != window_id]
        
        if len(updated_windows) == len(maintenance_windows):
            return create_response({'error': 'Maintenance window not found'}, 404)
        
        set_pipeline_variable('maintenance_windows', updated_windows, serialize_json=True)
        
        return create_response({
            'message': 'Maintenance window removed successfully'
        })
        
    except Exception as e:
        return create_response({'error': str(e)}, 500)


@app.route('/api/v1/pipeline/pause', methods=['POST'])
def pause_pipeline():
    """Pause pipeline scheduling."""
    if not authenticate_request():
        return create_response({'error': 'Unauthorized'}, 401)
    
    try:
        data = request.get_json() or {}
        
        pause_config = {
            'paused': True,
            'paused_at': datetime.utcnow().isoformat(),
            'paused_by': data.get('user', 'api'),
            'reason': data.get('reason', 'Manual pause via API'),
            'duration_minutes': data.get('duration_minutes')  # Optional auto-resume
        }
        
        set_pipeline_variable('pipeline_paused', pause_config, serialize_json=True)
        
        return create_response({
            'status': 'paused',
            'message': 'Pipeline scheduling paused'
        })
        
    except Exception as e:
        return create_response({'error': str(e)}, 500)


@app.route('/api/v1/pipeline/resume', methods=['POST'])
def resume_pipeline():
    """Resume pipeline scheduling."""
    if not authenticate_request():
        return create_response({'error': 'Unauthorized'}, 401)
    
    try:
        data = request.get_json() or {}
        
        resume_config = {
            'paused': False,
            'resumed_at': datetime.utcnow().isoformat(),
            'resumed_by': data.get('user', 'api'),
            'reason': data.get('reason', 'Manual resume via API')
        }
        
        set_pipeline_variable('pipeline_paused', resume_config, serialize_json=True)
        
        return create_response({
            'status': 'resumed',
            'message': 'Pipeline scheduling resumed'
        })
        
    except Exception as e:
        return create_response({'error': str(e)}, 500)


@app.route('/api/v1/pipeline/status', methods=['GET'])
def get_pipeline_status():
    """Get overall pipeline status."""
    if not authenticate_request():
        return create_response({'error': 'Unauthorized'}, 401)
    
    try:
        pause_config = get_pipeline_variable('pipeline_paused', {}, deserialize_json=True)
        
        status = {
            'paused': pause_config.get('paused', False),
            'last_execution': get_pipeline_variable('last_execution_time'),
            'next_scheduled': get_pipeline_variable('next_scheduled_time'),
            'pending_triggers': len(get_pipeline_variable('manual_triggers', [], deserialize_json=True)),
            'schedule_interval_minutes': get_pipeline_variable('schedule_interval_minutes', 60),
            'health_status': 'healthy'  # TODO: Implement actual health check
        }
        
        if pause_config.get('paused'):
            status['paused_at'] = pause_config.get('paused_at')
            status['paused_by'] = pause_config.get('paused_by')
            status['pause_reason'] = pause_config.get('reason')
        
        return create_response(status)
        
    except Exception as e:
        return create_response({'error': str(e)}, 500)


if __name__ == '__main__':
    # This would typically be run by a WSGI server in production
    app.run(host='0.0.0.0', port=5000, debug=False)