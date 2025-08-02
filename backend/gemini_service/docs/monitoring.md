# AI Quota Management - Monitoring Guide

## Overview

The AI Quota Management system includes comprehensive monitoring and alerting capabilities to ensure system reliability and performance.

## Components

### 1. Monitoring Dashboard
- **URL**: http://localhost:3001 (default)
- **Features**: Real-time system status, provider health, performance metrics, active alerts
- **Configuration**: `config/monitoring.json`

### 2. Alert Manager
- **Purpose**: Monitors system metrics and triggers alerts based on configurable rules
- **Configuration**: `config/alert-rules.json`
- **Notifications**: Console, webhook, email (configurable)

## Quick Start

### Start Monitoring
```bash
npm run start-monitoring
```

### Access Dashboard
Open http://localhost:3001 in your browser

### Configure Alerts
Edit `config/alert-rules.json` to customize alert rules and thresholds

## Configuration

### Monitoring Configuration (`config/monitoring.json`)

```json
{
  "dashboard": {
    "port": 3001,
    "refreshInterval": 30000,
    "enableAuth": false,
    "authToken": "your-token-here"
  },
  "alerts": {
    "enableAlerts": true,
    "alertCooldown": 300000,
    "thresholds": {
      "responseTime": 5000,
      "errorRate": 0.1,
      "quotaUsage": 0.9,
      "providerFailures": 3,
      "memoryUsage": 0.85
    },
    "notifications": {
      "console": true,
      "webhook": "https://your-webhook-url.com/alerts",
      "email": "admin@yourcompany.com"
    }
  }
}
```

### Alert Rules (`config/alert-rules.json`)

The system includes default alert rules for:
- High response time
- High error rate
- Provider failures
- High quota usage
- High memory usage
- Fallback mode activation

## Dashboard Features

### System Status
- Overall system health
- Uptime information
- Provider availability
- Fallback mode status

### Provider Health
- Individual provider status
- Health check results
- Last check timestamps

### Performance Metrics
- Total requests processed
- Success rate
- Average response time
- Requests per minute

### Active Alerts
- Current system alerts
- Alert severity levels
- Alert timestamps

### System Actions
- Refresh provider status
- Export metrics
- Toggle debug mode
- Clear alerts

## Alert Types

### Severity Levels
- **Error**: Critical issues requiring immediate attention
- **Warning**: Issues that should be monitored
- **Info**: Informational alerts

### Default Alert Rules

1. **High Response Time**
   - Threshold: 5000ms
   - Severity: Warning
   - Cooldown: 5 minutes

2. **High Error Rate**
   - Threshold: 10%
   - Severity: Error
   - Cooldown: 5 minutes

3. **Provider Failures**
   - Threshold: 3 failed providers
   - Severity: Error
   - Cooldown: 10 minutes

4. **High Quota Usage**
   - Threshold: 90%
   - Severity: Warning
   - Cooldown: 15 minutes

5. **High Memory Usage**
   - Threshold: 85%
   - Severity: Warning
   - Cooldown: 10 minutes

6. **Fallback Mode**
   - Trigger: All providers unavailable
   - Severity: Warning
   - Cooldown: 30 minutes

## Notifications

### Console Notifications
Enabled by default, displays alerts in the console with severity indicators.

### Webhook Notifications
Configure webhook URL in `config/monitoring.json`:
```json
{
  "alerts": {
    "notifications": {
      "webhook": "https://your-webhook-url.com/alerts"
    }
  }
}
```

### Email Notifications
Configure email address in `config/monitoring.json`:
```json
{
  "alerts": {
    "notifications": {
      "email": "admin@yourcompany.com"
    }
  }
}
```

## API Endpoints

The monitoring dashboard exposes several API endpoints:

- `GET /api/status` - System status
- `GET /api/metrics` - Performance metrics
- `GET /api/health` - Health check
- `GET /api/alerts` - Active alerts
- `GET /api/providers` - Provider status
- `GET /api/export` - Export metrics
- `POST /api/actions/:action` - System actions

## Troubleshooting

### Dashboard Not Loading
1. Check if the monitoring service is running
2. Verify the port is not in use
3. Check console for error messages

### Alerts Not Triggering
1. Verify alert rules are enabled
2. Check alert thresholds
3. Ensure metrics are being collected

### High Memory Usage
1. Monitor for memory leaks
2. Check alert history retention settings
3. Consider reducing metric retention period

## Best Practices

1. **Regular Monitoring**: Check the dashboard regularly for system health
2. **Alert Tuning**: Adjust alert thresholds based on your system's normal behavior
3. **Notification Setup**: Configure appropriate notification channels
4. **Metric Retention**: Balance between data retention and storage usage
5. **Performance Impact**: Monitor the monitoring system's own resource usage

## Integration

The monitoring system can be integrated with:
- External monitoring tools (Prometheus, Grafana)
- Incident management systems (PagerDuty, Opsgenie)
- Log aggregation systems (ELK Stack, Splunk)
- Chat platforms (Slack, Microsoft Teams)

## Support

For issues or questions about the monitoring system:
1. Check the console logs for error messages
2. Review the configuration files
3. Verify all dependencies are installed
4. Check the system requirements
