import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchRecommendations,
  SmartRecommendation,
} from "../api/recommendations";
import {
  getCacheItem,
  setCacheItem,
  getRecommendationsCacheKey,
  CACHE_TTL,
  clearExpiredItems,
} from "../utils/cacheManager";

// Constants for retry mechanism
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Validates if a phone ID is valid for API calls
 * @param id - The phone ID to validate
 * @returns boolean indicating if the ID is valid
 */
const isValidPhoneId = (id: number | string | null | undefined): boolean => {
  if (id === undefined || id === null) return false;

  // If it's a string, try to convert it to a number
  const numericId = typeof id === "string" ? parseInt(id, 10) : id;

  // Check if it's a valid number greater than 0
  return !isNaN(numericId) && numericId > 0;
};

/**
 * Checks if an error is likely a network error
 */
const isNetworkError = (error: any): boolean => {
  if (!error) return false;

  // Check for common network error patterns
  if (error.name === "TypeError" && error.message === "Failed to fetch")
    return true;
  if (error.message?.includes("Failed to fetch")) return true;
  if (error.message?.includes("network")) return true;
  if (error.message?.includes("internet")) return true;
  if (error.message?.includes("offline")) return true;
  if (error.message?.includes("connection")) return true;

  return false;
};

/**
 * Hook for fetching phone recommendations with retry mechanism and exponential backoff
 * @param phoneId - The ID of the phone to get recommendations for
 * @returns Object containing recommendations, loading state, error state, retry info, and refetch function
 */
export const useRecommendations = (phoneId: number | string) => {
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>(
    []
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [isNetworkErrorState, setIsNetworkErrorState] =
    useState<boolean>(false);

  // Use refs to track abort controller and retry timeout
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);

  // Function to clear any pending retries
  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current !== null) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Function to abort any in-flight requests
  const abortRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Reset all states
  const resetState = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
    setIsNetworkErrorState(false);
    clearRetryTimeout();
    abortRequest();
  }, [clearRetryTimeout, abortRequest]);

  // Function to fetch recommendations from the API with retry logic
  const fetchRecommendationsData = useCallback(
    async (forceRefresh = false) => {
      // Debug logging
      console.log(
        "fetchRecommendationsData called with phoneId:",
        phoneId,
        "type:",
        typeof phoneId
      );

      // Validate phone ID before making API calls
      if (!isValidPhoneId(phoneId)) {
        console.error("Invalid phone ID detected:", phoneId);
        setError("Invalid phone ID. Please provide a valid phone ID.");
        setLoading(false);
        return;
      }

      // Clear any existing retries and abort in-flight requests
      clearRetryTimeout();
      abortRequest();

      // Create a new abort controller for this request
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setLoading(true);
      setError(null);
      setIsRetrying(false);

      try {
        // Check cache first unless force refresh is requested
        if (!forceRefresh) {
          // Use our cache manager to get cached data
          const cacheKey = getRecommendationsCacheKey(phoneId);
          const cachedData = getCacheItem<SmartRecommendation[]>(cacheKey);

          if (cachedData) {
            setRecommendations(cachedData);
            setLoading(false);
            return;
          }
        }

        // Fetch fresh data with abort signal
        const data = await fetchRecommendations(phoneId, undefined, signal);

        // Filter out recommendations with invalid phone IDs
        const validRecommendations = data.filter(
          (rec) => rec.phone && isValidPhoneId(rec.phone.id)
        );

        // Check if we have any valid recommendations after filtering
        if (validRecommendations.length === 0 && data.length > 0) {
          console.warn(
            "All recommendations had invalid phone IDs. Original data:",
            data
          );
          setError(
            "No valid recommendations found. Please try a different phone."
          );
        } else {
          setRecommendations(validRecommendations);
          setRetryCount(0); // Reset retry count on success

          // Store in cache using our cache manager
          const cacheKey = getRecommendationsCacheKey(phoneId);
          setCacheItem(
            cacheKey,
            validRecommendations,
            CACHE_TTL.RECOMMENDATIONS
          );

          // Periodically clean up expired items
          clearExpiredItems();
        }
      } catch (err: any) {
        // Don't set error state if the request was aborted
        if (err.name === "AbortError") {
          console.log("Request was aborted");
          return;
        }

        // Check if it's a network error
        const networkError = isNetworkError(err);
        setIsNetworkErrorState(networkError);

        // Set the error message
        setError(
          err instanceof Error ? err.message : "Failed to fetch recommendations"
        );

        // Keep the last recommendations if we have them
        // This helps with graceful degradation
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [phoneId, clearRetryTimeout, abortRequest]
  );

  // Function to retry with exponential backoff
  const retryWithBackoff = useCallback(() => {
    if (retryCount >= MAX_RETRIES) {
      // Max retries reached, don't retry anymore
      return;
    }

    setIsRetrying(true);

    // Calculate delay with exponential backoff: 1s, 2s, 4s, etc.
    const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);

    // Clear any existing timeout
    clearRetryTimeout();

    // Set new timeout for retry
    retryTimeoutRef.current = window.setTimeout(() => {
      setRetryCount((prev) => prev + 1);
      fetchRecommendationsData(true); // Force refresh on retry
    }, delay);
  }, [retryCount, fetchRecommendationsData, clearRetryTimeout]);

  // Auto-retry on network errors
  useEffect(() => {
    if (
      error &&
      isNetworkErrorState &&
      !isRetrying &&
      retryCount < MAX_RETRIES
    ) {
      retryWithBackoff();
    }
  }, [error, isNetworkErrorState, isRetrying, retryCount, retryWithBackoff]);

  // Check for cached data on initial load
  useEffect(() => {
    // Skip API calls for invalid phone IDs
    if (!isValidPhoneId(phoneId)) {
      setError("Invalid phone ID. Please provide a valid phone ID.");
      return;
    }

    fetchRecommendationsData();

    // Cleanup function
    return () => {
      clearRetryTimeout();
      abortRequest();
    };
  }, [phoneId, fetchRecommendationsData, clearRetryTimeout, abortRequest]);

  // Manual retry function that resets the retry count
  const manualRetry = useCallback(() => {
    // Skip retry for invalid phone IDs
    if (!isValidPhoneId(phoneId)) {
      setError("Invalid phone ID. Please provide a valid phone ID.");
      return;
    }

    setRetryCount(0);
    setIsRetrying(false);
    fetchRecommendationsData(true); // Force refresh on manual retry
  }, [phoneId, fetchRecommendationsData]);

  return {
    recommendations,
    loading,
    error,
    isNetworkError: isNetworkErrorState,
    retryCount,
    isRetrying,
    refetch: fetchRecommendationsData,
    retry: manualRetry,
    resetError: resetState,
  };
};

export default useRecommendations;
