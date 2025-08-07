import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChatContextManager } from '../chatContextManager';
import { ContextualSuggestionGenerator } from '../contextualSuggestionGenerator';
import FollowUpSuggestions from '../../components/FollowUpSuggestions';
import ChatPhoneRecommendation from '../../components/ChatPhoneRecommendation';
import { Phone } from '../../api/phones';
import { ContextualSuggestion } from '../../types/suggestions';

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

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn()
}));

// Mock mobile utils
jest.mock('../../utils/mobileUtils', () => ({
  MobileUtils: {
    addHapticFeedback: jest.fn()
  }
}));

// Mock hooks
jest.mock('../../hooks/useMobileResponsive', () => ({
  useMobileResponsive: () => ({
    isMobile: false,
    isTouchDevice: false
  })
}));

const mockPhones: Phone[] = [
  {
    id: 1,
    name: 'iPhone 14 Pro',
    brand: 'Apple',
    model: '14 Pro',
    price: '৳79,900',
    url: '/iphone-14-pro',
    slug: 'iphone-14-pro',
    price_original: 79900,
    overall_device_score: 9.2,
    camera_score: 9.5,
    battery_capacity_numeric: 3200,
    refresh_rate_numeric: 120,
    network: '5G',
    has_fast_charging: true
  },
  {
    id: 2,
    name: 'Samsung Galaxy S23',
    brand: 'Samsung',
    model: 'Galaxy S23',
    price: '৳74,999',
    url: '/samsung-galaxy-s23',
    slug: 'samsung-galaxy-s23',
    price_original: 74999,
    overall_device_score: 9.0,
    camera_score: 9.2,
    battery_capacity_numeric: 3900,
    refresh_rate_numeric: 120,
    network: '5G',
    has_fast_charging: true
  },
  {
    id: 3,
    name: 'OnePlus 11',
    brand: 'OnePlus',
    model: '11',
    price: '৳56,999',
    url: '/oneplus-11',
    slug: 'oneplus-11',
    price_original: 56999,
    overall_device_score: 8.8,
    camera_score: 8.5,
    battery_capacity_numeric: 5000,
    refresh_rate_numeric: 120,
    network: '5G',
    has_fast_charging: true
  }
];

describe('Contextual Suggestions Integration Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    ChatContextManager.clearCache();
    ChatContextManager.resetPerformanceMetrics();
  });

  afterEach(() => {
    ChatContextManager.stopCleanupTimer();
  });

  describe('End-to-End Context Flow', () => {
    it('should maintain context across multiple recommendation rounds', async () => {
      // Initialize context
      let context = ChatContextManager.initializeContext();

      // First recommendation round
      context = ChatContextManager.addPhoneRecommendation(
        context,
        mockPhones.slice(0, 2),
        'premium phones with good cameras'
      );

      // Generate contextual suggestions
      const recentContext = ChatContextManager.getRecentPhoneContext(context);
      expect(recentContext).toHaveLength(1);

      const suggestions = ContextualSuggestionGenerator.generateContextualSuggestions(
        mockPhones.slice(0, 2),
        'premium phones with good cameras',
        recentContext
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.contextType === 'comparison')).toBe(true);

      // Second recommendation round
      context = ChatContextManager.addPhoneRecommendation(
        context,
        [mockPhones[2]],
        'cheaper alternatives'
      );

      const updatedContext = ChatContextManager.getRecentPhoneContext(context);
      expect(updatedContext).toHaveLength(2);

      // Generate new contextual suggestions with multiple contexts
      const newSuggestions = ContextualSuggestionGenerator.generateContextualSuggestions(
        [mockPhones[2]],
        'cheaper alternatives',
        updatedContext
      );

      expect(newSuggestions.length).toBeGreaterThan(0);
      expect(newSuggestions.some(s => s.referencedPhones.includes('iPhone 14 Pro'))).toBe(true);
    });

    it('should handle context expiration gracefully', async () => {
      let context = ChatContextManager.initializeContext();

      // Add old recommendation (simulate by manipulating timestamp)
      context = ChatContextManager.addPhoneRecommendation(
        context,
        mockPhones.slice(0, 2),
        'old query'
      );

      // Manually set old timestamp
      if (context.phoneRecommendations.length > 0) {
        context.phoneRecommendations[0].timestamp = Date.now() - 400000; // 6+ minutes ago
      }

      // Get recent context with 5-minute limit
      const recentContext = ChatContextManager.getRecentPhoneContext(context, 300000);
      expect(recentContext).toHaveLength(0);

      // Should fall back to general suggestions
      const suggestions = ContextualSuggestionGenerator.generateContextualSuggestions(
        mockPhones.slice(0, 1),
        'new query',
        recentContext
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.every(s => s.contextType === 'general')).toBe(true);
    });

    it('should generate contextual suggestions with proper phone references', () => {
      let context = ChatContextManager.initializeContext();
      
      context = ChatContextManager.addPhoneRecommendation(
        context,
        mockPhones.slice(0, 2),
        'premium phones'
      );

      const recentContext = ChatContextManager.getRecentPhoneContext(context);
      const suggestions = ContextualSuggestionGenerator.generateContextualSuggestions(
        mockPhones.slice(0, 2),
        'premium phones',
        recentContext
      );

      const contextualSuggestions = suggestions.filter(s => s.contextType !== 'general');
      
      contextualSuggestions.forEach(suggestion => {
        expect(suggestion.referencedPhones.length).toBeGreaterThan(0);
        expect(suggestion.contextualQuery).toContain('iPhone 14 Pro');
        expect(suggestion.contextIndicator).toBeDefined();
        expect(suggestion.contextIndicator.tooltip).toBeTruthy();
      });
    });
  });

  describe('Multi-Turn Conversation Context', () => {
    it('should maintain context across multiple chat interactions', () => {
      let context = ChatContextManager.initializeContext();

      // Simulate multiple turns
      const queries = [
        'show me premium phones',
        'what about cheaper alternatives',
        'compare camera quality',
        'show phones with better battery'
      ];

      const phoneGroups = [
        mockPhones.slice(0, 2),
        [mockPhones[2]],
        mockPhones.slice(0, 2),
        [mockPhones[2]]
      ];

      queries.forEach((query, index) => {
        context = ChatContextManager.addPhoneRecommendation(
          context,
          phoneGroups[index],
          query
        );
      });

      // Should have multiple recommendation contexts
      expect(context.phoneRecommendations.length).toBe(4);

      // Recent context should include all recent recommendations
      const recentContext = ChatContextManager.getRecentPhoneContext(context);
      expect(recentContext.length).toBe(4);

      // Generate suggestions with full context
      const suggestions = ContextualSuggestionGenerator.generateContextualSuggestions(
        mockPhones.slice(0, 1),
        'final query',
        recentContext
      );

      expect(suggestions.length).toBeGreaterThan(0);
      
      const contextualSuggestions = suggestions.filter(s => s.contextType !== 'general');
      expect(contextualSuggestions.length).toBeGreaterThan(0);
    });

    it('should reference specific phones from previous recommendations', () => {
      let context = ChatContextManager.initializeContext();

      // Add recommendations with specific phones
      context = ChatContextManager.addPhoneRecommendation(
        context,
        [mockPhones[0], mockPhones[1]], // iPhone and Samsung
        'premium phones comparison'
      );

      const recentContext = ChatContextManager.getRecentPhoneContext(context);
      const suggestions = ContextualSuggestionGenerator.generateContextualSuggestions(
        [mockPhones[2]], // OnePlus
        'budget alternative',
        recentContext
      );

      const comparisonSuggestions = suggestions.filter(s => s.contextType === 'comparison');
      
      expect(comparisonSuggestions.length).toBeGreaterThan(0);
      comparisonSuggestions.forEach(suggestion => {
        expect(
          suggestion.referencedPhones.includes('iPhone 14 Pro') ||
          suggestion.referencedPhones.includes('Samsung Galaxy S23')
        ).toBe(true);
      });
    });
  });

  describe('Component Integration', () => {
    it('should render FollowUpSuggestions with contextual indicators', () => {
      const contextualSuggestions: ContextualSuggestion[] = [
        {
          id: 'contextual-1',
          text: 'Show phones with better cameras',
          icon: '📸',
          query: 'better camera phones',
          contextualQuery: 'Show phones with better cameras than iPhone 14 Pro and Samsung Galaxy S23',
          category: 'comparison',
          priority: 9,
          contextType: 'comparison',
          referencedPhones: ['iPhone 14 Pro', 'Samsung Galaxy S23'],
          contextIndicator: {
            icon: '🔗',
            tooltip: 'References your previous recommendations',
            description: 'Contextual suggestion based on previous results'
          }
        }
      ];

      const mockPhoneContext = [{
        id: 'context-1',
        phones: mockPhones.slice(0, 2),
        originalQuery: 'premium phones',
        timestamp: Date.now(),
        metadata: {
          priceRange: { min: 70000, max: 80000 },
          brands: ['Apple', 'Samsung'],
          keyFeatures: ['camera', 'performance'],
          averageRating: 4.5,
          recommendationReason: 'Premium phones'
        }
      }];

      render(
        <FollowUpSuggestions
          suggestions={contextualSuggestions}
          onSuggestionClick={jest.fn()}
          darkMode={false}
          phoneContext={mockPhoneContext}
        />
      );

      // Check for contextual indicators
      expect(screen.getByText('Show phones with better cameras')).toBeInTheDocument();
      expect(screen.getByText('(🔗 contextual suggestions available)')).toBeInTheDocument();
      expect(screen.getByText('Suggestions with this icon reference your previous phone recommendations')).toBeInTheDocument();
    });

    it('should handle suggestion clicks with contextual data', () => {
      const mockOnSuggestionClick = jest.fn();
      
      const contextualSuggestion: ContextualSuggestion = {
        id: 'contextual-1',
        text: 'Find cheaper alternatives',
        icon: '💸',
        query: 'cheaper alternatives',
        contextualQuery: 'Find cheaper alternatives to iPhone 14 Pro and Samsung Galaxy S23',
        category: 'alternative',
        priority: 8,
        contextType: 'alternative',
        referencedPhones: ['iPhone 14 Pro', 'Samsung Galaxy S23'],
        contextIndicator: {
          icon: '🔗',
          tooltip: 'References your previous recommendations',
          description: 'Find alternatives to previously recommended phones'
        }
      };

      render(
        <FollowUpSuggestions
          suggestions={[contextualSuggestion]}
          onSuggestionClick={mockOnSuggestionClick}
          darkMode={false}
        />
      );

      fireEvent.click(screen.getByText('Find cheaper alternatives'));
      
      expect(mockOnSuggestionClick).toHaveBeenCalledWith(contextualSuggestion);
      expect(mockOnSuggestionClick).toHaveBeenCalledWith(
        expect.objectContaining({
          contextualQuery: 'Find cheaper alternatives to iPhone 14 Pro and Samsung Galaxy S23',
          referencedPhones: ['iPhone 14 Pro', 'Samsung Galaxy S23']
        })
      );
    });
  });

  describe('Context Fallback Scenarios', () => {
    it('should handle corrupted context gracefully', () => {
      // Create corrupted context
      const corruptedContext = {
        ...ChatContextManager.initializeContext(),
        phoneRecommendations: [
          { id: 'corrupt', phones: null, timestamp: 'invalid' }, // Corrupted data
          null, // Null entry
          undefined // Undefined entry
        ] as any
      };

      const cleanedContext = ChatContextManager.cleanupContext(corruptedContext);
      
      expect(cleanedContext.phoneRecommendations).toHaveLength(0);
      expect(cleanedContext.currentRecommendationId).toBeUndefined();
    });

    it('should provide general suggestions when no context is available', () => {
      const suggestions = ContextualSuggestionGenerator.generateContextualSuggestions(
        mockPhones.slice(0, 1),
        'test query',
        [] // No context
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.every(s => s.contextType === 'general')).toBe(true);
      expect(suggestions.every(s => s.referencedPhones.length === 0)).toBe(true);
    });

    it('should handle partial context availability', () => {
      const partialContext = [{
        id: 'partial',
        phones: [mockPhones[0]], // Only one phone
        originalQuery: 'test',
        timestamp: Date.now(),
        metadata: {
          priceRange: { min: 0, max: 0 }, // Invalid price range
          brands: [],
          keyFeatures: [],
          averageRating: 0,
          recommendationReason: ''
        }
      }];

      const suggestions = ContextualSuggestionGenerator.generateContextualSuggestions(
        mockPhones.slice(0, 1),
        'test query',
        partialContext
      );

      expect(suggestions.length).toBeGreaterThan(0);
      
      // Should have both contextual and general suggestions
      const contextualSuggestions = suggestions.filter(s => s.contextType !== 'general');
      const generalSuggestions = suggestions.filter(s => s.contextType === 'general');
      
      expect(contextualSuggestions.length).toBeGreaterThan(0);
      expect(generalSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Context Cleanup', () => {
    it('should limit context size to prevent memory issues', () => {
      let context = ChatContextManager.initializeContext();

      // Add many recommendations
      for (let i = 0; i < 20; i++) {
        context = ChatContextManager.addPhoneRecommendation(
          context,
          mockPhones.slice(0, 1),
          `query ${i}`
        );
      }

      // Should limit to MAX_PHONE_RECOMMENDATIONS
      expect(context.phoneRecommendations.length).toBeLessThanOrEqual(10);
    });

    it('should clean up stale context automatically', () => {
      let context = ChatContextManager.initializeContext();

      // Add old recommendations
      context = ChatContextManager.addPhoneRecommendation(
        context,
        mockPhones.slice(0, 1),
        'old query'
      );

      // Manually set very old timestamp
      if (context.phoneRecommendations.length > 0) {
        context.phoneRecommendations[0].timestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      }

      const cleanedContext = ChatContextManager.cleanupContext(context);
      
      expect(cleanedContext.phoneRecommendations.length).toBe(0);
    });

    it('should track performance metrics accurately', () => {
      ChatContextManager.resetPerformanceMetrics();

      // Perform operations
      const context1 = ChatContextManager.loadContext();
      ChatContextManager.saveContext(context1);
      const context2 = ChatContextManager.loadContext(); // Should hit cache

      const metrics = ChatContextManager.getPerformanceMetrics();

      expect(metrics.loadOperations).toBeGreaterThan(0);
      expect(metrics.saveOperations).toBeGreaterThan(0);
      expect(metrics.cacheHits + metrics.cacheMisses).toBeGreaterThan(0);
    });
  });
});