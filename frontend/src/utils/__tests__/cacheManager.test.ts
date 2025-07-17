import {
  setCacheItem,
  getCacheItem,
  removeCacheItem,
  invalidateCacheByPattern,
  clearExpiredItems,
  getRecommendationsCacheKey,
  getPhoneDetailsCacheKey,
  CACHE_TTL
} from '../cacheManager';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    key: jest.fn((index: number) => {
      return Object.keys(store)[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('cacheManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    
    // Reset timers
    jest.useRealTimers();
  });

  describe('setCacheItem and getCacheItem', () => {
    test('should store and retrieve an item from localStorage', () => {
      const key = 'test-key';
      const data = { id: 1, name: 'Test' };
      
      // Mock the localStorage.getItem to return a properly formatted cache item
      mockLocalStorage.getItem.mockImplementation((k) => {
        if (k === key) {
          return JSON.stringify({
            data,
            timestamp: Date.now(),
            ttl: 3600000
          });
        }
        return null;
      });
      
      setCacheItem(key, data, 3600000, 'local');
      
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      
      const retrieved = getCacheItem(key, false);
      expect(retrieved).toEqual(data);
    });

    test('should store and retrieve an item from memory cache', () => {
      const key = 'test-key';
      const data = { id: 1, name: 'Test' };
      
      setCacheItem(key, data, 3600000, 'memory');
      
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
      
      const retrieved = getCacheItem(key, true);
      expect(retrieved).toEqual(data);
    });

    test('should store in both caches when using "both" option', () => {
      const key = 'test-key';
      const data = { id: 1, name: 'Test' };
      
      setCacheItem(key, data, 3600000, 'both');
      
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      
      // Test memory cache
      const memoryRetrieved = getCacheItem(key, true);
      expect(memoryRetrieved).toEqual(data);
      
      // Test localStorage
      mockLocalStorage.getItem.mockClear();
      const localRetrieved = getCacheItem(key, false);
      expect(localRetrieved).toEqual(data);
      expect(mockLocalStorage.getItem).toHaveBeenCalled();
    });
  });

  describe('TTL functionality', () => {
    test('should return null for expired items', () => {
      jest.useFakeTimers();
      
      const key = 'test-key';
      const data = { id: 1, name: 'Test' };
      const ttl = 1000; // 1 second
      
      setCacheItem(key, data, ttl, 'both');
      
      // Advance time beyond TTL
      jest.advanceTimersByTime(ttl + 100);
      
      const retrieved = getCacheItem(key);
      expect(retrieved).toBeNull();
    });
  });

  describe('removeCacheItem', () => {
    test('should remove item from localStorage', () => {
      const key = 'test-key';
      const data = { id: 1, name: 'Test' };
      
      setCacheItem(key, data, 3600000, 'local');
      removeCacheItem(key, 'local');
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(key);
      
      const retrieved = getCacheItem(key, false);
      expect(retrieved).toBeNull();
    });

    test('should remove item from memory cache', () => {
      const key = 'test-key';
      const data = { id: 1, name: 'Test' };
      
      setCacheItem(key, data, 3600000, 'memory');
      removeCacheItem(key, 'memory');
      
      const retrieved = getCacheItem(key, true);
      expect(retrieved).toBeNull();
    });

    test('should remove item from both caches', () => {
      const key = 'test-key';
      const data = { id: 1, name: 'Test' };
      
      setCacheItem(key, data, 3600000, 'both');
      removeCacheItem(key, 'both');
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(key);
      
      const retrieved = getCacheItem(key);
      expect(retrieved).toBeNull();
    });
  });

  describe('invalidateCacheByPattern', () => {
    test('should remove items matching pattern from localStorage', () => {
      // Mock localStorage.getItem for the 'other_1' key
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'other_1') {
          return JSON.stringify({
            data: { id: 3 },
            timestamp: Date.now(),
            ttl: 3600000
          });
        }
        return null;
      });
      
      setCacheItem('phone_1', { id: 1 }, 3600000, 'local');
      setCacheItem('phone_2', { id: 2 }, 3600000, 'local');
      setCacheItem('other_1', { id: 3 }, 3600000, 'local');
      
      invalidateCacheByPattern(/^phone_/, 'local');
      
      expect(getCacheItem('phone_1', false)).toBeNull();
      expect(getCacheItem('phone_2', false)).toBeNull();
      expect(getCacheItem('other_1', false)).not.toBeNull();
    });

    test('should remove items matching pattern from memory cache', () => {
      setCacheItem('phone_1', { id: 1 }, 3600000, 'memory');
      setCacheItem('phone_2', { id: 2 }, 3600000, 'memory');
      setCacheItem('other_1', { id: 3 }, 3600000, 'memory');
      
      invalidateCacheByPattern(/^phone_/, 'memory');
      
      expect(getCacheItem('phone_1', true)).toBeNull();
      expect(getCacheItem('phone_2', true)).toBeNull();
      expect(getCacheItem('other_1', true)).not.toBeNull();
    });
  });

  describe('clearExpiredItems', () => {
    test('should remove expired items from localStorage', () => {
      jest.useFakeTimers();
      
      // Mock localStorage.getItem for the 'valid_item' key
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'valid_item') {
          return JSON.stringify({
            data: { id: 2 },
            timestamp: Date.now(),
            ttl: 10000
          });
        }
        return null;
      });
      
      setCacheItem('expired_item', { id: 1 }, 1000, 'local'); // 1 second TTL
      setCacheItem('valid_item', { id: 2 }, 10000, 'local'); // 10 seconds TTL
      
      // Advance time beyond first TTL but not second
      jest.advanceTimersByTime(5000);
      
      clearExpiredItems('local');
      
      expect(getCacheItem('expired_item', false)).toBeNull();
      expect(getCacheItem('valid_item', false)).not.toBeNull();
    });

    test('should remove expired items from memory cache', () => {
      jest.useFakeTimers();
      
      setCacheItem('expired_item', { id: 1 }, 1000, 'memory'); // 1 second TTL
      setCacheItem('valid_item', { id: 2 }, 10000, 'memory'); // 10 seconds TTL
      
      // Advance time beyond first TTL but not second
      jest.advanceTimersByTime(5000);
      
      clearExpiredItems('memory');
      
      expect(getCacheItem('expired_item', true)).toBeNull();
      expect(getCacheItem('valid_item', true)).not.toBeNull();
    });
  });

  describe('cache key helpers', () => {
    test('getRecommendationsCacheKey should return correct key format', () => {
      const phoneId = 123;
      const key = getRecommendationsCacheKey(phoneId);
      expect(key).toBe('phone_recommendations_123');
    });

    test('getPhoneDetailsCacheKey should return correct key format', () => {
      const phoneId = 456;
      const key = getPhoneDetailsCacheKey(phoneId);
      expect(key).toBe('phone_details_456');
    });
  });

  describe('CACHE_TTL constants', () => {
    test('should have correct TTL values', () => {
      expect(CACHE_TTL.RECOMMENDATIONS).toBe(3600000); // 1 hour
      expect(CACHE_TTL.PHONE_DETAILS).toBe(900000);    // 15 minutes
      expect(CACHE_TTL.SEARCH_RESULTS).toBe(1800000);  // 30 minutes
    });
  });
});