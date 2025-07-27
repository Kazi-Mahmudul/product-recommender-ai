/**
 * Custom hook for managing phone comparison state with enhanced request lifecycle management
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Phone, fetchPhonesByIds } from "../api/phones";
import { validateComparisonPhoneIds } from "../utils/slugUtils";
import { requestManager } from "../services/requestManager";

export interface ComparisonState {
  phones: Phone[];
  selectedPhoneIds: number[];
  isLoading: boolean;
  error: string | null;
  isValidComparison: boolean;
  retryCount: number;
  isRetrying: boolean;
}

export interface ComparisonActions {
  setSelectedPhoneIds: (phoneIds: number[]) => void;
  addPhone: (phoneId: number) => void;
  removePhone: (phoneId: number) => void;
  replacePhone: (oldPhoneId: number, newPhoneId: number) => void;
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
  const [selectedPhoneIds, setSelectedPhoneIds] =
    useState<number[]>(initialPhoneIds);
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

  // Fetch phones when selected IDs change with debouncing
  useEffect(() => {
    if (selectedPhoneIds.length > 0) {
      // Clear any existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Set up debounced fetch
      debounceTimeoutRef.current = setTimeout(() => {
        fetchPhonesInternalRef.current?.(selectedPhoneIds, false);
      }, 300); // 300ms debounce
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

    // Cleanup function to clear timeout
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [selectedPhoneIds]); // Only depend on selectedPhoneIds

  /**
   * Add a phone to the comparison
   */
  const addPhone = useCallback(
    (phoneId: number) => {
      if (selectedPhoneIds.includes(phoneId)) {
        setError("This phone is already in the comparison");
        return;
      }

      if (selectedPhoneIds.length >= 5) {
        setError("Maximum 5 phones can be compared at once");
        return;
      }

      const newPhoneIds = [...selectedPhoneIds, phoneId];
      const validation = validateComparisonPhoneIds(newPhoneIds);

      if (validation.isValid) {
        setSelectedPhoneIds(newPhoneIds);
        setError(null);
      } else {
        setError(validation.errors.join(", "));
      }
    },
    [selectedPhoneIds]
  );

  /**
   * Remove a phone from the comparison
   */
  const removePhone = useCallback(
    (phoneId: number) => {
      const newPhoneIds = selectedPhoneIds.filter((id) => id !== phoneId);
      setSelectedPhoneIds(newPhoneIds);
      setError(null);
    },
    [selectedPhoneIds]
  );

  /**
   * Replace a phone in the comparison
   */
  const replacePhone = useCallback(
    (oldPhoneId: number, newPhoneId: number) => {
      if (newPhoneId === oldPhoneId) return;

      if (selectedPhoneIds.includes(newPhoneId)) {
        setError("This phone is already in the comparison");
        return;
      }

      const newPhoneIds = selectedPhoneIds.map((id) =>
        id === oldPhoneId ? newPhoneId : id
      );
      const validation = validateComparisonPhoneIds(newPhoneIds);

      if (validation.isValid) {
        setSelectedPhoneIds(newPhoneIds);
        setError(null);
      } else {
        setError(validation.errors.join(", "));
      }
    },
    [selectedPhoneIds]
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

  const state: ComparisonState = {
    phones,
    selectedPhoneIds,
    isLoading,
    error,
    isValidComparison,
    retryCount,
    isRetrying,
  };

  const actions: ComparisonActions = {
    setSelectedPhoneIds,
    addPhone,
    removePhone,
    replacePhone,
    clearError,
    refreshPhones,
    retryFetch,
  };

  return [state, actions];
}
