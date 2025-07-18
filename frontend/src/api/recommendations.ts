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
 * Validates if a phone ID is valid for API calls
 * @param id - The phone ID to validate
 * @returns boolean indicating if the ID is valid
 */
const isValidPhoneId = (id: number | string | null | undefined): boolean => {
  if (id === undefined || id === null) return false;
  
  // If it's a string, try to convert it to a number
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  
  // Check if it's a valid number greater than 0
  return !isNaN(numericId) && numericId > 0;
};

/**
 * Fetches smart phone recommendations for a specific phone
 * @param phoneId - The ID of the phone to get recommendations for
 * @param limit - Optional limit for the number of recommendations (default: 8)
 * @param signal - Optional AbortSignal to cancel the request
 * @returns Promise resolving to an array of SmartRecommendation objects
 */
export async function fetchRecommendations(
  phoneId: number | string, 
  limit: number = 8,
  signal?: AbortSignal
): Promise<SmartRecommendation[]> {
  // Debug logging
  console.log('fetchRecommendations API called with phoneId:', phoneId, 'type:', typeof phoneId);
  
  // Validate phone ID before making API calls
  if (!isValidPhoneId(phoneId)) {
    console.error('API validation failed for phoneId:', phoneId);
    throw new Error('Invalid phone ID. Please provide a valid phone ID.');
  }
  
  // Convert phoneId to number if it's a string
  const numericPhoneId = typeof phoneId === 'string' ? parseInt(phoneId, 10) : phoneId;

  try {
    const response = await fetch(
      `${API_BASE}/api/v1/phones/${numericPhoneId}/recommendations?limit=${limit}`,
      { signal }
    );
    
    if (!response.ok) {
      // Handle different HTTP error codes
      if (response.status === 404) {
        throw new Error(`Phone with ID ${phoneId} not found. Please check the phone ID and try again.`);
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
    
    // Check if all recommendations have invalid IDs (like ID 0)
    const allInvalid = data.length > 0 && data.every(rec => !rec.phone || !isValidPhoneId(rec.phone.id));
    if (allInvalid) {
      console.error('API returned recommendations with all invalid phone IDs:', data);
      throw new Error('The recommendation service returned invalid data. Please try again later.');
    }
    
    // Filter out recommendations with invalid phone IDs
    const validRecommendations = data.filter(rec => rec.phone && isValidPhoneId(rec.phone.id));
    
    // If we filtered out some but not all recommendations, log a warning
    if (validRecommendations.length < data.length && validRecommendations.length > 0) {
      console.warn(`Filtered out ${data.length - validRecommendations.length} invalid recommendations`);
    }
    
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
    
    // Log the error for debugging
    console.error('Recommendation fetch error:', error);
    
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
 * @param phoneId - The ID of the phone to prefetch
 * @returns Promise that resolves when prefetching is complete
 */
export async function prefetchPhoneDetails(phoneId: number | string): Promise<void> {
  // Validate phone ID before making API calls
  if (!isValidPhoneId(phoneId)) {
    console.warn('Invalid phone ID for prefetching:', phoneId);
    return;
  }

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
    
    // Convert phoneId to number if it's a string
    const numericPhoneId = typeof phoneId === 'string' ? parseInt(phoneId, 10) : phoneId;
    
    // Use a timeout to abort the prefetch if it takes too long
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${API_BASE}/api/v1/phones/${numericPhoneId}`, {
      signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      
      // Store in cache using our cache manager
      setCacheItem(cacheKey, data, CACHE_TTL.PHONE_DETAILS);
    } else if (response.status === 404) {
      console.warn(`Phone with ID ${phoneId} not found during prefetch.`);
    } else {
      console.warn(`Failed to prefetch phone details: HTTP error ${response.status}`);
    }
  } catch (error) {
    // Silently fail on prefetch errors (including aborts)
    if (error instanceof Error && error.name !== 'AbortError') {
      console.warn('Prefetch failed:', error);
    }
  }
}