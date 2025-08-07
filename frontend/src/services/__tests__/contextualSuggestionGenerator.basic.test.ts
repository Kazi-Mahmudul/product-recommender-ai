import { ContextualSuggestionGenerator } from '../contextualSuggestionGenerator';
import { PhoneRecommendationContext } from '../chatContextManager';
import { Phone } from '../../api/phones';

const mockPhone: Phone = {
  id: 1,
  name: 'Test Phone',
  brand: 'TestBrand',
  model: 'TestModel',
  price: '৳25,000',
  url: '/test-phone',
  price_original: 25000,
  overall_device_score: 8.0,
  camera_score: 7.5,
  battery_capacity_numeric: 4000,
  refresh_rate_numeric: 90,
  network: '4G',
  has_fast_charging: true
};

describe('ContextualSuggestionGenerator Basic Tests', () => {
  it('should generate suggestions with valid input', () => {
    const phoneContext: PhoneRecommendationContext[] = [{
      id: 'test-context',
      phones: [mockPhone],
      originalQuery: 'test query',
      timestamp: Date.now(),
      metadata: {
        priceRange: { min: 25000, max: 25000 },
        brands: ['TestBrand'],
        keyFeatures: [],
        averageRating: 8.0,
        recommendationReason: 'Test recommendation'
      }
    }];

    const suggestions = ContextualSuggestionGenerator.generateContextualSuggestions(
      [mockPhone],
      'test query',
      phoneContext
    );

    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
    
    suggestions.forEach(suggestion => {
      expect(suggestion).toHaveProperty('id');
      expect(suggestion).toHaveProperty('text');
      expect(suggestion).toHaveProperty('query');
      expect(suggestion).toHaveProperty('contextualQuery');
      expect(suggestion).toHaveProperty('contextType');
      expect(suggestion).toHaveProperty('referencedPhones');
      expect(suggestion).toHaveProperty('contextIndicator');
    });
  });

  it('should handle empty phone context', () => {
    const suggestions = ContextualSuggestionGenerator.generateContextualSuggestions(
      [mockPhone],
      'test query',
      []
    );

    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('should handle invalid input gracefully', () => {
    const suggestions = ContextualSuggestionGenerator.generateContextualSuggestions(
      [],
      '',
      []
    );

    expect(Array.isArray(suggestions)).toBe(true);
  });
});