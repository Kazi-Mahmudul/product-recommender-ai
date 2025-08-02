/**
 * Load Tests for Quota Enforcement
 * 
 * Tests the system's behavior under high load and concurrent requests,
 * focusing on quota enforcement and system stability.
 */

const AIServiceManager = require('../../managers/AIServiceManager');
const ConfigurationManager = require('../../managers/ConfigurationManager');
const QuotaTracker = require('../../managers/QuotaTracker');
const HealthMonitor = require('../../managers/HealthMonitor');

describe('Load Tests for Quota Enforcement', () => {
  let aiServiceManager;
  let configManager;
  let quotaTracker;
  let healthMonitor;

  beforeAll(async () => {
    // Set up test environment with reduced quotas for faster testing
    process.env.NODE_ENV = 'test';
    process.env.GOOGLE_API_KEY = 'test-api-key';
    
    configManager = new ConfigurationManager('./config');
    await configManager.loadConfiguration();
    
    // Create quota tracker with low limits for testing
    const quotaConfig = {
      providers: {
        gemini: {
          requestsPerMinute: 10,
          requestsPerHour: 50,
          requestsPerDay: 100
        },
        test_provider: {
          requestsPerMinute: 5,
          requestsPerHour: 25,
          requestsPerDay: 50
        }
      },
      resetIntervals: {
        minute: 60000,
        hour: 3600000,
        day: 86400000
      }
    };
    
    quotaTracker = new QuotaTracker(configManager);
    healthMonitor = new HealthMonitor(configManager.getProvidersConfig());
    
    aiServiceManager = new AIServiceManager(
      configManager,
      quotaTracker,
      healthMonitor,
      { level: 'error' }
    );
  });

  afterAll(async () => {
    if (aiServiceManager) {
      aiServiceManager.cleanup();
    }
    if (quotaTracker) {
      quotaTracker.cleanup();
    }
    if (healthMonitor) {
      healthMonitor.cleanup();
    }
  });

  beforeEach(async () => {
    // Reset quotas before each test
    await quotaTracker.resetAllQuotas();
  });

  describe('Concurrent Request Handling', () => {
    test('should handle 50 concurrent requests without crashing', async () => {
      const concurrentRequests = 50;
      const queries = Array(concurrentRequests).fill().map((_, index) => 
        `Test query ${index} for concurrent processing`
      );

      const startTime = Date.now();
      
      const promises = queries.map(async (query, index) => {
        try {
          const result = await aiServiceManager.parseQuery(query);
          return {
            success: true,
            index,
            result,
            responseTime: result.responseTime || 0
          };
        } catch (error) {
          return {
            success: false,
            index,
            error: error.message,
            responseTime: 0
          };
        }
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Analyze results
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      const fallbackUsed = successful.filter(r => 
        r.result.source === 'local_fallback' || r.result.source === 'emergency_fallback'
      );

      console.log(`Load Test Results:
        Total Requests: ${concurrentRequests}
        Successful: ${successful.length}
        Failed: ${failed.length}
        Fallback Used: ${fallbackUsed.length}
        Total Time: ${totalTime}ms
        Average Response Time: ${successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length}ms
      `);

      // Assertions
      expect(results).toHaveLength(concurrentRequests);
      expect(successful.length).toBeGreaterThan(0); // At least some should succeed
      expect(successful.length + failed.length).toBe(concurrentRequests);
      
      // Most requests should complete (either via AI or fallback)
      expect(successful.length).toBeGreaterThan(concurrentRequests * 0.8);
    }, 30000); // 30 second timeout

    test('should enforce quota limits under concurrent load', async () => {
      const requestsToMake = 15; // More than the minute limit (10)
      const queries = Array(requestsToMake).fill().map((_, index) => 
        `Quota test query ${index}`
      );

      const results = [];
      const startTime = Date.now();

      // Make requests sequentially to better test quota enforcement
      for (let i = 0; i < requestsToMake; i++) {
        try {
          const result = await aiServiceManager.parseQuery(queries[i]);
          results.push({
            success: true,
            index: i,
            source: result.source,
            quotaExceeded: result.fallbackReason && result.fallbackReason.includes('quota')
          });
        } catch (error) {
          results.push({
            success: false,
            index: i,
            error: error.message
          });
        }
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Analyze quota enforcement
      const successful = results.filter(r => r.success);
      const fallbackDueToQuota = successful.filter(r => r.quotaExceeded);
      const fallbackUsed = successful.filter(r => 
        r.source === 'local_fallback' || r.source === 'emergency_fallback'
      );

      console.log(`Quota Enforcement Test Results:
        Total Requests: ${requestsToMake}
        Successful: ${successful.length}
        Fallback Used: ${fallbackUsed.length}
        Quota-triggered Fallback: ${fallbackDueToQuota.length}
        Total Time: ${totalTime}ms
      `);

      // Should have used fallback for requests exceeding quota
      expect(fallbackUsed.length).toBeGreaterThan(0);
      expect(successful.length).toBe(requestsToMake); // All should complete somehow
    }, 20000);

    test('should maintain system stability under sustained load', async () => {
      const batchSize = 10;
      const numberOfBatches = 5;
      const delayBetweenBatches = 1000; // 1 second

      const allResults = [];
      let totalResponseTime = 0;
      let totalRequests = 0;

      for (let batch = 0; batch < numberOfBatches; batch++) {
        console.log(`Processing batch ${batch + 1}/${numberOfBatches}`);
        
        const batchQueries = Array(batchSize).fill().map((_, index) => 
          `Sustained load test batch ${batch} query ${index}`
        );

        const batchPromises = batchQueries.map(async (query) => {
          const startTime = Date.now();
          try {
            const result = await aiServiceManager.parseQuery(query);
            const responseTime = Date.now() - startTime;
            totalResponseTime += responseTime;
            totalRequests++;
            
            return {
              success: true,
              source: result.source,
              responseTime
            };
          } catch (error) {
            return {
              success: false,
              error: error.message,
              responseTime: Date.now() - startTime
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        allResults.push(...batchResults);

        // Wait between batches
        if (batch < numberOfBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }

      const successful = allResults.filter(r => r.success);
      const failed = allResults.filter(r => !r.success);
      const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;

      console.log(`Sustained Load Test Results:
        Total Requests: ${totalRequests}
        Successful: ${successful.length}
        Failed: ${failed.length}
        Average Response Time: ${averageResponseTime.toFixed(2)}ms
        Success Rate: ${((successful.length / totalRequests) * 100).toFixed(2)}%
      `);

      // System should remain stable
      expect(successful.length).toBeGreaterThan(totalRequests * 0.7); // At least 70% success
      expect(averageResponseTime).toBeLessThan(10000); // Under 10 seconds average
      expect(failed.length).toBeLessThan(totalRequests * 0.3); // Less than 30% failures
    }, 60000); // 60 second timeout
  });

  describe('Quota Recovery and Reset', () => {
    test('should recover quota after reset period', async () => {
      // Exhaust quota first
      const quotaLimit = 10; // Based on our test configuration
      
      for (let i = 0; i < quotaLimit + 2; i++) {
        await aiServiceManager.parseQuery(`Quota exhaustion test ${i}`);
      }

      // Check quota status
      const quotaStatus = await quotaTracker.getAllUsageStats();
      console.log('Quota status after exhaustion:', quotaStatus);

      // Manually reset quota (simulating time passage)
      await quotaTracker.resetAllQuotas();

      // Should be able to make requests again
      const result = await aiServiceManager.parseQuery('Post-reset test query');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('source');
    });

    test('should handle quota reset during active requests', async () => {
      // Start some long-running requests
      const longRunningPromises = Array(5).fill().map((_, index) =>
        aiServiceManager.parseQuery(`Long running query ${index}`)
      );

      // Reset quota while requests are in progress
      setTimeout(async () => {
        await quotaTracker.resetAllQuotas();
      }, 100);

      // Wait for all requests to complete
      const results = await Promise.all(longRunningPromises);

      // All requests should complete successfully
      results.forEach(result => {
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('source');
      });
    });
  });

  describe('Memory and Resource Management', () => {
    test('should not leak memory under sustained load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Process many requests
      const numberOfRequests = 100;
      const batchSize = 10;
      
      for (let batch = 0; batch < numberOfRequests / batchSize; batch++) {
        const batchPromises = Array(batchSize).fill().map((_, index) =>
          aiServiceManager.parseQuery(`Memory test batch ${batch} query ${index}`)
        );
        
        await Promise.all(batchPromises);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;

      console.log(`Memory Usage:
        Initial: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB
        Final: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB
        Increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB (${memoryIncreasePercent.toFixed(2)}%)
      `);

      // Memory increase should be reasonable (less than 100% increase)
      expect(memoryIncreasePercent).toBeLessThan(100);
    }, 45000);

    test('should clean up resources properly', async () => {
      // Create a temporary service manager
      const tempConfigManager = new ConfigurationManager('./config');
      await tempConfigManager.loadConfiguration();
      
      const tempQuotaTracker = new QuotaTracker({
        providers: { test: { requestsPerMinute: 10 } }
      });
      
      const tempHealthMonitor = new HealthMonitor(tempConfigManager.getProvidersConfig());
      
      const tempAIServiceManager = new AIServiceManager(
        tempConfigManager,
        tempQuotaTracker,
        tempHealthMonitor,
        { level: 'error' }
      );

      // Use the service
      await tempAIServiceManager.parseQuery('Resource cleanup test');

      // Clean up
      tempAIServiceManager.cleanup();
      tempQuotaTracker.cleanup();
      tempHealthMonitor.cleanup();

      // Should not throw errors during cleanup
      expect(true).toBe(true); // Test passes if no errors thrown
    });
  });

  describe('Error Rate and Resilience', () => {
    test('should maintain acceptable error rate under load', async () => {
      const numberOfRequests = 50;
      const queries = Array(numberOfRequests).fill().map((_, index) => 
        `Error rate test query ${index}`
      );

      const results = await Promise.allSettled(
        queries.map(query => aiServiceManager.parseQuery(query))
      );

      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      const errorRate = (failed.length / numberOfRequests) * 100;

      console.log(`Error Rate Test Results:
        Total Requests: ${numberOfRequests}
        Successful: ${successful.length}
        Failed: ${failed.length}
        Error Rate: ${errorRate.toFixed(2)}%
      `);

      // Error rate should be acceptable (less than 10%)
      expect(errorRate).toBeLessThan(10);
      expect(successful.length).toBeGreaterThan(numberOfRequests * 0.9);
    });

    test('should recover from temporary system stress', async () => {
      // Simulate system stress with rapid requests
      const stressRequests = 30;
      const stressPromises = Array(stressRequests).fill().map((_, index) =>
        aiServiceManager.parseQuery(`Stress test ${index}`)
      );

      // Wait for stress test to complete
      const stressResults = await Promise.allSettled(stressPromises);
      
      // Wait for system to recover
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test normal operation after stress
      const recoveryResult = await aiServiceManager.parseQuery('Recovery test query');
      
      expect(recoveryResult).toHaveProperty('type');
      expect(recoveryResult).toHaveProperty('source');
      
      // System should be responsive after stress
      expect(recoveryResult.responseTime).toBeLessThan(5000);
    });
  });
});