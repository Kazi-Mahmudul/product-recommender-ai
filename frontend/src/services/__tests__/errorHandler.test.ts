// Unit tests for error handler service

import { ErrorHandler } from "../errorHandler";
import { ChatContextManager } from "../chatContextManager";

// Mock ChatContextManager
jest.mock("../chatContextManager");
const mockChatContextManager = ChatContextManager as jest.Mocked<
  typeof ChatContextManager
>;

// Mock AIResponseEnhancer
jest.mock("../aiResponseEnhancer", () => ({
  AIResponseEnhancer: {
    generateContextualErrorMessage: jest.fn().mockReturnValue({
      message: "Test error message",
      suggestions: ["Test suggestion 1", "Test suggestion 2"],
    }),
  },
}));

const mockContext = {
  sessionId: "test-session",
  currentRecommendations: [],
  userPreferences: {
    preferredBrands: ["Samsung"],
  },
  conversationHistory: [],
  lastQuery: "test query",
  queryCount: 1,
  timestamp: new Date(),
  interactionPatterns: {
    frequentFeatures: [],
    preferredPriceRange: null,
    brandInteractions: {},
    featureInteractions: {},
  },
  phoneRecommendations: [],
};

describe("ErrorHandler", () => {
  beforeEach(() => {
    ErrorHandler.clearErrorLog();
    jest.clearAllMocks();
  });

  describe("handleError", () => {
    it("should handle network errors", () => {
      const error = new Error("Network connection failed");
      const result = ErrorHandler.handleError(error, mockContext, "network");

      expect(result.showFallbackContent).toBe(true);
      expect(result.fallbackMessage).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });

    it("should handle API errors", () => {
      const error = new Error("API server error 500");
      const result = ErrorHandler.handleError(error, mockContext, "api");

      expect(result.showFallbackContent).toBe(true);
      expect(result.fallbackMessage).toBeDefined();
    });

    it("should classify errors automatically", () => {
      const networkError = new Error("fetch timeout");
      const result = ErrorHandler.handleError(networkError, mockContext);

      expect(result.showFallbackContent).toBe(true);
      expect(result.fallbackMessage).toBeDefined();
    });

    it("should handle string errors", () => {
      const result = ErrorHandler.handleError(
        "Something went wrong",
        mockContext
      );

      expect(result.showFallbackContent).toBe(true);
      expect(result.fallbackMessage).toBeDefined();
    });
  });

  describe("handleSuggestionError", () => {
    it("should return fallback suggestions", () => {
      const error = new Error("Suggestion generation failed");
      const phones = [
        {
          id: 1,
          name: "Test Phone",
          brand: "TestBrand",
          model: "Test Model",
          price: "৳50,000",
          url: "/test-phone",
          price_original: 50000,
        },
      ];

      const suggestions = ErrorHandler.handleSuggestionError(
        error,
        phones,
        mockContext
      );

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.includes("details"))).toBe(true);
    });

    it("should include context-based fallback suggestions", () => {
      const error = new Error("Suggestion generation failed");
      const phones = [
        {
          id: 1,
          name: "Test Phone",
          brand: "TestBrand",
          model: "Test Model",
          price: "৳50,000",
          url: "/test-phone",
          price_original: 50000,
        },
      ];

      const suggestions = ErrorHandler.handleSuggestionError(
        error,
        phones,
        mockContext
      );

      expect(suggestions.some((s) => s.includes("Samsung"))).toBe(true);
    });
  });

  describe("handleDrillDownError", () => {
    it("should provide alternative commands", () => {
      const error = new Error("Command not recognized");
      const result = ErrorHandler.handleDrillDownError(
        error,
        "invalid_command",
        mockContext
      );

      expect(result.message).toContain("alternatives");
      expect(result.alternatives).toBeDefined();
      expect(result.alternatives.length).toBeGreaterThan(0);
    });

    it("should suggest valid drill-down commands", () => {
      const error = new Error("Command not recognized");
      const result = ErrorHandler.handleDrillDownError(
        error,
        "invalid_command",
        mockContext
      );

      expect(result.alternatives.some((alt) => alt.includes("specs"))).toBe(
        true
      );
      expect(result.alternatives.some((alt) => alt.includes("chart"))).toBe(
        true
      );
    });
  });

  describe("handleComparisonError", () => {
    it("should provide fallback comparison content", () => {
      const error = new Error("Chart rendering failed");
      const phones = [
        {
          id: 1,
          name: "Phone 1",
          brand: "Brand 1",
          model: "Model 1",
          price: "৳50,000",
          url: "/phone-1",
          price_original: 50000,
        },
      ];
      const features = [{ label: "Price", raw: [50000] }];

      const result = ErrorHandler.handleComparisonError(
        error,
        phones,
        features
      );

      expect(result.fallbackContent).toBeDefined();
      expect(result.fallbackContent.type).toBe("table");
      expect(result.message).toContain("table");
    });

    it("should handle empty data gracefully", () => {
      const error = new Error("Chart rendering failed");
      const result = ErrorHandler.handleComparisonError(error, [], []);

      expect(result.fallbackContent).toBeDefined();
      expect(result.message).toBeDefined();
    });
  });

  describe("handleContextError", () => {
    it("should return fresh context on error", () => {
      const mockFreshContext = { ...mockContext, sessionId: "fresh-session" };
      mockChatContextManager.initializeContext.mockReturnValue(
        mockFreshContext
      );

      const error = new Error("Context corruption");
      const result = ErrorHandler.handleContextError(error);

      expect(mockChatContextManager.initializeContext).toHaveBeenCalled();
      expect(result).toEqual(mockFreshContext);
    });
  });

  describe("handleNetworkError", () => {
    it("should provide retry action for retryable errors", () => {
      const error = new Error("Network timeout");
      const result = ErrorHandler.handleNetworkError(error, 0);

      expect(result.retryAction).toBeDefined();
      expect(result.showFallbackContent).toBe(false);
    });

    it("should not retry after max attempts", () => {
      const error = new Error("Network timeout");
      const result = ErrorHandler.handleNetworkError(error, 3);

      expect(result.showFallbackContent).toBe(true);
      expect(result.suggestions).toBeDefined();
    });

    it("should not retry non-retryable errors", () => {
      const error = new Error("Fatal system error");
      const result = ErrorHandler.handleNetworkError(error, 0);

      expect(result.showFallbackContent).toBe(true);
    });
  });

  describe("error logging and statistics", () => {
    it("should log errors correctly", () => {
      const error = new Error("Test error");
      ErrorHandler.handleError(error, mockContext, "network");

      const stats = ErrorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorsByType.network).toBe(1);
    });

    it("should track recoverable errors", () => {
      const recoverableError = new Error("Network timeout");
      const fatalError = new Error("Fatal system error");

      ErrorHandler.handleError(recoverableError, mockContext, "network");
      ErrorHandler.handleError(fatalError, mockContext, "unknown");

      const stats = ErrorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(2);
      expect(stats.recoverableErrors).toBeGreaterThan(0);
    });

    it("should limit error log size", () => {
      // Add more than max errors
      for (let i = 0; i < 60; i++) {
        ErrorHandler.handleError(new Error(`Error ${i}`), mockContext);
      }

      const stats = ErrorHandler.getErrorStats();
      expect(stats.totalErrors).toBeLessThanOrEqual(50);
    });

    it("should clear error log", () => {
      ErrorHandler.handleError(new Error("Test error"), mockContext);
      expect(ErrorHandler.getErrorStats().totalErrors).toBe(1);

      ErrorHandler.clearErrorLog();
      expect(ErrorHandler.getErrorStats().totalErrors).toBe(0);
    });
  });

  describe("error classification", () => {
    it("should classify network errors correctly", () => {
      const networkErrors = [
        "Network connection failed",
        "fetch timeout",
        "Connection refused",
      ];

      networkErrors.forEach((errorMessage) => {
        const result = ErrorHandler.handleError(
          new Error(errorMessage),
          mockContext
        );
        expect(result.fallbackMessage).toBeDefined();
      });
    });

    it("should classify API errors correctly", () => {
      const apiErrors = [
        "API server error 500",
        "Internal server error",
        "Service unavailable",
      ];

      apiErrors.forEach((errorMessage) => {
        const result = ErrorHandler.handleError(
          new Error(errorMessage),
          mockContext
        );
        expect(result.fallbackMessage).toBeDefined();
      });
    });

    it("should handle unknown errors gracefully", () => {
      const unknownError = new Error("Some random error");
      const result = ErrorHandler.handleError(unknownError, mockContext);

      expect(result.showFallbackContent).toBe(true);
      expect(result.fallbackMessage).toBeDefined();
    });
  });
});
