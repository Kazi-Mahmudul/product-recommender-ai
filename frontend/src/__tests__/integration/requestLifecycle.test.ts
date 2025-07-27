/**
 * Integration tests for request lifecycle management
 */

import { requestManager } from '../../services/requestManager';
import { retryService } from '../../services/retryService';
import { performanceMonitor } from '../../utils/performanceMonitor';

// Mock fetch
global.fetch = jest.fn();

const mockPhones = [
  { id: 1, name: 'Phone 1', brand: 'Brand A', model: 'Model 1', price: '$100', url: '/phone1' },
  { id: 2, name: 'Phone 2', brand: 'Brand B', model: 'Model 2', price: '$200', url: '/phone2' },
];

describe('Request Lifecycle Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requestManager.cancelAllRequests();
    requestManager.clearCache();
    performanceMonitor.setEnabled(true);
    performanceMonitor.clearMetrics();
  });

  afterEach(() => {
    performanceMonitor.setEnabled(false);
  });

  describe('End-to-End Request Flow', () => {
    it('should handle successful request flow with caching', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhones,
      });

      const mockFetcher = jest.fn().mockImplementation(async (phoneIds, signal) => {
        const response = await fetch(`/api/phones/bulk?ids=${phoneIds.join(',')}`, { signal });
        if (!response.ok) throw new Error('Fetch failed');
        return response.json();
      });

      // First request
      const result1 = await requestManager.fetchPhones([1, 2], mockFetcher);
      expect(result1).toEqual(mockPhones);
      expect(mockFetcher).toHaveBeenCalledTimes(1);

      // Second request for same phones should use cache
      const result2 = await requestManager.fetchPhones([1, 2], mockFetcher);
      expect(result2).toEqual(mockPhones);
      expect(mockFetcher).toHaveBeenCalledTimes(1); // No additional call

      // Verify performance metrics
      const stats = performanceMonitor.getStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.successfulRequests).toBe(2);
      expect(stats.cacheHitRate).toBe(50); // 1 out of 2 requests was cache hit
    });

    it('should handle request failures with retry logic', async () => {
      const networkError = new TypeError('Failed to fetch');
      
      const mockFetcher = jest.fn()
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockPhones);

      // Mock retry service to actually retry
      const originalExecuteWithRetry = retryService.executeWithRetry;
      retryService.executeWithRetry = jest.fn().mockImplementation(async (operation, signal) => {
        let lastError;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            return await operation();
          } catch (error) {
            lastError = error;
            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        }
        throw lastError;
      });

      try {
        const result = await requestManager.fetchPhones([1, 2], mockFetcher);
        expect(result).toEqual(mockPhones);
        expect(mockFetcher).toHaveBeenCalledTimes(3); // Initial + 2 retries

        // Verify performance metrics tracked failures and final success
        const stats = performanceMonitor.getStats();
        expect(stats.totalRequests).toBe(1);
        expect(stats.successfulRequests).toBe(1);
      } finally {
        retryService.executeWithRetry = originalExecuteWithRetry;
      }
    });

    it('should handle request cancellation properly', async () => {
      const controller = new AbortController();
      
      const mockFetcher = jest.fn().mockImplementation(async (phoneIds, signal) => {
        return new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new Error('Request aborted'));
          });
          
          setTimeout(() => resolve(mockPhones), 1000);
        });
      });

      const requestPromise = requestManager.fetchPhones([1, 2], mockFetcher, controller.signal);
      
      // Cancel after a short delay
      setTimeout(() => controller.abort(), 100);

      await expect(requestPromise).rejects.toThrow('Request aborted');

      // Verify performance metrics tracked cancellation
      const stats = performanceMonitor.getStats();
      expect(stats.cancelledRequests).toBe(1);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should deduplicate concurrent requests for same phone IDs', async () => {
      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => mockPhones,
          }), 100)
        )
      );

      const mockFetcher = jest.fn().mockImplementation(async (phoneIds, signal) => {
        const response = await fetch(`/api/phones/bulk?ids=${phoneIds.join(',')}`, { signal });
        return response.json();
      });

      // Start multiple concurrent requests for same phones
      const promises = [
        requestManager.fetchPhones([1, 2], mockFetcher),
        requestManager.fetchPhones([1, 2], mockFetcher),
        requestManager.fetchPhones([1, 2], mockFetcher),
      ];

      const results = await Promise.all(promises);

      // All should return same data
      results.forEach(result => {
        expect(result).toEqual(mockPhones);
      });

      // But only one actual fetch should have been made
      expect(mockFetcher).toHaveBeenCalledTimes(1);

      // Verify performance metrics
      const stats = performanceMonitor.getStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.successfulRequests).toBe(3);
      expect(stats.cacheHitRate).toBeGreaterThan(0);
    });

    it('should handle different phone sets concurrently', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPhones,
      });

      const mockFetcher = jest.fn().mockImplementation(async (phoneIds, signal) => {
        const response = await fetch(`/api/phones/bulk?ids=${phoneIds.join(',')}`, { signal });
        return response.json();
      });

      // Start concurrent requests for different phone sets
      const promises = [
        requestManager.fetchPhones([1, 2], mockFetcher),
        requestManager.fetchPhones([3, 4], mockFetcher),
        requestManager.fetchPhones([5, 6], mockFetcher),
      ];

      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toEqual(mockPhones);
      });

      // Should make separate requests for each phone set
      expect(mockFetcher).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should recover from temporary network issues', async () => {
      const networkError = new TypeError('Failed to fetch');
      
      (fetch as jest.Mock)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPhones,
        });

      const mockFetcher = jest.fn().mockImplementation(async (phoneIds, signal) => {
        const response = await fetch(`/api/phones/bulk?ids=${phoneIds.join(',')}`, { signal });
        if (!response.ok) throw new Error('Fetch failed');
        return response.json();
      });

      // First request should fail and be cached as failure (not cached)
      await expect(requestManager.fetchPhones([1, 2], mockFetcher)).rejects.toThrow();

      // Second request should succeed
      const result = await requestManager.fetchPhones([1, 2], mockFetcher);
      expect(result).toEqual(mockPhones);

      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });

    it('should handle rate limiting with proper backoff', async () => {
      const rateLimitResponse = {
        ok: false,
        status: 429,
        headers: {
          get: jest.fn().mockReturnValue('2'), // 2 second retry-after
        },
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce(rateLimitResponse)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPhones,
        });

      const mockFetcher = jest.fn().mockImplementation(async (phoneIds, signal) => {
        const response = await fetch(`/api/phones/bulk?ids=${phoneIds.join(',')}`, { signal });
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}`) as any;
          error.statusCode = response.status;
          if (response.status === 429) {
            error.retryAfter = parseInt(response.headers.get('retry-after') || '0', 10);
          }
          throw error;
        }
        return response.json();
      });

      // Mock retry service to handle rate limiting
      const originalExecuteWithRetry = retryService.executeWithRetry;
      retryService.executeWithRetry = jest.fn().mockImplementation(async (operation, signal) => {
        try {
          return await operation();
        } catch (error: any) {
          if (error.statusCode === 429) {
            // Simulate waiting for retry-after
            await new Promise(resolve => setTimeout(resolve, error.retryAfter * 100)); // Shortened for test
            return await operation();
          }
          throw error;
        }
      });

      try {
        const result = await requestManager.fetchPhones([1, 2], mockFetcher);
        expect(result).toEqual(mockPhones);
        expect(mockFetcher).toHaveBeenCalledTimes(2); // Initial + retry
      } finally {
        retryService.executeWithRetry = originalExecuteWithRetry;
      }
    });
  });

  describe('Memory and Resource Management', () => {
    it('should clean up resources on cancellation', async () => {
      const mockFetcher = jest.fn().mockImplementation(async (phoneIds, signal) => {
        return new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new Error('Request aborted'));
          });
          
          setTimeout(() => resolve(mockPhones), 1000);
        });
      });

      // Start multiple requests
      const controllers = [
        new AbortController(),
        new AbortController(),
        new AbortController(),
      ];

      const promises = controllers.map(controller =>
        requestManager.fetchPhones([1, 2], mockFetcher, controller.signal)
      );

      // Cancel all requests
      controllers.forEach(controller => controller.abort());

      // All should be rejected
      const results = await Promise.allSettled(promises);
      results.forEach(result => {
        expect(result.status).toBe('rejected');
      });

      // Verify no pending requests remain
      const pendingStats = requestManager.getPendingRequestStats();
      expect(pendingStats.count).toBe(0);
    });

    it('should enforce cache size limits', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPhones,
      });

      const mockFetcher = jest.fn().mockImplementation(async (phoneIds, signal) => {
        const response = await fetch(`/api/phones/bulk?ids=${phoneIds.join(',')}`, { signal });
        return response.json();
      });

      // Configure small cache size for testing
      requestManager.updateConfig({ maxCacheSize: 3 });

      // Make requests for more phone sets than cache can hold
      for (let i = 0; i < 5; i++) {
        await requestManager.fetchPhones([i], mockFetcher);
      }

      const cacheStats = requestManager.getCacheStats();
      expect(cacheStats.size).toBeLessThanOrEqual(3);
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track comprehensive metrics across request lifecycle', async () => {
      const networkError = new TypeError('Failed to fetch');
      
      (fetch as jest.Mock)
        .mockRejectedValueOnce(networkError) // First request fails
        .mockResolvedValueOnce({ // Second request succeeds
          ok: true,
          json: async () => mockPhones,
        });

      const mockFetcher = jest.fn().mockImplementation(async (phoneIds, signal) => {
        const response = await fetch(`/api/phones/bulk?ids=${phoneIds.join(',')}`, { signal });
        if (!response.ok) throw new Error('Fetch failed');
        return response.json();
      });

      // Failed request
      await expect(requestManager.fetchPhones([1, 2], mockFetcher)).rejects.toThrow();

      // Successful request
      await requestManager.fetchPhones([3, 4], mockFetcher);

      // Cached request
      await requestManager.fetchPhones([3, 4], mockFetcher);

      const stats = performanceMonitor.getStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.successfulRequests).toBe(2);
      expect(stats.failedRequests).toBe(1);
      expect(stats.cacheHitRate).toBeGreaterThan(0);
    });
  });
});