/**
 * Tests for slug-based URL utilities
 */

import {
  parseComparisonUrl,
  validateComparisonPhoneIdentifiers,
  generateComparisonUrl,
  generateComparisonUrlLegacy,
  generatePhoneDetailUrl,
  parsePhoneIdentifiersFromUrl
} from '../slugUtils';
import { Phone } from '../../api/phones';

// Mock phone data for testing
const mockPhoneWithSlug: Phone = {
  id: 1,
  name: 'Samsung Galaxy A15',
  brand: 'Samsung',
  model: 'Galaxy A15',
  slug: 'samsung-galaxy-a15',
  price: '25000',
  url: '',
  img_url: ''
};

const mockPhoneWithoutSlug: Phone = {
  id: 2,
  name: 'Realme Narzo 70',
  brand: 'Realme',
  model: 'Narzo 70',
  price: '22000',
  url: '',
  img_url: ''
};

describe('slugUtils', () => {
  describe('parseComparisonUrl', () => {
    it('should parse slug-based comparison URLs', () => {
      const result = parseComparisonUrl('samsung-galaxy-a15-vs-realme-narzo-70');
      
      expect(result.identifiers).toEqual(['samsung-galaxy-a15', 'realme-narzo-70']);
      expect(result.isSlugBased).toBe(true);
      expect(result.isLegacyFormat).toBe(false);
    });

    it('should parse legacy ID-based comparison URLs', () => {
      const result = parseComparisonUrl('1-2-3');
      
      expect(result.identifiers).toEqual(['1', '2', '3']);
      expect(result.isSlugBased).toBe(false);
      expect(result.isLegacyFormat).toBe(true);
    });

    it('should handle empty input', () => {
      const result = parseComparisonUrl('');
      
      expect(result.identifiers).toEqual([]);
      expect(result.isSlugBased).toBe(false);
      expect(result.isLegacyFormat).toBe(false);
    });

    it('should handle single phone comparison', () => {
      const result = parseComparisonUrl('samsung-galaxy-a15');
      
      // Since it doesn't contain "-vs-", it gets parsed as dash-separated identifiers
      expect(result.identifiers).toEqual(['samsung', 'galaxy', 'a15']);
      expect(result.isSlugBased).toBe(false);
      expect(result.isLegacyFormat).toBe(false);
    });

    it('should handle mixed format (non-numeric with hyphens)', () => {
      const result = parseComparisonUrl('phone-1-phone-2');
      
      expect(result.identifiers).toEqual(['phone', '1', 'phone', '2']);
      expect(result.isSlugBased).toBe(false);
      expect(result.isLegacyFormat).toBe(false);
    });
  });

  describe('parsePhoneIdentifiersFromUrl', () => {
    it('should parse comma-separated identifiers', () => {
      const result = parsePhoneIdentifiersFromUrl('1,2,3');
      expect(result).toEqual(['1', '2', '3']);
    });

    it('should parse dash-separated identifiers', () => {
      const result = parsePhoneIdentifiersFromUrl('1-2-3');
      expect(result).toEqual(['1', '2', '3']);
    });

    it('should handle empty input', () => {
      const result = parsePhoneIdentifiersFromUrl('');
      expect(result).toEqual([]);
    });

    it('should trim whitespace', () => {
      const result = parsePhoneIdentifiersFromUrl(' 1 , 2 , 3 ');
      expect(result).toEqual(['1', '2', '3']);
    });

    it('should filter empty parts', () => {
      const result = parsePhoneIdentifiersFromUrl('1,,2,');
      expect(result).toEqual(['1', '2']);
    });
  });

  describe('validateComparisonPhoneIdentifiers', () => {
    it('should validate valid identifiers', () => {
      const result = validateComparisonPhoneIdentifiers(['phone-1', 'phone-2']);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject single phone', () => {
      const result = validateComparisonPhoneIdentifiers(['phone-1']);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least 2 phones are required for comparison');
    });

    it('should reject more than 5 phones', () => {
      const identifiers = ['phone-1', 'phone-2', 'phone-3', 'phone-4', 'phone-5', 'phone-6'];
      const result = validateComparisonPhoneIdentifiers(identifiers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Maximum 5 phones can be compared at once');
    });

    it('should reject duplicate identifiers', () => {
      const result = validateComparisonPhoneIdentifiers(['phone-1', 'phone-1', 'phone-2']);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duplicate phones cannot be compared');
    });

    it('should reject empty identifiers', () => {
      const result = validateComparisonPhoneIdentifiers(['phone-1', '', 'phone-2']);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid phone identifiers detected');
    });
  });

  describe('generateComparisonUrl', () => {
    it('should generate slug-based URL when all phones have slugs', () => {
      const phones = [mockPhoneWithSlug, { ...mockPhoneWithSlug, id: 2, slug: 'realme-narzo-70' }];
      const result = generateComparisonUrl(phones);
      
      expect(result).toBe('/compare/samsung-galaxy-a15-vs-realme-narzo-70');
    });

    it('should fallback to ID-based URL when some phones lack slugs', () => {
      const phones = [mockPhoneWithSlug, mockPhoneWithoutSlug];
      const result = generateComparisonUrl(phones);
      
      expect(result).toBe('/compare/1-2');
    });

    it('should handle empty phone array', () => {
      const result = generateComparisonUrl([]);
      
      expect(result).toBe('/compare');
    });

    it('should handle single phone', () => {
      const result = generateComparisonUrl([mockPhoneWithSlug]);
      
      expect(result).toBe('/compare/samsung-galaxy-a15');
    });
  });

  describe('generateComparisonUrlLegacy', () => {
    it('should generate legacy ID-based URL', () => {
      const result = generateComparisonUrlLegacy([1, 2, 3]);
      
      expect(result).toBe('/compare/1-2-3');
    });

    it('should handle empty array', () => {
      const result = generateComparisonUrlLegacy([]);
      
      expect(result).toBe('/compare');
    });

    it('should handle single ID', () => {
      const result = generateComparisonUrlLegacy([1]);
      
      expect(result).toBe('/compare/1');
    });
  });

  describe('generatePhoneDetailUrl', () => {
    it('should generate slug-based URL when phone has slug', () => {
      const result = generatePhoneDetailUrl(mockPhoneWithSlug);
      
      expect(result).toBe('/phones/samsung-galaxy-a15');
    });

    it('should fallback to ID-based URL when phone lacks slug', () => {
      const result = generatePhoneDetailUrl(mockPhoneWithoutSlug);
      
      expect(result).toBe('/phones/2');
    });

    it('should handle phone with empty slug', () => {
      const phoneWithEmptySlug = { ...mockPhoneWithSlug, slug: '' };
      const result = generatePhoneDetailUrl(phoneWithEmptySlug);
      
      expect(result).toBe('/phones/1');
    });

    it('should handle phone with undefined slug', () => {
      const phoneWithUndefinedSlug = { ...mockPhoneWithSlug, slug: undefined };
      const result = generatePhoneDetailUrl(phoneWithUndefinedSlug);
      
      expect(result).toBe('/phones/1');
    });
  });

  describe('edge cases', () => {
    it('should handle malformed comparison URLs', () => {
      const result = parseComparisonUrl('---vs---');
      
      // The split on '-vs-' results in ['--', '--'], then filtered to remove empty strings
      expect(result.identifiers).toEqual(['--', '--']);
      expect(result.isSlugBased).toBe(true);
      expect(result.isLegacyFormat).toBe(false);
    });

    it('should handle URLs with special characters', () => {
      const result = parseComparisonUrl('phone@1-vs-phone#2');
      
      expect(result.identifiers).toEqual(['phone@1', 'phone#2']);
      expect(result.isSlugBased).toBe(true);
      expect(result.isLegacyFormat).toBe(false);
    });

    it('should handle very long identifier lists', () => {
      const longList = Array.from({ length: 100 }, (_, i) => `phone-${i}`);
      const result = validateComparisonPhoneIdentifiers(longList);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Maximum 5 phones can be compared at once');
    });
  });
});