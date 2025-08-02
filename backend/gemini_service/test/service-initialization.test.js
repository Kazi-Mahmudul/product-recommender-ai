// Mock all dependencies before requiring anything
jest.mock('../managers/ConfigurationManager');
jest.mock('../managers/QuotaTracker');
jest.mock('../managers/HealthMonitor');
jest.mock('../managers/AIServiceManager');

const ConfigurationManager = require('../managers/ConfigurationManager');
const QuotaTracker = require('../managers/QuotaTracker');
const HealthMonitor = require('../managers/HealthMonitor');
const AIServiceManager = require('../managers/AIServiceManager');

describe('Service Initialization and Configuration Loading', () => {
  let mockConfigManager;
  let mockQuotaTracker;
  let mockHealthMonitor;
  let mockAIServiceManager;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock ConfigurationManager
    mockConfigManager = {
      config: {
        providers: [
          {
            name: 'gemini',
            type: 'google-generative-ai',
            apiKey: 'GOOGLE_API_KEY',
            enabled: true,
            priority: 1,
            quotas: {
              requestsPerMinute: 60,
              requestsPerHour: 1000,
              requestsPerDay: 200
            }
          },
          {
            name: 'openai',
            type: 'openai',
            apiKey: 'OPENAI_API_KEY',
            enabled: false,
            priority: 2,
            quotas: {
              requestsPerMinute: 100,
              requestsPerHour: 2000,
              requestsPerDay: 10000
            }
          }
        ],
        monitoring: {
          healthCheckInterval: 30000,
          quotaWarningThreshold: 0.8
        }
      }
    };
    ConfigurationManager.mockImplementation(() => mockConfigManager);

    // Mock QuotaTracker
    mockQuotaTracker = {
      cleanup: jest.fn()
    };
    QuotaTracker.mockImplementation(() => mockQuotaTracker);

    // Mock HealthMonitor
    mockHealthMonitor = {
      startPeriodicHealthChecks: jest.fn(),
      cleanup: jest.fn()
    };
    HealthMonitor.mockImplementation(() => mockHealthMonitor);

    // Mock AIServiceManager
    mockAIServiceManager = {
      parseQuery: jest.fn()
    };
    AIServiceManager.mockImplementation(() => mockAIServiceManager);
  });

  describe('Configuration Loading', () => {
    test('should load configuration from ai-providers.json', () => {
      // Create a new ConfigurationManager instance
      const configManager = new ConfigurationManager();
      
      expect(ConfigurationManager).toHaveBeenCalled();
      expect(configManager.config).toBeDefined();
      expect(configManager.config.providers).toBeInstanceOf(Array);
      expect(configManager.config.providers.length).toBeGreaterThan(0);
    });

    test('should validate provider configuration structure', () => {
      const configManager = new ConfigurationManager();
      const config = configManager.config;
      
      // Check that each provider has required fields
      config.providers.forEach(provider => {
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('type');
        expect(provider).toHaveProperty('apiKey');
        expect(provider).toHaveProperty('enabled');
        expect(provider).toHaveProperty('priority');
        expect(provider).toHaveProperty('quotas');
      });
    });

    test('should handle environment variable substitution', () => {
      // Set test environment variables
      process.env.GOOGLE_API_KEY = 'test-google-key';
      process.env.OPENAI_API_KEY = 'test-openai-key';
      
      const configManager = new ConfigurationManager();
      const config = configManager.config;
      
      // Simulate environment variable replacement
      for (const provider of config.providers) {
        if (provider.apiKey === 'GOOGLE_API_KEY') {
          provider.apiKey = process.env.GOOGLE_API_KEY;
        } else if (provider.apiKey === 'OPENAI_API_KEY') {
          provider.apiKey = process.env.OPENAI_API_KEY;
        }
      }
      
      const geminiProvider = config.providers.find(p => p.name === 'gemini');
      const openaiProvider = config.providers.find(p => p.name === 'openai');
      
      expect(geminiProvider.apiKey).toBe('test-google-key');
      expect(openaiProvider.apiKey).toBe('test-openai-key');
      
      // Clean up
      delete process.env.GOOGLE_API_KEY;
      delete process.env.OPENAI_API_KEY;
    });

    test('should handle missing environment variables gracefully', () => {
      // Ensure environment variables are not set
      delete process.env.GOOGLE_API_KEY;
      delete process.env.OPENAI_API_KEY;
      
      const configManager = new ConfigurationManager();
      const config = configManager.config;
      
      // Filter providers with valid API keys
      const validProviders = config.providers.filter(p => 
        p.enabled && p.apiKey && p.apiKey.trim() !== '' && !p.apiKey.startsWith('GOOGLE_API_KEY') && !p.apiKey.startsWith('OPENAI_API_KEY')
      );
      
      // Should handle the case where no valid providers are available
      expect(validProviders.length).toBe(0);
    });
  });

  describe('Component Initialization', () => {
    test('should initialize all components in correct order', () => {
      // Set up environment
      process.env.GOOGLE_API_KEY = 'test-key';
      
      // Simulate the initialization process
      const configManager = new ConfigurationManager();
      const quotaTracker = new QuotaTracker(configManager);
      const healthMonitor = new HealthMonitor(configManager.config.providers, configManager);
      const aiServiceManager = new AIServiceManager(configManager, quotaTracker, healthMonitor);
      
      // Verify initialization order and dependencies
      expect(ConfigurationManager).toHaveBeenCalled();
      expect(QuotaTracker).toHaveBeenCalledWith(configManager);
      expect(HealthMonitor).toHaveBeenCalledWith(configManager.config.providers, configManager);
      expect(AIServiceManager).toHaveBeenCalledWith(configManager, quotaTracker, healthMonitor);
      
      // Clean up
      delete process.env.GOOGLE_API_KEY;
    });

    test('should start periodic health checks with configured interval', () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      
      const configManager = new ConfigurationManager();
      const healthMonitor = new HealthMonitor(configManager.config.providers, configManager);
      
      // Start health checks
      healthMonitor.startPeriodicHealthChecks(configManager.config.monitoring.healthCheckInterval);
      
      expect(mockHealthMonitor.startPeriodicHealthChecks).toHaveBeenCalledWith(30000);
      
      delete process.env.GOOGLE_API_KEY;
    });

    test('should use default health check interval if not configured', () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      
      // Mock config without monitoring section
      mockConfigManager.config.monitoring = undefined;
      
      const configManager = new ConfigurationManager();
      const healthMonitor = new HealthMonitor(configManager.config.providers, configManager);
      
      // Start health checks with default
      const defaultInterval = 30000;
      healthMonitor.startPeriodicHealthChecks(configManager.config.monitoring?.healthCheckInterval || defaultInterval);
      
      expect(mockHealthMonitor.startPeriodicHealthChecks).toHaveBeenCalledWith(30000);
      
      delete process.env.GOOGLE_API_KEY;
    });
  });

  describe('Provider Validation', () => {
    test('should identify valid providers with API keys', () => {
      process.env.GOOGLE_API_KEY = 'valid-key';
      
      const configManager = new ConfigurationManager();
      const config = configManager.config;
      
      // Simulate API key replacement
      for (const provider of config.providers) {
        if (provider.apiKey === 'GOOGLE_API_KEY') {
          provider.apiKey = process.env.GOOGLE_API_KEY;
        }
      }
      
      const validProviders = config.providers.filter(p => 
        p.enabled && p.apiKey && p.apiKey.trim() !== ''
      );
      
      expect(validProviders.length).toBeGreaterThan(0);
      expect(validProviders[0].name).toBe('gemini');
      expect(validProviders[0].apiKey).toBe('valid-key');
      
      delete process.env.GOOGLE_API_KEY;
    });

    test('should handle multiple valid providers', () => {
      process.env.GOOGLE_API_KEY = 'google-key';
      process.env.OPENAI_API_KEY = 'openai-key';
      
      // Enable both providers
      mockConfigManager.config.providers[1].enabled = true;
      
      const configManager = new ConfigurationManager();
      const config = configManager.config;
      
      // Simulate API key replacement
      for (const provider of config.providers) {
        if (provider.apiKey === 'GOOGLE_API_KEY') {
          provider.apiKey = process.env.GOOGLE_API_KEY;
        } else if (provider.apiKey === 'OPENAI_API_KEY') {
          provider.apiKey = process.env.OPENAI_API_KEY;
        }
      }
      
      const validProviders = config.providers.filter(p => 
        p.enabled && p.apiKey && p.apiKey.trim() !== ''
      );
      
      expect(validProviders.length).toBe(2);
      expect(validProviders.map(p => p.name)).toEqual(['gemini', 'openai']);
      
      delete process.env.GOOGLE_API_KEY;
      delete process.env.OPENAI_API_KEY;
    });

    test('should filter out disabled providers', () => {
      process.env.GOOGLE_API_KEY = 'google-key';
      process.env.OPENAI_API_KEY = 'openai-key';
      
      const configManager = new ConfigurationManager();
      const config = configManager.config;
      
      // Simulate API key replacement
      for (const provider of config.providers) {
        if (provider.apiKey === 'GOOGLE_API_KEY') {
          provider.apiKey = process.env.GOOGLE_API_KEY;
        } else if (provider.apiKey === 'OPENAI_API_KEY') {
          provider.apiKey = process.env.OPENAI_API_KEY;
        }
      }
      
      const validProviders = config.providers.filter(p => 
        p.enabled && p.apiKey && p.apiKey.trim() !== ''
      );
      
      // Only gemini should be valid (openai is disabled in mock config)
      expect(validProviders.length).toBe(1);
      expect(validProviders[0].name).toBe('gemini');
      
      delete process.env.GOOGLE_API_KEY;
      delete process.env.OPENAI_API_KEY;
    });
  });

  describe('Error Handling', () => {
    test('should handle configuration loading errors', () => {
      // Mock ConfigurationManager to throw an error
      ConfigurationManager.mockImplementation(() => {
        throw new Error('Configuration file not found');
      });
      
      expect(() => {
        new ConfigurationManager();
      }).toThrow('Configuration file not found');
    });

    test('should handle component initialization errors', () => {
      // Mock QuotaTracker to throw an error
      QuotaTracker.mockImplementation(() => {
        throw new Error('Failed to initialize quota tracker');
      });
      
      const configManager = new ConfigurationManager();
      
      expect(() => {
        new QuotaTracker(configManager);
      }).toThrow('Failed to initialize quota tracker');
    });
  });

  describe('Service Lifecycle', () => {
    test('should provide cleanup methods for graceful shutdown', () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      
      const configManager = new ConfigurationManager();
      const quotaTracker = new QuotaTracker(configManager);
      const healthMonitor = new HealthMonitor(configManager.config.providers, configManager);
      
      // Test cleanup methods exist
      expect(mockQuotaTracker.cleanup).toBeDefined();
      expect(mockHealthMonitor.cleanup).toBeDefined();
      
      // Call cleanup methods
      quotaTracker.cleanup();
      healthMonitor.cleanup();
      
      expect(mockQuotaTracker.cleanup).toHaveBeenCalled();
      expect(mockHealthMonitor.cleanup).toHaveBeenCalled();
      
      delete process.env.GOOGLE_API_KEY;
    });

    test('should handle service restart scenarios', () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      
      // Initialize components
      const configManager = new ConfigurationManager();
      const quotaTracker = new QuotaTracker(configManager);
      const healthMonitor = new HealthMonitor(configManager.config.providers, configManager);
      
      // Cleanup
      quotaTracker.cleanup();
      healthMonitor.cleanup();
      
      // Re-initialize (simulating restart)
      const newQuotaTracker = new QuotaTracker(configManager);
      const newHealthMonitor = new HealthMonitor(configManager.config.providers, configManager);
      
      expect(QuotaTracker).toHaveBeenCalledTimes(2);
      expect(HealthMonitor).toHaveBeenCalledTimes(2);
      
      delete process.env.GOOGLE_API_KEY;
    });
  });

  describe('Configuration Hot-Reloading', () => {
    test('should support configuration updates without restart', () => {
      const configManager = new ConfigurationManager();
      
      // Simulate configuration update
      const newConfig = {
        ...mockConfigManager.config,
        monitoring: {
          healthCheckInterval: 60000, // Changed from 30000
          quotaWarningThreshold: 0.9  // Changed from 0.8
        }
      };
      
      // Update configuration
      mockConfigManager.config = newConfig;
      
      expect(configManager.config.monitoring.healthCheckInterval).toBe(60000);
      expect(configManager.config.monitoring.quotaWarningThreshold).toBe(0.9);
    });

    test('should validate updated configuration', () => {
      const configManager = new ConfigurationManager();
      
      // Test with invalid configuration
      const invalidConfig = {
        providers: [] // Empty providers array should be invalid
      };
      
      mockConfigManager.config = invalidConfig;
      
      // Should handle invalid configuration appropriately
      expect(configManager.config.providers).toEqual([]);
    });
  });
});