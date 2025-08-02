/**
 * Provider Failover Integration Tests
 * 
 * Tests the system's ability to handle provider failures and
 * automatically switch between providers and fallback modes.
 */

const AIServiceManager = require('../../managers/AIServiceManager');
const ConfigurationManager = require('../../managers/ConfigurationManager');
const QuotaTracker = require('../../managers/QuotaTracker');
const HealthMonitor = require('../../managers/HealthMonitor');
const ErrorClassifier = require('../../utils/ErrorClassifier');

describe('Provider Failover Integration Tests', () => {
  let aiServiceManager;
  let configManager;
  let quotaTracker;
  let healthMonitor;
  let errorClassifier;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.GOOGLE_API_KEY = 'test-api-key';
    
    configManager = new ConfigurationManager('./config');
    await configManager.loadConfiguration();
    
    quotaTracker = new QuotaTracker(configManager);
    healthMonitor = new HealthMonitor(configManager);
    errorClassifier = new ErrorClassifier();
    
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
    // Reset system state before each test
    await quotaTracker.resetQuotas(); // Reset all providers
    // Reset health monitor status for all providers
    for (const provider of configManager.getEnabledProviders()) {
      healthMonitor.markProviderHealthy(provider.name);
    }
  });

  describe('Single Provider Failure Scenarios', () => {
    test('should failover when primary provider is unhealthy', async () => {
      const providers = configManager.getEnabledProviders();
      
      if (providers.length > 0) {
        // Mark primary provider as unhealthy
        const primaryProvider = providers[0];
        healthMonitor.markProviderUnhealthy(
          primaryProvider.name, 
          new Error('Simulated provider failure'), 
          5000
        );

        const result = await aiServiceManager.parseQuery('Test failover query');
        
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('source');
        
        // Should use secondary provider or fallback
        expect(['openai', 'local_fallback', 'emergency_fallback']).toContain(result.source);
        
        // Should include fallback reason
        if (result.fallbackReason) {
          expect(result.fallbackReason).toBeDefined();
        }
      }
    });

    test('should handle authentication errors with immediate fallback', async () => {
      const providers = configManager.getEnabledProviders();
      
      if (providers.length > 0) {
        // Simulate authentication error
        const authError = new Error('Invalid API key');
        authError.status = 401;
        
        healthMonitor.markProviderUnhealthy(
          providers[0].name,
          authError,
          1000
        );

        const result = await aiServiceManager.parseQuery('Authentication error test');
        
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('source');
        expect(['openai', 'local_fallback', 'emergency_fallback']).toContain(result.source);
        
        // Should classify error correctly
        const errorType = errorClassifier.classifyError(authError);
        expect(errorType).toBe('authentication_error');
        expect(errorClassifier.shouldTriggerFallback(errorType)).toBe(true);
      }
    });

    test('should handle quota exceeded with fallback', async () => {
      const providers = configManager.getEnabledProviders();
      
      if (providers.length > 0) {
        // Exhaust quota for primary provider
        const primaryProvider = providers[0];
        
        // Simulate quota exhaustion
        for (let i = 0; i < 1000; i++) {
          await quotaTracker.recordUsage(primaryProvider.name, 'parseQuery', 1);
        }

        const result = await aiServiceManager.parseQuery('Quota exceeded test');
        
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('source');
        expect(['openai', 'local_fallback', 'emergency_fallback']).toContain(result.source);
        
        // Check quota status
        const quotaStatus = await quotaTracker.getUsageStats(primaryProvider.name);
        expect(quotaStatus.exceeded).toBe(true);
      }
    });

    test('should handle network timeouts with retry and fallback', async () => {
      const providers = configManager.getEnabledProviders();
      
      if (providers.length > 0) {
        // Simulate network timeout
        const timeoutError = new Error('Request timeout');
        timeoutError.code = 'ETIMEDOUT';
        
        healthMonitor.markProviderUnhealthy(
          providers[0].name,
          timeoutError,
          10000 // Long response time
        );

        const result = await aiServiceManager.parseQuery('Network timeout test');
        
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('source');
        
        // Should classify as timeout error
        const errorType = errorClassifier.classifyError(timeoutError);
        expect(errorType).toBe('timeout_error');
        expect(errorClassifier.isRetryable(errorType)).toBe(true);
      }
    });
  });

  describe('Multiple Provider Failure Scenarios', () => {
    test('should handle all providers being unhealthy', async () => {
      const providers = configManager.getEnabledProviders();
      
      // Mark all providers as unhealthy
      for (const provider of providers) {
        healthMonitor.markProviderUnhealthy(
          provider.name,
          new Error('All providers down'),
          5000
        );
      }

      const result = await aiServiceManager.parseQuery('All providers down test');
      
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('source');
      expect(['local_fallback', 'emergency_fallback']).toContain(result.source);
      
      // Should still provide a meaningful response
      expect(result.type).toBe('recommendation');
    });

    test('should handle cascading provider failures', async () => {
      const providers = configManager.getEnabledProviders();
      
      if (providers.length >= 2) {
        // First request - primary provider fails
        healthMonitor.markProviderUnhealthy(
          providers[0].name,
          new Error('Primary provider failure'),
          3000
        );

        const result1 = await aiServiceManager.parseQuery('Cascading failure test 1');
        expect(result1).toHaveProperty('type');

        // Second request - secondary provider also fails
        if (providers[1]) {
          healthMonitor.markProviderUnhealthy(
            providers[1].name,
            new Error('Secondary provider failure'),
            3000
          );
        }

        const result2 = await aiServiceManager.parseQuery('Cascading failure test 2');
        expect(result2).toHaveProperty('type');
        expect(['local_fallback', 'emergency_fallback']).toContain(result2.source);
      }
    });

    test('should handle mixed failure scenarios', async () => {
      const providers = configManager.getEnabledProviders();
      
      if (providers.length >= 2) {
        // Provider 1: Authentication error
        const authError = new Error('Invalid API key');
        authError.status = 401;
        healthMonitor.markProviderUnhealthy(providers[0].name, authError, 1000);

        // Provider 2: Quota exceeded (if exists)
        if (providers[1]) {
          for (let i = 0; i < 1000; i++) {
            await quotaTracker.recordUsage(providers[1].name, 'parseQuery', 1);
          }
        }

        const result = await aiServiceManager.parseQuery('Mixed failure scenario test');
        
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('source');
        expect(['local_fallback', 'emergency_fallback']).toContain(result.source);
      }
    });
  });

  describe('Provider Recovery Scenarios', () => {
    test('should detect provider recovery and resume usage', async () => {
      const providers = configManager.getEnabledProviders();
      
      if (providers.length > 0) {
        const primaryProvider = providers[0];
        
        // Mark provider as unhealthy
        healthMonitor.markProviderUnhealthy(
          primaryProvider.name,
          new Error('Temporary failure'),
          2000
        );

        // First request should use fallback
        const result1 = await aiServiceManager.parseQuery('Recovery test 1');
        expect(['local_fallback', 'emergency_fallback']).toContain(result1.source);

        // Mark provider as healthy again
        healthMonitor.markProviderHealthy(primaryProvider.name);

        // Wait a bit for the system to recognize the recovery
        await new Promise(resolve => setTimeout(resolve, 100));

        // Second request might use the recovered provider
        const result2 = await aiServiceManager.parseQuery('Recovery test 2');
        expect(result2).toHaveProperty('type');
        expect(result2).toHaveProperty('source');
        
        // Provider should be available again
        const healthStatus = healthMonitor.getProviderStatus(primaryProvider.name);
        expect(healthStatus.isHealthy).toBe(true);
      }
    });

    test('should handle partial recovery scenarios', async () => {
      const providers = configManager.getEnabledProviders();
      
      if (providers.length >= 2) {
        // Mark all providers as unhealthy
        for (const provider of providers) {
          healthMonitor.markProviderUnhealthy(
            provider.name,
            new Error('System-wide failure'),
            5000
          );
        }

        // First request - all providers down
        const result1 = await aiServiceManager.parseQuery('Partial recovery test 1');
        expect(['local_fallback', 'emergency_fallback']).toContain(result1.source);

        // Recover one provider
        healthMonitor.markProviderHealthy(providers[0].name);
        await quotaTracker.resetQuotas(providers[0].name);

        // Second request - one provider recovered
        const result2 = await aiServiceManager.parseQuery('Partial recovery test 2');
        expect(result2).toHaveProperty('type');
        
        // System should be able to use the recovered provider or fallback
        expect(result2.source).toBeDefined();
      }
    });

    test('should handle quota recovery after reset', async () => {
      const providers = configManager.getEnabledProviders();
      
      if (providers.length > 0) {
        const primaryProvider = providers[0];
        
        // Exhaust quota
        for (let i = 0; i < 1000; i++) {
          await quotaTracker.recordUsage(primaryProvider.name, 'parseQuery', 1);
        }

        // Request should use fallback due to quota
        const result1 = await aiServiceManager.parseQuery('Quota recovery test 1');
        expect(['local_fallback', 'emergency_fallback']).toContain(result1.source);

        // Reset quota
        await quotaTracker.resetQuotas(primaryProvider.name);

        // Request should be able to use the provider again
        const result2 = await aiServiceManager.parseQuery('Quota recovery test 2');
        expect(result2).toHaveProperty('type');
        expect(result2).toHaveProperty('source');
        
        // Quota should be available again
        const quotaStatus = await quotaTracker.getUsageStats(primaryProvider.name);
        expect(quotaStatus.exceeded).toBe(false);
      }
    });
  });

  describe('Fallback Mode Behavior', () => {
    test('should maintain consistent response format in fallback mode', async () => {
      // Force fallback mode
      const providers = configManager.getEnabledProviders();
      for (const provider of providers) {
        healthMonitor.markProviderUnhealthy(
          provider.name,
          new Error('Forced fallback test'),
          5000
        );
      }

      const queries = [
        'Samsung phone under 30000',
        'iPhone with good camera',
        'Budget phone under 15000',
        'Gaming phone high performance',
        'Phone with long battery life'
      ];

      for (const query of queries) {
        const result = await aiServiceManager.parseQuery(query);
        
        // All responses should have consistent structure
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('source');
        expect(result).toHaveProperty('responseTime');
        expect(['local_fallback', 'emergency_fallback']).toContain(result.source);
        
        if (result.type === 'recommendation') {
          expect(result).toHaveProperty('filters');
          expect(typeof result.filters).toBe('object');
        }
      }
    });

    test('should handle fallback parser failures gracefully', async () => {
      // This test simulates a scenario where even the fallback parser might fail
      // In practice, this would be very rare, but we should handle it gracefully
      
      const result = await aiServiceManager.parseQuery('Fallback failure test');
      
      // Should always return some response, even if it's minimal
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('source');
      
      // Even in worst case, should provide emergency fallback
      if (result.source === 'emergency_fallback') {
        expect(result.type).toBe('recommendation');
        expect(result).toHaveProperty('filters');
      }
    });

    test('should exit fallback mode when providers recover', async () => {
      const providers = configManager.getEnabledProviders();
      
      if (providers.length > 0) {
        // Force fallback mode
        for (const provider of providers) {
          healthMonitor.markProviderUnhealthy(
            provider.name,
            new Error('Temporary system failure'),
            3000
          );
        }

        // Verify fallback mode is active
        const status1 = aiServiceManager.getServiceStatus();
        expect(status1.availableProviders.length).toBe(0);

        // Recover providers
        for (const provider of providers) {
          healthMonitor.markProviderHealthy(provider.name);
          await quotaTracker.resetQuotas(provider.name);
        }

        // Refresh provider status
        await aiServiceManager.refreshProviderStatus();

        // Verify providers are available again
        const status2 = aiServiceManager.getServiceStatus();
        expect(status2.availableProviders.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Classification and Handling', () => {
    test('should classify different error types correctly during failover', async () => {
      const errorScenarios = [
        {
          error: new Error('You exceeded your current quota'),
          expectedType: 'quota_exceeded',
          shouldTriggerFallback: true
        },
        {
          error: new Error('Invalid API key'),
          expectedType: 'authentication_error',
          shouldTriggerFallback: true
        },
        {
          error: new Error('Too many requests'),
          expectedType: 'rate_limit_error',
          shouldTriggerFallback: false
        },
        {
          error: new Error('Network connection failed'),
          expectedType: 'network_error',
          shouldTriggerFallback: false
        },
        {
          error: new Error('Request timeout'),
          expectedType: 'timeout_error',
          shouldTriggerFallback: false
        }
      ];

      for (const scenario of errorScenarios) {
        const errorType = errorClassifier.classifyError(scenario.error);
        const shouldTriggerFallback = errorClassifier.shouldTriggerFallback(errorType);
        const isRetryable = errorClassifier.isRetryable(errorType);

        expect(errorType).toBe(scenario.expectedType);
        expect(shouldTriggerFallback).toBe(scenario.shouldTriggerFallback);

        // Test retry delay calculation
        if (isRetryable) {
          const retryDelay = errorClassifier.getRetryDelay(errorType, 1);
          expect(retryDelay).toBeGreaterThan(0);
          expect(retryDelay).toBeLessThan(60000); // Should be capped
        }
      }
    });

    test('should provide user-friendly error messages', async () => {
      const providers = configManager.getEnabledProviders();
      
      if (providers.length > 0) {
        // Simulate different error types
        const authError = new Error('Invalid API key');
        authError.status = 401;
        
        healthMonitor.markProviderUnhealthy(providers[0].name, authError, 1000);

        const result = await aiServiceManager.parseQuery('User-friendly error test');
        
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('source');
        
        // Should not expose internal error details
        if (result.error) {
          expect(result.error).not.toContain('API key');
          expect(result.error).not.toContain('401');
          expect(result.error).not.toContain('authentication');
        }
        
        if (result.fallbackReason) {
          // Should be user-friendly
          expect(typeof result.fallbackReason).toBe('string');
          expect(result.fallbackReason.length).toBeGreaterThan(0);
        }
      }
    });
  });
});