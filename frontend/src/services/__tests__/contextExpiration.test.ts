import { ChatContextManager } from '../chatContextManager';
import { Phone } from '../../api/phones';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

const mockPhones: Phone[] = [
  {
    id: 1,
    name: 'Test Phone 1',
    brand: 'TestBrand',
    model: 'Model 1',
    price: '৳50,000',
    url: '/test-phone-1',
    price_original: 50000,
    overall_device_score: 8.5,
    camera_score: 8.0,
    battery_capacity_numeric: 4000,
    refresh_rate_numeric: 90,
    network: '5G',
    has_fast_charging: true
  },
  {
    id: 2,
    name: 'Test Phone 2',
    brand: 'TestBrand',
    model: 'Model 2',
    price: '৳60,000',
    url: '/test-phone-2',
    price_original: 60000,
    overall_device_score: 9.0,
    camera_score: 8.5,
    battery_capacity_numeric: 4500,
    refresh_rate_numeric: 120,
    network: '5G',
    has_fast_charging: true
  }
];

describe('Context Expiration and Cleanup Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    ChatContextManager.clearCache();
    ChatContextManager.resetPerformanceMetrics();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    ChatContextManager.stopCleanupTimer();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Context Expiration', () => {
    it('should expire context after specified time', () => {
      let context = ChatContextManager.initializeContext();
      
      // Add recommendation
      context = ChatContextManager.addPhoneRecommendation(
        context,
        mockPhones,
        'test query'
      );

      // Initially should have context
      expect(ChatContextManager.getRecentPhoneContext(context, 300000)).toHaveLength(1);

      // Manually set old timestamp
      if (context.phoneRecommendations.length > 0) {
        context.phoneRecommendations[0].timestamp = Date.now() - 400000; // 6+ minutes ago
      }

      // Should be expired now
      expect(ChatContextManager.getRecentPhoneContext(context, 300000)).toHaveLength(0);
    });

    it('should handle mixed fresh and stale contexts', () => {
      let context = ChatContextManager.initializeContext();
      
      // Add fresh recommendation
      context = ChatContextManager.addPhoneRecommendation(
        context,
        [mockPhones[0]],
        'fresh query'
      );

      // Add stale recommendation
      context = ChatContextManager.addPhoneRecommendation(
        context,
        [mockPhones[1]],
        'stale query'
      );

      // Make second recommendation stale
      if (context.phoneRecommendations.length >= 2) {
        context.phoneRecommendations[1].timestamp = Date.now() - 400000;
      }

      const recentContext = ChatContextManager.getRecentPhoneContext(context, 300000);
      
      // Should only return fresh context
      expect(recentContext).toHaveLength(1);
      expect(recentContext[0].originalQuery).toBe('fresh query');
    });

    it('should expire entire chat context after 24 hours', () => {
      // Create context with old timestamp
      const oldContext = {
        ...ChatContextManager.initializeContext(),
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      };

      // Save old context
      localStorageMock.setItem('epick_chat_context', JSON.stringify(oldContext));

      // Loading should create new context due to expiration
      const loadedContext = ChatContextManager.loadContext();
      
      expect(loadedContext.sessionId).not.toBe(oldContext.sessionId);
      expect(loadedContext.phoneRecommendations).toHaveLength(0);
    });
  });

  describe('Automatic Cleanup', () => {
    it('should start cleanup timer automatically', () => {
      const context = ChatContextManager.loadContext();
      
      // Timer should be started
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });

    it('should clean up stale recommendations periodically', () => {
      let context = ChatContextManager.initializeContext();
      
      // Add recommendations with different timestamps
      context = ChatContextManager.addPhoneRecommendation(
        context,
        [mockPhones[0]],
        'fresh query'
      );

      context = ChatContextManager.addPhoneRecommendation(
        context,
        [mockPhones[1]],
        'stale query'
      );

      // Make one recommendation stale
      if (context.phoneRecommendations.length >= 2) {
        context.phoneRecommendations[1].timestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      }

      ChatContextManager.saveContext(context);

      // Trigger cleanup timer
      jest.advanceTimersByTime(5 * 60 * 1000); // 5 minutes

      const cleanedContext = ChatContextManager.loadContext();
      
      // Should have removed stale recommendation
      expect(cleanedContext.phoneRecommendations.length).toBe(1);
      expect(cleanedContext.phoneRecommendations[0].originalQuery).toBe('fresh query');
    });

    it('should clear stale cache automatically', () => {
      // Load context to populate cache
      const context = ChatContextManager.loadContext();
      
      // Verify cache is populated
      const metrics1 = ChatContextManager.getPerformanceMetrics();
      expect(metrics1.isCacheValid).toBe(true);

      // Advance time beyond cache TTL
      jest.advanceTimersByTime(35 * 1000); // 35 seconds (TTL is 30 seconds)

      // Trigger cleanup
      jest.advanceTimersByTime(5 * 60 * 1000); // 5 minutes

      const metrics2 = ChatContextManager.getPerformanceMetrics();
      expect(metrics2.isCacheValid).toBe(false);
    });
  });

  describe('Context Validation and Migration', () => {
    it('should validate and fix corrupted phone recommendations', () => {
      const corruptedContext = {
        ...ChatContextManager.initializeContext(),
        phoneRecommendations: [
          {
            id: 'valid',
            phones: mockPhones,
            originalQuery: 'valid query',
            timestamp: Date.now(),
            metadata: {
              priceRange: { min: 50000, max: 60000 },
              brands: ['TestBrand'],
              keyFeatures: ['camera'],
              averageRating: 8.5,
              recommendationReason: 'Test'
            }
          },
          {
            id: 'invalid',
            phones: null, // Invalid
            originalQuery: '',
            timestamp: 'invalid', // Invalid
            metadata: null
          },
          null, // Completely invalid
          {
            id: 'partial',
            phones: [], // Empty phones array
            originalQuery: 'partial query',
            timestamp: Date.now(),
            metadata: {
              priceRange: { min: 0, max: 0 },
              brands: [],
              keyFeatures: [],
              averageRating: 0,
              recommendationReason: ''
            }
          }
        ] as any
      };

      const cleanedContext = ChatContextManager.cleanupContext(corruptedContext);

      // Should only keep valid recommendations
      expect(cleanedContext.phoneRecommendations).toHaveLength(1);
      expect(cleanedContext.phoneRecommendations[0].id).toBe('valid');
    });

    it('should handle missing or invalid context properties', () => {
      const invalidContext = {
        sessionId: 'test',
        // Missing required properties
        phoneRecommendations: 'invalid', // Should be array
        conversationHistory: null,
        interactionPatterns: undefined
      } as any;

      localStorageMock.setItem('epick_chat_context', JSON.stringify(invalidContext));

      const loadedContext = ChatContextManager.loadContext();

      // Should have valid structure
      expect(Array.isArray(loadedContext.phoneRecommendations)).toBe(true);
      expect(Array.isArray(loadedContext.conversationHistory)).toBe(true);
      expect(loadedContext.interactionPatterns).toBeDefined();
      expect(loadedContext.interactionPatterns.brandInteractions).toBeDefined();
    });

    it('should limit conversation history size during cleanup', () => {
      let context = ChatContextManager.initializeContext();

      // Add many conversation messages
      const manyMessages = Array.from({ length: 100 }, (_, i) => ({
        user: `User message ${i}`,
        bot: `Bot response ${i}`,
        timestamp: new Date(),
        messageId: `msg-${i}`
      }));

      context.conversationHistory = manyMessages as any;

      const cleanedContext = ChatContextManager.cleanupContext(context);

      // Should limit to MAX_HISTORY_LENGTH (50)
      expect(cleanedContext.conversationHistory.length).toBeLessThanOrEqual(50);
      
      // Should keep the most recent messages
      const lastMessage = cleanedContext.conversationHistory[cleanedContext.conversationHistory.length - 1];
      expect(lastMessage.user).toBe('User message 99');
    });
  });

  describe('Context Size Management', () => {
    it('should limit phone recommendations to prevent memory issues', () => {
      let context = ChatContextManager.initializeContext();

      // Add many phone recommendations
      for (let i = 0; i < 20; i++) {
        context = ChatContextManager.addPhoneRecommendation(
          context,
          mockPhones,
          `query ${i}`
        );
      }

      // Should be limited to MAX_PHONE_RECOMMENDATIONS (10)
      expect(context.phoneRecommendations.length).toBeLessThanOrEqual(10);
      
      // Should keep the most recent recommendations
      const lastRecommendation = context.phoneRecommendations[context.phoneRecommendations.length - 1];
      expect(lastRecommendation.originalQuery).toBe('query 19');
    });

    it('should optimize phone data for storage', () => {
      let context = ChatContextManager.initializeContext();

      // Add recommendation with full phone data
      const fullPhones = mockPhones.map(phone => ({
        ...phone,
        // Add extra properties that should be stripped
        extraLargeProperty: 'x'.repeat(10000),
        anotherLargeProperty: Array.from({ length: 1000 }, (_, i) => `item-${i}`)
      }));

      context = ChatContextManager.addPhoneRecommendation(
        context,
        fullPhones,
        'test query'
      );

      // Save and reload to trigger optimization
      ChatContextManager.saveContext(context);
      const reloadedContext = ChatContextManager.loadContext();

      // Should have essential phone data only
      const savedPhones = reloadedContext.phoneRecommendations[0].phones;
      savedPhones.forEach(phone => {
        expect(phone.id).toBeDefined();
        expect(phone.name).toBeDefined();
        expect(phone.brand).toBeDefined();
        expect(phone.price_original).toBeDefined();
        
        // Extra properties should be stripped
        expect((phone as any).extraLargeProperty).toBeUndefined();
        expect((phone as any).anotherLargeProperty).toBeUndefined();
      });
    });

    it('should handle storage quota exceeded gracefully', () => {
      // Mock localStorage to throw quota exceeded error
      const originalSetItem = localStorageMock.setItem;
      let callCount = 0;
      
      localStorageMock.setItem = jest.fn((key, value) => {
        callCount++;
        if (callCount === 1) {
          // First call fails with quota exceeded
          const error = new Error('QuotaExceededError');
          Object.defineProperty(error, 'name', { value: 'QuotaExceededError' });
          Object.defineProperty(error, 'code', { value: 22, writable: false });
          throw error;
        } else {
          // Second call (after cleanup) succeeds
          return originalSetItem(key, value);
        }
      });

      let context = ChatContextManager.initializeContext();
      
      // Add large amount of data
      for (let i = 0; i < 15; i++) {
        context = ChatContextManager.addPhoneRecommendation(
          context,
          mockPhones,
          `large query ${i} with lots of text to make it bigger`
        );
      }

      // Should not throw error even when storage fails initially
      expect(() => {
        ChatContextManager.saveContext(context);
      }).not.toThrow();

      // Should have attempted aggressive cleanup
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2);

      // Restore original setItem
      localStorageMock.setItem = originalSetItem;
    });
  });

  describe('Error Recovery', () => {
    it('should recover from corrupted localStorage data', () => {
      // Set corrupted JSON in localStorage
      localStorageMock.setItem('epick_chat_context', 'invalid json {');

      // Should not throw and should create new context
      const context = ChatContextManager.loadContext();
      
      expect(context).toBeDefined();
      expect(context.sessionId).toBeDefined();
      expect(context.phoneRecommendations).toEqual([]);
    });

    it('should handle context cleanup failures gracefully', () => {
      const context = ChatContextManager.initializeContext();
      
      // Create context with circular reference to cause JSON.stringify to fail
      const circularContext = { ...context };
      (circularContext as any).circular = circularContext;

      // Should not throw and should return fresh context
      const cleanedContext = ChatContextManager.cleanupContext(circularContext as any);
      
      expect(cleanedContext).toBeDefined();
      expect(cleanedContext.sessionId).toBeDefined();
    });

    it('should stop cleanup timer when requested', () => {
      ChatContextManager.loadContext(); // Starts timer
      
      expect(jest.getTimerCount()).toBeGreaterThan(0);
      
      ChatContextManager.stopCleanupTimer();
      
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});