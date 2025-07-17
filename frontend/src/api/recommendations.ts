import { Phone } from './phones';
import { getCacheItem, setCacheItem, getPhoneDetailsCacheKey, CACHE_TTL } from '../utils/cacheManager';

// API base URL from environment variables
const API_BASE = process.env.REACT_APP_API_BASE || "/api";

// Define the interface for the recommendation data
export interface SmartRecommendation {
  phone: Phone;
  similarityScore: number;
  highlights: string[];
  badges: string[];
  matchReasons: string[];
}

/**
 * Fetches smart phone recommendations for a specific phone
 * @param phoneId - The ID of the phone to get recommendations for
 * @param limit - Optional limit for the number of recommendations (default: 8)
 * @param signal - Optional AbortSignal to cancel the request
 * @returns Promise resolving to an array of SmartRecommendation objects
 */
export async function fetchRecommendations(
  phoneId: number, 
  limit: number = 8,
  signal?: AbortSignal
): Promise<SmartRecommendation[]> {
  try {
    const response = await fetch(
      `${API_BASE}/api/v1/phones/${phoneId}/recommendations?limit=${limit}`,
      { signal }
    );
    
    if (!response.ok) {
      // Handle different HTTP error codes
      if (response.status === 404) {
        throw new Error('Phone not found');
      } else if (response.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      } else if (response.status >= 500) {
        throw new Error('Server error. Our team has been notified.');
      } else {
        throw new Error(`Failed to fetch recommendations: ${response.status}`);
      }
    }
    
    return response.json();
  } catch (error) {
    // Re-throw AbortError as is
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    
    // Check for network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Network error. Please check your internet connection.');
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Prefetches phone details for faster navigation
 * @param phoneId - The ID of the phone to prefetch
 * @returns Promise that resolves when prefetching is complete
 */
export async function prefetchPhoneDetails(phoneId: number): Promise<void> {
  // Check if we already have this phone in cache and it's not expired
  const cacheKey = getPhoneDetailsCacheKey(phoneId);
  const cachedData = getCacheItem(cacheKey);
  
  if (cachedData) {
    // Cache is valid, no need to prefetch again
    return;
  }
  
  try {
    // Add a low priority hint to the fetch request
    const controller = new AbortController();
    const signal = controller.signal;
    
    // Use a timeout to abort the prefetch if it takes too long
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${API_BASE}/api/v1/phones/${phoneId}`, {
      signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      
      // Store in cache using our cache manager
      setCacheItem(cacheKey, data, CACHE_TTL.PHONE_DETAILS);
    }
  } catch (error) {
    // Silently fail on prefetch errors (including aborts)
    if (error instanceof Error && error.name !== 'AbortError') {
      console.warn('Prefetch failed:', error);
    }
  }
}