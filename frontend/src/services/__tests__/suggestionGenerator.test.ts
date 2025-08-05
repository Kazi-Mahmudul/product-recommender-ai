// Unit tests for suggestion generation service

import { SuggestionGenerator } from '../suggestionGenerator';
import { Phone } from '../../api/phones';

// Mock phone data for testing
const mockPhones: Phone[] = [
  {
    id: 1,
    name: 'Samsung Galaxy A55',
    brand: 'Samsung',
    model: 'Galaxy A55',
    price: '45,000',
    price_original: 45000,
    url: '/samsung-galaxy-a55',
    refresh_rate_numeric: 120,
    has_fast_charging: true,
    battery_capacity_numeric: 5000,
    camera_score: 8.5,
    display_score: 8.0,
    network: '5G'
  },
  {
    id: 2,
    name: 'Xiaomi POCO X6',
    brand: 'Xiaomi',
    model: 'POCO X6',
    price: '35,000',
    price_original: 35000,
    url: '/xiaomi-poco-x6',
    refresh_rate_numeric: 120,
    has_fast_charging: true,
    battery_capacity_numeric: 5100,
    camera_score: 7.5,
    display_score: 7.8,
    network: '5G'
  },
  {
    id: 3,
    name: 'iPhone 15',
    brand: 'Apple',
    model: 'iPhone 15',
    price: '95,000',
    price_original: 95000,
    url: '/iphone-15',
    refresh_rate_numeric: 60,
    has_fast_charging: true,
    battery_capacity_numeric: 3349,
    camera_score: 9.2,
    display_score: 9.0,
    network: '5G'
  }
];

describe('SuggestionGenerator', () => {
  describe('generateSuggestions', () => {
    it('should generate suggestions for valid phone data', () => {
      const suggestions = SuggestionGenerator.generateSuggestions(
        mockPhones,
        'best phones under 50000'
      );

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should return default suggestions for empty phone array', () => {
      const suggestions = SuggestionGenerator.generateSuggestions(
        [],
        'test query'
      );

      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.every(s => s.category === 'filter')).toBe(true);
    });

    it('should generate battery-focused suggestions for battery queries', () => {
      const suggestions = SuggestionGenerator.generateSuggestions(
        mockPhones,
        'phones with good battery life'
      );

      const batteryRelated = suggestions.filter(s => 
        s.text.toLowerCase().includes('battery') || 
        s.query.toLowerCase().includes('battery')
      );

      expect(batteryRelated.length).toBeGreaterThan(0);
    });

    it('should generate gaming suggestions for gaming queries', () => {
      const suggestions = SuggestionGenerator.generateSuggestions(
        mockPhones,
        'best gaming phones'
      );

      const gamingRelated = suggestions.filter(s => 
        s.text.toLowerCase().includes('gaming') || 
        s.query.toLowerCase().includes('gaming')
      );

      expect(gamingRelated.length).toBeGreaterThan(0);
    });

    it('should generate comparison suggestions when multiple phones provided', () => {
      const suggestions = SuggestionGenerator.generateSuggestions(
        mockPhones,
        'compare phones'
      );

      const comparisonSuggestions = suggestions.filter(s => s.category === 'comparison');
      expect(comparisonSuggestions.length).toBeGreaterThan(0);
    });

    it('should prioritize suggestions correctly', () => {
      const suggestions = SuggestionGenerator.generateSuggestions(
        mockPhones,
        'test query'
      );

      // Check that suggestions are sorted by priority (descending)
      for (let i = 0; i < suggestions.length - 1; i++) {
        expect(suggestions[i].priority).toBeGreaterThanOrEqual(suggestions[i + 1].priority);
      }
    });

    it('should generate valid suggestion objects', () => {
      const suggestions = SuggestionGenerator.generateSuggestions(
        mockPhones,
        'test query'
      );

      suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('id');
        expect(suggestion).toHaveProperty('text');
        expect(suggestion).toHaveProperty('icon');
        expect(suggestion).toHaveProperty('query');
        expect(suggestion).toHaveProperty('category');
        expect(suggestion).toHaveProperty('priority');
        
        expect(typeof suggestion.id).toBe('string');
        expect(typeof suggestion.text).toBe('string');
        expect(typeof suggestion.icon).toBe('string');
        expect(typeof suggestion.query).toBe('string');
        expect(['filter', 'comparison', 'detail', 'alternative']).toContain(suggestion.category);
        expect(typeof suggestion.priority).toBe('number');
      });
    });
  });
});