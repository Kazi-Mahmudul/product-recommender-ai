/**
 * Custom hook for managing phone comparison state with enhanced request lifecycle management
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Phone, fetchPhonesBySlugs } from "../api/phones";
import { validateComparisonPhoneSlugs } from "../utils/slugUtils";

export interface ComparisonState {
  phones: Phone[];
  selectedPhoneSlugs: string[];
  isLoading: boolean;
  error: string | null;
  isValidComparison: boolean;
  retryCount: number;
  isRetrying: boolean;
}

export interface ComparisonActions {
  setSelectedPhoneSlugs: (phoneSlugs: string[]) => void;
  addPhone: (phoneSlug: string) => void;
  removePhone: (phoneSlug: string) => void;
  replacePhone: (oldPhoneSlug: string, newPhone: Phone) => void;
  clearError: () => void;
  refreshPhones: () => Promise<void>;
  retryFetch: () => Promise<void>;
}

/**
 * Hook for managing comparison state and phone data fetching with enhanced lifecycle management
 */
export function useComparisonState(
  initialPhoneSlugs: string[] = []
): [ComparisonState, ComparisonActions] {
  const [phones, setPhones] = useState<Phone[]>([]);
  const [selectedPhoneSlugs, setSelectedPhoneSlugs] = useState<string[]>(initialPhoneSlugs);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Refs for tracking request state and preventing race conditions
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestedIdsRef = useRef<string>("");
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  

  // Validate current comparison
  const isValidComparison =
    validateComparisonPhoneSlugs(selectedPhoneSlugs).isValid;

  /**
   * Internal function to fetch phones with proper error handling and lifecycle management
   */
  const fetchPhonesInternal = useCallback(
    async (phoneSlugs: string[], isRetry = false): Promise<void> => {
      if (phoneSlugs.length === 0) {
        if (isMountedRef.current) {
          setPhones([]);
          setIsLoading(false);
          setError(null);
          setRetryCount(0);
          setIsRetrying(false);
        }
        return;
      }

      const slugsString = phoneSlugs.join(",");

      // Prevent duplicate requests for same phone slugs
      if (lastRequestedIdsRef.current === slugsString && !isRetry) {
        console.debug("Skipping duplicate request for phone slugs:", slugsString);
        return;
      }

      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      lastRequestedIdsRef.current = slugsString;

      if (isMountedRef.current) {
        setIsLoading(true);
        setError(null);
        if (isRetry) {
          setIsRetrying(true);
          setRetryCount((prev) => prev + 1);
        } else {
          setRetryCount(0);
          setIsRetrying(false);
        }
      }

      try {
        console.debug(`Fetching phones for comparison: ${slugsString}`);

        // Fetch phones directly by slugs
        const fetchedPhones = await fetchPhonesBySlugs(phoneSlugs, signal);

        // Check if request was cancelled (but allow component to continue if still mounted)
        if (signal.aborted) {
          return;
        }

        // Check if all phones were fetched successfully
        const fetchedSlugs = fetchedPhones.map((phone) => phone.slug);
        const failedSlugs = phoneSlugs.filter((slug) => !fetchedSlugs.includes(slug));

        if (failedSlugs.length > 0) {
          console.warn(
            `Failed to fetch phones with slugs: ${failedSlugs.join(", ")}`
          );

          let errorMessage: string;
          if (failedSlugs.length === 1) {
            errorMessage = `Phone with slug ${failedSlugs[0]} could not be loaded`;
          } else {
            errorMessage = `${failedSlugs.length} phones could not be loaded`;
          }

          // Only show error if we have some successful results, otherwise let the catch block handle it
          if (fetchedPhones.length > 0) {
            setError(errorMessage);
          }
        }

        setPhones(fetchedPhones);
        setRetryCount(0);
        setIsRetrying(false);
      } catch (error: any) {
        // Don't update state if request was cancelled
        if (signal.aborted) {
          return;
        }

        console.error("Error fetching phones for comparison:", error);

        let errorMessage = "Failed to load phone data. Please try again.";

        // Provide more specific error messages based on error type and status code
        if (error.statusCode === 422) {
          errorMessage =
            "Some phone slugs are invalid or no longer available. Please try different phones.";
        } else if (error.statusCode === 404) {
          errorMessage =
            "The requested phones could not be found. They may have been removed.";
        } else if (error.statusCode === 400) {
          errorMessage =
            "Invalid request. Please check the phone selection and try again.";
        } else if (error.message?.includes("ERR_INSUFFICIENT_RESOURCES")) {
          errorMessage =
            "Server is experiencing high load. Please try again in a moment.";
        } else if (error.message?.includes("Failed to fetch")) {
          errorMessage =
            "Network error. Please check your connection and try again.";
        } else if (error.message?.includes("aborted")) {
          // Don't show error for aborted requests
          return;
        }

        setError(errorMessage);
        setPhones([]);
        setIsRetrying(false);

        // If all phones failed to load (e.g., invalid slugs), clear the selection to show empty state
        if (error.statusCode === 422 || error.statusCode === 404) {
          setSelectedPhoneSlugs([]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Update the ref with the latest function
  

  /**
   * Refresh phone data for current selection
   */
  const refreshPhones = useCallback(async (): Promise<void> => {
    await fetchPhonesInternal(selectedPhoneSlugs, false);
  }, [selectedPhoneSlugs, fetchPhonesInternal]);

  /**
   * Retry fetching phones (for manual retry)
   */
  const retryFetch = useCallback(async (): Promise<void> => {
    await fetchPhonesInternal(selectedPhoneSlugs, true);
  }, [selectedPhoneSlugs, fetchPhonesInternal]);

  

  /**
   * Add a phone to the comparison
   */
  const addPhone = useCallback(
    (phoneSlug: string) => {
      if (selectedPhoneSlugs.includes(phoneSlug)) {
        setError("This phone is already in the comparison");
        return;
      }

      if (selectedPhoneSlugs.length >= 5) {
        setError("Maximum 5 phones can be compared at once");
        return;
      }

      const newPhoneSlugs = [...selectedPhoneSlugs, phoneSlug];
      setSelectedPhoneSlugs(newPhoneSlugs);
      setError(null);
    },
    [selectedPhoneSlugs]
  );

  /**
   * Remove a phone from the comparison
   */
  const removePhone = useCallback(
    (phoneSlugToRemove: string) => {
      setSelectedPhoneSlugs(prevSlugs => 
        prevSlugs.filter(slug => slug !== phoneSlugToRemove)
      );
      setError(null);
    },
    []
  );

  /**
   * Replace a phone in the comparison
   */
  const replacePhone = useCallback(
    (oldPhoneSlug: string, newPhone: Phone) => {
      if (!newPhone.slug) {
        setError("Cannot replace phone without a valid slug.");
        return;
      }

      if (selectedPhoneSlugs.includes(newPhone.slug)) {
        setError("This phone is already in the comparison");
        return;
      }

      setSelectedPhoneSlugs(prevSlugs =>
        prevSlugs.map(slug => (slug === oldPhoneSlug ? newPhone.slug! : slug))
      );
      setError(null);
    },
    [selectedPhoneSlugs]
  );

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Clear debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Cleanup completed
    };
  }, []);

  

  useEffect(() => {
    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set up debounced fetch
    debounceTimeoutRef.current = setTimeout(() => {
      if (selectedPhoneSlugs.length > 0) {
        fetchPhonesInternal(selectedPhoneSlugs, false);
      } else {
        // Clear state immediately for empty selection
        if (isMountedRef.current) {
          setPhones([]);
          setIsLoading(false);
          setError(null);
          setRetryCount(0);
          setIsRetrying(false);
        }
        lastRequestedIdsRef.current = "";
      }
    }, 300); // 300ms debounce

    // Cleanup function to clear timeout
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [selectedPhoneSlugs, fetchPhonesInternal]);

  // Add new actions for slug-based operations
  

  

  // Update the state and actions objects
  const state: ComparisonState = {
    phones,
    selectedPhoneSlugs,
    isLoading,
    error,
    isValidComparison,
    retryCount,
    isRetrying
  };

  const actions: ComparisonActions = {
    setSelectedPhoneSlugs,
    addPhone,
    removePhone,
    replacePhone,
    clearError,
    refreshPhones,
    retryFetch
  };

  return [state, actions];
}
