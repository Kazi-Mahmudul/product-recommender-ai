// Unit tests for AI response enhancer service

import { AIResponseEnhancer } from '../aiResponseEnhancer';
import { Phone } from '../../api/phones';
import { ChatContext } from '../chatContextManager';

// Mock phone data
const mockPhones: Phone[] = [
  {
    id: 1,
    name: 'Samsung Galaxy A55',
    brand: 'Samsung',
    model: 'Galaxy A55',
    price: '45,000',
    price_original: 45000,
    url: '/samsung-galaxy-a55',
    camera_score: 8.5,
    battery_capacity_numeric: 5000,
    refresh_rate_numeric: 120
  },
  {
    id: 2,
    name: 'iPhone 15',
    brand: 'Apple',
    model: 'iPhone 15',
    price: '95,000',
    price_original: 95000,
    url: '/iphone-15',
    camera_score: 9.2,
    battery_capacity_numeric: 3349,
    refresh_rate_numeric: 60
  }
];

const mockContext: ChatContext = {
  sessionId: 'test-session',
  currentRecommendations: [],
  userPreferences: {
    budgetCategory: 'mid-range',
    preferredBrands: ['Samsung'],
    importantFeatures: ['camera', 'battery']
  },
  conversationHistory: [],
  lastQuery: 'test query',
  queryCount: 1,
  timestamp: new Date(),
  interactionPatterns: {
    frequentFeatures: [],
    preferredPriceRange: null,
    brandInteractions: { 'Samsung': 2 },
    featureInteractions: { 'camera': 3 }
  },
  phoneRecommendations: []
};

describe('AIResponseEnhancer', () => {
  describe('enhanceRecommendationResponse', () => {
    it('should generate enhanced recommendation response', () => {
      const response = AIResponseEnhancer.enhanceRecommendationResponse(
        mockPhones,
        'best phones under 50000',
        mockContext
      );

      expect(response.message).toBeDefined();
      expect(response.message).toContain('recommendations');
      expect(response.reasoning).toBeDefined();
      expect(response.suggestions).toBeDefined();
      expect(response.suggestions!.length).toBeLessThanOrEqual(3);
    });

    it('should provide different greeting for returning users', () => {
      const returningUserContext = { ...mockContext, queryCount: 5 };
      
      const response = AIResponseEnhancer.enhanceRecommendationResponse(
        mockPhones,
        'phones with good camera',
        returningUserContext
      );

      expect(response.message).toContain('Welcome back');
    });

    it('should include budget reasoning for budget queries', () => {
      const response = AIResponseEnhancer.enhanceRecommendationResponse(
        mockPhones,
        'phones under 50000',
        mockContext
      );

      expect(response.reasoning).toContain('budget');
      expect(response.reasoning).toContain('৳');
    });

    it('should include camera reasoning for camera queries', () => {
      const response = AIResponseEnhancer.enhanceRecommendationResponse(
        mockPhones,
        'phones with good camera',
        mockContext
      );

      expect(response.reasoning).toContain('camera');
      expect(response.reasoning).toContain('score');
    });

    it('should include battery reasoning for battery queries', () => {
      const response = AIResponseEnhancer.enhanceRecommendationResponse(
        mockPhones,
        'phones with good battery',
        mockContext
      );

      expect(response.reasoning).toContain('battery');
      expect(response.reasoning).toContain('mAh');
    });
  });

  describe('enhanceQAResponse', () => {
    it('should make QA responses more conversational', () => {
      const response = AIResponseEnhancer.enhanceQAResponse(
        'What is the battery capacity of Galaxy A55?',
        'The Galaxy A55 has a 5000mAh battery.',
        mockContext
      );

      expect(response.message).toContain('Great question!');
      expect(response.message).toContain('5000mAh');
      expect(response.clarifyingQuestions).toBeDefined();
    });

    it('should generate clarifying questions', () => {
      const response = AIResponseEnhancer.enhanceQAResponse(
        'Which phone is better?',
        'Both phones have their strengths.',
        mockContext
      );

      expect(response.clarifyingQuestions).toBeDefined();
      expect(response.clarifyingQuestions!.length).toBeGreaterThan(0);
    });
  });

  describe('generateContextualErrorMessage', () => {
    it('should handle no results error', () => {
      const response = AIResponseEnhancer.generateContextualErrorMessage(
        'No phones found matching your criteria',
        mockContext
      );

      expect(response.message).toContain("couldn't find any phones");
      expect(response.suggestions).toBeDefined();
      expect(response.suggestions!.length).toBeGreaterThan(0);
    });

    it('should handle network errors', () => {
      const response = AIResponseEnhancer.generateContextualErrorMessage(
        'Network connection failed',
        mockContext
      );

      expect(response.message).toContain('trouble connecting');
      expect(response.suggestions).toContain('try your question again');
    });

    it('should handle unclear query errors', () => {
      const response = AIResponseEnhancer.generateContextualErrorMessage(
        'Could not understand the query',
        mockContext
      );

      expect(response.message).toContain('need a bit more information');
      expect(response.suggestions).toBeDefined();
    });

    it('should include brand suggestions from context', () => {
      const response = AIResponseEnhancer.generateContextualErrorMessage(
        'General error',
        mockContext
      );

      expect(response.suggestions!.some(s => s.includes('Samsung'))).toBe(true);
    });
  });

  describe('generateClarifyingQuestions', () => {
    it('should ask about budget when not specified', () => {
      const contextWithoutBudget = {
        ...mockContext,
        userPreferences: {}
      };

      const questions = AIResponseEnhancer.generateClarifyingQuestions(
        'best phones',
        contextWithoutBudget
      );

      expect(questions.some(q => q.includes('budget'))).toBe(true);
    });

    it('should ask about use case when not specified', () => {
      const contextWithoutUseCase = {
        ...mockContext,
        userPreferences: {}
      };

      const questions = AIResponseEnhancer.generateClarifyingQuestions(
        'good phones',
        contextWithoutUseCase
      );

      expect(questions.some(q => q.includes('primarily use'))).toBe(true);
    });

    it('should ask about brand preferences when not specified', () => {
      const contextWithoutBrands = {
        ...mockContext,
        userPreferences: {}
      };

      const questions = AIResponseEnhancer.generateClarifyingQuestions(
        'phones',
        contextWithoutBrands
      );

      expect(questions.some(q => q.includes('preferred brands'))).toBe(true);
    });

    it('should ask about important features when not specified', () => {
      const contextWithoutFeatures = {
        ...mockContext,
        userPreferences: {}
      };

      const questions = AIResponseEnhancer.generateClarifyingQuestions(
        'phones',
        contextWithoutFeatures
      );

      expect(questions.some(q => q.includes('features are most important'))).toBe(true);
    });

    it('should not ask questions when preferences are already known', () => {
      const completeContext = {
        ...mockContext,
        userPreferences: {
          priceRange: [20000, 50000] as [number, number],
          primaryUseCase: 'gaming' as const,
          preferredBrands: ['Samsung'],
          importantFeatures: ['camera', 'battery']
        }
      };

      const questions = AIResponseEnhancer.generateClarifyingQuestions(
        'Samsung gaming phones',
        completeContext
      );

      expect(questions.length).toBe(0);
    });
  });

  describe('conversational enhancements', () => {
    it('should add conversational starters to responses', () => {
      const response = AIResponseEnhancer.enhanceQAResponse(
        'What is the screen size?',
        'The screen size is 6.6 inches.',
        mockContext
      );

      const conversationalStarters = ['Great question!', "I'd be happy to help", "That's a smart thing", "Good thinking!"];
      const hasStarter = conversationalStarters.some(starter => 
        response.message.includes(starter)
      );
      
      expect(hasStarter).toBe(true);
    });

    it('should add encouraging endings to responses', () => {
      const response = AIResponseEnhancer.enhanceQAResponse(
        'What is the price?',
        'The price is 45,000 BDT',
        mockContext
      );

      const encouragingEndings = ['Let me know if you need', 'Feel free to ask', 'Hope this helps', 'Any other questions'];
      const hasEnding = encouragingEndings.some(ending => 
        response.message.includes(ending)
      );
      
      expect(hasEnding).toBe(true);
    });
  });
});