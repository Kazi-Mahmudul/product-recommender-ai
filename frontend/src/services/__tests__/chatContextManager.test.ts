// Unit tests for chat context manager service

import { ChatContextManager, ChatContext, UserPreferences } from '../chatContextManager';
import { Phone } from '../../api/phones';
import { ChatMessage } from '../../types/chat';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock phone data
const mockPhone: Phone = {
  id: 1,
  name: 'Samsung Galaxy A55',
  brand: 'Samsung',
  model: 'Galaxy A55',
  price: '45,000',
  price_original: 45000,
  url: '/samsung-galaxy-a55'
};

const mockChatMessage: ChatMessage = {
  user: 'best Samsung phones under 50000',
  bot: 'Here are some recommendations',
  phones: [mockPhone]
};

describe('ChatContextManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('initializeContext', () => {
    it('should create a new context with default values', () => {
      const context = ChatContextManager.initializeContext();

      expect(context.sessionId).toBeDefined();
      expect(context.currentRecommendations).toEqual([]);
      expect(context.userPreferences).toEqual({});
      expect(context.conversationHistory).toEqual([]);
      expect(context.lastQuery).toBe('');
      expect(context.queryCount).toBe(0);
      expect(context.timestamp).toBeInstanceOf(Date);
      expect(context.interactionPatterns).toBeDefined();
    });

    it('should save the new context to localStorage', () => {
      ChatContextManager.initializeContext();
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'epick_chat_context',
        expect.any(String)
      );
    });
  });

  describe('loadContext', () => {
    it('should return new context when no stored context exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const context = ChatContextManager.loadContext();
      
      expect(context.sessionId).toBeDefined();
      expect(context.conversationHistory).toEqual([]);
    });

    it('should load existing context from localStorage', () => {
      const storedContext: ChatContext = {
        sessionId: 'test-session',
        currentRecommendations: [],
        userPreferences: { budgetCategory: 'budget' },
        conversationHistory: [],
        lastQuery: 'test query',
        queryCount: 5,
        timestamp: new Date(),
        interactionPatterns: {
          frequentFeatures: [],
          preferredPriceRange: null,
          brandInteractions: {},
          featureInteractions: {}
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedContext));
      
      const context = ChatContextManager.loadContext();
      
      expect(context.sessionId).toBe('test-session');
      expect(context.lastQuery).toBe('test query');
      expect(context.queryCount).toBe(5);
      expect(context.userPreferences.budgetCategory).toBe('budget');
    });

    it('should create new context when stored context is expired', () => {
      const expiredContext: ChatContext = {
        sessionId: 'expired-session',
        currentRecommendations: [],
        userPreferences: {},
        conversationHistory: [],
        lastQuery: '',
        queryCount: 0,
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        interactionPatterns: {
          frequentFeatures: [],
          preferredPriceRange: null,
          brandInteractions: {},
          featureInteractions: {}
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredContext));
      
      const context = ChatContextManager.loadContext();
      
      expect(context.sessionId).not.toBe('expired-session');
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const context = ChatContextManager.loadContext();
      
      expect(context.sessionId).toBeDefined();
      expect(context.conversationHistory).toEqual([]);
    });
  });

  describe('updateWithMessage', () => {
    it('should add message to conversation history', () => {
      const context = ChatContextManager.initializeContext();
      
      const updatedContext = ChatContextManager.updateWithMessage(context, mockChatMessage);
      
      expect(updatedContext.conversationHistory).toHaveLength(1);
      expect(updatedContext.conversationHistory[0]).toEqual(mockChatMessage);
    });

    it('should update last query and query count', () => {
      const context = ChatContextManager.initializeContext();
      
      const updatedContext = ChatContextManager.updateWithMessage(context, mockChatMessage);
      
      expect(updatedContext.lastQuery).toBe('best Samsung phones under 50000');
      expect(updatedContext.queryCount).toBe(1);
    });

    it('should update current recommendations when phones are present', () => {
      const context = ChatContextManager.initializeContext();
      
      const updatedContext = ChatContextManager.updateWithMessage(context, mockChatMessage);
      
      expect(updatedContext.currentRecommendations).toEqual([mockPhone]);
    });

    it('should analyze user preferences from query', () => {
      const context = ChatContextManager.initializeContext();
      
      const updatedContext = ChatContextManager.updateWithMessage(context, mockChatMessage);
      
      expect(updatedContext.userPreferences.priceRange).toEqual([0, 50000]);
      expect(updatedContext.userPreferences.budgetCategory).toBe('mid-range');
      expect(updatedContext.userPreferences.preferredBrands).toContain('Samsung');
    });
  });

  describe('updateUserPreferences', () => {
    it('should merge new preferences with existing ones', () => {
      const context = ChatContextManager.initializeContext();
      context.userPreferences.budgetCategory = 'budget';
      
      const newPreferences: Partial<UserPreferences> = {
        primaryUseCase: 'gaming',
        importantFeatures: ['camera', 'battery']
      };
      
      const updatedContext = ChatContextManager.updateUserPreferences(context, newPreferences);
      
      expect(updatedContext.userPreferences.budgetCategory).toBe('budget');
      expect(updatedContext.userPreferences.primaryUseCase).toBe('gaming');
      expect(updatedContext.userPreferences.importantFeatures).toEqual(['camera', 'battery']);
    });
  });

  describe('getContextualSuggestions', () => {
    it('should generate price-based suggestions', () => {
      const context = ChatContextManager.initializeContext();
      context.userPreferences.priceRange = [20000, 50000];
      
      const suggestions = ChatContextManager.getContextualSuggestions(context);
      
      expect(suggestions.some(s => s.includes('৳20,000 - ৳50,000'))).toBe(true);
    });

    it('should generate brand-based suggestions', () => {
      const context = ChatContextManager.initializeContext();
      context.interactionPatterns.brandInteractions = { 'Samsung': 3, 'Apple': 2 };
      
      const suggestions = ChatContextManager.getContextualSuggestions(context);
      
      expect(suggestions.some(s => s.includes('Samsung') || s.includes('Apple'))).toBe(true);
    });

    it('should generate feature-based suggestions', () => {
      const context = ChatContextManager.initializeContext();
      context.interactionPatterns.featureInteractions = { 'camera': 3, 'battery': 2 };
      
      const suggestions = ChatContextManager.getContextualSuggestions(context);
      
      expect(suggestions.some(s => s.includes('camera') || s.includes('battery'))).toBe(true);
    });

    it('should generate use case based suggestions', () => {
      const context = ChatContextManager.initializeContext();
      context.userPreferences.primaryUseCase = 'photography';
      
      const suggestions = ChatContextManager.getContextualSuggestions(context);
      
      expect(suggestions.some(s => s.includes('Professional camera'))).toBe(true);
    });
  });

  describe('clearContext', () => {
    it('should remove context from localStorage and return new context', () => {
      const newContext = ChatContextManager.clearContext();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('epick_chat_context');
      expect(newContext.sessionId).toBeDefined();
      expect(newContext.conversationHistory).toEqual([]);
    });
  });

  describe('getContextSummary', () => {
    it('should generate a readable context summary', () => {
      const context = ChatContextManager.initializeContext();
      context.queryCount = 5;
      context.userPreferences.budgetCategory = 'mid-range';
      context.userPreferences.importantFeatures = ['camera', 'battery'];
      context.interactionPatterns.brandInteractions = { 'Samsung': 3 };
      
      const summary = ChatContextManager.getContextSummary(context);
      
      expect(summary).toContain('Queries: 5');
      expect(summary).toContain('Budget: mid-range');
      expect(summary).toContain('Samsung(3)');
      expect(summary).toContain('camera, battery');
    });
  });

  describe('preference analysis', () => {
    it('should extract price preferences from various query formats', () => {
      const context = ChatContextManager.initializeContext();
      
      const queries = [
        'phones under 30000',
        'phones below 25000',
        'phones less than 40000'
      ];
      
      queries.forEach(query => {
        const message: ChatMessage = { user: query, bot: 'response' };
        ChatContextManager.updateWithMessage(context, message);
      });
      
      expect(context.userPreferences.priceRange).toBeDefined();
    });

    it('should extract brand preferences from queries', () => {
      const context = ChatContextManager.initializeContext();
      const message: ChatMessage = { 
        user: 'best iPhone and Samsung phones', 
        bot: 'response' 
      };
      
      ChatContextManager.updateWithMessage(context, message);
      
      expect(context.userPreferences.preferredBrands).toContain('Iphone');
      expect(context.userPreferences.preferredBrands).toContain('Samsung');
    });

    it('should extract feature preferences from queries', () => {
      const context = ChatContextManager.initializeContext();
      const message: ChatMessage = { 
        user: 'phones with good camera and battery life', 
        bot: 'response' 
      };
      
      ChatContextManager.updateWithMessage(context, message);
      
      expect(context.userPreferences.importantFeatures).toContain('camera');
      expect(context.userPreferences.importantFeatures).toContain('battery');
    });

    it('should extract use case from queries', () => {
      const context = ChatContextManager.initializeContext();
      const message: ChatMessage = { 
        user: 'best gaming phones for mobile games', 
        bot: 'response' 
      };
      
      ChatContextManager.updateWithMessage(context, message);
      
      expect(context.userPreferences.primaryUseCase).toBe('gaming');
    });
  });
});