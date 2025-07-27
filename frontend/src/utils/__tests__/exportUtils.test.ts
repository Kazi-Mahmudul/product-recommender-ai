/**
 * Tests for export utility functions
 */

import {
  generateShareableUrl,
  copyToClipboard,
  saveComparisonToHistory,
  getComparisonHistory,
  clearComparisonHistory
} from '../exportUtils';
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

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: { origin: 'https://epick.com.bd' },
  writable: true
});

describe('exportUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateShareableUrl', () => {
    it('should generate shareable URL with default base URL', () => {
      const phoneIds = [1, 2, 3];
      const url = generateShareableUrl(phoneIds);
      expect(url).toBe('https://epick.com.bd/compare/1-2-3');
    });

    it('should generate shareable URL with custom base URL', () => {
      const phoneIds = [1, 2];
      const url = generateShareableUrl(phoneIds, 'https://example.com');
      expect(url).toBe('https://example.com/compare/1-2');
    });

    it('should handle single phone', () => {
      const phoneIds = [1];
      const url = generateShareableUrl(phoneIds);
      expect(url).toBe('https://epick.com.bd/compare/1');
    });
  });

  describe('copyToClipboard', () => {
    it('should copy text using navigator.clipboard when available', async () => {
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true
      });
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true
      });

      const result = await copyToClipboard('test text');
      
      expect(result).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith('test text');
    });

    it('should fallback to execCommand when clipboard API is not available', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true
      });

      const mockExecCommand = jest.fn().mockReturnValue(true);
      document.execCommand = mockExecCommand;

      const result = await copyToClipboard('test text');
      
      expect(result).toBe(true);
      expect(mockExecCommand).toHaveBeenCalledWith('copy');
    });
  });

  describe('comparison history', () => {
    describe('saveComparisonToHistory', () => {
      it('should save comparison to localStorage', () => {
        localStorageMock.getItem.mockReturnValue(null);
        
        const phones = [mockPhone1, mockPhone2];
        saveComparisonToHistory(phones);

        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'epick_comparison_history',
          expect.stringContaining('"phoneIds":[1,2]')
        );
      });

      it('should remove duplicates and maintain max history items', () => {
        const existingHistory = [
          {
            id: '1',
            phoneIds: [1, 2],
            phoneNames: ['Apple iPhone 15 Pro Max', 'Samsung Galaxy S24 Ultra'],
            timestamp: new Date('2023-01-01'),
            url: '/compare/1-2'
          }
        ];
        
        localStorageMock.getItem.mockReturnValue(JSON.stringify(existingHistory));
        
        const phones = [mockPhone1, mockPhone2];
        saveComparisonToHistory(phones);

        const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
        expect(savedData).toHaveLength(1); // Should not duplicate
      });
    });

    describe('getComparisonHistory', () => {
      it('should return parsed history from localStorage', () => {
        const mockHistory = [
          {
            id: '1',
            phoneIds: [1, 2],
            phoneNames: ['Apple iPhone 15 Pro Max', 'Samsung Galaxy S24 Ultra'],
            timestamp: '2023-01-01T00:00:00.000Z',
            url: '/compare/1-2'
          }
        ];
        
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockHistory));
        
        const history = getComparisonHistory();
        
        expect(history).toHaveLength(1);
        expect(history[0].phoneIds).toEqual([1, 2]);
        expect(history[0].timestamp).toBeInstanceOf(Date);
      });

      it('should return empty array when no history exists', () => {
        localStorageMock.getItem.mockReturnValue(null);
        
        const history = getComparisonHistory();
        
        expect(history).toEqual([]);
      });

      it('should handle corrupted localStorage data', () => {
        localStorageMock.getItem.mockReturnValue('invalid json');
        
        const history = getComparisonHistory();
        
        expect(history).toEqual([]);
      });
    });

    describe('clearComparisonHistory', () => {
      it('should remove history from localStorage', () => {
        clearComparisonHistory();
        
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('epick_comparison_history');
      });
    });
  });
});