/**
 * Tests for navigation utility functions
 */

import { navigateToPhoneDetails, navigateToComparison, getComparisonUrl } from '../navigationUtils';
import { generateComparisonUrlLegacy } from '../slugUtils';
// Mock the slugUtils module
jest.mock('../slugUtils', () => ({
  generateComparisonUrlLegacy: jest.fn()
}));

// Import the mocked function
const mockGenerateComparisonUrlLegacy = generateComparisonUrlLegacy as jest.MockedFunction<typeof generateComparisonUrlLegacy>;

describe('navigationUtils', () => {
  let mockNavigate: jest.Mock;

  beforeEach(() => {
    mockNavigate = jest.fn();
    
    // Set up the mock implementation for generateComparisonUrlLegacy
    mockGenerateComparisonUrlLegacy.mockImplementation((ids: number[]) => {
      if (ids.length === 0) return '/compare';
      return `/compare/${ids.join('-')}`;
    });
  });

  describe('navigateToPhoneDetails', () => {
    it('should navigate to phone details page with ID', () => {
      navigateToPhoneDetails(mockNavigate, '123');
      
      expect(mockNavigate).toHaveBeenCalledWith('/phones/123');
    });

    it('should handle string IDs', () => {
      navigateToPhoneDetails(mockNavigate, 'abc123');
      
      expect(mockNavigate).toHaveBeenCalledWith('/phones/abc123');
    });

    it('should handle empty ID', () => {
      navigateToPhoneDetails(mockNavigate, '');
      
      expect(mockNavigate).toHaveBeenCalledWith('/phones/');
    });
  });

  describe('navigateToComparison', () => {
    it('should navigate to comparison page with multiple phone IDs', () => {
      navigateToComparison(mockNavigate, ['1', '2', '3']);
      
      expect(mockNavigate).toHaveBeenCalledWith('/compare/1-2-3');
    });

    it('should handle two phone IDs', () => {
      navigateToComparison(mockNavigate, ['123', '456']);
      
      expect(mockNavigate).toHaveBeenCalledWith('/compare/123-456');
    });

    it('should not navigate with single phone ID', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      navigateToComparison(mockNavigate, ['1']);
      
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('At least 2 phones are required for comparison');
      
      consoleSpy.mockRestore();
    });

    it('should not navigate with empty array', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      navigateToComparison(mockNavigate, []);
      
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('At least 2 phones are required for comparison');
      
      consoleSpy.mockRestore();
    });

    it('should handle non-numeric IDs', () => {
      navigateToComparison(mockNavigate, ['abc', 'def']);
      
      // Non-numeric IDs should be filtered out, resulting in empty array, which generates '/compare'
      expect(mockNavigate).toHaveBeenCalledWith('/compare');
    });

    it('should handle mixed numeric and non-numeric IDs', () => {
      navigateToComparison(mockNavigate, ['1', 'abc', '2']);
      
      expect(mockNavigate).toHaveBeenCalledWith('/compare/1-2');
    });
  });

  describe('getComparisonUrl', () => {
    it('should generate comparison URL with multiple phone IDs', () => {
      const result = getComparisonUrl(['1', '2', '3']);
      
      expect(result).toBe('/compare/1-2-3');
    });

    it('should generate comparison URL with two phone IDs', () => {
      const result = getComparisonUrl(['123', '456']);
      
      expect(result).toBe('/compare/123-456');
    });

    it('should return empty string with single phone ID', () => {
      const result = getComparisonUrl(['1']);
      
      expect(result).toBe('');
    });

    it('should return empty string with empty array', () => {
      const result = getComparisonUrl([]);
      
      expect(result).toBe('');
    });

    it('should handle non-numeric IDs', () => {
      const result = getComparisonUrl(['abc', 'def']);
      
      // Non-numeric IDs should be filtered out, resulting in empty array, which generates '/compare'
      expect(result).toBe('/compare');
    });

    it('should handle mixed numeric and non-numeric IDs', () => {
      const result = getComparisonUrl(['1', 'abc', '2']);
      
      expect(result).toBe('/compare/1-2');
    });

    it('should handle large numbers', () => {
      const result = getComparisonUrl(['999999', '1000000']);
      
      expect(result).toBe('/compare/999999-1000000');
    });
  });

  describe('edge cases', () => {
    it('should handle whitespace in phone IDs', () => {
      navigateToPhoneDetails(mockNavigate, ' 123 ');
      
      expect(mockNavigate).toHaveBeenCalledWith('/phones/ 123 ');
    });

    it('should handle special characters in phone IDs', () => {
      navigateToPhoneDetails(mockNavigate, 'phone-123');
      
      expect(mockNavigate).toHaveBeenCalledWith('/phones/phone-123');
    });

    it('should handle very long phone ID arrays', () => {
      const longArray = Array.from({ length: 10 }, (_, i) => i.toString());
      navigateToComparison(mockNavigate, longArray);
      
      expect(mockNavigate).toHaveBeenCalledWith('/compare/0-1-2-3-4-5-6-7-8-9');
    });

    it('should handle zero as phone ID', () => {
      navigateToPhoneDetails(mockNavigate, '0');
      
      expect(mockNavigate).toHaveBeenCalledWith('/phones/0');
    });

    it('should handle negative numbers as phone IDs', () => {
      const result = getComparisonUrl(['-1', '-2']);
      
      // Negative numbers are valid integers, so they should work
      expect(result).toBe('/compare/-1--2');
    });
  });
});