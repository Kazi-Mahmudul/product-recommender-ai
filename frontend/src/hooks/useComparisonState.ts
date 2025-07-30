/**
 * Custom hook for managing phone comparison state with enhanced request lifecycle management
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Phone, fetchPhonesBySlugs, fetchPhonesByIds } from "../api/phones";
import { validateComparisonPhoneIds } from "../utils/slugUtils";
import { requestManager } from "../services/requestManager";

export interface ComparisonState {
  phones: Phone[];
  selectedPhoneIds: number[];
  selectedPhoneSlugs: string[]; // Add this new property
  isLoading: boolean;
  error: string | null;
  isValidComparison: boolean;
  retryCount: number;
  isRetrying: boolean;
}

export interface ComparisonActions {
  setSelectedPhoneIds: (phoneIds: number[]) => void;
  setSelectedPhoneSlugs: (phoneSlugs: string[]) => void; // Add this new action
  addPhone: (phoneSlug: string) => void;
  removePhone: (phoneId: number) => void;
  replacePhone: (oldPhoneId: number, newPhone: Phone) => void;
  clearError: () => void;
  refreshPhones: () => Promise<void>;
  retryFetch: () => Promise<void>;
}

/**
 * Hook for managing comparison state and phone data fetching with enhanced lifecycle management
 */
export function useComparisonState(
  initialPhoneIds: number[] = []
): [ComparisonState, ComparisonActions] {
  const [phones, setPhones] = useState<Phone[]>([]);
  const [selectedPhoneIds, setSelectedPhoneIds] = useState<number[]>(initialPhoneIds);
  const [selectedPhoneSlugs, setSelectedPhoneSlugs] = useState<string[]>([]); // Add this new state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Refs for tracking request state and preventing race conditions
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestedIdsRef = useRef<string>("");
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const fetchPhonesInternalRef =
    useRef<(phoneIds: number[], isRetry?: boolean) => Promise<void>>();

  // Validate current comparison
  const isValidComparison =
    validateComparisonPhoneIds(selectedPhoneIds).isValid;

  /**
   * Internal function to fetch phones with proper error handling and lifecycle management
   */
  const fetchPhonesInternal = useCallback(
    async (phoneIds: number[], isRetry = false): Promise<void> => {
      if (phoneIds.length === 0) {
        if (isMountedRef.current) {
          setPhones([]);
          setIsLoading(false);
          setError(null);
          setRetryCount(0);
          setIsRetrying(false);
        }
        return;
      }

      const idsString = phoneIds.join(",");

      // Prevent duplicate requests for same phone IDs
      if (lastRequestedIdsRef.current === idsString && !isRetry) {
        console.debug("Skipping duplicate request for phone IDs:", idsString);
        return;
      }

      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      lastRequestedIdsRef.current = idsString;

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
        console.debug(`Fetching phones for comparison: ${idsString}`);

        // Use request manager for deduplication and caching
        const fetchedPhones = await requestManager.fetchPhones(
          phoneIds,
          (ids, requestSignal) => fetchPhonesByIds(ids, requestSignal),
          signal
        );

        // Check if request was cancelled (but allow component to continue if still mounted)
        if (signal.aborted) {
          return;
        }

        // Check if all phones were fetched successfully
        const fetchedIds = fetchedPhones.map((phone) => phone.id);
        const failedIds = phoneIds.filter((id) => !fetchedIds.includes(id));

        if (failedIds.length > 0) {
          console.warn(
            `Failed to fetch phones with IDs: ${failedIds.join(", ")}`
          );

          let errorMessage: string;
          if (failedIds.length === 1) {
            errorMessage = `Phone with ID ${failedIds[0]} could not be loaded`;
          } else {
            errorMessage = `${failedIds.length} phones could not be loaded`;
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
            "Some phone IDs are invalid or no longer available. Please try different phones.";
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

        // If all phones failed to load (e.g., invalid IDs), clear the selection to show empty state
        if (error.statusCode === 422 || error.statusCode === 404) {
          setSelectedPhoneIds([]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Update the ref with the latest function
  fetchPhonesInternalRef.current = fetchPhonesInternal;

  /**
   * Refresh phone data for current selection
   */
  const refreshPhones = useCallback(async (): Promise<void> => {
    await fetchPhonesInternal(selectedPhoneIds, false);
  }, [selectedPhoneIds, fetchPhonesInternal]);

  /**
   * Retry fetching phones (for manual retry)
   */
  const retryFetch = useCallback(async (): Promise<void> => {
    await fetchPhonesInternal(selectedPhoneIds, true);
  }, [selectedPhoneIds, fetchPhonesInternal]);

  

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
    (phoneIdToRemove: number) => {
      const phoneToRemove = phones.find(p => p.id === phoneIdToRemove);
      if (phoneToRemove && phoneToRemove.slug) {
        setSelectedPhoneSlugs(prevSlugs => 
          prevSlugs.filter(slug => slug !== phoneToRemove.slug)
        );
      } else {
        // Fallback to ID-based removal if slug not found
        setSelectedPhoneIds(prevIds => prevIds.filter(id => id !== phoneIdToRemove));
      }
      setError(null);
    },
    [phones] // Depend on phones to have access to the latest slugs
  );

  /**
   * Replace a phone in the comparison
   */
  const replacePhone = useCallback(
    (oldPhoneId: number, newPhone: Phone) => {
      if (newPhone.id === oldPhoneId) return;

      const oldPhone = phones.find(p => p.id === oldPhoneId);
      if (!oldPhone || !oldPhone.slug || !newPhone.slug) {
        setError("Cannot replace phone without a valid slug.");
        return;
      }

      if (selectedPhoneSlugs.includes(newPhone.slug)) {
        setError("This phone is already in the comparison");
        return;
      }

      setSelectedPhoneSlugs(prevSlugs =>
        prevSlugs.map(slug => (slug === oldPhone.slug ? newPhone.slug! : slug))
      );
      setError(null);
    },
    [selectedPhoneSlugs, phones]
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

      // Cancel any pending requests in request manager
      requestManager.cancelAllRequests();
    };
  }, []);

  // Add a function to fetch phones by slugs
  const fetchPhonesBySlugsInternal = useCallback(
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
        // Use the existing API function to fetch phones by slugs
        const fetchedPhones = await fetchPhonesBySlugs(phoneSlugs, signal);

        if (isMountedRef.current) {
          setPhones(fetchedPhones);
          // Update the IDs based on the fetched phones
          setSelectedPhoneIds(fetchedPhones.map(phone => phone.id));
          setIsLoading(false);
          setError(null);
          setIsRetrying(false);
        }
      } catch (error) {
        console.error("Error fetching phones by slugs:", error);

        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRetrying(false);
          setError("Failed to load phone data. Please try again.");
        }
      }
    },
    []
  );

  useEffect(() => {
    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set up debounced fetch
    debounceTimeoutRef.current = setTimeout(() => {
      if (selectedPhoneSlugs.length > 0) {
        fetchPhonesBySlugsInternal(selectedPhoneSlugs, false);
      } else if (selectedPhoneIds.length > 0) {
        // Fallback to IDs if slugs are not available
        fetchPhonesInternalRef.current?.(selectedPhoneIds, false);
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
  }, [selectedPhoneSlugs, selectedPhoneIds, fetchPhonesBySlugsInternal]);

  // Add new actions for slug-based operations
  

  

  // Update the state and actions objects
  const state: ComparisonState = {
    phones,
    selectedPhoneIds,
    selectedPhoneSlugs,
    isLoading,
    error,
    isValidComparison,
    retryCount,
    isRetrying
  };

  const actions: ComparisonActions = {
    setSelectedPhoneIds,
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
