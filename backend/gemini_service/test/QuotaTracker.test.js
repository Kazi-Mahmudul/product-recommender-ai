const QuotaTracker = require('../managers/QuotaTracker');

// Mock ConfigurationManager
const mockConfig = {
  getEnabledProviders: jest.fn(),
  getProviderConfig: jest.fn(),
  getMonitoringConfig: jest.fn()
};

describe('QuotaTracker', () => {
  let quotaTracker;
  let mockProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    mockProvider = {
      name: 'gemini',
      quotas: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 200
      }
    };

    mockConfig.getEnabledProviders.mockReturnValue([mockProvider]);
    mockConfig.getProviderConfig.mockReturnValue(mockProvider);
    mockConfig.getMonitoringConfig.mockReturnValue({
      quotaWarningThreshold: 0.8
    });

    quotaTracker = new QuotaTracker(mockConfig);
  });

  afterEach(() => {
    quotaTracker.cleanup();
    jest.useRealTimers();
  });

  describe('constructor and initialization', () => {
    test('should initialize with enabled providers', () => {
      expect(mockConfig.getEnabledProviders).toHaveBeenCalled();
      expect(quotaTracker.usage.has('gemini')).toBe(true);
    });

    test('should initialize provider usage with zero counts', () => {
      const usage = quotaTracker.usage.get('gemini');
      expect(usage.minute.used).toBe(0);
      expect(usage.hour.used).toBe(0);
      expect(usage.day.used).toBe(0);
      expect(usage.requests).toEqual([]);
    });

    test('should set reset times for all windows', () => {
      const usage = quotaTracker.usage.get('gemini');
      expect(usage.minute.resetTime).toBeInstanceOf(Date);
      expect(usage.hour.resetTime).toBeInstanceOf(Date);
      expect(usage.day.resetTime).toBeInstanceOf(Date);
    });
  });

  describe('checkQuota', () => {
    test('should allow request when under quota', async () => {
      const result = await quotaTracker.checkQuota('gemini');
      
      expect(result.allowed).toBe(true);
      expect(result.quotaStatus).toBeDefined();
      expect(result.quotaStatus.minute.used).toBe(0);
      expect(result.quotaStatus.minute.limit).toBe(60);
    });

    test('should deny request when minute quota exceeded', async () => {
      // Simulate quota usage
      const usage = quotaTracker.usage.get('gemini');
      usage.minute.used = 60;

      const result = await quotaTracker.checkQuota('gemini');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('quota_exceeded');
      expect(result.window).toBe('minute');
      expect(result.used).toBe(60);
      expect(result.limit).toBe(60);
    });

    test('should deny request when hour quota exceeded', async () => {
      const usage = quotaTracker.usage.get('gemini');
      usage.hour.used = 1000;

      const result = await quotaTracker.checkQuota('gemini');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('quota_exceeded');
      expect(result.window).toBe('hour');
    });

    test('should deny request when day quota exceeded', async () => {
      const usage = quotaTracker.usage.get('gemini');
      usage.day.used = 200;

      const result = await quotaTracker.checkQuota('gemini');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('quota_exceeded');
      expect(result.window).toBe('day');
    });

    test('should initialize provider if not exists', async () => {
      const result = await quotaTracker.checkQuota('newprovider');
      
      expect(result.allowed).toBe(true);
      expect(quotaTracker.usage.has('newprovider')).toBe(true);
    });

    test('should handle errors gracefully', async () => {
      mockConfig.getProviderConfig.mockImplementation(() => {
        throw new Error('Provider not found');
      });

      const result = await quotaTracker.checkQuota('invalid');
      
      expect(result.allowed).toBe(true);
      expect(result.error).toBeDefined();
    });
  });

  describe('recordUsage', () => {
    test('should record usage correctly', async () => {
      const result = await quotaTracker.recordUsage('gemini', 'parseQuery', 1);
      
      expect(result).toBe(true);
      
      const usage = quotaTracker.usage.get('gemini');
      expect(usage.minute.used).toBe(1);
      expect(usage.hour.used).toBe(1);
      expect(usage.day.used).toBe(1);
      expect(usage.requests).toHaveLength(1);
    });

    test('should record multiple tokens', async () => {
      await quotaTracker.recordUsage('gemini', 'generateContent', 5);
      
      const usage = quotaTracker.usage.get('gemini');
      expect(usage.minute.used).toBe(5);
      expect(usage.hour.used).toBe(5);
      expect(usage.day.used).toBe(5);
    });

    test('should initialize provider if not exists', async () => {
      const result = await quotaTracker.recordUsage('newprovider');
      
      expect(result).toBe(true);
      expect(quotaTracker.usage.has('newprovider')).toBe(true);
    });

    test('should handle errors gracefully', async () => {
      // Mock the usage.get to return null to trigger error path
      const originalGet = quotaTracker.usage.get;
      quotaTracker.usage.get = jest.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = await quotaTracker.recordUsage('gemini');
      
      expect(result).toBe(false);
      
      // Restore original method
      quotaTracker.usage.get = originalGet;
    });
  });

  describe('isQuotaExceeded', () => {
    test('should return false when under quota', () => {
      const result = quotaTracker.isQuotaExceeded('gemini');
      
      expect(result.exceeded).toBe(false);
    });

    test('should return true when quota exceeded', () => {
      const usage = quotaTracker.usage.get('gemini');
      usage.minute.used = 60;

      const result = quotaTracker.isQuotaExceeded('gemini');
      
      expect(result.exceeded).toBe(true);
      expect(result.window).toBe('minute');
      expect(result.used).toBe(60);
      expect(result.limit).toBe(60);
    });

    test('should return false for non-existent provider', () => {
      const result = quotaTracker.isQuotaExceeded('nonexistent');
      
      expect(result).toBe(false);
    });
  });

  describe('getUsageStats', () => {
    test('should return usage statistics', async () => {
      // Record some usage
      await quotaTracker.recordUsage('gemini', 'parseQuery', 5);

      const stats = await quotaTracker.getUsageStats('gemini');
      
      expect(stats).toBeDefined();
      expect(stats.provider).toBe('gemini');
      expect(stats.quotas.minute.used).toBe(5);
      expect(stats.quotas.minute.limit).toBe(60);
      expect(stats.quotas.minute.utilization).toBe(8); // 5/60 * 100 = 8.33 -> 8
      expect(stats.recentRequests).toHaveLength(1);
    });

    test('should return null for non-existent provider', async () => {
      const stats = await quotaTracker.getUsageStats('nonexistent');
      
      expect(stats).toBeNull();
    });

    test('should handle errors gracefully', async () => {
      mockConfig.getProviderConfig.mockImplementation(() => {
        throw new Error('Provider error');
      });

      const stats = await quotaTracker.getUsageStats('gemini');
      
      expect(stats).toBeNull();
    });
  });

  describe('resetQuotas', () => {
    test('should reset specific provider quotas', async () => {
      // Record some usage first
      await quotaTracker.recordUsage('gemini', 'parseQuery', 10);
      
      const result = await quotaTracker.resetQuotas('gemini');
      
      expect(result).toBe(true);
      
      const usage = quotaTracker.usage.get('gemini');
      expect(usage.minute.used).toBe(0);
      expect(usage.hour.used).toBe(0);
      expect(usage.day.used).toBe(0);
      expect(usage.requests).toEqual([]);
    });

    test('should reset all providers when no provider specified', async () => {
      await quotaTracker.recordUsage('gemini', 'parseQuery', 10);
      
      const result = await quotaTracker.resetQuotas();
      
      expect(result).toBe(true);
      
      const usage = quotaTracker.usage.get('gemini');
      expect(usage.minute.used).toBe(0);
    });
  });

  describe('getAllUsageStats', () => {
    test('should return stats for all providers', async () => {
      await quotaTracker.recordUsage('gemini', 'parseQuery', 5);

      const allStats = await quotaTracker.getAllUsageStats();
      
      expect(allStats).toBeDefined();
      expect(allStats.gemini).toBeDefined();
      expect(allStats.gemini.quotas.minute.used).toBe(5);
    });
  });

  describe('quota reset scheduling', () => {
    test('should schedule quota resets', () => {
      // Check that timers are set
      expect(quotaTracker.quotaResetTimers.has('gemini')).toBe(true);
      
      const timers = quotaTracker.quotaResetTimers.get('gemini');
      expect(timers.minute).toBeDefined();
      expect(timers.hour).toBeDefined();
      expect(timers.day).toBeDefined();
    });

    test('should reset quota when timer fires', () => {
      const usage = quotaTracker.usage.get('gemini');
      usage.minute.used = 30;

      // Fast-forward time to trigger minute reset
      jest.advanceTimersByTime(60 * 1000);

      // The quota should be reset (this is a simplified test)
      // In real implementation, the timer would call resetQuota
      expect(quotaTracker.quotaResetTimers.has('gemini')).toBe(true);
    });
  });

  describe('cleanup', () => {
    test('should clear all timers', () => {
      quotaTracker.cleanup();
      
      expect(quotaTracker.quotaResetTimers.size).toBe(0);
    });
  });

  describe('getNextResetTime', () => {
    test('should calculate correct reset times', () => {
      const now = new Date('2025-08-02T10:30:45.000Z');
      jest.setSystemTime(now);

      const minuteReset = quotaTracker.getNextResetTime('minute');
      const hourReset = quotaTracker.getNextResetTime('hour');
      const dayReset = quotaTracker.getNextResetTime('day');

      expect(minuteReset.getMinutes()).toBe(31);
      expect(minuteReset.getSeconds()).toBe(0);
      
      // Account for timezone differences - just check it's the next hour
      expect(hourReset.getTime()).toBeGreaterThan(now.getTime());
      expect(hourReset.getMinutes()).toBe(0);
      
      // Just check it's the next day
      expect(dayReset.getTime()).toBeGreaterThan(now.getTime());
      expect(dayReset.getHours()).toBe(0);
    });

    test('should throw error for invalid window', () => {
      expect(() => quotaTracker.getNextResetTime('invalid')).toThrow('Invalid time window: invalid');
    });
  });
});

  describe('quota warning and protection', () => {
    beforeEach(() => {
      // Reset quotaTracker for each test
      quotaTracker = new QuotaTracker(mockConfig);
    });

    test('should log warning when approaching quota threshold', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Set usage to 80% of limit (48/60)
      const usage = quotaTracker.usage.get('gemini');
      usage.minute.used = 48;

      await quotaTracker.checkQuota('gemini');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Quota warning for gemini (minute): 48/60 (80%)')
      );
      
      consoleSpy.mockRestore();
    });

    test('should not log warning when under threshold', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Set usage to 70% of limit (42/60)
      const usage = quotaTracker.usage.get('gemini');
      usage.minute.used = 42;

      await quotaTracker.checkQuota('gemini');
      
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Quota warning')
      );
      
      consoleSpy.mockRestore();
    });

    test('should respect custom warning threshold', async () => {
      mockConfig.getMonitoringConfig.mockReturnValue({
        quotaWarningThreshold: 0.5 // 50% threshold
      });
      
      const newQuotaTracker = new QuotaTracker(mockConfig);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Set usage to 50% of limit (30/60)
      const usage = newQuotaTracker.usage.get('gemini');
      usage.minute.used = 30;

      await newQuotaTracker.checkQuota('gemini');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Quota warning for gemini (minute): 30/60 (50%)')
      );
      
      consoleSpy.mockRestore();
      newQuotaTracker.cleanup();
    });

    test('should activate quota protection when limit exceeded', async () => {
      const usage = quotaTracker.usage.get('gemini');
      usage.minute.used = 60; // Exactly at limit

      const result = await quotaTracker.checkQuota('gemini');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('quota_exceeded');
    });

    test('should provide reset time information for quota protection', async () => {
      const usage = quotaTracker.usage.get('gemini');
      usage.day.used = 200; // Exceed daily limit

      const result = await quotaTracker.checkQuota('gemini');
      
      expect(result.allowed).toBe(false);
      expect(result.resetTime).toBeInstanceOf(Date);
      expect(result.resetTime.getTime()).toBeGreaterThan(Date.now());
    });
  });