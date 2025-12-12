import { Phone } from './phones';
import { getCacheItem, setCacheItem, getPhoneDetailsCacheKey, CACHE_TTL } from '../utils/cacheManager';
import { chatAPIService, ChatQueryRequest, ChatResponse } from './chat';

// API base URL from environment variables
// API base URL from environment variables
let API_BASE = process.env.REACT_APP_API_BASE || "/api";
// Removed forced HTTPS upgrade to allow local development
// if (API_BASE.startsWith('http://')) {
//   API_BASE = API_BASE.replace('http://', 'https://');
// }

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
    // Ensure no double slashes in URL
    const baseUrl = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const response = await fetch(
      `${baseUrl}/api/v1/phones/slug/${phoneSlug}/recommendations?limit=${limit}`,
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

    // Ensure no double slashes in URL
    const baseUrl = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const response = await fetch(`${baseUrl}/api/v1/phones/slug/${phoneSlug}`, {
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
/**
 
* RAG-enhanced phone recommendations based on natural language queries
 * @param query - Natural language query describing phone preferences
 * @param conversationHistory - Optional conversation history for context
 * @param sessionId - Optional session ID for tracking
 * @returns Promise resolving to ChatResponse with recommendations
 */
export async function fetchRAGRecommendations(
  query: string,
  conversationHistory?: Array<{ type: 'user' | 'assistant'; content: string }>,
  sessionId?: string
): Promise<ChatResponse> {
  try {
    const ragRequest: ChatQueryRequest = {
      query,
      conversation_history: conversationHistory,
      session_id: sessionId
    };

    const response = await chatAPIService.sendChatQuery(ragRequest);

    // Ensure we got recommendations
    if (response.response_type !== 'recommendations') {
      throw new Error('Expected recommendations but got different response type');
    }

    return response;
  } catch (error) {
    console.error('RAG recommendations failed:', error);
    throw error;
  }
}

/**
 * Enhanced smart recommendations that combines traditional and RAG approaches
 * @param phoneSlug - The slug of the phone to get recommendations for
 * @param limit - Number of recommendations to return
 * @param useRAG - Whether to enhance with RAG analysis
 * @param signal - AbortSignal for cancellation
 * @returns Promise resolving to enhanced recommendations
 */
export async function fetchEnhancedRecommendations(
  phoneSlug: string,
  limit: number = 8,
  useRAG: boolean = true,
  signal?: AbortSignal
): Promise<SmartRecommendation[]> {
  try {
    // Get traditional recommendations first
    const traditionalRecs = await fetchRecommendations(phoneSlug, limit, signal);

    if (!useRAG || traditionalRecs.length === 0) {
      return traditionalRecs;
    }

    // Enhance with RAG analysis
    const phoneNames = traditionalRecs.map(rec => rec.phone.name).slice(0, 5);
    const ragQuery = `Analyze and provide insights for these phone recommendations: ${phoneNames.join(', ')}. Explain why each phone might be a good alternative and what makes them similar or different.`;

    try {
      const ragResponse = await chatAPIService.sendRAGQuery({
        query: ragQuery,
        session_id: `recommendations-${Date.now()}`
      });

      // If RAG provides additional insights, enhance the recommendations
      if (ragResponse.content.text) {
        // Try to extract insights for each phone
        const insights = extractPhoneInsights(ragResponse.content.text, phoneNames);

        // Enhance recommendations with RAG insights
        return traditionalRecs.map((rec, index) => ({
          ...rec,
          highlights: [
            ...rec.highlights,
            ...(insights[rec.phone.name] || [])
          ].slice(0, 4), // Limit to 4 highlights
          matchReasons: [
            ...rec.matchReasons,
            ...(insights[rec.phone.name] || [])
          ].slice(0, 3) // Limit to 3 match reasons
        }));
      }
    } catch (ragError) {
      console.warn('RAG enhancement failed, returning traditional recommendations:', ragError);
    }

    return traditionalRecs;
  } catch (error) {
    console.error('Enhanced recommendations failed:', error);
    throw error;
  }
}

/**
 * Get contextual phone recommendations based on user preferences
 * @param preferences - User preferences object
 * @param context - Additional context for recommendations
 * @returns Promise resolving to contextual recommendations
 */
export async function fetchContextualRecommendations(
  preferences: {
    budget?: number;
    usage?: string; // 'gaming', 'photography', 'business', 'casual'
    brand?: string;
    features?: string[]; // ['camera', 'battery', 'performance', 'display']
    size?: 'compact' | 'standard' | 'large';
  },
  context?: string
): Promise<ChatResponse> {
  try {
    // Build natural language query from preferences
    let query = 'I need phone recommendations';

    if (preferences.budget) {
      query += ` under ৳${preferences.budget.toLocaleString()}`;
    }

    if (preferences.usage) {
      query += ` for ${preferences.usage}`;
    }

    if (preferences.brand) {
      query += ` from ${preferences.brand}`;
    }

    if (preferences.features && preferences.features.length > 0) {
      query += ` with good ${preferences.features.join(', ')}`;
    }

    if (preferences.size) {
      query += ` in ${preferences.size} size`;
    }

    if (context) {
      query += `. Additional context: ${context}`;
    }

    return await fetchRAGRecommendations(query);
  } catch (error) {
    console.error('Contextual recommendations failed:', error);
    throw error;
  }
}

/**
 * Get alternative phones for a specific phone using RAG
 * @param phoneSlug - The slug of the reference phone
 * @param alternativeType - Type of alternatives to find
 * @returns Promise resolving to alternative recommendations
 */
export async function fetchPhoneAlternatives(
  phoneSlug: string,
  alternativeType: 'similar' | 'cheaper' | 'better' | 'different_brand' = 'similar'
): Promise<ChatResponse> {
  try {
    // First get the phone details to build context
    const baseUrl = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const phoneResponse = await fetch(`${baseUrl}/api/v1/phones/slug/${phoneSlug}`);

    if (!phoneResponse.ok) {
      throw new Error('Failed to fetch phone details');
    }

    const phone = await phoneResponse.json();

    // Build query based on alternative type
    let query = '';
    switch (alternativeType) {
      case 'similar':
        query = `Find phones similar to ${phone.name} with comparable features and performance`;
        break;
      case 'cheaper':
        query = `Find cheaper alternatives to ${phone.name} that offer good value`;
        break;
      case 'better':
        query = `Find better phones than ${phone.name} with improved features or performance`;
        break;
      case 'different_brand':
        query = `Find phones from different brands that compete with ${phone.name}`;
        break;
    }

    if (phone.price_original) {
      query += ` (reference price: ৳${phone.price_original.toLocaleString()})`;
    }

    return await fetchRAGRecommendations(query);
  } catch (error) {
    console.error('Phone alternatives failed:', error);
    throw error;
  }
}

/**
 * Helper function to extract phone insights from RAG response text
 * @param text - RAG response text
 * @param phoneNames - Array of phone names to extract insights for
 * @returns Object mapping phone names to insights
 */
function extractPhoneInsights(text: string, phoneNames: string[]): Record<string, string[]> {
  const insights: Record<string, string[]> = {};

  phoneNames.forEach(phoneName => {
    const phoneInsights: string[] = [];

    // Look for mentions of the phone in the text
    const phoneRegex = new RegExp(`${phoneName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.]*[.]`, 'gi');
    const matches = text.match(phoneRegex);

    if (matches) {
      matches.forEach(match => {
        // Extract key insights from the sentence
        const sentence = match.trim();
        if (sentence.length > 20 && sentence.length < 150) {
          // Clean up the sentence
          const cleanSentence = sentence
            .replace(phoneName, '')
            .replace(/^[^a-zA-Z]*/, '')
            .trim();

          if (cleanSentence.length > 10) {
            phoneInsights.push(cleanSentence);
          }
        }
      });
    }

    if (phoneInsights.length > 0) {
      insights[phoneName] = phoneInsights.slice(0, 2); // Limit to 2 insights per phone
    }
  });

  return insights;
}

/**
 * Test RAG recommendations functionality
 * @returns Promise resolving to test results
 */
export async function testRAGRecommendations(): Promise<{
  ragRecommendations: boolean;
  traditionalRecommendations: boolean;
  enhancedRecommendations: boolean;
}> {
  const results = {
    ragRecommendations: false,
    traditionalRecommendations: false,
    enhancedRecommendations: false
  };

  try {
    // Test RAG recommendations
    const ragTest = await fetchRAGRecommendations('best phone under 30000 taka');
    results.ragRecommendations = ragTest.response_type === 'recommendations';
  } catch (error) {
    console.warn('RAG recommendations test failed:', error);
  }

  try {
    // Test traditional recommendations (need a valid phone slug)
    // This is a placeholder - in real usage, you'd use an actual phone slug
    const traditionalTest = await fetchRecommendations('test-phone-slug', 3);
    results.traditionalRecommendations = Array.isArray(traditionalTest);
  } catch (error) {
    console.warn('Traditional recommendations test failed:', error);
  }

  try {
    // Test enhanced recommendations
    const enhancedTest = await fetchEnhancedRecommendations('test-phone-slug', 3, true);
    results.enhancedRecommendations = Array.isArray(enhancedTest);
  } catch (error) {
    console.warn('Enhanced recommendations test failed:', error);
  }

  return results;
}