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
 * Validates if a phone slug is valid for API calls
 * @param slug - The phone slug to validate
 * @returns boolean indicating if the slug is valid
 */
const isValidPhoneSlug = (slug: string | null | undefined): boolean => {
  if (slug === undefined || slug === null || slug.trim() === '') return false;
  // Basic slug validation: non-empty string, no leading/trailing spaces
  // More complex validation (e.g., regex for allowed characters) can be added if needed
  return true;
};

/**
 * Fetches smart phone recommendations for a specific phone
 * @param phoneId - The ID of the phone to get recommendations for
 * @param limit - Optional limit for the number of recommendations (default: 8)
 * @param signal - Optional AbortSignal to cancel the request
 * @returns Promise resolving to an array of SmartRecommendation objects
 */
export async function fetchRecommendations(
  phoneSlug: string, 
  limit: number = 8,
  signal?: AbortSignal
): Promise<SmartRecommendation[]> {
  // Validate phone slug before making API calls
  if (!isValidPhoneSlug(phoneSlug)) {
    throw new Error('Invalid phone slug. Please provide a valid phone slug.');
  }
  
  try {
    const response = await fetch(
      `${API_BASE}/api/v1/phones/slug/${phoneSlug}/recommendations?limit=${limit}`,
      { signal }
    );
    
    if (!response.ok) {
      // Handle different HTTP error codes
      if (response.status === 404) {
        throw new Error(`Phone with slug ${phoneSlug} not found. Please check the phone slug and try again.`);
      } else if (response.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      } else if (response.status === 400) {
        throw new Error('Invalid request. Please check your parameters and try again.');
      } else if (response.status === 401) {
        throw new Error('Authentication required. Please log in and try again.');
      } else if (response.status === 403) {
        throw new Error('Access denied. You do not have permission to access this resource.');
      } else if (response.status >= 500) {
        throw new Error('Server error. Our team has been notified. Please try again later.');
      } else {
        throw new Error(`Failed to fetch recommendations: HTTP error ${response.status}`);
      }
    }
    
    const data = await response.json();
    
    // Validate the response data
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format. Expected an array of recommendations.');
    }
    
    // Check if all recommendations have invalid slugs
    const allInvalid = data.length > 0 && data.every(rec => !rec.phone || !isValidPhoneSlug(rec.phone.slug));
    if (allInvalid) {
      throw new Error('The recommendation service returned invalid data. Please try again later.');
    }
    
    // Filter out recommendations with invalid phone slugs
    const validRecommendations = data.filter(rec => rec.phone && isValidPhoneSlug(rec.phone.slug));
    
    return validRecommendations;
  } catch (error) {
    // Re-throw AbortError as is
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    
    // Check for network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Network error. Please check your internet connection and try again.');
    }
    
    // Re-throw the error with a more descriptive message if it's not already an Error object
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unexpected error occurred while fetching recommendations.');
    }
  }
}

/**
 * Prefetches phone details for faster navigation
 * @param phoneSlug - The slug of the phone to prefetch
 * @returns Promise that resolves when prefetching is complete
 */
export async function prefetchPhoneDetails(phoneSlug: string): Promise<void> {
  // Validate phone slug before making API calls
  if (!isValidPhoneSlug(phoneSlug)) {
    return;
  }

  // Check if we already have this phone in cache and it's not expired
  const cacheKey = getPhoneDetailsCacheKey(phoneSlug);
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
    
    const response = await fetch(`${API_BASE}/api/v1/phones/slug/${phoneSlug}`, {
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
  }
}