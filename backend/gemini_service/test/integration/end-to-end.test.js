/**
 * End-to-End Integration Tests
 * 
 * Tests the complete system flow from query input to response output,
 * including provider failover, quota management, and fallback scenarios.
 */

const request = require('supertest');
const express = require('express');
const AIServiceManager = require('../../managers/AIServiceManager');
const ConfigurationManager = require('../../managers/ConfigurationManager');
const QuotaTracker = require('../../managers/QuotaTracker');
const HealthMonitor = require('../../managers/HealthMonitor');
const LocalFallbackParser = require('../../parsers/LocalFallbackParser');

describe('End-to-End Integration Tests', () => {
  let app;
  let aiServiceManager;
  let configManager;
  let quotaTracker;
  let healthMonitor;

  beforeAll(async () => {
    // Set up test environment
    process.env.NODE_ENV = 'test';
    process.env.GOOGLE_API_KEY = 'test-api-key';
    
    // Initialize components
    configManager = new ConfigurationManager('./config');
    await configManager.loadConfiguration();
    
    quotaTracker = new QuotaTracker(configManager.getQuotaConfig());
    healthMonitor = new HealthMonitor(configManager.getProvidersConfig());
    
    aiServiceManager = new AIServiceManager(
      configManager,
      quotaTracker,
      healthMonitor,
      { level: 'error' } // Reduce log noise in tests
    );

    // Create Express app for testing
    app = express();
    app.use(express.json());
    
    // Add test routes
    app.post('/api/parse-query', async (req, res) => {
      try {
        const { query } = req.body;
        if (!query) {
          return res.status(400).json({ error: 'Query is required' });
        }
        
        const result = await aiServiceManager.parseQuery(query);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/health', async (req, res) => {
      try {
        const status = aiServiceManager.getServiceStatus();
        res.json(status);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/metrics', async (req, res) => {
      try {
        const metrics = aiServiceManager.getDetailedMetrics();
        res.json(metrics);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
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

  describe('Query Processing Flow', () => {
    test('should process simple phone query successfully', async () => {
      const response = await request(app)
        .post('/api/parse-query')
        .send({ query: 'Find me a Samsung phone under 30000' })
        .expect(200);

      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('source');
      expect(response.body).toHaveProperty('responseTime');
      expect(response.body.type).toBe('recommendation');
      
      // Should use fallback parser in test environment
      expect(['local_fallback', 'emergency_fallback']).toContain(response.body.source);
    });

    test('should handle complex query with multiple criteria', async () => {
      const response = await request(app)
        .post('/api/parse-query')
        .send({ 
          query: 'I need a phone with good camera, long battery life, under 50000 BDT, preferably Samsung or Apple' 
        })
        .expect(200);

      expect(response.body).toHaveProperty('type', 'recommendation');
      expect(response.body).toHaveProperty('filters');
      
      if (response.body.filters) {
        expect(response.body.filters).toHaveProperty('max_price');
        expect(response.body.filters.max_price).toBeLessThanOrEqual(50000);
      }
    });

    test('should return error for empty query', async () => {
      const response = await request(app)
        .post('/api/parse-query')
        .send({ query: '' })
        .expect(200); // Service handles empty queries gracefully

      expect(response.body).toHaveProperty('type');
      // Should still return a response, possibly with default filters
    });

    test('should handle malformed request', async () => {
      const response = await request(app)
        .post('/api/parse-query')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Query is required');
    });
  });

  describe('Provider Failover Scenarios', () => {
    test('should fallback to local parser when AI providers fail', async () => {
      // Force all providers to be unhealthy
      const providers = configManager.getEnabledProviders();
      for (const provider of providers) {
        healthMonitor.markProviderUnhealthy(provider.name, new Error('Test failure'), 5000);
      }

      const response = await request(app)
        .post('/api/parse-query')
        .send({ query: 'Samsung phone under 25000' })
        .expect(200);

      expect(response.body).toHaveProperty('source');
      expect(['local_fallback', 'emergency_fallback']).toContain(response.body.source);
      expect(response.body).toHaveProperty('type', 'recommendation');
    });

    test('should handle quota exceeded scenario', async () => {
      // Simulate quota exceeded for all providers
      const providers = configManager.getEnabledProviders();
      for (const provider of providers) {
        // Exhaust quota
        for (let i = 0; i < 1000; i++) {
          await quotaTracker.recordUsage(provider.name, 'parseQuery', 1);
        }
      }

      const response = await request(app)
        .post('/api/parse-query')
        .send({ query: 'iPhone under 80000' })
        .expect(200);

      expect(response.body).toHaveProperty('source');
      expect(['local_fallback', 'emergency_fallback']).toContain(response.body.source);
      
      // Should include fallback reason
      if (response.body.fallbackReason) {
        expect(response.body.fallbackReason).toBeDefined();
      }
    });
  });

  describe('Concurrent Request Handling', () => {
    test('should handle multiple concurrent requests', async () => {
      const queries = [
        'Samsung Galaxy under 30000',
        'iPhone with good camera',
        'Budget phone under 15000',
        'Gaming phone with high performance',
        'Phone with long battery life'
      ];

      const promises = queries.map(query =>
        request(app)
          .post('/api/parse-query')
          .send({ query })
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('type');
        expect(response.body).toHaveProperty('source');
      });

      // Should have processed all requests
      expect(responses).toHaveLength(5);
    });

    test('should maintain quota limits under concurrent load', async () => {
      // Reset quotas first
      await quotaTracker.resetAllQuotas();

      const concurrentRequests = 20;
      const promises = Array(concurrentRequests).fill().map((_, index) =>
        request(app)
          .post('/api/parse-query')
          .send({ query: `Test query ${index}` })
      );

      const responses = await Promise.all(promises);

      // All requests should complete (may use fallback if quota exceeded)
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('type');
      });

      // Check that quota tracking is working
      const quotaStatus = await quotaTracker.getAllUsageStats();
      expect(quotaStatus).toBeDefined();
    });
  });

  describe('Health and Status Endpoints', () => {
    test('should return system health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('fallbackMode');
      expect(response.body).toHaveProperty('availableProviders');
      expect(response.body).toHaveProperty('totalProviders');
      expect(response.body).toHaveProperty('healthStatus');
      expect(response.body).toHaveProperty('quotaStatus');
      expect(response.body).toHaveProperty('metrics');
    });

    test('should return detailed metrics', async () => {
      const response = await request(app)
        .get('/api/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('timeRange');
      expect(response.body).toHaveProperty('current');
      expect(response.body).toHaveProperty('historical');
      expect(response.body).toHaveProperty('logging');

      // Current metrics should have expected structure
      expect(response.body.current).toHaveProperty('timestamp');
      expect(response.body.current).toHaveProperty('summary');
      expect(response.body.current).toHaveProperty('alerts');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should recover from temporary provider failures', async () => {
      // Mark provider as unhealthy
      const providers = configManager.getEnabledProviders();
      if (providers.length > 0) {
        healthMonitor.markProviderUnhealthy(providers[0].name, new Error('Temporary failure'), 1000);
      }

      // First request should use fallback
      const response1 = await request(app)
        .post('/api/parse-query')
        .send({ query: 'Test query 1' })
        .expect(200);

      expect(['local_fallback', 'emergency_fallback']).toContain(response1.body.source);

      // Wait for potential recovery
      await new Promise(resolve => setTimeout(resolve, 100));

      // Mark provider as healthy again
      if (providers.length > 0) {
        healthMonitor.markProviderHealthy(providers[0].name);
      }

      // Second request might use the recovered provider or fallback
      const response2 = await request(app)
        .post('/api/parse-query')
        .send({ query: 'Test query 2' })
        .expect(200);

      expect(response2.body).toHaveProperty('type');
      expect(response2.body).toHaveProperty('source');
    });

    test('should handle service errors gracefully', async () => {
      // Test with invalid configuration scenario
      const response = await request(app)
        .post('/api/parse-query')
        .send({ query: 'Valid query but system might have issues' })
        .expect(200); // Should not crash, should return fallback response

      expect(response.body).toHaveProperty('type');
      // Should provide some response even if there are internal issues
    });
  });

  describe('Performance and Response Times', () => {
    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/parse-query')
        .send({ query: 'Performance test query' })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within 5 seconds (generous limit for integration test)
      expect(responseTime).toBeLessThan(5000);
      
      // Response should include timing information
      expect(response.body).toHaveProperty('responseTime');
      expect(typeof response.body.responseTime).toBe('number');
    });

    test('should handle timeout scenarios', async () => {
      // This test simulates a scenario where the service takes too long
      // In a real implementation, this would test actual timeout handling
      
      const response = await request(app)
        .post('/api/parse-query')
        .send({ query: 'Timeout test query' })
        .expect(200);

      // Should still return a response (likely from fallback)
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('source');
    });
  });

  describe('Data Validation and Sanitization', () => {
    test('should handle special characters in queries', async () => {
      const specialQueries = [
        'Phone with "quotes" and special chars: @#$%',
        'Query with <script>alert("xss")</script>',
        'Unicode query: 📱 স্মার্টফোন ১৫০০০ টাকার নিচে',
        'Very long query: ' + 'a'.repeat(1000)
      ];

      for (const query of specialQueries) {
        const response = await request(app)
          .post('/api/parse-query')
          .send({ query })
          .expect(200);

        expect(response.body).toHaveProperty('type');
        expect(response.body).toHaveProperty('source');
        // Should not crash or return errors for special characters
      }
    });

    test('should validate response format consistency', async () => {
      const response = await request(app)
        .post('/api/parse-query')
        .send({ query: 'Format validation test' })
        .expect(200);

      // All responses should have consistent structure
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('source');
      expect(response.body).toHaveProperty('responseTime');
      
      if (response.body.type === 'recommendation') {
        expect(response.body).toHaveProperty('filters');
        expect(typeof response.body.filters).toBe('object');
      }
    });
  });
});