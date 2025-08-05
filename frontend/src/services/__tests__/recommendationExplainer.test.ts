// Unit tests for recommendation explainer service

import { RecommendationExplainer } from '../recommendationExplainer';
import { Phone } from '../../api/phones';

// Mock phone data for testing
const mockBudgetPhones: Phone[] = [
  {
    id: 1,
    name: 'Samsung Galaxy A15',
    brand: 'Samsung',
    model: 'Galaxy A15',
    price: '20,000',
    price_original: 20000,
    url: '/samsung-galaxy-a15',
    overall_device_score: 7.5,
    camera_score: 7.0,
    battery_capacity_numeric: 5000,
    refresh_rate_numeric: 90,
    network: '4G'
  },
  {
    id: 2,
    name: 'Xiaomi Redmi 12',
    brand: 'Xiaomi',
    model: 'Redmi 12',
    price: '18,000',
    price_original: 18000,
    url: '/xiaomi-redmi-12',
    overall_device_score: 7.2,
    camera_score: 6.8,
    battery_capacity_numeric: 5000,
    refresh_rate_numeric: 90,
    network: '4G'
  }
];

const mockPremiumPhones: Phone[] = [
  {
    id: 1,
    name: 'iPhone 15 Pro',
    brand: 'Apple',
    model: 'iPhone 15 Pro',
    price: '120,000',
    price_original: 120000,
    url: '/iphone-15-pro',
    overall_device_score: 9.5,
    camera_score: 9.8,
    battery_capacity_numeric: 3274,
    refresh_rate_numeric: 120,
    network: '5G',
    has_wireless_charging: true
  }
];

describe('RecommendationExplainer', () => {
  describe('generateExplanation', () => {
    it('should generate budget explanation for budget queries', () => {
      const explanation = RecommendationExplainer.generateExplanation(
        mockBudgetPhones,
        'best phones under 25000 taka'
      );

      expect(explanation).toContain('under 25000 taka');
      expect(explanation).toContain('value');
      expect(typeof explanation).toBe('string');
      expect(explanation.length).toBeGreaterThan(0);
    });

    it('should generate premium explanation for premium queries', () => {
      const explanation = RecommendationExplainer.generateExplanation(
        mockPremiumPhones,
        'best premium flagship phones'
      );

      expect(explanation).toContain('premium');
      expect(explanation).toContain('8+ ratings');
      expect(typeof explanation).toBe('string');
    });

    it('should generate gaming explanation for gaming queries', () => {
      const explanation = RecommendationExplainer.generateExplanation(
        mockBudgetPhones,
        'best phones for gaming'
      );

      expect(explanation).toContain('gaming');
      expect(explanation).toContain('refresh rate');
      expect(typeof explanation).toBe('string');
    });

    it('should generate camera explanation for camera queries', () => {
      const explanation = RecommendationExplainer.generateExplanation(
        mockPremiumPhones,
        'phones with best camera'
      );

      expect(explanation).toContain('photography');
      expect(explanation).toContain('camera');
      expect(typeof explanation).toBe('string');
    });

    it('should generate battery explanation for battery queries', () => {
      const explanation = RecommendationExplainer.generateExplanation(
        mockBudgetPhones,
        'phones with good battery life'
      );

      expect(explanation).toContain('battery');
      expect(explanation).toContain('4500mAh+');
      expect(typeof explanation).toBe('string');
    });

    it('should generate general explanation for general queries', () => {
      const explanation = RecommendationExplainer.generateExplanation(
        mockBudgetPhones,
        'good phones'
      );

      expect(explanation).toContain('phones');
      expect(explanation).toContain('match your search criteria');
      expect(typeof explanation).toBe('string');
    });

    it('should handle empty phone array', () => {
      const explanation = RecommendationExplainer.generateExplanation(
        [],
        'test query'
      );

      expect(explanation).toBe('No phones found matching your criteria.');
    });

    it('should include feature highlights when available', () => {
      const explanation = RecommendationExplainer.generateExplanation(
        mockPremiumPhones,
        'test query'
      );

      expect(explanation).toContain('5G');
      expect(explanation).toContain('wireless charging');
      expect(explanation).toContain('120Hz+');
    });
  });

  describe('generateTopRecommendationSummary', () => {
    it('should generate summary for budget phone', () => {
      const summary = RecommendationExplainer.generateTopRecommendationSummary(
        mockBudgetPhones[0],
        'phones under 25000'
      );

      expect(summary).toContain('Top pick');
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should generate summary for premium phone', () => {
      const summary = RecommendationExplainer.generateTopRecommendationSummary(
        mockPremiumPhones[0],
        'best premium phone'
      );

      expect(summary).toContain('Top pick');
      expect(typeof summary).toBe('string');
    });

    it('should provide fallback summary when no specific reasons found', () => {
      const basicPhone: Phone = {
        id: 1,
        name: 'Basic Phone',
        brand: 'Generic',
        model: 'Basic',
        price: '15,000',
        price_original: 15000,
        url: '/basic-phone'
      };

      const summary = RecommendationExplainer.generateTopRecommendationSummary(
        basicPhone,
        'test query'
      );

      expect(summary).toBe('Highly recommended based on your criteria.');
    });
  });
});