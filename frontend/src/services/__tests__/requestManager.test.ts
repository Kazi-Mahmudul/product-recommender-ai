/**
 * Unit tests for RequestManager
 */

import { RequestManager } from '../requestManager';
import { Phone } from '../../api/phones';

// Mock phone data
const mockPhones: Phone[] = [
  { id: 1, name: 'Phone 1', brand: 'Brand A', model: 'Model 1', price: '$100', url: '/phone1' },
  { id: 2, name: 'Phone 2', brand: 'Brand B', model: 'Model 2', price: '$200', url: '/phone2' },
];

describe('RequestManager', () => {
  let requestManager: RequestManager;
  let mockFetcher: jest.Mock;

  beforeEach(() => {
    requestManager = new RequestManager();
    mockFetcher = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    requestManager.cancelAllRequests();
    requestManager.clearCache();
  });

  describe('Request Fingerprinting', () => {
    it('should generate same fingerprint for same phone IDs regardless of order', async () => {
      mockFetcher.mockResolvedValue(mockPhones);

      // Make requests with same IDs in different order
      const promise1 = requestManager.fetchPhones([1, 2], mockFetcher);
      const promise2 = requestManager.fetchPhones([2, 1], mockFetcher);

      await Promise.all([promise1, promise2]);

      // Should only call fetcher once due to deduplication
      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });

    it('should generate different fingerprints for different phone IDs', async () => {
      mockFetcher.mockResolvedValue(mockPhones);

      await requestManager.fetchPhones([1, 2], mockFetcher);
      await requestManager.fetchPhones([1, 3], mockFetcher);

      // Should call fetcher twice for different phone sets
      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });
  });

  describe('Request Deduplication', () => {
    it('should deduplicate concurrent requests for same phone IDs', async () => {
      mockFetcher.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockPhones), 100))
      );

      // Make multiple concurrent requests for same phones
      const promises = [
        requestManager.fetchPhones([1, 2], mockFetcher),
        requestManager.fetchPhones([1, 2], mockFetcher),
        requestManager.fetchPhones([1, 2], mockFetcher),
      ];

      const results = await Promise.all(promises);

      // Should only call fetcher once
      expect(mockFetcher).toHaveBeenCalledTimes(1);
      
      // All promises should resolve to same data
      results.forEach(result => {
        expect(result).toEqual(mockPhones);
      });
    });

    it('should track pending requests correctly', async () => {
      mockFetcher.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockPhones), 100))
      );

      // Start request but don't await
      const promise = requestManager.fetchPhones([1, 2], mockFetcher);

      // Check that request is pending
      expect(requestManager.isRequestPending([1, 2])).toBe(true);
      expect(requestManager.isRequestPending([2, 1])).toBe(true); // Same fingerprint
      expect(requestManager.isRequestPending([1, 3])).toBe(false); // Different fingerprint

      await promise;

      // After completion, should no longer be pending
      expect(requestManager.isRequestPending([1, 2])).toBe(false);
    });
  });

  describe('Caching', () => {
    it('should cache successful responses', async () => {
      mockFetcher.mockResolvedValue(mockPhones);

      // First request
      const result1 = await requestManager.fetchPhones([1, 2], mockFetcher);
      
      // Second request should use cache
      const result2 = await requestManager.fetchPhones([1, 2], mockFetcher);

      expect(mockFetcher).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(mockPhones);
      expect(result2).toEqual(mockPhones);
    });

    it('should not cache failed requests', async () => {
      const error = new Error('Fetch failed');
      mockFetcher.mockRejectedValue(error);

      // First request fails
      await expect(requestManager.fetchPhones([1, 2], mockFetcher)).rejects.toThrow('Fetch failed');
      
      // Second request should try again
      await expect(requestManager.fetchPhones([1, 2], mockFetcher)).rejects.toThrow('Fetch failed');

      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });

    it('should respect TTL for cache entries', async () => {
      const shortTTLManager = new RequestManager({ defaultTTL: 100 });
      mockFetcher.mockResolvedValue(mockPhones);

      // First request
      await shortTTLManager.fetchPhones([1, 2], mockFetcher);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Second request should not use expired cache
      await shortTTLManager.fetchPhones([1, 2], mockFetcher);

      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });

    it('should enforce cache size limit', async () => {
      const smallCacheManager = new RequestManager({ maxCacheSize: 2 });
      mockFetcher.mockResolvedValue(mockPhones);

      // Fill cache beyond limit
      await smallCacheManager.fetchPhones([1], mockFetcher);
      await smallCacheManager.fetchPhones([2], mockFetcher);
      await smallCacheManager.fetchPhones([3], mockFetcher); // Should evict oldest

      const stats = smallCacheManager.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(2);
    });

    it('should allow disabling cache', async () => {
      const noCacheManager = new RequestManager({ enableCache: false });
      mockFetcher.mockResolvedValue(mockPhones);

      await noCacheManager.fetchPhones([1, 2], mockFetcher);
      await noCacheManager.fetchPhones([1, 2], mockFetcher);

      // Should call fetcher twice without caching
      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });
  });

  describe('Request Cancellation', () => {
    it('should cancel specific requests', async () => {
      mockFetcher.mockImplementation(() => 
        new Promise((resolve, reject) => {
          setTimeout(() => resolve(mockPhones), 100);
        })
      );

      // Start request
      const promise = requestManager.fetchPhones([1, 2], mockFetcher);
      
      // Cancel it
      const cancelled = requestManager.cancelRequest([1, 2]);
      expect(cancelled).toBe(true);

      // Request should be aborted
      await expect(promise).rejects.toThrow();
    });

    it('should cancel all pending requests', async () => {
      mockFetcher.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockPhones), 100))
      );

      // Start multiple requests
      const promises = [
        requestManager.fetchPhones([1], mockFetcher),
        requestManager.fetchPhones([2], mockFetcher),
        requestManager.fetchPhones([3], mockFetcher),
      ];

      // Cancel all
      requestManager.cancelAllRequests();

      // All should be rejected
      const results = await Promise.allSettled(promises);
      results.forEach(result => {
        expect(result.status).toBe('rejected');
      });
    });

    it('should handle external AbortSignal', async () => {
      const controller = new AbortController();
      mockFetcher.mockImplementation((phoneIds, signal) => 
        new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('Aborted')));
          setTimeout(() => resolve(mockPhones), 100);
        })
      );

      const promise = requestManager.fetchPhones([1, 2], mockFetcher, controller.signal);
      
      // Abort externally
      controller.abort();

      await expect(promise).rejects.toThrow();
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', async () => {
      mockFetcher.mockResolvedValue(mockPhones);

      await requestManager.fetchPhones([1, 2], mockFetcher);
      
      let stats = requestManager.getCacheStats();
      expect(stats.size).toBe(1);

      requestManager.clearCache();
      
      stats = requestManager.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should clear cache for specific phones', async () => {
      mockFetcher.mockResolvedValue(mockPhones);

      await requestManager.fetchPhones([1, 2], mockFetcher);
      await requestManager.fetchPhones([3, 4], mockFetcher);
      
      let stats = requestManager.getCacheStats();
      expect(stats.size).toBe(2);

      requestManager.clearCacheForPhones([1, 2]);
      
      stats = requestManager.getCacheStats();
      expect(stats.size).toBe(1);
    });
  });

  describe('Statistics', () => {
    it('should provide cache statistics', async () => {
      mockFetcher.mockResolvedValue(mockPhones);

      await requestManager.fetchPhones([1, 2], mockFetcher);
      
      const stats = requestManager.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries).toHaveLength(1);
      expect(stats.entries[0].isValid).toBe(true);
    });

    it('should provide pending request statistics', async () => {
      mockFetcher.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockPhones), 100))
      );

      // Start request but don't await
      requestManager.fetchPhones([1, 2], mockFetcher);
      
      const stats = requestManager.getPendingRequestStats();
      expect(stats.count).toBe(1);
      expect(stats.requests).toHaveLength(1);
      expect(stats.requests[0].phoneIds).toEqual([1, 2]);
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      const newConfig = { defaultTTL: 10000, maxCacheSize: 50 };
      requestManager.updateConfig(newConfig);

      const config = requestManager.getConfig();
      expect(config.defaultTTL).toBe(10000);
      expect(config.maxCacheSize).toBe(50);
    });

    it('should clear cache when disabling it', async () => {
      mockFetcher.mockResolvedValue(mockPhones);

      await requestManager.fetchPhones([1, 2], mockFetcher);
      
      let stats = requestManager.getCacheStats();
      expect(stats.size).toBe(1);

      requestManager.updateConfig({ enableCache: false });
      
      stats = requestManager.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty phone IDs array', async () => {
      const result = await requestManager.fetchPhones([], mockFetcher);
      expect(result).toEqual([]);
      expect(mockFetcher).not.toHaveBeenCalled();
    });

    it('should handle already aborted signal', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        requestManager.fetchPhones([1, 2], mockFetcher, controller.signal)
      ).rejects.toThrow('Request aborted');

      expect(mockFetcher).not.toHaveBeenCalled();
    });
  });
});