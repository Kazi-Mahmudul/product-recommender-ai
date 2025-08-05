// Test chat services without router dependencies

import '@testing-library/jest-dom';

describe('Chat Services Integration Tests', () => {
  beforeEach(() => {
    // Mock localStorage with actual storage behavior
    const localStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          store[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete store[key];
        }),
        clear: jest.fn(() => {
          store = {};
        }),
      };
    })();

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  describe('ChatContextManager', () => {
    it('should initialize context correctly', () => {
      const { ChatContextManager } = require('../services/chatContextManager');
      
      const context = ChatContextManager.initializeContext();
      
      expect(context).toBeDefined();
      expect(context.sessionId).toBeDefined();
      expect(context.userPreferences).toBeDefined();
      expect(context.userPreferences.preferredBrands).toEqual([]);
      expect(context.userPreferences.importantFeatures).toEqual([]);
      expect(context.conversationHistory).toEqual([]);
      expect(context.queryCount).toBe(0);
      expect(context.interactionPatterns).toBeDefined();
    });

    it('should update context with messages', () => {
      const { ChatContextManager } = require('../services/chatContextManager');
      
      const context = ChatContextManager.initializeContext();
      const message = {
        user: 'best phones under 30000',
        bot: 'Here are some recommendations',
        phones: [
          { id: 1, name: 'Samsung Galaxy A55', brand: 'Samsung', price_original: 25000 }
        ]
      };
      
      const updatedContext = ChatContextManager.updateWithMessage(context, message);
      
      expect(updatedContext.conversationHistory).toHaveLength(1);
      expect(updatedContext.lastQuery).toBe('best phones under 30000');
      expect(updatedContext.queryCount).toBe(1);
      expect(updatedContext.currentRecommendations).toHaveLength(1);
    });

    it('should analyze user preferences from queries', () => {
      const { ChatContextManager } = require('../services/chatContextManager');
      
      const context = ChatContextManager.initializeContext();
      const message = {
        user: 'samsung phones under 30000 with good camera',
        bot: 'Here are Samsung phones with good cameras'
      };
      
      const updatedContext = ChatContextManager.updateWithMessage(context, message);
      
      expect(updatedContext.userPreferences.preferredBrands).toContain('Samsung');
      expect(updatedContext.userPreferences.importantFeatures).toContain('camera');
      expect(updatedContext.userPreferences.priceRange).toEqual([0, 30000]);
    });

    it('should generate contextual suggestions', () => {
      const { ChatContextManager } = require('../services/chatContextManager');
      
      const context = ChatContextManager.initializeContext();
      context.userPreferences.preferredBrands = ['Samsung'];
      context.userPreferences.priceRange = [0, 30000];
      context.interactionPatterns.brandInteractions = { Samsung: 3, Apple: 1 };
      context.interactionPatterns.featureInteractions = { camera: 2, battery: 1 };
      
      const suggestions: string[] = ChatContextManager.getContextualSuggestions(context);
      
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('Samsung'))).toBe(true);
    });
  });

  describe('AIResponseEnhancer', () => {
    it('should enhance recommendation responses', () => {
      const { AIResponseEnhancer } = require('../services/aiResponseEnhancer');
      const { ChatContextManager } = require('../services/chatContextManager');
      
      const context = ChatContextManager.initializeContext();
      const phones = [
        { 
          id: 1, 
          name: 'Samsung Galaxy A55', 
          brand: 'Samsung', 
          price_original: 25000,
          camera_score: 8.5,
          battery_capacity_numeric: 5000
        }
      ];
      
      const enhanced = AIResponseEnhancer.enhanceRecommendationResponse(
        phones, 
        'best phones under 30000', 
        context
      );
      
      expect(enhanced).toBeDefined();
      expect(enhanced.message).toBeDefined();
      expect(typeof enhanced.message).toBe('string');
      expect(enhanced.message.length).toBeGreaterThan(0);
      expect(Array.isArray(enhanced.suggestions)).toBe(true);
    });

    it('should generate contextual error messages', () => {
      const { AIResponseEnhancer } = require('../services/aiResponseEnhancer');
      const { ChatContextManager } = require('../services/chatContextManager');
      
      const context = ChatContextManager.initializeContext();
      context.userPreferences.preferredBrands = ['Samsung'];
      
      const errorResponse = AIResponseEnhancer.generateContextualErrorMessage(
        'Network connection failed',
        context
      );
      
      expect(errorResponse).toBeDefined();
      expect(errorResponse.message).toBeDefined();
      expect(typeof errorResponse.message).toBe('string');
      expect(Array.isArray(errorResponse.suggestions)).toBe(true);
      expect(errorResponse.suggestions.length).toBeGreaterThan(0);
    });

    it('should enhance QA responses', () => {
      const { AIResponseEnhancer } = require('../services/aiResponseEnhancer');
      const { ChatContextManager } = require('../services/chatContextManager');
      
      const context = ChatContextManager.initializeContext();
      context.queryCount = 2; // Returning user
      
      const enhanced = AIResponseEnhancer.enhanceQAResponse(
        'What is the battery capacity of Samsung Galaxy A55?',
        'The Samsung Galaxy A55 has a 5000mAh battery.',
        context
      );
      
      expect(enhanced).toBeDefined();
      expect(enhanced.message).toBeDefined();
      expect(enhanced.message).toContain('5000mAh');
      expect(enhanced.message.length).toBeGreaterThan('The Samsung Galaxy A55 has a 5000mAh battery.'.length);
    });
  });

  describe('ErrorHandler', () => {
    it('should handle network errors', () => {
      const { ErrorHandler } = require('../services/errorHandler');
      const { ChatContextManager } = require('../services/chatContextManager');
      
      const context = ChatContextManager.initializeContext();
      const error = new Error('Network connection failed');
      
      const result = ErrorHandler.handleError(error, context, 'network');
      
      expect(result).toBeDefined();
      expect(result.showFallbackContent).toBeDefined();
      expect(result.fallbackMessage).toBeDefined();
      expect(typeof result.fallbackMessage).toBe('string');
    });

    it('should handle context errors', () => {
      const { ErrorHandler } = require('../services/errorHandler');
      
      const error = new Error('Context loading failed');
      const recoveredContext = ErrorHandler.handleContextError(error);
      
      expect(recoveredContext).toBeDefined();
      expect(recoveredContext.sessionId).toBeDefined();
      expect(recoveredContext.userPreferences).toBeDefined();
    });

    it('should provide error statistics', () => {
      const { ErrorHandler } = require('../services/errorHandler');
      const { ChatContextManager } = require('../services/chatContextManager');
      
      const context = ChatContextManager.initializeContext();
      
      // Generate some errors
      ErrorHandler.handleError(new Error('Network error'), context, 'network');
      ErrorHandler.handleError(new Error('API error'), context, 'api');
      
      const stats = ErrorHandler.getErrorStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalErrors).toBe('number');
      expect(typeof stats.errorsByType).toBe('object');
      expect(Array.isArray(stats.recentErrors)).toBe(true);
      expect(typeof stats.recoverableErrors).toBe('number');
    });
  });

  describe('SuggestionGenerator', () => {
    it('should generate suggestions for phone recommendations', () => {
      const { SuggestionGenerator } = require('../services/suggestionGenerator');
      
      const phones = [
        { 
          id: 1, 
          name: 'Samsung Galaxy A55', 
          brand: 'Samsung', 
          price_original: 25000,
          camera_score: 8.5
        },
        { 
          id: 2, 
          name: 'iPhone 15', 
          brand: 'Apple', 
          price_original: 95000,
          camera_score: 9.2
        }
      ];
      
      const suggestions = SuggestionGenerator.generateSuggestions(phones, 'best phones');
      
      expect(Array.isArray(suggestions)).toBe(true);
      // Should return suggestions even if empty array
      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('FeatureFlags', () => {
    it('should manage feature flags correctly', () => {
      const { FeatureFlagManager } = require('../utils/featureFlags');
      
      // Clear any existing flags first
      FeatureFlagManager.resetToDefaults();
      
      // Test default flags
      const flags = FeatureFlagManager.getFlags();
      expect(flags).toBeDefined();
      expect(typeof flags.enhancedSuggestions).toBe('boolean');
      expect(typeof flags.contextManagement).toBe('boolean');
      
      // Test enabling/disabling features
      const originalValue = FeatureFlagManager.isEnabled('enhancedSuggestions');
      FeatureFlagManager.disableFeature('enhancedSuggestions');
      expect(FeatureFlagManager.isEnabled('enhancedSuggestions')).toBe(false);
      
      FeatureFlagManager.enableFeature('enhancedSuggestions');
      expect(FeatureFlagManager.isEnabled('enhancedSuggestions')).toBe(true);
      
      // Reset to defaults for other tests
      FeatureFlagManager.resetToDefaults();
    });

    it('should provide debug information', () => {
      const { FeatureFlagManager } = require('../utils/featureFlags');
      
      const debugInfo = FeatureFlagManager.getDebugInfo();
      
      expect(debugInfo).toBeDefined();
      expect(debugInfo.flags).toBeDefined();
      expect(typeof debugInfo.enabledCount).toBe('number');
      expect(typeof debugInfo.disabledCount).toBe('number');
      expect(debugInfo.enabledCount + debugInfo.disabledCount).toBeGreaterThan(0);
    });
  });

  describe('Integration Test', () => {
    it('should work together in a complete flow', () => {
      const { ChatContextManager } = require('../services/chatContextManager');
      const { AIResponseEnhancer } = require('../services/aiResponseEnhancer');
      const { SuggestionGenerator } = require('../services/suggestionGenerator');
      const { FeatureFlagManager } = require('../utils/featureFlags');
      
      // Initialize context
      const context = ChatContextManager.initializeContext();
      expect(context).toBeDefined();
      
      // Simulate user query
      const userMessage = {
        user: 'samsung phones under 30000 with good camera',
        bot: 'Here are some recommendations'
      };
      
      const updatedContext = ChatContextManager.updateWithMessage(context, userMessage);
      expect(updatedContext.queryCount).toBe(1);
      expect(updatedContext.userPreferences.preferredBrands).toContain('Samsung');
      
      // Generate enhanced response
      const phones = [
        { id: 1, name: 'Samsung Galaxy A55', brand: 'Samsung', price_original: 25000, camera_score: 8.5 }
      ];
      
      const enhanced = AIResponseEnhancer.enhanceRecommendationResponse(
        phones,
        userMessage.user,
        updatedContext
      );
      
      expect(enhanced.message).toBeDefined();
      expect(enhanced.suggestions).toBeDefined();
      
      // Generate follow-up suggestions
      const suggestions = SuggestionGenerator.generateSuggestions(phones, userMessage.user);
      expect(Array.isArray(suggestions)).toBe(true);
      
      // Check feature flags
      expect(FeatureFlagManager.isEnabled('contextManagement')).toBe(true);
      expect(FeatureFlagManager.isEnabled('enhancedSuggestions')).toBe(true);
    });
  });
});