/**
 * Request management service for deduplication and caching
 * Prevents duplicate API requests and caches results
 */

import { Phone } from '../api/phones';
import { performanceMonitor } from '../utils/performanceMonitor';

export interface CacheEntry {
  data: Phone[];
  timestamp: number;
  ttl: number;
  requestId: string;
}

export interface PendingRequest {
  promise: Promise<Phone[]>;
  abortController: AbortController;
  requestId: string;
  phoneIds: number[];
}

export interface RequestManagerConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxCacheSize: number;
  enableCache: boolean;
}

export const DEFAULT_REQUEST_CONFIG: RequestManagerConfig = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxCacheSize: 100,
  enableCache: true,
};

export class RequestManager {
  private cache = new Map<string, CacheEntry>();
  private pendingRequests = new Map<string, PendingRequest>();
  private config: RequestManagerConfig;

  constructor(config: Partial<RequestManagerConfig> = {}) {
    this.config = { ...DEFAULT_REQUEST_CONFIG, ...config };
  }

  /**
   * Generates a unique fingerprint for a request based on phone IDs
   */
  private generateRequestFingerprint(phoneIds: number[]): string {
    return phoneIds.sort((a, b) => a - b).join(',');
  }

  /**
   * Generates a unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Checks if cache entry is still valid
   */
  private isCacheEntryValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Cleans up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp >= entry.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });
  }

  /**
   * Enforces cache size limit by removing oldest entries
   */
  private enforceCacheLimit(): void {
    if (this.cache.size <= this.config.maxCacheSize) return;

    // Convert to array and sort by timestamp (oldest first)
    const entries: Array<[string, CacheEntry]> = [];
    this.cache.forEach((value, key) => {
      entries.push([key, value]);
    });
    
    entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);

    // Remove oldest entries until we're under the limit
    const entriesToRemove = entries.slice(0, this.cache.size - this.config.maxCacheSize);
    entriesToRemove.forEach(([key]) => {
      this.cache.delete(key);
    });
  }

  /**
   * Gets cached data if available and valid
   */
  private getCachedData(fingerprint: string): Phone[] | null {
    if (!this.config.enableCache) return null;

    const entry = this.cache.get(fingerprint);
    if (!entry || !this.isCacheEntryValid(entry)) {
      if (entry) {
        this.cache.delete(fingerprint);
      }
      return null;
    }

    return entry.data;
  }

  /**
   * Stores data in cache
   */
  private setCachedData(
    fingerprint: string,
    data: Phone[],
    requestId: string,
    ttl?: number
  ): void {
    if (!this.config.enableCache) return;

    this.cleanupExpiredEntries();
    this.enforceCacheLimit();

    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      requestId,
    };

    this.cache.set(fingerprint, entry);
  }

  /**
   * Checks if a request is currently pending
   */
  isRequestPending(phoneIds: number[]): boolean {
    const fingerprint = this.generateRequestFingerprint(phoneIds);
    return this.pendingRequests.has(fingerprint);
  }

  /**
   * Gets pending request if it exists
   */
  private getPendingRequest(fingerprint: string): PendingRequest | null {
    return this.pendingRequests.get(fingerprint) || null;
  }

  /**
   * Adds a pending request
   */
  private addPendingRequest(
    fingerprint: string,
    promise: Promise<Phone[]>,
    abortController: AbortController,
    phoneIds: number[]
  ): void {
    const requestId = this.generateRequestId();
    const pendingRequest: PendingRequest = {
      promise,
      abortController,
      requestId,
      phoneIds,
    };

    this.pendingRequests.set(fingerprint, pendingRequest);

    // Clean up when request completes (success or failure)
    promise.finally(() => {
      this.pendingRequests.delete(fingerprint);
    });
  }

  /**
   * Fetches phones with deduplication and caching
   */
  async fetchPhones(
    phoneIds: number[],
    fetcher: (phoneIds: number[], signal: AbortSignal) => Promise<Phone[]>,
    signal?: AbortSignal,
    ttl?: number
  ): Promise<Phone[]> {
    if (phoneIds.length === 0) return [];

    const fingerprint = this.generateRequestFingerprint(phoneIds);

    // Check if request was aborted
    if (signal?.aborted) {
      throw new Error('Request aborted');
    }

    // Check cache first
    const cachedData = this.getCachedData(fingerprint);
    if (cachedData) {
      console.debug(`Cache hit for phones: ${fingerprint}`);
      
      // Track cache hit
      const requestId = this.generateRequestId();
      performanceMonitor.startRequest(requestId, phoneIds, true);
      performanceMonitor.completeRequest(requestId);
      
      return cachedData;
    }

    // Check if request is already pending
    const pendingRequest = this.getPendingRequest(fingerprint);
    if (pendingRequest) {
      console.debug(`Request already pending for phones: ${fingerprint}`);
      
      // If we have an external abort signal, we need to handle it
      if (signal) {
        const abortHandler = () => {
          // Don't cancel the original request, just reject this promise
          throw new Error('Request aborted');
        };
        
        signal.addEventListener('abort', abortHandler, { once: true });
        
        try {
          const result = await pendingRequest.promise;
          signal.removeEventListener('abort', abortHandler);
          return result;
        } catch (error) {
          signal.removeEventListener('abort', abortHandler);
          throw error;
        }
      }
      
      return pendingRequest.promise;
    }

    // Create new request
    const abortController = new AbortController();
    const requestSignal = abortController.signal;

    // If external signal is provided, forward abort
    if (signal) {
      const abortHandler = () => {
        abortController.abort();
      };
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    console.debug(`Making new request for phones: ${fingerprint}`);

    // Start performance tracking
    const requestId = this.generateRequestId();
    performanceMonitor.startRequest(requestId, phoneIds, false);

    const requestPromise = fetcher(phoneIds, requestSignal)
      .then((data) => {
        // Track successful completion
        performanceMonitor.completeRequest(requestId);
        
        // Cache successful result
        this.setCachedData(fingerprint, data, requestId, ttl);
        return data;
      })
      .catch((error) => {
        // Track failure
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          performanceMonitor.cancelRequest(requestId);
        } else {
          performanceMonitor.failRequest(requestId, error.message || 'Unknown error');
        }
        
        // Don't cache errors, just propagate them
        throw error;
      });

    // Add to pending requests
    this.addPendingRequest(fingerprint, requestPromise, abortController, phoneIds);

    return requestPromise;
  }

  /**
   * Cancels a specific request by phone IDs
   */
  cancelRequest(phoneIds: number[]): boolean {
    const fingerprint = this.generateRequestFingerprint(phoneIds);
    const pendingRequest = this.pendingRequests.get(fingerprint);

    if (pendingRequest) {
      console.debug(`Cancelling request for phones: ${fingerprint}`);
      pendingRequest.abortController.abort();
      this.pendingRequests.delete(fingerprint);
      return true;
    }

    return false;
  }

  /**
   * Cancels all pending requests
   */
  cancelAllRequests(): void {
    console.debug(`Cancelling ${this.pendingRequests.size} pending requests`);
    
    this.pendingRequests.forEach((request, fingerprint) => {
      request.abortController.abort();
    });
    
    this.pendingRequests.clear();
  }

  /**
   * Clears the cache
   */
  clearCache(): void {
    console.debug(`Clearing cache with ${this.cache.size} entries`);
    this.cache.clear();
  }

  /**
   * Clears cache for specific phone IDs
   */
  clearCacheForPhones(phoneIds: number[]): void {
    const fingerprint = this.generateRequestFingerprint(phoneIds);
    if (this.cache.has(fingerprint)) {
      console.debug(`Clearing cache for phones: ${fingerprint}`);
      this.cache.delete(fingerprint);
    }
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ fingerprint: string; timestamp: number; ttl: number; isValid: boolean }>;
  } {
    const entries: Array<{ fingerprint: string; timestamp: number; ttl: number; isValid: boolean }> = [];
    
    this.cache.forEach((entry, fingerprint) => {
      entries.push({
        fingerprint,
        timestamp: entry.timestamp,
        ttl: entry.ttl,
        isValid: this.isCacheEntryValid(entry),
      });
    });

    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      hitRate: 0, // Would need to track hits/misses to calculate this
      entries,
    };
  }

  /**
   * Gets pending request statistics
   */
  getPendingRequestStats(): {
    count: number;
    requests: Array<{ fingerprint: string; phoneIds: number[]; requestId: string }>;
  } {
    const requests: Array<{ fingerprint: string; phoneIds: number[]; requestId: string }> = [];
    
    this.pendingRequests.forEach((request, fingerprint) => {
      requests.push({
        fingerprint,
        phoneIds: request.phoneIds,
        requestId: request.requestId,
      });
    });

    return {
      count: this.pendingRequests.size,
      requests,
    };
  }

  /**
   * Updates configuration
   */
  updateConfig(newConfig: Partial<RequestManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // If cache was disabled, clear it
    if (!this.config.enableCache) {
      this.clearCache();
    }
    
    // If cache size was reduced, enforce new limit
    this.enforceCacheLimit();
  }

  /**
   * Gets current configuration
   */
  getConfig(): RequestManagerConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const requestManager = new RequestManager();