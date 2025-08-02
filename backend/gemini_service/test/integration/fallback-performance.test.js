/**
 * Fallback Parser Performance Tests
 * 
 * Tests the performance characteristics of the local fallback parser
 * to ensure it provides fast responses when AI providers are unavailable.
 */

const LocalFallbackParser = require('../../parsers/LocalFallbackParser');
const AIServiceManager = require('../../managers/AIServiceManager');
const ConfigurationManager = require('../../managers/ConfigurationManager');
const QuotaTracker = require('../../managers/QuotaTracker');
const HealthMonitor = require('../../managers/HealthMonitor');

describe('Fallback Parser Performance Tests', () => {
  let fallbackParser;
  let aiServiceManager;
  let configManager;
  let quotaTracker;
  let healthMonitor;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    
    fallbackParser = new LocalFallbackParser();
    
    // For now, just test the fallback parser directly
    // Full system integration will be tested separately
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('Single Query Performance', () => {
    test('should process simple queries under 100ms', async () => {
      const simpleQueries = [
        'Samsung phone',
        'iPhone under 50000',
        'Budget phone',
        'Gaming phone',
        'Camera phone'
      ];

      for (const query of simpleQueries) {
        const startTime = Date.now();
        const result = await fallbackParser.parseQuery(query);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        expect(responseTime).toBeLessThan(100);
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('filters');
        expect(result.type).toBe('recommendation');

        console.log(`Query: "${query}" - Response time: ${responseTime}ms`);
      }
    });

    test('should process complex queries under 200ms', async () => {
      const complexQueries = [
        'I need a Samsung or Apple phone with good camera, long battery life, under 80000 BDT, preferably with 128GB storage',
        'Find me a gaming phone with high performance processor, at least 8GB RAM, good display, under 60000 taka',
        'Budget smartphone under 20000 with decent camera for photography, good battery backup, and fast charging',
        'Professional phone for business use with excellent camera, premium build quality, latest features, price no bar',
        'Student phone under 25000 with good performance for apps and games, decent camera, and long battery life'
      ];

      for (const query of complexQueries) {
        const startTime = Date.now();
        const result = await fallbackParser.parseQuery(query);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        expect(responseTime).toBeLessThan(200);
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('filters');
        expect(result.type).toBe('recommendation');

        console.log(`Complex query response time: ${responseTime}ms`);
        console.log(`Extracted filters:`, Object.keys(result.filters).length);
      }
    });

    test('should handle edge case queries efficiently', async () => {
      const edgeCaseQueries = [
        '', // Empty query
        'a', // Single character
        'phone'.repeat(100), // Very long repetitive query
        '!@#$%^&*()_+{}|:"<>?[]\\;\',./', // Special characters only
        '১২৩৪৫ ফোন ১৫০০০ টাকা', // Unicode/Bengali numbers
        'PHONE PHONE PHONE PHONE PHONE' // All caps repetitive
      ];

      for (const query of edgeCaseQueries) {
        const startTime = Date.now();
        const result = await fallbackParser.parseQuery(query);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        expect(responseTime).toBeLessThan(150);
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('filters');

        console.log(`Edge case "${query.substring(0, 20)}..." - Response time: ${responseTime}ms`);
      }
    });
  });

  describe('Batch Processing Performance', () => {
    test('should process 100 queries under 5 seconds total', async () => {
      const batchQueries = Array(100).fill().map((_, index) => 
        `Test query ${index} for Samsung phone under ${20000 + (index * 100)}`
      );

      const startTime = Date.now();
      
      const results = await Promise.all(
        batchQueries.map(query => fallbackParser.parseQuery(query))
      );
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / batchQueries.length;

      expect(totalTime).toBeLessThan(5000); // Under 5 seconds total
      expect(averageTime).toBeLessThan(50); // Under 50ms average
      expect(results).toHaveLength(100);

      // All results should be valid
      results.forEach(result => {
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('filters');
      });

      console.log(`Batch processing: ${batchQueries.length} queries in ${totalTime}ms (avg: ${averageTime.toFixed(2)}ms)`);
    });

    test('should maintain performance under concurrent load', async () => {
      const concurrentQueries = Array(50).fill().map((_, index) => 
        `Concurrent test ${index} iPhone under ${30000 + (index * 500)}`
      );

      const startTime = Date.now();
      
      // Process all queries concurrently
      const results = await Promise.all(
        concurrentQueries.map(async (query) => {
          const queryStartTime = Date.now();
          const result = await fallbackParser.parseQuery(query);
          const queryEndTime = Date.now();
          
          return {
            result,
            responseTime: queryEndTime - queryStartTime
          };
        })
      );
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const responseTimeStats = results.map(r => r.responseTime);
      const averageResponseTime = responseTimeStats.reduce((sum, time) => sum + time, 0) / responseTimeStats.length;
      const maxResponseTime = Math.max(...responseTimeStats);
      const minResponseTime = Math.min(...responseTimeStats);

      expect(totalTime).toBeLessThan(3000); // Total time under 3 seconds
      expect(averageResponseTime).toBeLessThan(200); // Average under 200ms
      expect(maxResponseTime).toBeLessThan(500); // Max under 500ms

      console.log(`Concurrent processing stats:
        Total time: ${totalTime}ms
        Average response time: ${averageResponseTime.toFixed(2)}ms
        Min response time: ${minResponseTime}ms
        Max response time: ${maxResponseTime}ms
      `);
    });
  });

  describe('Memory Usage Performance', () => {
    test('should maintain low memory usage during processing', async () => {
      const initialMemory = process.memoryUsage();
      
      // Process many queries to test memory usage
      const queries = Array(200).fill().map((_, index) => 
        `Memory test query ${index} for phone under ${15000 + (index * 100)} with good camera and battery`
      );

      for (const query of queries) {
        await fallbackParser.parseQuery(query);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;

      console.log(`Memory usage test:
        Initial: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB
        Final: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB
        Increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB (${memoryIncreasePercent.toFixed(2)}%)
      `);

      // Memory increase should be minimal (less than 50% increase)
      expect(memoryIncreasePercent).toBeLessThan(50);
    });

    test('should not leak memory with repeated processing', async () => {
      const testQuery = 'Samsung phone under 30000 with good camera';
      const iterations = 1000;
      
      const initialMemory = process.memoryUsage();
      
      // Process the same query many times
      for (let i = 0; i < iterations; i++) {
        await fallbackParser.parseQuery(testQuery);
        
        // Force garbage collection every 100 iterations if available
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;

      console.log(`Memory leak test (${iterations} iterations):
        Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB (${memoryIncreasePercent.toFixed(2)}%)
      `);

      // Should not have significant memory increase (less than 100%)
      expect(memoryIncreasePercent).toBeLessThan(100);
    });
  });

  describe('Integration Performance', () => {
    test('should provide fast fallback parsing', async () => {
      const testQueries = [
        'Samsung Galaxy under 40000',
        'iPhone with good camera',
        'Budget phone under 18000',
        'Gaming phone high performance',
        'Phone with long battery life'
      ];

      const results = [];

      for (const query of testQueries) {
        const startTime = Date.now();
        const result = await fallbackParser.parseQuery(query);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        results.push({
          query,
          responseTime
        });

        expect(responseTime).toBeLessThan(300); // Should be fast
        expect(result).toHaveProperty('type');
      }

      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      
      console.log(`Integration performance results:
        Average response time: ${averageResponseTime.toFixed(2)}ms
      `);

      expect(averageResponseTime).toBeLessThan(200);
    });

    test('should handle rapid successive requests efficiently', async () => {
      const rapidRequests = 20;
      const delay = 10; // 10ms between requests
      
      const results = [];
      
      for (let i = 0; i < rapidRequests; i++) {
        const startTime = Date.now();
        const result = await fallbackParser.parseQuery(`Rapid request ${i} Samsung phone`);
        const endTime = Date.now();
        
        results.push({
          index: i,
          responseTime: endTime - startTime
        });

        // Small delay between requests
        if (i < rapidRequests - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      const maxResponseTime = Math.max(...results.map(r => r.responseTime));
      
      console.log(`Rapid successive requests:
        Count: ${rapidRequests}
        Average response time: ${averageResponseTime.toFixed(2)}ms
        Max response time: ${maxResponseTime}ms
      `);

      expect(averageResponseTime).toBeLessThan(100);
      expect(maxResponseTime).toBeLessThan(200);
    });
  });

  describe('Query Complexity vs Performance', () => {
    test('should scale performance with query complexity', async () => {
      const complexityLevels = [
        {
          name: 'Simple',
          queries: ['Samsung phone', 'iPhone', 'Budget phone']
        },
        {
          name: 'Medium',
          queries: [
            'Samsung phone under 30000',
            'iPhone with good camera',
            'Budget phone under 20000 with decent battery'
          ]
        },
        {
          name: 'Complex',
          queries: [
            'Samsung or Apple phone with excellent camera, long battery life, under 60000 BDT',
            'Gaming phone with high performance processor, at least 8GB RAM, good display',
            'Professional phone for photography with multiple cameras, premium build, latest features'
          ]
        }
      ];

      const performanceResults = {};

      for (const level of complexityLevels) {
        const levelResults = [];
        
        for (const query of level.queries) {
          const startTime = Date.now();
          const result = await fallbackParser.parseQuery(query);
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          levelResults.push({
            query,
            responseTime,
            filterCount: Object.keys(result.filters || {}).length
          });
        }

        const averageResponseTime = levelResults.reduce((sum, r) => sum + r.responseTime, 0) / levelResults.length;
        const averageFilterCount = levelResults.reduce((sum, r) => sum + r.filterCount, 0) / levelResults.length;
        
        performanceResults[level.name] = {
          averageResponseTime,
          averageFilterCount,
          results: levelResults
        };

        console.log(`${level.name} queries:
          Average response time: ${averageResponseTime.toFixed(2)}ms
          Average filters extracted: ${averageFilterCount.toFixed(1)}
        `);
      }

      // Simple queries should be fastest
      expect(performanceResults.Simple.averageResponseTime).toBeLessThan(performanceResults.Medium.averageResponseTime);
      
      // Complex queries should extract more filters
      expect(performanceResults.Complex.averageFilterCount).toBeGreaterThan(performanceResults.Simple.averageFilterCount);
      
      // Even complex queries should be reasonably fast
      expect(performanceResults.Complex.averageResponseTime).toBeLessThan(300);
    });
  });
});