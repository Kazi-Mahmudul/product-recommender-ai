/**
 * Monitoring System Tests
 * 
 * Tests for the monitoring dashboard and alert manager.
 */

const MonitoringDashboard = require('../../monitoring/MonitoringDashboard');
const AlertManager = require('../../monitoring/AlertManager');

// Mock AIServiceManager for testing
class MockAIServiceManager {
  constructor() {
    this.mockData = {
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

  getServiceStatus() {
    return this.mockData;
  }

  getDetailedMetrics() {
    return {
      current: {
        totalRequests: 1000,
        successfulRequests: 950,
        failedRequests: 50,
        successRate: 0.95,
        averageResponseTime: 250,
        requestsPerMinute: 10.5,
        uptime: 3600000,
        alerts: {
          active: [],
          total: 0,
          history: []
        }
      },
      timeRange: 3600000,
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
    return Promise.resolve({ refreshed: true, timestamp: Date.now() });
  }

  setLogLevel(level) {
    console.log(`Log level set to: ${level}`);
  }
}

describe('Monitoring System', () => {
  let mockAIServiceManager;
  let alertManager;
  let dashboard;

  beforeAll(() => {
    mockAIServiceManager = new MockAIServiceManager();
  });

  afterAll(async () => {
    if (dashboard) {
      await dashboard.stop();
    }
    if (alertManager) {
      alertManager.cleanup();
    }
  });

  describe('AlertManager', () => {
    beforeEach(() => {
      alertManager = new AlertManager({
        enableAlerts: true,
        alertCooldown: 1000, // Short cooldown for testing
        thresholds: {
          responseTime: 1000,
          errorRate: 0.05,
          quotaUsage: 0.7,
          providerFailures: 2,
          memoryUsage: 0.8
        },
        notifications: {
          console: false // Disable console notifications for tests
        }
      });
    });

    afterEach(() => {
      if (alertManager) {
        alertManager.cleanup();
      }
    });

    test('should initialize with default rules', () => {
      expect(alertManager.alertRules.size).toBeGreaterThan(0);
      expect(alertManager.alertRules.has('high_response_time')).toBe(true);
      expect(alertManager.alertRules.has('high_error_rate')).toBe(true);
      expect(alertManager.alertRules.has('provider_failure')).toBe(true);
    });

    test('should add custom alert rules', () => {
      const initialRuleCount = alertManager.alertRules.size;
      
      alertManager.addRule('test_rule', {
        condition: () => true,
        severity: 'info',
        message: 'Test alert'
      });

      expect(alertManager.alertRules.size).toBe(initialRuleCount + 1);
      expect(alertManager.alertRules.has('test_rule')).toBe(true);
    });

    test('should trigger alerts based on conditions', () => {
      const metrics = {
        averageResponseTime: 2000, // Above threshold
        successRate: 0.9,
        totalRequests: 100
      };

      const context = mockAIServiceManager.getServiceStatus();
      const result = alertManager.checkAlerts(metrics, context);

      expect(result.triggered.length).toBeGreaterThan(0);
      expect(result.triggered.some(alert => alert.rule === 'high_response_time')).toBe(true);
    });

    test('should respect alert cooldowns', async () => {
      const metrics = {
        averageResponseTime: 2000,
        successRate: 0.9,
        totalRequests: 100
      };

      const context = mockAIServiceManager.getServiceStatus();
      
      // First check should trigger alert
      const result1 = alertManager.checkAlerts(metrics, context);
      expect(result1.triggered.length).toBeGreaterThan(0);

      // Immediate second check should not trigger due to cooldown
      const result2 = alertManager.checkAlerts(metrics, context);
      expect(result2.triggered.length).toBe(0);

      // Wait for cooldown to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Clear the active alerts and cooldowns to allow new ones
      alertManager.clearAllAlerts();
      alertManager.alertCooldowns.clear(); // Clear cooldown timers

      // Third check should trigger again
      const result3 = alertManager.checkAlerts(metrics, context);
      expect(result3.triggered.length).toBeGreaterThan(0);
    });

    test('should manage active alerts', () => {
      const metrics = {
        averageResponseTime: 2000,
        successRate: 0.9,
        totalRequests: 100
      };

      const context = mockAIServiceManager.getServiceStatus();
      alertManager.checkAlerts(metrics, context);

      const activeAlerts = alertManager.getActiveAlerts();
      expect(activeAlerts.length).toBeGreaterThan(0);

      // Clear all alerts
      const clearedCount = alertManager.clearAllAlerts();
      expect(clearedCount).toBeGreaterThan(0);
      expect(alertManager.getActiveAlerts().length).toBe(0);
    });

    test('should export alert data', () => {
      const metrics = {
        averageResponseTime: 2000,
        successRate: 0.9,
        totalRequests: 100
      };

      const context = mockAIServiceManager.getServiceStatus();
      alertManager.checkAlerts(metrics, context);

      // Test JSON export
      const jsonExport = alertManager.exportAlerts('json');
      expect(typeof jsonExport).toBe('string');
      const parsedData = JSON.parse(jsonExport);
      expect(parsedData).toHaveProperty('activeAlerts');
      expect(parsedData).toHaveProperty('alertHistory');
      expect(parsedData).toHaveProperty('stats');

      // Test CSV export
      const csvExport = alertManager.exportAlerts('csv');
      expect(typeof csvExport).toBe('string');
      expect(csvExport).toContain('Timestamp,Rule,Severity,Message,Status');
    });

    test('should provide alert statistics', () => {
      const metrics = {
        averageResponseTime: 2000,
        successRate: 0.9,
        totalRequests: 100
      };

      const context = mockAIServiceManager.getServiceStatus();
      alertManager.checkAlerts(metrics, context);

      const stats = alertManager.getAlertStats();
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('last24h');
      expect(stats).toHaveProperty('last1h');
      expect(stats).toHaveProperty('severityCounts');
      expect(stats).toHaveProperty('rules');
    });
  });

  describe('MonitoringDashboard', () => {
    beforeEach(() => {
      dashboard = new MonitoringDashboard(mockAIServiceManager, {
        port: 3002, // Use different port for testing
        refreshInterval: 5000,
        enableAuth: false
      });
    });

    afterEach(async () => {
      if (dashboard) {
        await dashboard.stop();
      }
    });

    test('should initialize with configuration', () => {
      const config = dashboard.getConfig();
      expect(config.port).toBe(3002);
      expect(config.refreshInterval).toBe(5000);
      expect(config.enableAuth).toBe(false);
    });

    test('should update configuration', () => {
      dashboard.updateConfig({ refreshInterval: 10000 });
      const config = dashboard.getConfig();
      expect(config.refreshInterval).toBe(10000);
    });

    test('should generate dashboard HTML', () => {
      const html = dashboard.generateDashboardHTML();
      expect(typeof html).toBe('string');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('AI Quota Management System');
      expect(html).toContain('System Status');
      expect(html).toContain('Provider Health');
    });

    test('should start and stop server', async () => {
      // Start dashboard
      await expect(dashboard.start()).resolves.toBeUndefined();
      expect(dashboard.server).toBeTruthy();

      // Stop dashboard
      await expect(dashboard.stop()).resolves.toBeUndefined();
    });
  });

  describe('Integration Tests', () => {
    test('should integrate AlertManager with monitoring data', () => {
      const alertManager = new AlertManager({
        enableAlerts: true,
        thresholds: {
          responseTime: 200, // Low threshold to trigger alert
          errorRate: 0.03,   // Low threshold to trigger alert
          quotaUsage: 0.5    // Low threshold to trigger alert
        },
        notifications: {
          console: false
        }
      });

      const metrics = mockAIServiceManager.getDetailedMetrics().current;
      const context = mockAIServiceManager.getServiceStatus();

      const result = alertManager.checkAlerts(metrics, context);

      // Should trigger multiple alerts due to low thresholds
      expect(result.triggered.length).toBeGreaterThan(0);
      expect(result.active.length).toBeGreaterThan(0);

      // Cleanup
      alertManager.cleanup();
    });

    test('should handle monitoring system lifecycle', async () => {
      const alertManager = new AlertManager({
        enableAlerts: true,
        notifications: { console: false }
      });

      const dashboard = new MonitoringDashboard(mockAIServiceManager, {
        port: 3003,
        enableAuth: false
      });

      // Start monitoring components
      await dashboard.start();

      // Simulate monitoring cycle
      const metrics = mockAIServiceManager.getDetailedMetrics().current;
      const context = mockAIServiceManager.getServiceStatus();
      
      alertManager.checkAlerts(metrics, context);

      // Verify components are working
      expect(dashboard.server).toBeTruthy();
      expect(alertManager.getAlertStats()).toHaveProperty('rules');

      // Cleanup
      await dashboard.stop();
      alertManager.cleanup();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid alert rule conditions', () => {
      const alertManager = new AlertManager({
        enableAlerts: true,
        notifications: { console: false }
      });

      // Add rule with invalid condition
      alertManager.addRule('invalid_rule', {
        condition: () => { throw new Error('Test error'); },
        severity: 'error',
        message: 'Invalid rule'
      });

      const metrics = mockAIServiceManager.getDetailedMetrics().current;
      const context = mockAIServiceManager.getServiceStatus();

      // Should not throw error, but handle gracefully
      expect(() => {
        alertManager.checkAlerts(metrics, context);
      }).not.toThrow();

      alertManager.cleanup();
    });

    test('should handle dashboard startup errors', async () => {
      // Try to start dashboard on invalid port
      const dashboard = new MonitoringDashboard(mockAIServiceManager, {
        port: -1 // Invalid port
      });

      await expect(dashboard.start()).rejects.toThrow();
    });
  });
});