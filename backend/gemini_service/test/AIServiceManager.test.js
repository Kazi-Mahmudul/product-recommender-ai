const AIServiceManager = require('../managers/AIServiceManager');
const ConfigurationManager = require('../managers/ConfigurationManager');
const QuotaTracker = require('../managers/QuotaTracker');
const HealthMonitor = require('../managers/HealthMonitor');

// Mock the LocalFallbackParser
jest.mock('../parsers/LocalFallbackParser', () => {
  return jest.fn().mockImplementation(() => ({
    parseQuery: jest.fn().mockResolvedValue({
      type: "recommendation",
      filters: { limit: 10 },
      source: "local_fallback",
      confidence: 0.7
    })
  }));
});

describe('AIServiceManager', () => {
  let aiServiceManager;
  let mockConfig;
  let mockQuotaTracker;
  let mockHealthMonitor;

  const mockProviders = [
    {
      name: 'gemini',
      type: 'google-generative-ai',
      apiKey: 'test-key-1',
      priority: 1,
      enabled: true,
      model: 'gemini-2.0-flash'
    },
    {
      name: 'openai',
      type: 'openai',
      apiKey: 'test-key-2',
      priority: 2,
      enabled: true,
      model: 'gpt-3.5-turbo'
    }
  ];

  beforeEach(() => {
    // Mock ConfigurationManager
    mockConfig = {
      getEnabledProviders: jest.fn().mockReturnValue(mockProviders),
      getProviderConfig: jest.fn().mockImplementation((name) => 
        mockProviders.find(p => p.name === name)
      )
    };

    // Mock QuotaTracker
    mockQuotaTracker = {
      checkQuota: jest.fn().mockResolvedValue({ allowed: true }),
      recordUsage: jest.fn().mockResolvedValue(true),
      isQuotaExceeded: jest.fn().mockReturnValue({ exceeded: false }),
      getAllUsageStats: jest.fn().mockReturnValue({})
    };

    // Mock HealthMonitor
    mockHealthMonitor = {
      isProviderAvailable: jest.fn().mockReturnValue(true),
      markProviderUnhealthy: jest.fn(),
      getAllProviderStatus: jest.fn().mockReturnValue({}),
      performHealthChecks: jest.fn().mockResolvedValue([])
    };

    aiServiceManager = new AIServiceManager(mockConfig, mockQuotaTracker, mockHealthMonitor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with provided dependencies', () => {
      expect(aiServiceManager.config).toBe(mockConfig);
      expect(aiServiceManager.quotaTracker).toBe(mockQuotaTracker);
      expect(aiServiceManager.healthMonitor).toBe(mockHealthMonitor);
      expect(aiServiceManager.fallbackMode).toBe(false);
      expect(aiServiceManager.currentProvider).toBeNull();
    });
  });

  describe('parseQuery', () => {
    test('should successfully parse query with first available provider', async () => {
      const query = 'Samsung phones under 30000';
      const result = await aiServiceManager.parseQuery(query);

      expect(result.type).toBe('recommendation');
      expect(['gemini', 'openai']).toContain(result.source); // Accept either provider
      expect(result.responseTime).toBeGreaterThan(0);
      expect(mockQuotaTracker.checkQuota).toHaveBeenCalled();
      expect(mockQuotaTracker.recordUsage).toHaveBeenCalled();
      expect(mockHealthMonitor.isProviderAvailable).toHaveBeenCalled();
    });

    test('should fallback to second provider when first fails quota check', async () => {
      mockQuotaTracker.checkQuota
        .mockResolvedValueOnce({ allowed: false, reason: 'quota_exceeded' })
        .mockResolvedValueOnce({ allowed: true });

      const query = 'iPhone under 50000';
      const result = await aiServiceManager.parseQuery(query);

      expect(result.source).toBe('openai');
      expect(mockQuotaTracker.checkQuota).toHaveBeenCalledTimes(2);
      expect(mockQuotaTracker.checkQuota).toHaveBeenNthCalledWith(1, 'gemini', 'parseQuery');
      expect(mockQuotaTracker.checkQuota).toHaveBeenNthCalledWith(2, 'openai', 'parseQuery');
    });

    test('should fallback to second provider when first is unhealthy', async () => {
      mockHealthMonitor.isProviderAvailable
        .mockReturnValueOnce(false)  // First call in getAvailableProviders for gemini
        .mockReturnValueOnce(true)   // Second call in getAvailableProviders for openai
        .mockReturnValueOnce(true);  // Third call during actual provider selection for openai

      const query = 'gaming phones';
      const result = await aiServiceManager.parseQuery(query);

      expect(result.source).toBe('openai');
      expect(mockHealthMonitor.isProviderAvailable).toHaveBeenCalledTimes(3);
    });

    test('should use fallback parser when all providers fail', async () => {
      mockQuotaTracker.checkQuota.mockResolvedValue({ allowed: false, reason: 'quota_exceeded' });

      const query = 'budget phones';
      const result = await aiServiceManager.parseQuery(query);

      expect(result.source).toBe('local_fallback');
      expect(result.fallbackReason).toContain('Quota exceeded');
      expect(aiServiceManager.fallbackParser.parseQuery).toHaveBeenCalledWith(query);
    });

    test('should use fallback parser when no providers available', async () => {
      mockConfig.getEnabledProviders.mockReturnValue([]);

      const query = 'phones under 20000';
      const result = await aiServiceManager.parseQuery(query);

      expect(result.source).toBe('local_fallback');
      expect(aiServiceManager.fallbackMode).toBe(true);
    });

    test('should use fallback parser when in fallback mode', async () => {
      aiServiceManager.enableFallbackMode();

      const query = 'premium phones';
      const result = await aiServiceManager.parseQuery(query);

      expect(result.source).toBe('local_fallback');
      expect(mockQuotaTracker.checkQuota).not.toHaveBeenCalled();
    });

    test('should handle provider request errors gracefully', async () => {
      // Mock makeProviderRequest to throw error for first provider
      const originalMakeRequest = aiServiceManager.makeProviderRequest;
      aiServiceManager.makeProviderRequest = jest.fn()
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          type: "recommendation",
          filters: { limit: 10 },
          confidence: 0.85
        });

      const query = 'test query';
      const result = await aiServiceManager.parseQuery(query);

      expect(result.source).toBe('openai');
      expect(mockHealthMonitor.markProviderUnhealthy).toHaveBeenCalledWith(
        'gemini',
        expect.any(Error),
        expect.any(Number)
      );

      // Restore original method
      aiServiceManager.makeProviderRequest = originalMakeRequest;
    });

    test('should return emergency fallback when everything fails', async () => {
      mockConfig.getEnabledProviders.mockReturnValue([]);
      aiServiceManager.fallbackParser.parseQuery.mockRejectedValue(new Error('Fallback failed'));

      const query = 'test query';
      const result = await aiServiceManager.parseQuery(query);

      expect(result.source).toBe('emergency_fallback');
      expect(result.confidence).toBe(0.1);
      expect(result.error).toContain('All systems failed');
    });
  });

  describe('makeProviderRequest', () => {
    test('should handle Gemini provider requests', async () => {
      // Use a test API key that will trigger simulation mode
      const provider = { ...mockProviders[0], apiKey: 'TEST_SIMULATED_KEY' };
      const query = 'test query';

      const result = await aiServiceManager.makeProviderRequest(provider, query);

      expect(result.type).toBe('recommendation');
      expect(result.confidence).toBe(0.9);
      expect(result.filters).toBeDefined();
    });

    test('should handle OpenAI provider requests', async () => {
      const provider = mockProviders[1];
      const query = 'test query';

      const result = await aiServiceManager.makeProviderRequest(provider, query);

      expect(result.type).toBe('recommendation');
      expect(result.confidence).toBe(0.85);
      expect(result.filters).toBeDefined();
    });

    test('should throw error for unsupported provider type', async () => {
      const provider = { ...mockProviders[0], type: 'unsupported' };
      const query = 'test query';

      await expect(aiServiceManager.makeProviderRequest(provider, query))
        .rejects.toThrow('Unsupported provider type: unsupported');
    });

    test('should simulate quota exceeded error for Gemini', async () => {
      const provider = { ...mockProviders[0], apiKey: 'TEST_QUOTA_EXCEEDED' };
      const query = 'test query';

      await expect(aiServiceManager.makeProviderRequest(provider, query))
        .rejects.toThrow('You exceeded your current quota');
    });

    test('should simulate auth error for Gemini', async () => {
      const provider = { ...mockProviders[0], apiKey: 'TEST_AUTH_ERROR' };
      const query = 'test query';

      await expect(aiServiceManager.makeProviderRequest(provider, query))
        .rejects.toThrow('Invalid API key');
    });
  });

  describe('getAvailableProviders', () => {
    test('should return healthy providers with available quota', () => {
      const result = aiServiceManager.getAvailableProviders();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('gemini');
      expect(result[1].name).toBe('openai');
      expect(mockHealthMonitor.isProviderAvailable).toHaveBeenCalledTimes(2);
      expect(mockQuotaTracker.isQuotaExceeded).toHaveBeenCalledTimes(2);
    });

    test('should filter out unhealthy providers', () => {
      mockHealthMonitor.isProviderAvailable
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const result = aiServiceManager.getAvailableProviders();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('openai');
    });

    test('should filter out providers with exceeded quota', () => {
      mockQuotaTracker.isQuotaExceeded
        .mockReturnValueOnce({ exceeded: true })
        .mockReturnValueOnce({ exceeded: false });

      const result = aiServiceManager.getAvailableProviders();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('openai');
    });

    test('should return empty array when config fails', () => {
      mockConfig.getEnabledProviders.mockImplementation(() => {
        throw new Error('Config error');
      });

      const result = aiServiceManager.getAvailableProviders();

      expect(result).toHaveLength(0);
    });
  });

  describe('switchToNextProvider', () => {
    test('should switch to next available provider', () => {
      aiServiceManager.currentProvider = 'gemini';

      const result = aiServiceManager.switchToNextProvider();

      expect(result.name).toBe('openai');
      expect(aiServiceManager.currentProvider).toBe('openai');
    });

    test('should wrap around to first provider', () => {
      aiServiceManager.currentProvider = 'openai';

      const result = aiServiceManager.switchToNextProvider();

      expect(result.name).toBe('gemini');
      expect(aiServiceManager.currentProvider).toBe('gemini');
    });

    test('should enable fallback mode when no providers available', () => {
      mockConfig.getEnabledProviders.mockReturnValue([]);

      const result = aiServiceManager.switchToNextProvider();

      expect(result).toBeNull();
      expect(aiServiceManager.fallbackMode).toBe(true);
    });

    test('should select first provider when current not found', () => {
      aiServiceManager.currentProvider = 'unknown';

      const result = aiServiceManager.switchToNextProvider();

      expect(result.name).toBe('gemini');
      expect(aiServiceManager.currentProvider).toBe('gemini');
    });
  });

  describe('fallback mode management', () => {
    test('should enable fallback mode', () => {
      aiServiceManager.enableFallbackMode();

      expect(aiServiceManager.fallbackMode).toBe(true);
      expect(aiServiceManager.currentProvider).toBeNull();
    });

    test('should disable fallback mode', () => {
      aiServiceManager.enableFallbackMode();
      aiServiceManager.disableFallbackMode();

      expect(aiServiceManager.fallbackMode).toBe(false);
    });

    test('should not log multiple times when already in fallback mode', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      aiServiceManager.enableFallbackMode();
      aiServiceManager.enableFallbackMode();

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      consoleSpy.mockRestore();
    });
  });

  describe('generateContent', () => {
    test('should generate content with available provider', async () => {
      const prompt = 'Generate a product description';
      const result = await aiServiceManager.generateContent(prompt);

      expect(result.content).toContain('Generated content for: Generate a product description');
      expect(result.source).toBe('gemini');
      expect(mockQuotaTracker.checkQuota).toHaveBeenCalledWith('gemini', 'generateContent');
      expect(mockQuotaTracker.recordUsage).toHaveBeenCalledWith('gemini', 'generateContent', 1);
    });

    test('should throw error when in fallback mode', async () => {
      aiServiceManager.enableFallbackMode();

      await expect(aiServiceManager.generateContent('test prompt'))
        .rejects.toThrow('Content generation not available in fallback mode');
    });

    test('should throw error when no providers available', async () => {
      mockConfig.getEnabledProviders.mockReturnValue([]);

      await expect(aiServiceManager.generateContent('test prompt'))
        .rejects.toThrow('No providers available for content generation');
    });

    test('should try next provider when first fails quota check', async () => {
      mockQuotaTracker.checkQuota
        .mockResolvedValueOnce({ allowed: false })
        .mockResolvedValueOnce({ allowed: true });

      const result = await aiServiceManager.generateContent('test prompt');

      expect(result.source).toBe('openai');
      expect(mockQuotaTracker.checkQuota).toHaveBeenCalledTimes(2);
    });
  });

  describe('getServiceStatus', () => {
    test('should return comprehensive service status', () => {
      aiServiceManager.currentProvider = 'gemini';
      aiServiceManager.fallbackMode = false;

      const status = aiServiceManager.getServiceStatus();

      expect(status.timestamp).toBeDefined();
      expect(status.fallbackMode).toBe(false);
      expect(status.currentProvider).toBe('gemini');
      expect(status.availableProviders).toEqual(['gemini', 'openai']);
      expect(status.totalProviders).toBe(2);
      expect(status.healthStatus).toBeDefined();
      expect(status.quotaStatus).toBeDefined();
    });
  });

  describe('refreshProviderStatus', () => {
    test('should refresh provider status and exit fallback mode if providers available', async () => {
      aiServiceManager.enableFallbackMode();

      const status = await aiServiceManager.refreshProviderStatus();

      expect(mockHealthMonitor.performHealthChecks).toHaveBeenCalled();
      expect(aiServiceManager.fallbackMode).toBe(false);
      expect(aiServiceManager.currentProvider).toBe('gemini');
      expect(status.fallbackMode).toBe(false);
    });

    test('should remain in fallback mode if no providers available', async () => {
      aiServiceManager.enableFallbackMode();
      mockConfig.getEnabledProviders.mockReturnValue([]);

      const status = await aiServiceManager.refreshProviderStatus();

      expect(aiServiceManager.fallbackMode).toBe(true);
      expect(aiServiceManager.currentProvider).toBeNull();
      expect(status.fallbackMode).toBe(true);
    });
  });

  describe('parseQueryToFilters', () => {
    test('should extract price from query', () => {
      const filters = aiServiceManager.parseQueryToFilters('phones under 25000');
      
      expect(filters.max_price).toBe(25000);
      expect(filters.limit).toBe(10);
    });

    test('should extract brand from query', () => {
      const filters = aiServiceManager.parseQueryToFilters('samsung galaxy phones');
      
      expect(filters.brand).toBe('Samsung');
      expect(filters.limit).toBe(10);
    });

    test('should extract both price and brand', () => {
      const filters = aiServiceManager.parseQueryToFilters('apple phones under 80000');
      
      expect(filters.max_price).toBe(80000);
      expect(filters.brand).toBe('Apple');
      expect(filters.limit).toBe(10);
    });

    test('should return basic filters for generic query', () => {
      const filters = aiServiceManager.parseQueryToFilters('good phones');
      
      expect(filters.limit).toBe(10);
      expect(filters.max_price).toBeUndefined();
      expect(filters.brand).toBeUndefined();
    });
  });

  describe('utility methods', () => {
    test('getCurrentProvider should return current provider', () => {
      aiServiceManager.currentProvider = 'gemini';
      expect(aiServiceManager.getCurrentProvider()).toBe('gemini');
    });

    test('isFallbackMode should return fallback mode status', () => {
      expect(aiServiceManager.isFallbackMode()).toBe(false);
      aiServiceManager.enableFallbackMode();
      expect(aiServiceManager.isFallbackMode()).toBe(true);
    });
  });
});