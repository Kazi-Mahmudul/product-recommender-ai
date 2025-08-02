#!/usr/bin/env node

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
      return 'timestamp,requests,success_rate,avg_response_time\n' +
             `${new Date().toISOString()},${metrics.current.totalRequests},${metrics.current.successRate},${metrics.current.averageResponseTime}`;
    }
    return JSON.stringify(metrics, null, 2);
  }

  refreshProviderStatus() {
    console.log('Refreshing provider status...');
    return Promise.resolve({ refreshed: true, timestamp: Date.now() });
  }

  setLogLevel(level) {
    console.log(`Log level set to: ${level}`);
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
  console.log('🚀 Starting AI Quota Management Monitoring...\n');
  
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

    console.log('\n✅ Monitoring system started successfully!');
    console.log(`📊 Dashboard: http://localhost:${config.dashboard?.port || 3001}`);
    console.log('🚨 Alert system: Active');
    console.log('\n📝 Logs will appear below:\n');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down monitoring system...');
      
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
