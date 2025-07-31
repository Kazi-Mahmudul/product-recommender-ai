import { useCallback, useRef } from 'react';
import { prefetchPhoneDetails } from '../api/recommendations';
import { getCacheItem, getPhoneDetailsCacheKey } from '../utils/cacheManager';

/**
 * Hook for prefetching phone details on hover
 * @returns Object containing prefetch function
 */
export const usePrefetch = () => {
  // Use useRef to maintain the set across renders but not trigger re-renders
  const prefetchedPhonesRef = useRef<Set<string>>(new Set());
  
  // Track prefetch in progress to avoid duplicate requests
  const prefetchInProgressRef = useRef<Set<string>>(new Set());
  
  /**
   * Prefetch phone details when hovering over a recommendation card
   * @param phoneId - The ID of the phone to prefetch
   */
  const prefetchPhone = useCallback((phoneSlug: string) => {
    // Skip if already prefetched or in progress
    if (
      prefetchedPhonesRef.current.has(phoneSlug) || 
      prefetchInProgressRef.current.has(phoneSlug)
    ) {
      return;
    }
    
    // Check if data is already in cache
    const cacheKey = getPhoneDetailsCacheKey(phoneSlug);
    const cachedData = getCacheItem(cacheKey);
    
    if (cachedData) {
      // Data is already cached, no need to prefetch
      prefetchedPhonesRef.current.add(phoneSlug);
      return;
    }
    
    // Mark as in progress
    prefetchInProgressRef.current.add(phoneSlug);
    
    // Use requestIdleCallback if available for better performance
    const startPrefetch = () => {
      prefetchPhoneDetails(phoneSlug)
        .then(() => {
          // Successfully prefetched, add to prefetched set
          prefetchedPhonesRef.current.add(phoneSlug);
        })
        .catch(() => {
          // If prefetch fails, we'll try again next time
          console.warn(`Failed to prefetch phone ${phoneSlug}`);
        })
        .finally(() => {
          // Remove from in-progress set regardless of outcome
          prefetchInProgressRef.current.delete(phoneSlug);
        });
    };
    
    // Use requestIdleCallback if available, otherwise use setTimeout with a small delay
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(startPrefetch, { timeout: 2000 });
    } else {
      // Fallback to setTimeout with a small delay to not block main thread
      setTimeout(startPrefetch, 100);
    }
  }, []);

  return { prefetchPhone };
};

export default usePrefetch;