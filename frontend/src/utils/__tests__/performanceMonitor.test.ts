/**
 * Unit tests for performanceMonitor
 */

import { performanceMonitor, debugUtils } from '../performanceMonitor';

// Mock performance.now()
const mockPerformanceNow = jest.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true,
});

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // Clear metrics
    performanceMonitor.clearMetrics();
    
    // Enable monitoring for tests
    performanceMonitor.setEnabled(true);
  });

  afterEach(() => {
    performanceMonitor.setEnabled(false);
  });

  describe('Request Tracking', () => {
    it('should start tracking a request', () => {
      performanceMonitor.startRequest('req1', [1, 2]);
      
      const metrics = performanceMonitor.getDetailedMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        requestId: 'req1',
        phoneIds: [1, 2],
        startTime: 1000,
        status: 'pending',
        retryCount: 0,
        cacheHit: false,
      });
    });

    it('should track cache hits', () => {
      performanceMonitor.startRequest('req1', [1, 2], true);
      
      const metrics = performanceMonitor.getDetailedMetrics();
      expect(metrics[0].cacheHit).toBe(true);
    });

    it('should complete a request successfully', () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1500);
      
      performanceMonitor.startRequest('req1', [1, 2]);
      performanceMonitor.completeRequest('req1');
      
      const metrics = performanceMonitor.getDetailedMetrics();
      expect(metrics[0]).toMatchObject({
        status: 'success',
        endTime: 1500,
        duration: 500,
      });
    });

    it('should mark a request as failed', () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1300);
      
      performanceMonitor.startRequest('req1', [1, 2]);
      performanceMonitor.failRequest('req1', 'Network error');
      
      const metrics = performanceMonitor.getDetailedMetrics();
      expect(metrics[0]).toMatchObject({
        status: 'error',
        endTime: 1300,
        duration: 300,
        error: 'Network error',
      });
    });

    it('should mark a request as cancelled', () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1200);
      
      performanceMonitor.startRequest('req1', [1, 2]);
      performanceMonitor.cancelRequest('req1');
      
      const metrics = performanceMonitor.getDetailedMetrics();
      expect(metrics[0]).toMatchObject({
        status: 'cancelled',
        endTime: 1200,
        duration: 200,
      });
    });

    it('should increment retry count', () => {
      performanceMonitor.startRequest('req1', [1, 2]);
      performanceMonitor.incrementRetry('req1');
      performanceMonitor.incrementRetry('req1');
      
      const metrics = performanceMonitor.getDetailedMetrics();
      expect(metrics[0].retryCount).toBe(2);
    });

    it('should handle non-existent request IDs gracefully', () => {
      expect(() => {
        performanceMonitor.completeRequest('nonexistent');
        performanceMonitor.failRequest('nonexistent', 'error');
        performanceMonitor.cancelRequest('nonexistent');
        performanceMonitor.incrementRetry('nonexistent');
      }).not.toThrow();
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      // Set up some test data
      mockPerformanceNow
        .mockReturnValueOnce(1000).mockReturnValueOnce(1500) // req1: 500ms success
        .mockReturnValueOnce(2000).mockReturnValueOnce(2300) // req2: 300ms success
        .mockReturnValueOnce(3000).mockReturnValueOnce(3200) // req3: 200ms failed
        .mockReturnValueOnce(4000).mockReturnValueOnce(4100); // req4: 100ms cancelled

      performanceMonitor.startRequest('req1', [1, 2], true); // cache hit
      performanceMonitor.completeRequest('req1');

      performanceMonitor.startRequest('req2', [1, 2, 3]);
      performanceMonitor.completeRequest('req2');

      performanceMonitor.startRequest('req3', [1]);
      performanceMonitor.incrementRetry('req3');
      performanceMonitor.failRequest('req3', 'Network error');

      performanceMonitor.startRequest('req4', [1, 2]);
      performanceMonitor.cancelRequest('req4');
    });

    it('should calculate correct statistics', () => {
      const stats = performanceMonitor.getStats();

      expect(stats).toMatchObject({
        totalRequests: 4,
        successfulRequests: 2,
        failedRequests: 1,
        cancelledRequests: 1,
        averageResponseTime: 400, // (500 + 300) / 2
        cacheHitRate: 25, // 1 out of 4 requests
        totalRetries: 1,
        requestsByPhoneCount: {
          1: 1, // req3
          2: 2, // req1, req4
          3: 1, // req2
        },
      });
    });

    it('should return empty stats when disabled', () => {
      performanceMonitor.setEnabled(false);
      
      const stats = performanceMonitor.getStats();
      expect(stats).toMatchObject({
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        cancelledRequests: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
        totalRetries: 0,
        requestsByPhoneCount: {},
      });
    });
  });

  describe('Memory Management', () => {
    it('should enforce metrics history limit', () => {
      // Create more than 100 requests (the default limit)
      for (let i = 0; i < 150; i++) {
        mockPerformanceNow.mockReturnValue(1000 + i);
        performanceMonitor.startRequest(`req${i}`, [i]);
        performanceMonitor.completeRequest(`req${i}`);
      }

      const metrics = performanceMonitor.getDetailedMetrics();
      expect(metrics.length).toBeLessThanOrEqual(100);
      
      // Should keep the most recent ones
      const requestIds = metrics.map(m => m.requestId);
      expect(requestIds).toContain('req149');
      expect(requestIds).not.toContain('req0');
    });
  });

  describe('Enable/Disable', () => {
    it('should enable monitoring and set localStorage', () => {
      performanceMonitor.setEnabled(true);
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('comparison-debug', 'true');
      expect(performanceMonitor.isMonitoringEnabled()).toBe(true);
    });

    it('should disable monitoring and remove localStorage', () => {
      performanceMonitor.setEnabled(false);
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('comparison-debug');
      expect(performanceMonitor.isMonitoringEnabled()).toBe(false);
    });

    it('should not track requests when disabled', () => {
      performanceMonitor.setEnabled(false);
      performanceMonitor.startRequest('req1', [1, 2]);
      
      const metrics = performanceMonitor.getDetailedMetrics();
      expect(metrics).toHaveLength(0);
    });
  });

  describe('Debug Utils', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'table').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should enable debug mode', () => {
      debugUtils.enable();
      expect(performanceMonitor.isMonitoringEnabled()).toBe(true);
      expect(console.log).toHaveBeenCalledWith('🔍 Comparison debug mode enabled');
    });

    it('should disable debug mode', () => {
      debugUtils.disable();
      expect(performanceMonitor.isMonitoringEnabled()).toBe(false);
      expect(console.log).toHaveBeenCalledWith('🔍 Comparison debug mode disabled');
    });

    it('should print stats', () => {
      debugUtils.stats();
      expect(console.table).toHaveBeenCalled();
    });

    it('should print metrics', () => {
      debugUtils.metrics();
      expect(console.table).toHaveBeenCalled();
    });

    it('should clear metrics', () => {
      performanceMonitor.startRequest('req1', [1, 2]);
      debugUtils.clear();
      
      const metrics = performanceMonitor.getDetailedMetrics();
      expect(metrics).toHaveLength(0);
      expect(console.log).toHaveBeenCalledWith('🔍 Metrics cleared');
    });

    it('should export metrics as JSON', () => {
      performanceMonitor.startRequest('req1', [1, 2]);
      performanceMonitor.completeRequest('req1');
      
      const exported = debugUtils.export();
      const data = JSON.parse(exported);
      
      expect(data).toHaveProperty('stats');
      expect(data).toHaveProperty('metrics');
      expect(data).toHaveProperty('timestamp');
      expect(data.metrics).toHaveLength(1);
    });
  });

  describe('Development Mode', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should be enabled by default in development', () => {
      process.env.NODE_ENV = 'development';
      mockLocalStorage.getItem.mockReturnValue(null);
      
      // Create new instance to test constructor
      const { PerformanceMonitor } = require('../performanceMonitor');
      const monitor = new PerformanceMonitor();
      
      expect(monitor.isMonitoringEnabled()).toBe(true);
    });

    it('should be disabled by default in production', () => {
      process.env.NODE_ENV = 'production';
      mockLocalStorage.getItem.mockReturnValue(null);
      
      // Create new instance to test constructor
      const { PerformanceMonitor } = require('../performanceMonitor');
      const monitor = new PerformanceMonitor();
      
      expect(monitor.isMonitoringEnabled()).toBe(false);
    });

    it('should respect localStorage setting', () => {
      process.env.NODE_ENV = 'production';
      mockLocalStorage.getItem.mockReturnValue('true');
      
      // Create new instance to test constructor
      const { PerformanceMonitor } = require('../performanceMonitor');
      const monitor = new PerformanceMonitor();
      
      expect(monitor.isMonitoringEnabled()).toBe(true);
    });
  });
});