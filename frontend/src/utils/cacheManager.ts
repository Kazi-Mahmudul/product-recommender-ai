/**
 * Cache Manager Utility
 *
 * This utility provides a centralized way to manage caching for the application.
 * It supports both localStorage and memory caching with TTL (Time To Live).
 */

// Type for cached items
interface CachedItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

// In-memory cache
const memoryCache = new Map<string, CachedItem<any>>();

/**
 * Sets an item in the cache (both localStorage and memory)
 *
 * @param key - The cache key
 * @param data - The data to cache
 * @param ttl - Time to live in milliseconds (default: 1 hour)
 * @param storageType - Where to store the cache ('local', 'memory', 'both')
 */
export function setCacheItem<T>(
  key: string,
  data: T,
  ttl: number = 3600000, // Default: 1 hour
  storageType: "local" | "memory" | "both" = "both"
): void {
  const item: CachedItem<T> = {
    data,
    timestamp: Date.now(),
    ttl,
  };

  // Store in memory cache
  if (storageType === "memory" || storageType === "both") {
    memoryCache.set(key, item);
  }

  // Store in localStorage
  if (storageType === "local" || storageType === "both") {
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.warn("Failed to store item in localStorage:", error);

      // If localStorage fails (e.g., quota exceeded), ensure it's at least in memory
      if (storageType === "both") {
        memoryCache.set(key, item);
      }
    }
  }
}

/**
 * Gets an item from the cache
 *
 * @param key - The cache key
 * @param preferMemory - Whether to check memory cache first (default: true)
 * @returns The cached data or null if not found or expired
 */
export function getCacheItem<T>(
  key: string,
  preferMemory: boolean = true
): T | null {
  // Check order based on preference
  const checkOrder = preferMemory ? ["memory", "local"] : ["local", "memory"];

  for (const storageType of checkOrder) {
    // Check memory cache
    if (storageType === "memory") {
      const memoryItem = memoryCache.get(key);

      if (memoryItem) {
        // Check if expired
        if (Date.now() - memoryItem.timestamp < memoryItem.ttl) {
          return memoryItem.data;
        } else {
          // Remove expired item
          memoryCache.delete(key);
        }
      }
    }

    // Check localStorage
    if (storageType === "local") {
      try {
        const localItem = localStorage.getItem(key);

        if (localItem) {
          const parsedItem: CachedItem<T> = JSON.parse(localItem);

          // Check if expired
          if (Date.now() - parsedItem.timestamp < parsedItem.ttl) {
            // If found in localStorage but not in memory, add to memory for faster access next time
            if (preferMemory && !memoryCache.has(key)) {
              memoryCache.set(key, parsedItem);
            }
            return parsedItem.data;
          } else {
            // Remove expired item
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.warn("Failed to retrieve item from localStorage:", error);
      }
    }
  }

  return null;
}

/**
 * Removes an item from the cache
 *
 * @param key - The cache key
 * @param storageType - Where to remove the cache from ('local', 'memory', 'both')
 */
export function removeCacheItem(
  key: string,
  storageType: "local" | "memory" | "both" = "both"
): void {
  if (storageType === "memory" || storageType === "both") {
    memoryCache.delete(key);
  }

  if (storageType === "local" || storageType === "both") {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("Failed to remove item from localStorage:", error);
    }
  }
}

/**
 * Invalidates all cache items that match a pattern
 *
 * @param pattern - Regular expression pattern to match keys
 * @param storageType - Where to invalidate the cache from ('local', 'memory', 'both')
 */
export function invalidateCacheByPattern(
  pattern: RegExp,
  storageType: "local" | "memory" | "both" = "both"
): void {
  // Invalidate memory cache
  if (storageType === "memory" || storageType === "both") {
    // Convert keys to array first to avoid iterator issues
    Array.from(memoryCache.keys()).forEach((key) => {
      if (pattern.test(key)) {
        memoryCache.delete(key);
      }
    });
  }

  // Invalidate localStorage
  if (storageType === "local" || storageType === "both") {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && pattern.test(key)) {
          keysToRemove.push(key);
        }
      }

      // Remove keys in a separate loop to avoid issues with changing indices
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.warn("Failed to invalidate localStorage items:", error);
    }
  }
}

/**
 * Clears all expired items from the cache
 *
 * @param storageType - Where to clear expired items from ('local', 'memory', 'both')
 */
export function clearExpiredItems(
  storageType: "local" | "memory" | "both" = "both"
): void {
  const now = Date.now();

  // Clear expired items from memory cache
  if (storageType === "memory" || storageType === "both") {
    // Convert entries to array first to avoid iterator issues
    Array.from(memoryCache.entries()).forEach(([key, item]) => {
      if (now - item.timestamp >= item.ttl) {
        memoryCache.delete(key);
      }
    });
  }

  // Clear expired items from localStorage
  if (storageType === "local" || storageType === "both") {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            const item = JSON.parse(localStorage.getItem(key) || "");
            if (
              item &&
              item.timestamp &&
              item.ttl &&
              now - item.timestamp >= item.ttl
            ) {
              keysToRemove.push(key);
            }
          } catch (e) {
            // Skip non-cache items or invalid JSON
          }
        }
      }

      // Remove keys in a separate loop
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.warn("Failed to clear expired localStorage items:", error);
    }
  }
}

/**
 * Gets the cache key for phone recommendations
 *
 * @param phoneId - The ID of the phone
 * @returns The cache key
 */
export function getRecommendationsCacheKey(phoneId: number | string): string {
  return `phone_recommendations_${phoneId}`;
}

/**
 * Gets the cache key for phone details
 *
 * @param phoneId - The ID of the phone
 * @returns The cache key
 */
export function getPhoneDetailsCacheKey(phoneId: number | string): string {
  return `phone_details_${phoneId}`;
}

// Constants for TTL values
export const CACHE_TTL = {
  RECOMMENDATIONS: 3600000, // 1 hour
  PHONE_DETAILS: 900000, // 15 minutes
  SEARCH_RESULTS: 1800000, // 30 minutes
};
