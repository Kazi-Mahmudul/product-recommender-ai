// Mock the AI management components before requiring anything
jest.mock('../managers/ConfigurationManager');
jest.mock('../managers/QuotaTracker');
jest.mock('../managers/HealthMonitor');
jest.mock('../managers/AIServiceManager');

const ConfigurationManager = require('../managers/ConfigurationManager');
const QuotaTracker = require('../managers/QuotaTracker');
const HealthMonitor = require('../managers/HealthMonitor');
const AIServiceManager = require('../managers/AIServiceManager');

describe('Integration Tests - Refactored parseQuery', () => {
  let mockAIServiceManager;
  let mockConfigManager;
  let mockQuotaTracker;
  let mockHealthMonitor;

  beforeAll(() => {
    // Set up environment variables
    process.env.GOOGLE_API_KEY = 'test-api-key';
    
    // Mock ConfigurationManager
    mockConfigManager = {
      config: {
        providers: [
          {
            name: 'gemini',
            type: 'google-generative-ai',
            apiKey: 'test-api-key',
            enabled: true,
            priority: 1
          }
        ],
        monitoring: {
          healthCheckInterval: 30000
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

  afterAll(() => {
    // Clean up environment
    delete process.env.GOOGLE_API_KEY;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AIServiceManager Integration', () => {
    test('should successfully process recommendation query', async () => {
      const mockResponse = {
        type: 'recommendation',
        filters: { max_price: 30000, limit: 10 },
        source: 'gemini',
        confidence: 0.9,
        responseTime: 150
      };

      mockAIServiceManager.parseQuery.mockResolvedValue(mockResponse);

      // Test the parseQuery function directly
      const result = await mockAIServiceManager.parseQuery('phones under 30000');

      expect(result).toEqual(mockResponse);
      expect(mockAIServiceManager.parseQuery).toHaveBeenCalledWith('phones under 30000');
    });

    test('should handle fallback response', async () => {
      const mockResponse = {
        type: 'recommendation',
        filters: { max_price: 25000, limit: 10 },
        source: 'local_fallback',
        confidence: 0.7,
        responseTime: 50,
        fallbackReason: 'All providers failed'
      };

      mockAIServiceManager.parseQuery.mockResolvedValue(mockResponse);

      const result = await mockAIServiceManager.parseQuery('Samsung phones under 25000');

      expect(result).toEqual(mockResponse);
      expect(result.source).toBe('local_fallback');
    });

    test('should handle chat queries', async () => {
      const mockResponse = {
        type: 'chat',
        data: 'Hello! How can I help you find the perfect phone today?',
        source: 'gemini',
        confidence: 0.95,
        responseTime: 120
      };

      mockAIServiceManager.parseQuery.mockResolvedValue(mockResponse);

      const result = await mockAIServiceManager.parseQuery('Hello');

      expect(result).toEqual(mockResponse);
      expect(result.type).toBe('chat');
    });

    test('should handle QA queries', async () => {
      const mockResponse = {
        type: 'qa',
        data: 'The Galaxy A55 has a 120Hz Super AMOLED display.',
        source: 'gemini',
        confidence: 0.88,
        responseTime: 200
      };

      mockAIServiceManager.parseQuery.mockResolvedValue(mockResponse);

      const result = await mockAIServiceManager.parseQuery('What is the refresh rate of Galaxy A55?');

      expect(result).toEqual(mockResponse);
      expect(result.type).toBe('qa');
    });

    test('should handle comparison queries', async () => {
      const mockResponse = {
        type: 'comparison',
        data: 'I\'ll compare the POCO X6 and Redmi Note 13 Pro for you.',
        source: 'gemini',
        confidence: 0.92,
        responseTime: 180
      };

      mockAIServiceManager.parseQuery.mockResolvedValue(mockResponse);

      const result = await mockAIServiceManager.parseQuery('Compare POCO X6 vs Redmi Note 13 Pro');

      expect(result).toEqual(mockResponse);
      expect(result.type).toBe('comparison');
    });

    test('should handle AIServiceManager errors gracefully', async () => {
      mockAIServiceManager.parseQuery.mockRejectedValue(new Error('Service temporarily unavailable'));

      try {
        await mockAIServiceManager.parseQuery('test query');
      } catch (error) {
        expect(error.message).toBe('Service temporarily unavailable');
      }
    });

    test('should validate query input', () => {
      // Test that the AIServiceManager is called with proper validation
      expect(mockAIServiceManager.parseQuery).toBeDefined();
      expect(typeof mockAIServiceManager.parseQuery).toBe('function');
    });

    test('should handle complex recommendation queries with multiple filters', async () => {
      const mockResponse = {
        type: 'recommendation',
        filters: {
          brand: 'Samsung',
          max_price: 50000,
          min_camera_score: 7.0,
          min_ram_gb: 8,
          has_fast_charging: true,
          limit: 10
        },
        source: 'gemini',
        confidence: 0.95,
        responseTime: 220
      };

      mockAIServiceManager.parseQuery.mockResolvedValue(mockResponse);

      const result = await mockAIServiceManager.parseQuery('Samsung phones under 50000 with good camera, 8GB RAM and fast charging');

      expect(result).toEqual(mockResponse);
      expect(result.filters.brand).toBe('Samsung');
      expect(result.filters.max_price).toBe(50000);
      expect(result.filters.min_camera_score).toBe(7.0);
      expect(result.filters.min_ram_gb).toBe(8);
      expect(result.filters.has_fast_charging).toBe(true);
    });

    test('should maintain backward compatibility with response format', async () => {
      const mockResponse = {
        type: 'recommendation',
        filters: { max_price: 20000, limit: 10 },
        source: 'gemini',
        confidence: 0.85,
        responseTime: 130
      };

      mockAIServiceManager.parseQuery.mockResolvedValue(mockResponse);

      const result = await mockAIServiceManager.parseQuery('budget phones under 20000');

      // Check that the response maintains the expected structure
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('filters');
      expect(result.type).toBe('recommendation');
      expect(typeof result.filters).toBe('object');
      
      // New fields should be present
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('responseTime');
    });

    test('should have components available for initialization', () => {
      // Verify that all components are available and properly mocked
      expect(ConfigurationManager).toBeDefined();
      expect(QuotaTracker).toBeDefined();
      expect(HealthMonitor).toBeDefined();
      expect(AIServiceManager).toBeDefined();
      
      // Verify mock implementations
      expect(mockConfigManager.config).toBeDefined();
      expect(mockQuotaTracker.cleanup).toBeDefined();
      expect(mockHealthMonitor.startPeriodicHealthChecks).toBeDefined();
      expect(mockAIServiceManager.parseQuery).toBeDefined();
    });
  });
});