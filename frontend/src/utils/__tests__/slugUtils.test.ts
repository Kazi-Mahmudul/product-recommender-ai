/**
 * Tests for slug utility functions
 */

import {
  generatePhoneSlug,
  generateComparisonSlug,
  parsePhoneIdsFromUrl,
  generateComparisonUrl,
  validateComparisonPhoneIds,
  createShareableComparisonUrl
} from '../slugUtils';
import { Phone } from '../../api/phones';

// Mock phone data
const mockPhone1: Phone = {
  id: 1,
  name: 'iPhone 15 Pro Max',
  brand: 'Apple',
  model: 'iPhone 15 Pro Max',
  price: '150,000',
  url: '/phones/1',
  price_original: 150000
} as Phone;

const mockPhone2: Phone = {
  id: 2,
  name: 'Samsung Galaxy S24 Ultra',
  brand: 'Samsung',
  model: 'Galaxy S24 Ultra',
  price: '140,000',
  url: '/phones/2',
  price_original: 140000
} as Phone;

describe('slugUtils', () => {
  describe('generatePhoneSlug', () => {
    it('should generate URL-friendly slug from phone name', () => {
      expect(generatePhoneSlug('iPhone 15 Pro Max')).toBe('iphone-15-pro-max');
      expect(generatePhoneSlug('Samsung Galaxy S24 Ultra')).toBe('samsung-galaxy-s24-ultra');
      expect(generatePhoneSlug('Xiaomi Redmi Note 12 Pro+')).toBe('xiaomi-redmi-note-12-pro');
    });

    it('should handle special characters', () => {
      expect(generatePhoneSlug('Phone (2023) - Special Edition!')).toBe('phone-2023-special-edition');
      expect(generatePhoneSlug('Phone@#$%^&*()_+')).toBe('phone');
    });

    it('should handle empty or whitespace strings', () => {
      expect(generatePhoneSlug('')).toBe('');
      expect(generatePhoneSlug('   ')).toBe('');
    });
  });

  describe('generateComparisonSlug', () => {
    it('should generate comparison slug from multiple phones', () => {
      const phones = [mockPhone1, mockPhone2];
      const slug = generateComparisonSlug(phones);
      expect(slug).toBe('iphone-15-pro-max-vs-samsung-galaxy-s24-ultra');
    });

    it('should handle single phone', () => {
      const phones = [mockPhone1];
      const slug = generateComparisonSlug(phones);
      expect(slug).toBe('iphone-15-pro-max');
    });

    it('should handle empty array', () => {
      const phones: Phone[] = [];
      const slug = generateComparisonSlug(phones);
      expect(slug).toBe('');
    });
  });

  describe('parsePhoneIdsFromUrl', () => {
    it('should parse comma-separated phone IDs', () => {
      expect(parsePhoneIdsFromUrl('1,2,3')).toEqual([1, 2, 3]);
    });

    it('should parse dash-separated phone IDs', () => {
      expect(parsePhoneIdsFromUrl('1-2-3')).toEqual([1, 2, 3]);
    });

    it('should filter out invalid IDs', () => {
      expect(parsePhoneIdsFromUrl('1,abc,3')).toEqual([1, 3]);
      expect(parsePhoneIdsFromUrl('1,-2,3')).toEqual([1, 3]);
    });

    it('should handle empty string', () => {
      expect(parsePhoneIdsFromUrl('')).toEqual([]);
    });
  });

  describe('generateComparisonUrl', () => {
    it('should generate URL for phone comparison', () => {
      expect(generateComparisonUrl([1, 2, 3])).toBe('/compare/1-2-3');
    });

    it('should handle single phone', () => {
      expect(generateComparisonUrl([1])).toBe('/compare/1');
    });

    it('should handle empty array', () => {
      expect(generateComparisonUrl([])).toBe('/compare');
    });
  });

  describe('validateComparisonPhoneIds', () => {
    it('should validate valid phone IDs', () => {
      const result = validateComparisonPhoneIds([1, 2, 3]);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject less than 2 phones', () => {
      const result = validateComparisonPhoneIds([1]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least 2 phones are required for comparison');
    });

    it('should reject more than 5 phones', () => {
      const result = validateComparisonPhoneIds([1, 2, 3, 4, 5, 6]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Maximum 5 phones can be compared at once');
    });

    it('should reject duplicate phone IDs', () => {
      const result = validateComparisonPhoneIds([1, 2, 2, 3]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duplicate phones cannot be compared');
    });

    it('should reject invalid phone IDs', () => {
      const result = validateComparisonPhoneIds([0, -1, 1.5]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid phone IDs detected');
    });
  });

  describe('createShareableComparisonUrl', () => {
    it('should create shareable URL with phone names', () => {
      const phones = [mockPhone1, mockPhone2];
      const url = createShareableComparisonUrl(phones, 'https://example.com');
      expect(url).toBe('https://example.com/compare/1-2/iphone-15-pro-max-vs-samsung-galaxy-s24-ultra');
    });

    it('should use window.location.origin as default base URL', () => {
      // Mock window.location.origin
      Object.defineProperty(window, 'location', {
        value: { origin: 'https://epick.com.bd' },
        writable: true
      });

      const phones = [mockPhone1];
      const url = createShareableComparisonUrl(phones);
      expect(url).toBe('https://epick.com.bd/compare/1/iphone-15-pro-max');
    });
  });
});