#!/usr/bin/env node

/**
 * Monitoring Setup Script
 * 
 * Sets up monitoring infrastructure including dashboard and alerting.
 */

const fs = require('fs');
const path = require('path');

async function setupMonitoring() {
  console.log('🔧 Setting up AI Quota Management Monitoring...\n');
  console.log('=' .repeat(60));

  try {
    // Create monitoring configuration
    await createMonitoringConfig();
    
    // Create alert rules configuration
    await createAlertRulesConfig();
    
    // Create dashboard configuration
    await createDashboardConfig();
    
    // Create monitoring startup script
    await createMonitoringStartupScript();
    
    // Update package.json scripts
    await updatePackageJsonScripts();
    
    // Create monitoring documentation
    await createMonitoringDocs();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Monitoring setup completed successfully!');
    console.log('\n🚀 Next steps:');
    console.log('1. Start the monitoring dashboard: npm run start-monitoring');
    console.log('2. Access dashboard at: http://localhost:3001');
    console.log('3. Configure alert webhooks in config/monitoring.json');
    console.log('4. Review alert rules in config/alert-rules.json');
    console.log('\n📚 Documentation: docs/monitoring.md');
    
  } catch (error) {
    console.error('\n❌ Monitoring setup failed:', error.message);
    process.exit(1);
  }
}

/**
 * Create monitoring configuration file
 */
async function createMonitoringConfig() {
  console.log('📋 Creating monitoring configuration...');
  
  const monitoringConfig = {
    dashboard: {
      port: 3001,
      refreshInterval: 30000,
      enableAuth: false,
      authToken: "monitoring-token-" + Math.random().toString(36).substr(2, 9)
    },
    alerts: {
      enableAlerts: true,
      alertCooldown: 300000,
      maxActiveAlerts: 50,
      alertRetention: 86400000,
      thresholds: {
        responseTime: 5000,
        errorRate: 0.1,
        quotaUsage: 0.9,
        providerFailures: 3,
        memoryUsage: 0.85
      },
      notifications: {
        console: true,
        webhook: null,
        email: null
      }
    },
    metrics: {
      aggregationInterval: 60000,
      retentionPeriod: 604800000,
      enableDetailedMetrics: true
    },
    healthChecks: {
      interval: 30000,
      timeout: 10000,
      retries: 3
    }
  };

  const configPath = path.join(process.cwd(), 'config', 'monitoring.json');
  await ensureDirectoryExists(path.dirname(configPath));
  
  fs.writeFileSync(configPath, JSON.stringify(monitoringConfig, null, 2));
  console.log('✅ Created config/monitoring.json');
}

/**
 * Create alert rules configuration
 */
async function createAlertRulesConfig() {
  console.log('🚨 Creating alert rules configuration...');
  
  const alertRules = {
    rules: [
      {
        name: "high_response_time",
        enabled: true,
        severity: "warning",
        description: "Triggers when average response time exceeds threshold",
        cooldown: 300000,
        metadata: {
          category: "performance",
          documentation: "High response times may indicate system overload or provider issues"
        }
      },
      {
        name: "high_error_rate",
        enabled: true,
        severity: "error",
        description: "Triggers when error rate exceeds threshold",
        cooldown: 300000,
        metadata: {
          category: "reliability",
          documentation: "High error rates indicate system reliability issues"
        }
      },
      {
        name: "provider_failure",
        enabled: true,
        severity: "error",
        description: "Triggers when multiple providers fail",
        cooldown: 600000,
        metadata: {
          category: "availability",
          documentation: "Multiple provider failures may require immediate attention"
        }
      },
      {
        name: "high_quota_usage",
        enabled: true,
        severity: "warning",
        description: "Triggers when quota usage is high",
        cooldown: 900000,
        metadata: {
          category: "quota",
          documentation: "High quota usage may lead to service interruption"
        }
      },
      {
        name: "high_memory_usage",
        enabled: true,
        severity: "warning",
        description: "Triggers when memory usage is high",
        cooldown: 600000,
        metadata: {
          category: "resources",
          documentation: "High memory usage may indicate memory leaks or high load"
        }
      },
      {
        name: "fallback_mode_active",
        enabled: true,
        severity: "warning",
        description: "Triggers when system is running in fallback mode",
        cooldown: 1800000,
        metadata: {
          category: "availability",
          documentation: "Fallback mode indicates all AI providers are unavailable"
        }
      }
    ],
    customRules: {
      description: "Add custom alert rules here",
      example: {
        name: "custom_rule",
        enabled: false,
        severity: "info",
        description: "Example custom rule",
        cooldown: 300000,
        condition: "// JavaScript function that returns true/false",
        message: "// JavaScript function that returns alert message"
      }
    }
  };

  const configPath = path.join(process.cwd(), 'config', 'alert-rules.json');
  await ensureDirectoryExists(path.dirname(configPath));
  
  fs.writeFileSync(configPath, JSON.stringify(alertRules, null, 2));
  console.log('✅ Created config/alert-rules.json');
}

/**
 * Create dashboard configuration
 */
async function createDashboardConfig() {
  console.log('📊 Creating dashboard configuration...');
  
  const dashboardConfig = {
    title: "AI Quota Management System",
    theme: "default",
    layout: {
      grid: {
        columns: "auto-fit",
        minWidth: "300px",
        gap: "1.5rem"
      }
    },
    widgets: [
      {
        id: "system-status",
        title: "📊 System Status",
        type: "status",
        enabled: true,
        refreshInterval: 30000
      },
      {
        id: "provider-health",
        title: "🔌 Provider Health",
        type: "providers",
        enabled: true,
        refreshInterval: 30000
      },
      {
        id: "performance-metrics",
        title: "📈 Performance Metrics",
        type: "metrics",
        enabled: true,
        refreshInterval: 30000
      },
      {
        id: "active-alerts",
        title: "🚨 Active Alerts",
        type: "alerts",
        enabled: true,
        refreshInterval: 15000
      }
    ],
    actions: [
      {
        id: "refresh-providers",
        title: "🔄 Refresh Providers",
        type: "button",
        enabled: true
      },
      {
        id: "export-metrics",
        title: "📊 Export Metrics",
        type: "button",
        enabled: true
      },
      {
        id: "debug-mode",
        title: "🐛 Debug Mode",
        type: "button",
        enabled: true,
        style: "danger"
      },
      {
        id: "normal-mode",
        title: "ℹ️ Normal Mode",
        type: "button",
        enabled: true
      }
    ]
  };

  const configPath = path.join(process.cwd(), 'config', 'dashboard.json');
  await ensureDirectoryExists(path.dirname(configPath));
  
  fs.writeFileSync(configPath, JSON.stringify(dashboardConfig, null, 2));
  console.log('✅ Created config/dashboard.json');
}

/**
 * Create monitoring startup script
 */
async function createMonitoringStartupScript() {
  console.log('🚀 Creating monitoring startup script...');
  
  const startupScript = `#!/usr/bin/env node

/**
 * Monitoring Service Startup Script
 * 
 * Starts the monitoring dashboard and alert system.
 */

const path = require('path');
const fs = require('fs');

// Import monitoring components
const MonitoringDashboard = require('./monitoring/MonitoringDashboard');
const AlertManager = require('./monitoring/AlertManager');

// Mock AIServiceManager for standalone monitoring
class MockAIServiceManager {
  constructor() {
    this.startTime = Date.now();
    this.requestCount = 0;
    this.successCount = 0;
    this.totalResponseTime = 0;
  }

  getServiceStatus() {
    return {
      availableProviders: ['gemini', 'openai'],
      totalProviders: 3,
      fallbackMode: false,
      healthStatus: {
        gemini: { isHealthy: true, lastCheck: Date.now() },
        openai: { isHealthy: true, lastCheck: Date.now() },
        claude: { isHealthy: false, lastCheck: Date.now() }
      },
      quotaStatus: {
        gemini: { used: 150, limit: 1000, usage: 0.15 },
        openai: { used: 800, limit: 1000, usage: 0.8 },
        claude: { used: 0, limit: 1000, usage: 0 }
      }
    };
  }

  getDetailedMetrics(timeRange = 3600000) {
    const uptime = Date.now() - this.startTime;
    const avgResponseTime = this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0;
    const successRate = this.requestCount > 0 ? this.successCount / this.requestCount : 1;
    
    return {
      current: {
        totalRequests: this.requestCount,
        successfulRequests: this.successCount,
        failedRequests: this.requestCount - this.successCount,
        successRate: successRate,
        averageResponseTime: avgResponseTime,
        requestsPerMinute: (this.requestCount / (uptime / 60000)) || 0,
        uptime: uptime,
        alerts: {
          active: [],
          total: 0,
          history: []
        }
      },
      timeRange: timeRange,
      timestamp: Date.now()
    };
  }

  exportMetrics(format = 'json') {
    const metrics = this.getDetailedMetrics();
    if (format === 'csv') {
      return 'timestamp,requests,success_rate,avg_response_time\\n' +
             \`\${new Date().toISOString()},\${metrics.current.totalRequests},\${metrics.current.successRate},\${metrics.current.averageResponseTime}\`;
    }
    return JSON.stringify(metrics, null, 2);
  }

  refreshProviderStatus() {
    console.log('Refreshing provider status...');
    return Promise.resolve({ refreshed: true, timestamp: Date.now() });
  }

  setLogLevel(level) {
    console.log(\`Log level set to: \${level}\`);
  }

  // Simulate some activity
  simulateActivity() {
    setInterval(() => {
      this.requestCount++;
      this.successCount += Math.random() > 0.1 ? 1 : 0; // 90% success rate
      this.totalResponseTime += Math.random() * 1000 + 100; // 100-1100ms response time
    }, 5000);
  }
}

async function startMonitoring() {
  console.log('🚀 Starting AI Quota Management Monitoring...\\n');
  
  try {
    // Load configuration
    const configPath = path.join(__dirname, 'config', 'monitoring.json');
    let config = {};
    
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log('📋 Loaded monitoring configuration');
    } else {
      console.log('⚠️ No monitoring configuration found, using defaults');
    }

    // Create mock service manager for standalone monitoring
    const aiServiceManager = new MockAIServiceManager();
    aiServiceManager.simulateActivity();

    // Initialize alert manager
    const alertManager = new AlertManager(config.alerts || {});
    console.log('🚨 Alert manager initialized');

    // Initialize monitoring dashboard
    const dashboard = new MonitoringDashboard(aiServiceManager, config.dashboard || {});
    
    // Start dashboard
    await dashboard.start();
    
    // Setup periodic alert checking
    setInterval(() => {
      const metrics = aiServiceManager.getDetailedMetrics();
      const status = aiServiceManager.getServiceStatus();
      
      alertManager.checkAlerts(metrics.current, status);
    }, 30000); // Check every 30 seconds

    console.log('\\n✅ Monitoring system started successfully!');
    console.log(\`📊 Dashboard: http://localhost:\${config.dashboard?.port || 3001}\`);
    console.log('🚨 Alert system: Active');
    console.log('\\n📝 Logs will appear below:\\n');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\\n🛑 Shutting down monitoring system...');
      
      await dashboard.stop();
      alertManager.cleanup();
      
      console.log('✅ Monitoring system stopped');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start monitoring system:', error.message);
    process.exit(1);
  }
}

// Start monitoring if this script is run directly
if (require.main === module) {
  startMonitoring().catch(error => {
    console.error('💥 Monitoring startup error:', error.message);
    process.exit(1);
  });
}

module.exports = { startMonitoring };
`;

  const scriptPath = path.join(process.cwd(), 'start-monitoring.js');
  fs.writeFileSync(scriptPath, startupScript);
  console.log('✅ Created start-monitoring.js');
}

/**
 * Update package.json scripts
 */
async function updatePackageJsonScripts() {
  console.log('📦 Updating package.json scripts...');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.log('⚠️ package.json not found, skipping script updates');
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Add monitoring scripts
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts['setup-monitoring'] = 'node scripts/setup-monitoring.js';
  packageJson.scripts['start-monitoring'] = 'node start-monitoring.js';
  packageJson.scripts['monitoring-dashboard'] = 'node start-monitoring.js';
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ Updated package.json scripts');
}

/**
 * Create monitoring documentation
 */
async function createMonitoringDocs() {
  console.log('📚 Creating monitoring documentation...');
  
  const docsContent = `# AI Quota Management - Monitoring Guide

## Overview

The AI Quota Management system includes comprehensive monitoring and alerting capabilities to ensure system reliability and performance.

## Components

### 1. Monitoring Dashboard
- **URL**: http://localhost:3001 (default)
- **Features**: Real-time system status, provider health, performance metrics, active alerts
- **Configuration**: \`config/monitoring.json\`

### 2. Alert Manager
- **Purpose**: Monitors system metrics and triggers alerts based on configurable rules
- **Configuration**: \`config/alert-rules.json\`
- **Notifications**: Console, webhook, email (configurable)

## Quick Start

### Start Monitoring
\`\`\`bash
npm run start-monitoring
\`\`\`

### Access Dashboard
Open http://localhost:3001 in your browser

### Configure Alerts
Edit \`config/alert-rules.json\` to customize alert rules and thresholds

## Configuration

### Monitoring Configuration (\`config/monitoring.json\`)

\`\`\`json
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
\`\`\`

### Alert Rules (\`config/alert-rules.json\`)

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
Configure webhook URL in \`config/monitoring.json\`:
\`\`\`json
{
  "alerts": {
    "notifications": {
      "webhook": "https://your-webhook-url.com/alerts"
    }
  }
}
\`\`\`

### Email Notifications
Configure email address in \`config/monitoring.json\`:
\`\`\`json
{
  "alerts": {
    "notifications": {
      "email": "admin@yourcompany.com"
    }
  }
}
\`\`\`

## API Endpoints

The monitoring dashboard exposes several API endpoints:

- \`GET /api/status\` - System status
- \`GET /api/metrics\` - Performance metrics
- \`GET /api/health\` - Health check
- \`GET /api/alerts\` - Active alerts
- \`GET /api/providers\` - Provider status
- \`GET /api/export\` - Export metrics
- \`POST /api/actions/:action\` - System actions

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
`;

  const docsPath = path.join(process.cwd(), 'docs', 'monitoring.md');
  await ensureDirectoryExists(path.dirname(docsPath));
  
  fs.writeFileSync(docsPath, docsContent);
  console.log('✅ Created docs/monitoring.md');
}

/**
 * Ensure directory exists
 */
async function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run setup if this script is executed directly
if (require.main === module) {
  setupMonitoring().catch(error => {
    console.error('💥 Setup error:', error.message);
    process.exit(1);
  });
}

module.exports = { setupMonitoring };