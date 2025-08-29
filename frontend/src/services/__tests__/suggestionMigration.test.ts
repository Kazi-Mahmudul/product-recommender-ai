import { SuggestionMigration } from '../suggestionMigration';
import { ChatContextManager } from '../chatContextManager';
import { SuggestionGenerator } from '../suggestionGenerator';
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
    overall_device_score: 8.5
  },
  {
    id: 2,
    name: 'Test Phone 2',
    brand: 'TestBrand2',
    model: 'Model 2',
    price: '৳60,000',
    url: '/test-phone-2',
    price_original: 60000,
    overall_device_score: 9.0
  }
];

describe('SuggestionMigration', () => {
  beforeEach(() => {
    localStorageMock.clear();
    ChatContextManager.clearCache();
  });

  describe('Migration Detection', () => {
    it('should detect when migration is needed', () => {
      // Create legacy context without phoneRecommendations
      const legacyContext = {
        ...ChatContextManager.initializeContext(),
        currentRecommendations: mockPhones,
        lastQuery: 'test query'
      };
      delete (legacyContext as any).phoneRecommendations;

      localStorageMock.setItem('peyechi_chat_context', JSON.stringify(legacyContext));

      const status = SuggestionMigration.getMigrationStatus();
      expect(status.isMigrated).toBe(false);
      expect(status.hasContext).toBe(true);
    });

    it('should detect when migration is not needed', () => {
      const modernContext = ChatContextManager.initializeContext();
      ChatContextManager.saveContext(modernContext);

      const status = SuggestionMigration.getMigrationStatus();
      expect(status.isMigrated).toBe(true);
      expect(status.hasContext).toBe(true);
    });
  });

  describe('Migration Process', () => {
    it('should migrate legacy context successfully', () => {
      // Create legacy context
      const legacyContext = {
        sessionId: 'test-session',
        currentRecommendations: mockPhones,
        lastQuery: 'premium phones',
        queryCount: 1,
        timestamp: new Date(),
        userPreferences: {},
        conversationHistory: [],
        interactionPatterns: {
          frequentFeatures: [],
          preferredPriceRange: null,
          brandInteractions: {},
          featureInteractions: {}
        },
        phoneRecommendations: []
      };

      localStorageMock.setItem('peyechi_chat_context', JSON.stringify(legacyContext));

      // Perform migration
      SuggestionMigration.migrateToContextualSuggestions();

      // Load migrated context
      const migratedContext = ChatContextManager.loadContext();

      expect(migratedContext.phoneRecommendations).toBeDefined();
      expect(Array.isArray(migratedContext.phoneRecommendations)).toBe(true);
      expect(migratedContext.phoneRecommendations.length).toBe(1);
      expect(migratedContext.currentRecommendationId).toBeDefined();

      const phoneRec = migratedContext.phoneRecommendations[0];
      expect(phoneRec.phones).toEqual(mockPhones);
      expect(phoneRec.originalQuery).toBe('premium phones');
      expect(phoneRec.metadata.brands).toContain('TestBrand');
    });

    it('should handle migration of context without current recommendations', () => {
      const legacyContext = {
        sessionId: 'test-session',
        currentRecommendations: [],
        lastQuery: '',
        queryCount: 0,
        timestamp: new Date(),
        userPreferences: {},
        conversationHistory: [],
        interactionPatterns: {
          frequentFeatures: [],
          preferredPriceRange: null,
          brandInteractions: {},
          featureInteractions: {}
        },
        phoneRecommendations: []
      };

      localStorageMock.setItem('peyechi_chat_context', JSON.stringify(legacyContext));

      SuggestionMigration.migrateToContextualSuggestions();

      const migratedContext = ChatContextManager.loadContext();
      expect(migratedContext.phoneRecommendations).toEqual([]);
      expect(migratedContext.currentRecommendationId).toBeUndefined();
    });
  });

  describe('Backward Compatibility', () => {
    it('should provide compatible suggestions for legacy calls', () => {
      const context = ChatContextManager.initializeContext();
      ChatContextManager.addPhoneRecommendation(context, mockPhones, 'test query');

      const suggestions = SuggestionMigration.generateCompatibleSuggestions(
        mockPhones,
        'new query'
      );

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should detect contextual suggestions availability', () => {
      let context = ChatContextManager.initializeContext();
      
      // Initially no contextual suggestions
      expect(SuggestionMigration.hasContextualSuggestionsAvailable()).toBe(false);

      // Add phone recommendation
      context = ChatContextManager.addPhoneRecommendation(context, mockPhones, 'test query');
      ChatContextManager.saveContext(context);

      // Now should have contextual suggestions
      expect(SuggestionMigration.hasContextualSuggestionsAvailable()).toBe(true);
    });
  });

  describe('SuggestionGenerator Integration', () => {
    it('should use contextual suggestions when context is available', () => {
      let context = ChatContextManager.initializeContext();
      context = ChatContextManager.addPhoneRecommendation(context, mockPhones, 'test query');

      const suggestions = SuggestionGenerator.generateSuggestions(
        mockPhones,
        'new query',
        [],
        context
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(SuggestionGenerator.getSuggestionMode(context)).toBe('contextual');
    });

    it('should fall back to regular suggestions when no context', () => {
      const context = ChatContextManager.initializeContext();

      const suggestions = SuggestionGenerator.generateSuggestions(
        mockPhones,
        'test query',
        [],
        context
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(SuggestionGenerator.getSuggestionMode(context)).toBe('regular');
    });

    it('should detect contextual suggestions availability', () => {
      let context = ChatContextManager.initializeContext();
      
      expect(SuggestionGenerator.hasContextualSuggestionsAvailable(context)).toBe(false);

      context = ChatContextManager.addPhoneRecommendation(context, mockPhones, 'test query');
      
      expect(SuggestionGenerator.hasContextualSuggestionsAvailable(context)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle migration errors gracefully', () => {
      // Set invalid JSON in localStorage
      localStorageMock.setItem('peyechi_chat_context', 'invalid json');

      expect(() => {
        SuggestionMigration.migrateToContextualSuggestions();
      }).not.toThrow();

      // Should create fresh context after failed migration
      const context = ChatContextManager.loadContext();
      expect(context).toBeDefined();
      expect(context.phoneRecommendations).toEqual([]);
    });

    it('should handle compatibility wrapper errors', () => {
      // Mock ChatContextManager to throw error
      const originalLoadContext = ChatContextManager.loadContext;
      ChatContextManager.loadContext = jest.fn(() => {
        throw new Error('Context load failed');
      });

      const suggestions = SuggestionMigration.generateCompatibleSuggestions(
        mockPhones,
        'test query'
      );

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);

      // Restore original method
      ChatContextManager.loadContext = originalLoadContext;
    });
  });

  describe('Testing Utilities', () => {
    it('should support forced migration', () => {
      SuggestionMigration.resetToLegacyContext();
      
      let status = SuggestionMigration.getMigrationStatus();
      expect(status.isMigrated).toBe(false);

      SuggestionMigration.forceMigration();
      
      status = SuggestionMigration.getMigrationStatus();
      expect(status.isMigrated).toBe(true);
    });

    it('should support resetting to legacy context', () => {
      const modernContext = ChatContextManager.initializeContext();
      ChatContextManager.saveContext(modernContext);

      SuggestionMigration.resetToLegacyContext();

      const status = SuggestionMigration.getMigrationStatus();
      expect(status.isMigrated).toBe(false);
    });
  });
});