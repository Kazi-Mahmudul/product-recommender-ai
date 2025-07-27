/**
 * Unit tests for useComparisonState hook
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useComparisonState } from "../useComparisonState";
import { Phone } from "../../api/phones";

// Mock the dependencies
jest.mock("../../api/phones", () => ({
  fetchPhonesByIds: jest.fn(),
}));

jest.mock("../../services/requestManager", () => ({
  requestManager: {
    fetchPhones: jest.fn(),
    cancelAllRequests: jest.fn(),
  },
}));

jest.mock("../../utils/slugUtils", () => ({
  validateComparisonPhoneIds: jest.fn(),
}));

const mockPhones: Phone[] = [
  {
    id: 1,
    name: "Phone 1",
    brand: "Brand A",
    model: "Model 1",
    price: "$100",
    url: "/phone1",
  },
  {
    id: 2,
    name: "Phone 2",
    brand: "Brand B",
    model: "Model 2",
    price: "$200",
    url: "/phone2",
  },
];

describe("useComparisonState", () => {
  const { fetchPhonesByIds } = require("../../api/phones");
  const { requestManager } = require("../../services/requestManager");
  const { validateComparisonPhoneIds } = require("../../utils/slugUtils");

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    validateComparisonPhoneIds.mockReturnValue({ isValid: true, errors: [] });
    requestManager.fetchPhones.mockResolvedValue(mockPhones);
    fetchPhonesByIds.mockResolvedValue(mockPhones);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe("Initial State", () => {
    it("should initialize with empty state", () => {
      const { result } = renderHook(() => useComparisonState());
      const [state] = result.current;

      expect(state.phones).toEqual([]);
      expect(state.selectedPhoneIds).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
      expect(state.retryCount).toBe(0);
      expect(state.isRetrying).toBe(false);
    });

    it("should initialize with provided phone IDs", () => {
      const initialIds = [1, 2];
      const { result } = renderHook(() => useComparisonState(initialIds));
      const [state] = result.current;

      expect(state.selectedPhoneIds).toEqual(initialIds);
    });
  });

  describe("Phone Fetching", () => {
    it("should fetch phones when phone IDs are set", async () => {
      const { result } = renderHook(() => useComparisonState());

      act(() => {
        const [, actions] = result.current;
        actions.setSelectedPhoneIds([1, 2]);
      });

      // Wait for debounced fetch
      await waitFor(() => {
        expect(requestManager.fetchPhones).toHaveBeenCalledWith(
          [1, 2],
          expect.any(Function),
          expect.any(AbortSignal)
        );
      });

      await waitFor(() => {
        const [state] = result.current;
        expect(state.phones).toEqual(mockPhones);
      });

      await waitFor(() => {
        const [state] = result.current;
        expect(state.isLoading).toBe(false);
      });
    });

    it("should handle fetch errors gracefully", async () => {
      const error = new Error("Fetch failed");
      requestManager.fetchPhones.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useComparisonState());

      act(() => {
        const [, actions] = result.current;
        actions.setSelectedPhoneIds([1, 2]);
      });

      await waitFor(() => {
        const [state] = result.current;
        expect(state.error).toBe(
          "Failed to load phone data. Please try again."
        );
      });

      await waitFor(() => {
        const [state] = result.current;
        expect(state.phones).toEqual([]);
      });

      await waitFor(() => {
        const [state] = result.current;
        expect(state.isLoading).toBe(false);
      });
    });

    it("should handle insufficient resources error", async () => {
      const error = new Error("net::ERR_INSUFFICIENT_RESOURCES");
      requestManager.fetchPhones.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useComparisonState());

      act(() => {
        const [, actions] = result.current;
        actions.setSelectedPhoneIds([1, 2]);
      });

      await waitFor(() => {
        const [state] = result.current;
        expect(state.error).toBe(
          "Server is experiencing high load. Please try again in a moment."
        );
      });
    });

    it("should handle network errors", async () => {
      const error = new Error("Failed to fetch");
      requestManager.fetchPhones.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useComparisonState());

      act(() => {
        const [, actions] = result.current;
        actions.setSelectedPhoneIds([1, 2]);
      });

      await waitFor(() => {
        const [state] = result.current;
        expect(state.error).toBe(
          "Network error. Please check your connection and try again."
        );
      });
    });

    it("should clear state when phone IDs are empty", async () => {
      const { result } = renderHook(() => useComparisonState([1, 2]));

      // Wait for initial fetch
      await waitFor(() => {
        const [state] = result.current;
        expect(state.phones).toEqual(mockPhones);
      });

      act(() => {
        const [, actions] = result.current;
        actions.setSelectedPhoneIds([]);
      });

      const [state] = result.current;
      expect(state.phones).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
    });
  });

  describe("Phone Management", () => {
    it("should add phone to comparison", () => {
      const { result } = renderHook(() => useComparisonState([1]));

      act(() => {
        const [, actions] = result.current;
        actions.addPhone(2);
      });

      const [state] = result.current;
      expect(state.selectedPhoneIds).toEqual([1, 2]);
    });

    it("should not add duplicate phone", () => {
      const { result } = renderHook(() => useComparisonState([1]));

      act(() => {
        const [, actions] = result.current;
        actions.addPhone(1);
      });

      const [state] = result.current;
      expect(state.selectedPhoneIds).toEqual([1]);
      expect(state.error).toBe("This phone is already in the comparison");
    });

    it("should not add more than 5 phones", () => {
      const { result } = renderHook(() => useComparisonState([1, 2, 3, 4, 5]));

      act(() => {
        const [, actions] = result.current;
        actions.addPhone(6);
      });

      const [state] = result.current;
      expect(state.selectedPhoneIds).toEqual([1, 2, 3, 4, 5]);
      expect(state.error).toBe("Maximum 5 phones can be compared at once");
    });

    it("should remove phone from comparison", () => {
      const { result } = renderHook(() => useComparisonState([1, 2]));

      act(() => {
        const [, actions] = result.current;
        actions.removePhone(1);
      });

      const [state] = result.current;
      expect(state.selectedPhoneIds).toEqual([2]);
    });

    it("should replace phone in comparison", () => {
      const { result } = renderHook(() => useComparisonState([1, 2]));

      act(() => {
        const [, actions] = result.current;
        actions.replacePhone(1, 3);
      });

      const [state] = result.current;
      expect(state.selectedPhoneIds).toEqual([3, 2]);
    });

    it("should not replace with duplicate phone", () => {
      const { result } = renderHook(() => useComparisonState([1, 2]));

      act(() => {
        const [, actions] = result.current;
        actions.replacePhone(1, 2);
      });

      const [state] = result.current;
      expect(state.selectedPhoneIds).toEqual([1, 2]);
      expect(state.error).toBe("This phone is already in the comparison");
    });
  });

  describe("Error Handling", () => {
    it("should clear error", () => {
      const { result } = renderHook(() => useComparisonState());

      // Set an error first
      act(() => {
        const [, actions] = result.current;
        actions.addPhone(1); // This will trigger validation
      });

      // Assume validation fails and sets an error
      validateComparisonPhoneIds.mockReturnValueOnce({
        isValid: false,
        errors: ["Test error"],
      });

      act(() => {
        const [, actions] = result.current;
        actions.addPhone(2);
      });

      let [state] = result.current;
      expect(state.error).toBe("Test error");

      act(() => {
        const [, actions] = result.current;
        actions.clearError();
      });

      [state] = result.current;
      expect(state.error).toBe(null);
    });
  });

  describe("Retry Functionality", () => {
    it("should retry fetch and increment retry count", async () => {
      const { result } = renderHook(() => useComparisonState([1, 2]));

      // Wait for initial fetch
      await waitFor(() => {
        const [state] = result.current;
        expect(state.phones).toEqual(mockPhones);
      });

      act(() => {
        const [, actions] = result.current;
        actions.retryFetch();
      });

      await waitFor(() => {
        const [state] = result.current;
        expect(state.retryCount).toBe(1);
      });

      await waitFor(() => {
        const [state] = result.current;
        expect(state.isRetrying).toBe(true);
      });

      await waitFor(() => {
        const [state] = result.current;
        expect(state.isRetrying).toBe(false);
      });
    });

    it("should refresh phones", async () => {
      const { result } = renderHook(() => useComparisonState([1, 2]));

      act(() => {
        const [, actions] = result.current;
        actions.refreshPhones();
      });

      await waitFor(() => {
        expect(requestManager.fetchPhones).toHaveBeenCalled();
      });
    });
  });

  describe("Validation", () => {
    it("should validate comparison state", () => {
      validateComparisonPhoneIds.mockReturnValue({ isValid: true, errors: [] });

      const { result } = renderHook(() => useComparisonState([1, 2]));
      const [state] = result.current;

      expect(state.isValidComparison).toBe(true);
      expect(validateComparisonPhoneIds).toHaveBeenCalledWith([1, 2]);
    });

    it("should handle invalid comparison state", () => {
      validateComparisonPhoneIds.mockReturnValue({
        isValid: false,
        errors: ["Not enough phones"],
      });

      const { result } = renderHook(() => useComparisonState([1]));
      const [state] = result.current;

      expect(state.isValidComparison).toBe(false);
    });
  });

  describe("Cleanup", () => {
    it("should cleanup on unmount", () => {
      const { unmount } = renderHook(() => useComparisonState([1, 2]));

      unmount();

      expect(requestManager.cancelAllRequests).toHaveBeenCalled();
    });
  });

  describe("Debouncing", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should debounce rapid phone ID changes", async () => {
      const { result } = renderHook(() => useComparisonState());

      act(() => {
        const [, actions] = result.current;
        actions.setSelectedPhoneIds([1]);
      });

      act(() => {
        const [, actions] = result.current;
        actions.setSelectedPhoneIds([1, 2]);
      });

      act(() => {
        const [, actions] = result.current;
        actions.setSelectedPhoneIds([1, 2, 3]);
      });

      // Fast-forward debounce timer
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        // Should only call fetch once with the final phone IDs
        expect(requestManager.fetchPhones).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(requestManager.fetchPhones).toHaveBeenCalledWith(
          [1, 2, 3],
          expect.any(Function),
          expect.any(AbortSignal)
        );
      });
    });
  });
});
