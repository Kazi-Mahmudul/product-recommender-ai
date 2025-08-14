# Pipeline Scheduling and Trigger System

This directory contains the comprehensive scheduling and trigger management system for the data pipeline.

## Overview

The scheduling system provides multiple ways to trigger and manage pipeline execution:

1. **Automated Scheduling**: Time-based scheduling with configurable patterns
2. **Manual Triggers**: On-demand execution via API or UI
3. **Event-Driven Triggers**: Execution based on external events
4. **Conditional Execution**: Smart execution based on system state
5. **Adaptive Scheduling**: Performance-based schedule optimization

## Components

### 1. Pipeline Scheduler (`pipeline_scheduler.py`)

The main scheduling DAG that:
- Evaluates trigger conditions every 15 minutes
- Checks data freshness, system health, and maintenance windows
- Processes manual and external triggers
- Adapts scheduling based on performance metrics

**Key Features:**
- Conditional execution logic
- Maintenance window awareness
- External dependency checking
- Performance-based schedule adjustment

### 2. Trigger API (`trigger_api.py`)

REST API service for external trigger management:

**Endpoints:**
- `POST /api/v1/trigger/manual` - Queue manual trigger
- `POST /api/v1/trigger/webhook` - Handle webhook triggers
- `POST /api/v1/trigger/immediate` - Immediate execution
- `GET /api/v1/trigger/status/<id>` - Check trigger status
- `GET /api/v1/triggers/pending` - List pending triggers
- `GET /api/v1/schedule/config` - Get schedule configuration
- `PUT /api/v1/schedule/config` - Update schedule configuration
- `POST /api/v1/pipeline/pause` - Pause pipeline
- `POST /api/v1/pipeline/resume` - Resume pipeline

**Authentication:**
Uses Bearer token authentication. Set `PIPELINE_API_TOKEN` environment variable.

### 3. Schedule Patterns (`schedule_patterns.py`)

Predefined scheduling patterns for different use cases:

**Standard Patterns:**
- `production_daily`: Daily at 2 AM with robust error handling
- `production_hourly`: Every hour with SLA monitoring
- `development_frequent`: Every 15 minutes for development
- `business_hours_only`: Hourly during business hours
- `weekend_batch`: Weekend batch processing
- `manual_only`: Manual triggers only
- `high_frequency`: Every 5 minutes for real-time scenarios
- `low_frequency`: Monthly execution

**Event-Driven Patterns:**
- `data_arrival`: Triggered by file arrival
- `external_api_update`: Triggered by API changes
- `database_change`: Triggered by database updates
- `webhook_trigger`: Triggered by webhooks

**Business Patterns:**
- `ecommerce_peak_hours`: E-commerce specific timing
- `financial_end_of_day`: Financial market schedules
- `retail_inventory_update`: Retail-specific patterns
- `marketing_campaign_sync`: Marketing automation

### 4. Configuration (`schedule_config.yaml`)

Comprehensive YAML configuration covering:
- Environment-specific settings
- Business patterns
- Trigger mechanisms
- Conditional execution rules
- Adaptive scheduling
- Monitoring and alerting
- Resource management
- Security settings

## Usage Examples

### Manual Trigger via API

```bash
# Trigger pipeline immediately
curl -X POST http://localhost:5000/api/v1/trigger/immediate \
  -H "Authorization: Bearer your-api-token" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Data update required",
    "user": "admin",
    "parameters": {
      "force_full_refresh": true
    }
  }'

# Queue manual trigger
curl -X POST http://localhost:5000/api/v1/trigger/manual \
  -H "Authorization: Bearer your-api-token" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Scheduled maintenance",
    "user": "operator",
    "priority": "high"
  }'
```

### Webhook Trigger

```bash
# External system webhook
curl -X POST http://localhost:5000/api/v1/trigger/webhook \
  -H "Authorization: Bearer your-api-token" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "data_provider",
    "event": "data_updated",
    "data": {
      "dataset": "mobile_phones",
      "records_updated": 1500
    }
  }'
```

### Schedule Configuration

```bash
# Get current configuration
curl -X GET http://localhost:5000/api/v1/schedule/config \
  -H "Authorization: Bearer your-api-token"

# Update schedule interval
curl -X PUT http://localhost:5000/api/v1/schedule/config \
  -H "Authorization: Bearer your-api-token" \
  -H "Content-Type: application/json" \
  -d '{
    "schedule_interval_minutes": 120,
    "staleness_threshold_hours": 48
  }'
```

### Maintenance Window Management

```bash
# Add maintenance window
curl -X POST http://localhost:5000/api/v1/schedule/maintenance \
  -H "Authorization: Bearer your-api-token" \
  -H "Content-Type: application/json" \
  -d '{
    "start": "02:00",
    "end": "04:00",
    "description": "Weekly maintenance",
    "days": ["sunday"]
  }'
```

### Pipeline Control

```bash
# Pause pipeline
curl -X POST http://localhost:5000/api/v1/pipeline/pause \
  -H "Authorization: Bearer your-api-token" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "System maintenance",
    "user": "admin",
    "duration_minutes": 120
  }'

# Resume pipeline
curl -X POST http://localhost:5000/api/v1/pipeline/resume \
  -H "Authorization: Bearer your-api-token" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Maintenance completed",
    "user": "admin"
  }'
```

## File-Based Triggers

Create trigger files in `/opt/airflow/triggers/`:

```json
{
  "trigger_type": "data_update",
  "source": "external_system",
  "priority": "high",
  "parameters": {
    "dataset": "mobile_phones",
    "incremental": false
  },
  "created_at": "2024-01-15T10:30:00Z"
}
```

Save as `*.trigger` or `*.json` file. The scheduler will process and remove the file.

## Conditional Execution

The scheduler evaluates several conditions before triggering:

1. **Maintenance Windows**: Skips execution during defined maintenance periods
2. **Data Freshness**: Only runs if data is stale (configurable threshold)
3. **System Health**: Ensures all services are healthy
4. **External Dependencies**: Checks external systems availability

## Adaptive Scheduling

The system automatically adjusts scheduling based on:
- Pipeline success rate
- Average execution time
- System resource utilization
- Data volume trends

**Configuration:**
```yaml
adaptive_scheduling:
  enabled: true
  base_interval_minutes: 60
  min_interval_minutes: 30
  max_interval_minutes: 240
  performance_thresholds:
    success_rate_min: 0.95
    avg_duration_max_minutes: 45
```

## Monitoring and Alerting

The scheduling system provides comprehensive monitoring:

### Metrics Collected
- Schedule adherence
- Execution duration
- Success/failure rates
- Queue lengths
- Resource utilization

### Alert Conditions
- Missed schedules
- Long-running executions
- High failure rates
- System health issues

### Alert Channels
- Email notifications
- Slack integration
- Webhook callbacks
- Console logging

## Security

### Authentication
- Bearer token authentication for API access
- Token expiry and rotation support
- Role-based access control

### Authorization
- Admin: Full access to all operations
- Operator: Execute and monitor operations
- Viewer: Read-only access

### Audit Logging
- All API calls logged
- User actions tracked
- Configuration changes recorded

## Deployment

### Docker Compose
The trigger API is included in the main docker-compose setup:

```yaml
trigger-api:
  build:
    context: .
    dockerfile: trigger-api.dockerfile
  ports:
    - "5000:5000"
  environment:
    - PIPELINE_API_TOKEN=your-secure-token
```

### Environment Variables

Required:
- `PIPELINE_API_TOKEN`: API authentication token
- `DATABASE_URL`: Database connection string
- `REDIS_URL`: Redis connection string

Optional:
- `FLASK_ENV`: Flask environment (production/development)
- `AIRFLOW_BASE_URL`: Airflow webserver URL

## Troubleshooting

### Common Issues

1. **Triggers Not Processing**
   - Check scheduler DAG is running
   - Verify API token authentication
   - Check Airflow webserver connectivity

2. **Schedule Drift**
   - Monitor system resources
   - Check for long-running tasks
   - Review adaptive scheduling settings

3. **API Errors**
   - Verify authentication token
   - Check request format
   - Review API logs

### Debugging

```bash
# Check trigger API logs
docker-compose logs trigger-api

# Check scheduler DAG status
docker-compose exec airflow-scheduler airflow dags state pipeline_scheduler

# Monitor pending triggers
curl -X GET http://localhost:5000/api/v1/triggers/pending \
  -H "Authorization: Bearer your-api-token"
```

## Best Practices

1. **Schedule Design**
   - Use appropriate intervals for your data freshness requirements
   - Consider system resources and dependencies
   - Implement proper error handling and retries

2. **Trigger Management**
   - Use priority levels for different trigger types
   - Implement rate limiting for external triggers
   - Monitor trigger queue lengths

3. **Maintenance**
   - Define clear maintenance windows
   - Use pause/resume for planned maintenance
   - Monitor schedule adherence

4. **Security**
   - Rotate API tokens regularly
   - Use HTTPS in production
   - Implement proper access controls

5. **Monitoring**
   - Set up comprehensive alerting
   - Monitor key performance metrics
   - Regular health checks

## Integration Examples

### CI/CD Pipeline Integration

```yaml
# GitHub Actions example
- name: Trigger Data Pipeline
  run: |
    curl -X POST ${{ secrets.PIPELINE_API_URL }}/api/v1/trigger/immediate \
      -H "Authorization: Bearer ${{ secrets.PIPELINE_API_TOKEN }}" \
      -H "Content-Type: application/json" \
      -d '{
        "reason": "Code deployment completed",
        "user": "ci-cd",
        "parameters": {
          "deployment_id": "${{ github.run_id }}"
        }
      }'
```

### Monitoring System Integration

```python
# Python monitoring script
import requests

def trigger_pipeline_if_needed():
    # Check data staleness
    if is_data_stale():
        response = requests.post(
            'http://localhost:5000/api/v1/trigger/immediate',
            headers={'Authorization': 'Bearer your-token'},
            json={
                'reason': 'Data staleness detected',
                'user': 'monitoring_system'
            }
        )
        return response.json()
```

This scheduling system provides a robust, flexible, and scalable solution for managing data pipeline execution across different environments and use cases.