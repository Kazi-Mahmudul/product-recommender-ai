const HealthMonitor = require('../managers/HealthMonitor');

// Mock configuration
const mockConfig = {
  getProviderConfig: jest.fn()
};

describe('HealthMonitor', () => {
  let healthMonitor;
  let mockProviders;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    mockProviders = [
      { name: 'gemini', enabled: true },
      { name: 'openai', enabled: true }
    ];

    mockConfig.getProviderConfig.mockImplementation((name) => ({
      name,
      apiKey: 'test-api-key',
      enabled: true
    }));

    healthMonitor = new HealthMonitor(mockProviders, mockConfig);
  });

  afterEach(() => {
    healthMonitor.cleanup();
    jest.useRealTimers();
  });

  describe('constructor and initialization', () => {
    test('should initialize with providers', () => {
      expect(healthMonitor.providerStatus.has('gemini')).toBe(true);
      expect(healthMonitor.providerStatus.has('openai')).toBe(true);
    });

    test('should initialize provider status as available', () => {
      const status = healthMonitor.providerStatus.get('gemini');
      expect(status.status).toBe('available');
      expect(status.errorCount).toBe(0);
      expect(status.consecutiveErrors).toBe(0);
      expect(status.healthHistory).toEqual([]);
    });
  });

  describe('checkProviderHealth', () => {
    test('should mark provider as healthy on successful check', async () => {
      const result = await healthMonitor.checkProviderHealth('gemini');
      
      expect(result.healthy).toBe(true);
      expect(result.provider).toBe('gemini');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      
      const status = healthMonitor.providerStatus.get('gemini');
      expect(status.status).toBe('available');
      expect(status.consecutiveErrors).toBe(0);
    });

    test('should mark provider as unhealthy on failed check', async () => {
      mockConfig.getProviderConfig.mockReturnValue({
        name: 'gemini',
        apiKey: '', // Empty API key should cause failure
        enabled: true
      });

      const result = await healthMonitor.checkProviderHealth('gemini');
      
      expect(result.healthy).toBe(false);
      expect(result.error).toBeDefined();
      
      const status = healthMonitor.providerStatus.get('gemini');
      expect(status.consecutiveErrors).toBe(1);
      expect(status.currentError).toBeDefined();
    });

    test('should initialize provider if not exists', async () => {
      const result = await healthMonitor.checkProviderHealth('newprovider');
      
      expect(healthMonitor.providerStatus.has('newprovider')).toBe(true);
      expect(result.provider).toBe('newprovider');
    });

    test('should handle errors gracefully', async () => {
      mockConfig.getProviderConfig.mockImplementation(() => {
        throw new Error('Configuration error');
      });

      const result = await healthMonitor.checkProviderHealth('gemini');
      
      expect(result.healthy).toBe(false);
      expect(result.error.message).toBe('Configuration error');
    });
  });

  describe('performHealthCheck', () => {
    test('should return healthy for valid configuration', async () => {
      const providerConfig = {
        name: 'gemini',
        apiKey: 'valid-key',
        enabled: true
      };

      const result = await healthMonitor.performHealthCheck(providerConfig);
      
      expect(result.healthy).toBe(true);
    });

    test('should return unhealthy for missing API key', async () => {
      const providerConfig = {
        name: 'gemini',
        apiKey: '',
        enabled: true
      };

      const result = await healthMonitor.performHealthCheck(providerConfig);
      
      expect(result.healthy).toBe(false);
      expect(result.error.message).toBe('API key is missing or empty');
    });

    test('should return unhealthy for disabled provider', async () => {
      const providerConfig = {
        name: 'gemini',
        apiKey: 'valid-key',
        enabled: false
      };

      const result = await healthMonitor.performHealthCheck(providerConfig);
      
      expect(result.healthy).toBe(false);
      expect(result.error.message).toBe('Provider is disabled in configuration');
    });
  });

  describe('markProviderHealthy', () => {
    test('should update status to available', () => {
      healthMonitor.markProviderHealthy('gemini', 100);
      
      const status = healthMonitor.providerStatus.get('gemini');
      expect(status.status).toBe('available');
      expect(status.consecutiveErrors).toBe(0);
      expect(status.responseTime).toBe(100);
      expect(status.currentError).toBeNull();
    });

    test('should add entry to health history', () => {
      healthMonitor.markProviderHealthy('gemini', 100);
      
      const status = healthMonitor.providerStatus.get('gemini');
      expect(status.healthHistory).toHaveLength(1);
      expect(status.healthHistory[0].healthy).toBe(true);
      expect(status.healthHistory[0].responseTime).toBe(100);
    });

    test('should limit health history to 10 entries', () => {
      // Add 15 entries
      for (let i = 0; i < 15; i++) {
        healthMonitor.markProviderHealthy('gemini', 100);
      }
      
      const status = healthMonitor.providerStatus.get('gemini');
      expect(status.healthHistory).toHaveLength(10);
    });
  });

  describe('markProviderUnhealthy', () => {
    test('should increment error counts', () => {
      const error = new Error('Test error');
      healthMonitor.markProviderUnhealthy('gemini', error, 0);
      
      const status = healthMonitor.providerStatus.get('gemini');
      expect(status.errorCount).toBe(1);
      expect(status.consecutiveErrors).toBe(1);
      expect(status.status).toBe('degraded');
    });

    test('should mark as unavailable after 3 consecutive errors', () => {
      const error = new Error('Test error');
      
      // First two errors should mark as degraded
      healthMonitor.markProviderUnhealthy('gemini', error, 0);
      healthMonitor.markProviderUnhealthy('gemini', error, 0);
      expect(healthMonitor.providerStatus.get('gemini').status).toBe('degraded');
      
      // Third error should mark as unavailable
      healthMonitor.markProviderUnhealthy('gemini', error, 0);
      expect(healthMonitor.providerStatus.get('gemini').status).toBe('unavailable');
    });

    test('should classify error types correctly', () => {
      const quotaError = new Error('Quota exceeded');
      healthMonitor.markProviderUnhealthy('gemini', quotaError, 0);
      
      const status = healthMonitor.providerStatus.get('gemini');
      expect(status.currentError.type).toBe('quota_exceeded');
    });
  });

  describe('classifyError', () => {
    test('should classify quota errors', () => {
      const error = new Error('Quota exceeded');
      const type = healthMonitor.classifyError(error);
      expect(type).toBe('quota_exceeded');
    });

    test('should classify authentication errors', () => {
      const error = new Error('Authentication failed');
      const type = healthMonitor.classifyError(error);
      expect(type).toBe('authentication_error');
    });

    test('should classify network errors', () => {
      const error = new Error('Network timeout');
      const type = healthMonitor.classifyError(error);
      expect(type).toBe('network_error');
    });

    test('should classify unknown errors', () => {
      const error = new Error('Something went wrong');
      const type = healthMonitor.classifyError(error);
      expect(type).toBe('unknown_error');
    });
  });

  describe('getProviderStatus', () => {
    test('should return provider status', () => {
      const status = healthMonitor.getProviderStatus('gemini');
      
      expect(status).toBeDefined();
      expect(status.provider).toBe('gemini');
      expect(status.status).toBe('available');
      expect(status.errorCount).toBe(0);
    });

    test('should return null for non-existent provider', () => {
      const status = healthMonitor.getProviderStatus('nonexistent');
      expect(status).toBeNull();
    });

    test('should return a copy of health history', () => {
      healthMonitor.markProviderHealthy('gemini', 100);
      const status = healthMonitor.getProviderStatus('gemini');
      
      // Modify the returned history
      status.healthHistory.push({ test: true });
      
      // Original should be unchanged
      const originalStatus = healthMonitor.providerStatus.get('gemini');
      expect(originalStatus.healthHistory).toHaveLength(1);
      expect(originalStatus.healthHistory[0].test).toBeUndefined();
    });
  });

  describe('getAllProviderStatus', () => {
    test('should return status for all providers', () => {
      const allStatus = healthMonitor.getAllProviderStatus();
      
      expect(allStatus).toHaveProperty('gemini');
      expect(allStatus).toHaveProperty('openai');
      expect(allStatus.gemini.status).toBe('available');
      expect(allStatus.openai.status).toBe('available');
    });
  });

  describe('isProviderAvailable', () => {
    test('should return true for available provider', () => {
      expect(healthMonitor.isProviderAvailable('gemini')).toBe(true);
    });

    test('should return false for unavailable provider', () => {
      const error = new Error('Test error');
      // Mark as unavailable by causing 3 consecutive errors
      healthMonitor.markProviderUnhealthy('gemini', error, 0);
      healthMonitor.markProviderUnhealthy('gemini', error, 0);
      healthMonitor.markProviderUnhealthy('gemini', error, 0);
      
      expect(healthMonitor.isProviderAvailable('gemini')).toBe(false);
    });

    test('should return false for non-existent provider', () => {
      expect(healthMonitor.isProviderAvailable('nonexistent')).toBe(false);
    });
  });

  describe('getAvailableProviders', () => {
    test('should return list of available providers', () => {
      const available = healthMonitor.getAvailableProviders();
      expect(available).toEqual(['gemini', 'openai']);
    });

    test('should exclude unavailable providers', () => {
      const error = new Error('Test error');
      // Mark gemini as unavailable
      healthMonitor.markProviderUnhealthy('gemini', error, 0);
      healthMonitor.markProviderUnhealthy('gemini', error, 0);
      healthMonitor.markProviderUnhealthy('gemini', error, 0);
      
      const available = healthMonitor.getAvailableProviders();
      expect(available).toEqual(['openai']);
    });
  });

  describe('performHealthChecks', () => {
    test('should check health for all providers', async () => {
      const results = await healthMonitor.performHealthChecks();
      
      expect(results).toHaveLength(2);
      expect(results[0].provider).toBe('gemini');
      expect(results[1].provider).toBe('openai');
      expect(results[0].healthy).toBe(true);
      expect(results[1].healthy).toBe(true);
    });

    test('should handle errors for individual providers', async () => {
      mockConfig.getProviderConfig.mockImplementation((name) => {
        if (name === 'gemini') {
          throw new Error('Configuration error');
        }
        return { name, apiKey: 'test-key', enabled: true };
      });

      const results = await healthMonitor.performHealthChecks();
      
      expect(results).toHaveLength(2);
      expect(results[0].healthy).toBe(false);
      expect(results[1].healthy).toBe(true);
    });
  });

  describe('scheduleRecoveryCheck', () => {
    test('should schedule recovery check with exponential backoff', () => {
      const status = healthMonitor.providerStatus.get('gemini');
      status.consecutiveErrors = 2;
      
      healthMonitor.scheduleRecoveryCheck('gemini');
      
      expect(status.nextRetry).toBeInstanceOf(Date);
      expect(status.nextRetry.getTime()).toBeGreaterThan(Date.now());
      expect(healthMonitor.healthCheckTimers.has('gemini')).toBe(true);
    });

    test('should clear existing timer before scheduling new one', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      // Schedule first check
      healthMonitor.scheduleRecoveryCheck('gemini');
      const firstTimer = healthMonitor.healthCheckTimers.get('gemini');
      
      // Schedule second check
      healthMonitor.scheduleRecoveryCheck('gemini');
      
      expect(clearTimeoutSpy).toHaveBeenCalledWith(firstTimer);
    });
  });

  describe('forceMarkAvailable', () => {
    test('should manually mark provider as available', () => {
      const error = new Error('Test error');
      // First mark as unavailable
      healthMonitor.markProviderUnhealthy('gemini', error, 0);
      healthMonitor.markProviderUnhealthy('gemini', error, 0);
      healthMonitor.markProviderUnhealthy('gemini', error, 0);
      
      // Then force mark as available
      healthMonitor.forceMarkAvailable('gemini');
      
      const status = healthMonitor.providerStatus.get('gemini');
      expect(status.status).toBe('available');
      expect(status.consecutiveErrors).toBe(0);
      expect(status.currentError).toBeNull();
    });

    test('should clear recovery timer', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      // Schedule recovery check
      healthMonitor.scheduleRecoveryCheck('gemini');
      const timer = healthMonitor.healthCheckTimers.get('gemini');
      
      // Force mark available
      healthMonitor.forceMarkAvailable('gemini');
      
      expect(clearTimeoutSpy).toHaveBeenCalledWith(timer);
      expect(healthMonitor.healthCheckTimers.has('gemini')).toBe(false);
    });
  });

  describe('forceMarkUnavailable', () => {
    test('should manually mark provider as unavailable', () => {
      healthMonitor.forceMarkUnavailable('gemini', 'Maintenance mode');
      
      const status = healthMonitor.providerStatus.get('gemini');
      expect(status.status).toBe('unavailable');
      expect(status.currentError.message).toBe('Maintenance mode');
      expect(status.currentError.type).toBe('manual_intervention');
    });
  });

  describe('periodic health checks', () => {
    test('should start periodic health checks', () => {
      const timer = healthMonitor.startPeriodicHealthChecks(5000);
      
      expect(timer).toBeDefined();
      expect(healthMonitor.periodicTimer).toBe(timer);
    });

    test('should stop periodic health checks', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      healthMonitor.startPeriodicHealthChecks(5000);
      const timer = healthMonitor.periodicTimer;
      
      healthMonitor.stopPeriodicHealthChecks();
      
      expect(clearIntervalSpy).toHaveBeenCalledWith(timer);
      expect(healthMonitor.periodicTimer).toBeNull();
    });
  });

  describe('cleanup', () => {
    test('should clear all timers', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      // Set up some timers
      healthMonitor.scheduleRecoveryCheck('gemini');
      healthMonitor.startPeriodicHealthChecks(5000);
      
      healthMonitor.cleanup();
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(healthMonitor.healthCheckTimers.size).toBe(0);
      expect(healthMonitor.periodicTimer).toBeNull();
    });
  });
});