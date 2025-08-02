const MetricsCollector = require('../utils/MetricsCollector');

describe('MetricsCollector', () => {
  let metricsCollector;
  let consoleSpy;

  beforeEach(() => {
    // Mock console methods
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation()
    };

    // Use shorter intervals for testing
    metricsCollector = new MetricsCollector({
      aggregationInterval: 100, // 100ms for testing
      maxDataPoints: 10,
      retentionPeriod: 5000, // 5 seconds for testing
      enableAlerts: true,
      alertThresholds: {
        errorRate: 0.2, // 20% for easier testing
        responseTime: 1000, // 1 second
        quotaUsage: 0.8 // 80%
      }
    });
  });

  afterEach(() => {
    metricsCollector.cleanup();
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('constructor', () => {
    test('should initialize with default configuration', () => {
      const defaultCollector = new MetricsCollector();
      
      expect(defaultCollector.config.retentionPeriod).toBe(24 * 60 * 60 * 1000);
      expect(defaultCollector.config.aggregationInterval).toBe(60 * 1000);
      expect(defaultCollector.config.maxDataPoints).toBe(1440);
      expect(defaultCollector.config.enableAlerts).toBe(true);
      
      defaultCollector.cleanup();
    });

    test('should initialize time series and current window', () => {
      expect(metricsCollector.timeSeries).toBeDefined();
      expect(metricsCollector.currentWindow).toBeDefined();
      expect(metricsCollector.alertState).toBeDefined();
      expect(metricsCollector.currentWindow.requests).toBe(0);
      expect(metricsCollector.currentWindow.errors).toBe(0);
    });
  });

  describe('recordRequest', () => {
    test('should record successful request', () => {
      metricsCollector.recordRequest({
        success: true,
        responseTime: 150,
        provider: 'gemini',
        operation: 'parseQuery'
      });

      expect(metricsCollector.currentWindow.requests).toBe(1);
      expect(metricsCollector.currentWindow.errors).toBe(0);
      expect(metricsCollector.currentWindow.totalResponseTime).toBe(150);
      
      const providerStats = metricsCollector.currentWindow.providerStats.get('gemini');
      expect(providerStats.requests).toBe(1);
      expect(providerStats.errors).toBe(0);
      expect(providerStats.totalResponseTime).toBe(150);
    });

    test('should record failed request', () => {
      metricsCollector.recordRequest({
        success: false,
        responseTime: 300,
        provider: 'gemini',
        operation: 'parseQuery',
        errorType: 'network_error'
      });

      expect(metricsCollector.currentWindow.requests).toBe(1);
      expect(metricsCollector.currentWindow.errors).toBe(1);
      expect(metricsCollector.currentWindow.errorTypes.get('network_error')).toBe(1);
      
      const providerStats = metricsCollector.currentWindow.providerStats.get('gemini');
      expect(providerStats.requests).toBe(1);
      expect(providerStats.errors).toBe(1);
    });

    test('should handle multiple requests for same provider', () => {
      metricsCollector.recordRequest({ success: true, provider: 'gemini', responseTime: 100 });
      metricsCollector.recordRequest({ success: false, provider: 'gemini', responseTime: 200 });

      const providerStats = metricsCollector.currentWindow.providerStats.get('gemini');
      expect(providerStats.requests).toBe(2);
      expect(providerStats.errors).toBe(1);
      expect(providerStats.totalResponseTime).toBe(300);
    });
  });

  describe('recordQuotaUsage', () => {
    test('should record quota usage', () => {
      const quotaData = {
        used: 800,
        limit: 1000,
        usage: 0.8,
        resetTime: new Date().toISOString()
      };

      metricsCollector.recordQuotaUsage('gemini', quotaData);

      expect(metricsCollector.currentWindow.quotaUsage.has('gemini')).toBe(true);
      const recorded = metricsCollector.currentWindow.quotaUsage.get('gemini');
      expect(recorded.used).toBe(800);
      expect(recorded.limit).toBe(1000);
      expect(recorded.usage).toBe(0.8);
    });

    test('should trigger quota alert when threshold exceeded', () => {
      const quotaData = { used: 900, limit: 1000, usage: 0.9 };

      metricsCollector.recordQuotaUsage('gemini', quotaData);

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('🚨 ALERT')
      );
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('High quota usage')
      );
    });
  });

  describe('recordProviderHealth', () => {
    test('should record healthy provider', () => {
      const healthData = {
        isHealthy: true,
        responseTime: 150,
        errorCount: 0,
        lastCheck: Date.now()
      };

      metricsCollector.recordProviderHealth('gemini', healthData);

      expect(metricsCollector.currentWindow.providerHealth.has('gemini')).toBe(true);
      const recorded = metricsCollector.currentWindow.providerHealth.get('gemini');
      expect(recorded.isHealthy).toBe(true);
      expect(recorded.responseTime).toBe(150);
    });

    test('should trigger alert for unhealthy provider', () => {
      const healthData = {
        isHealthy: false,
        responseTime: 5000,
        errorCount: 5,
        lastCheck: Date.now()
      };

      metricsCollector.recordProviderHealth('gemini', healthData);

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('🚨 ALERT')
      );
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Provider gemini is unhealthy')
      );
    });
  });

  describe('aggregation', () => {
    test('should aggregate data after interval', (done) => {
      // Record some data
      metricsCollector.recordRequest({ success: true, responseTime: 100, provider: 'gemini' });
      metricsCollector.recordRequest({ success: false, responseTime: 200, provider: 'gemini' });

      // Wait for aggregation
      setTimeout(() => {
        expect(metricsCollector.timeSeries.requests.length).toBeGreaterThan(0);
        
        const latestData = metricsCollector.timeSeries.requests[metricsCollector.timeSeries.requests.length - 1];
        expect(latestData.requests.total).toBe(2);
        expect(latestData.requests.errors).toBe(1);
        expect(latestData.requests.successRate).toBe(0.5);
        expect(latestData.requests.averageResponseTime).toBe(150);
        
        done();
      }, 150);
    });

    test('should reset current window after aggregation', (done) => {
      metricsCollector.recordRequest({ success: true, responseTime: 100 });

      setTimeout(() => {
        expect(metricsCollector.currentWindow.requests).toBe(0);
        expect(metricsCollector.currentWindow.errors).toBe(0);
        expect(metricsCollector.currentWindow.totalResponseTime).toBe(0);
        
        done();
      }, 150);
    });

    test('should limit data points', (done) => {
      // Record data and wait for multiple aggregations
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          metricsCollector.recordRequest({ success: true, responseTime: 100 });
        }, i * 25);
      }

      setTimeout(() => {
        expect(metricsCollector.timeSeries.requests.length).toBeLessThanOrEqual(10);
        done();
      }, 600);
    });
  });

  describe('alerts', () => {
    test('should trigger high error rate alert', (done) => {
      // Record requests with high error rate
      for (let i = 0; i < 10; i++) {
        metricsCollector.recordRequest({ 
          success: i < 3, // 70% error rate
          responseTime: 100 
        });
      }

      setTimeout(() => {
        expect(consoleSpy.warn).toHaveBeenCalledWith(
          expect.stringContaining('High system error rate')
        );
        done();
      }, 150);
    });

    test('should trigger high response time alert', (done) => {
      metricsCollector.recordRequest({ 
        success: true, 
        responseTime: 2000 // Above threshold
      });

      setTimeout(() => {
        expect(consoleSpy.warn).toHaveBeenCalledWith(
          expect.stringContaining('High average response time')
        );
        done();
      }, 150);
    });

    test('should not spam duplicate alerts', () => {
      const quotaData = { used: 900, limit: 1000, usage: 0.9 };
      
      // Trigger same alert multiple times
      metricsCollector.recordQuotaUsage('gemini', quotaData);
      metricsCollector.recordQuotaUsage('gemini', quotaData);
      metricsCollector.recordQuotaUsage('gemini', quotaData);

      // Should only log once
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
    });

    test('should generate unique alert IDs', () => {
      const id1 = metricsCollector.generateAlertId();
      const id2 = metricsCollector.generateAlertId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^alert_\d+_[a-z0-9]+$/);
    });

    test('should format alert messages correctly', () => {
      const quotaMessage = metricsCollector.formatAlertMessage('quota_high', {
        provider: 'gemini',
        usage: 90,
        threshold: 80
      });
      
      expect(quotaMessage).toContain('High quota usage for gemini: 90%');
      
      const healthMessage = metricsCollector.formatAlertMessage('provider_unhealthy', {
        provider: 'openai',
        errorCount: 5,
        responseTime: 3000
      });
      
      expect(healthMessage).toContain('Provider openai is unhealthy');
    });

    test('should resolve alerts', () => {
      const quotaData = { used: 900, limit: 1000, usage: 0.9 };
      metricsCollector.recordQuotaUsage('gemini', quotaData);
      
      expect(metricsCollector.alertState.activeAlerts.size).toBe(1);
      
      // Get the alert ID from active alerts
      const activeAlert = Array.from(metricsCollector.alertState.activeAlerts.values())[0];
      const resolved = metricsCollector.resolveAlert(activeAlert.id);
      expect(resolved).toBe(true);
      expect(metricsCollector.alertState.activeAlerts.size).toBe(0);
    });
  });

  describe('metrics retrieval', () => {
    test('should get current metrics summary', (done) => {
      metricsCollector.recordRequest({ success: true, responseTime: 100 });
      metricsCollector.recordRequest({ success: false, responseTime: 200 });

      setTimeout(() => {
        const metrics = metricsCollector.getCurrentMetrics();
        
        expect(metrics.timestamp).toBeDefined();
        expect(metrics.summary).toBeDefined();
        expect(metrics.alerts).toBeDefined();
        expect(metrics.timeSeries).toBeDefined();
        
        done();
      }, 150);
    });

    test('should get metrics for time range', (done) => {
      const startTime = Date.now();
      
      metricsCollector.recordRequest({ success: true, responseTime: 100 });

      setTimeout(() => {
        const endTime = Date.now();
        const rangeMetrics = metricsCollector.getMetricsForTimeRange(startTime, endTime);
        
        expect(rangeMetrics.timeRange.startTime).toBe(startTime);
        expect(rangeMetrics.timeRange.endTime).toBe(endTime);
        expect(rangeMetrics.summary).toBeDefined();
        
        done();
      }, 150);
    });

    test('should calculate average response time correctly', () => {
      const dataPoints = [
        { requests: { total: 2, averageResponseTime: 100 } },
        { requests: { total: 3, averageResponseTime: 200 } }
      ];
      
      const avgResponseTime = metricsCollector.calculateAverageResponseTime(dataPoints);
      expect(avgResponseTime).toBe(160); // (2*100 + 3*200) / (2+3) = 160
    });

    test('should calculate requests per second correctly', () => {
      const dataPoints = [
        { requests: { total: 10 } },
        { requests: { total: 20 } }
      ];
      
      // Mock aggregation interval for calculation
      const originalInterval = metricsCollector.config.aggregationInterval;
      metricsCollector.config.aggregationInterval = 1000; // 1 second
      
      const rps = metricsCollector.calculateRequestsPerSecond(dataPoints);
      expect(rps).toBe(15); // (10+20) / (2 seconds) = 15
      
      metricsCollector.config.aggregationInterval = originalInterval;
    });
  });

  describe('data export', () => {
    test('should export metrics as JSON', (done) => {
      metricsCollector.recordRequest({ success: true, responseTime: 100 });

      setTimeout(() => {
        const jsonExport = metricsCollector.exportMetrics('json');
        const parsed = JSON.parse(jsonExport);
        
        expect(parsed.exportTime).toBeDefined();
        expect(parsed.config).toBeDefined();
        expect(parsed.timeSeries).toBeDefined();
        expect(parsed.alerts).toBeDefined();
        
        done();
      }, 150);
    });

    test('should export metrics as CSV', (done) => {
      metricsCollector.recordRequest({ success: true, responseTime: 100 });

      setTimeout(() => {
        const csvExport = metricsCollector.exportMetrics('csv');
        const lines = csvExport.split('\n');
        
        expect(lines[0]).toContain('timestamp,requests,errors,success_rate,avg_response_time');
        expect(lines.length).toBeGreaterThan(1);
        
        done();
      }, 150);
    });

    test('should throw error for unsupported export format', () => {
      expect(() => {
        metricsCollector.exportMetrics('xml');
      }).toThrow('Unsupported export format: xml');
    });
  });

  describe('data cleanup', () => {
    test('should clean old data beyond retention period', (done) => {
      // Record some data
      metricsCollector.recordRequest({ success: true, responseTime: 100 });

      setTimeout(() => {
        // Manually trigger cleanup with very short retention
        const originalRetention = metricsCollector.config.retentionPeriod;
        metricsCollector.config.retentionPeriod = 1; // 1ms
        
        metricsCollector.cleanOldData();
        
        expect(metricsCollector.timeSeries.requests.length).toBe(0);
        
        metricsCollector.config.retentionPeriod = originalRetention;
        done();
      }, 150);
    });
  });

  describe('edge cases', () => {
    test('should handle empty data points in calculations', () => {
      const avgResponseTime = metricsCollector.calculateAverageResponseTime([]);
      expect(avgResponseTime).toBe(0);
      
      const rps = metricsCollector.calculateRequestsPerSecond([]);
      expect(rps).toBe(0);
    });

    test('should handle missing optional fields in recordRequest', () => {
      expect(() => {
        metricsCollector.recordRequest({});
      }).not.toThrow();
      
      expect(metricsCollector.currentWindow.requests).toBe(1);
    });

    test('should handle missing optional fields in recordQuotaUsage', () => {
      expect(() => {
        metricsCollector.recordQuotaUsage('test', {});
      }).not.toThrow();
    });

    test('should handle missing optional fields in recordProviderHealth', () => {
      expect(() => {
        metricsCollector.recordProviderHealth('test', {});
      }).not.toThrow();
    });
  });

  describe('cleanup', () => {
    test('should cleanup resources', () => {
      expect(metricsCollector.aggregationTimer).toBeDefined();
      
      metricsCollector.cleanup();
      
      expect(metricsCollector.aggregationTimer).toBeNull();
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('MetricsCollector cleanup completed')
      );
    });
  });
});