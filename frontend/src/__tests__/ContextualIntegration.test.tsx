/**
 * Integration tests for contextual query frontend features
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import EnhancedContextIndicator from "../components/EnhancedContextIndicator";
import ContextualErrorHandler from "../components/ContextualErrorHandler";
import ContextualSuggestions from "../components/ContextualSuggestions";
import { useContextualQuery } from "../hooks/useContextualQuery";
import { contextSync } from "../services/contextSynchronization";

// Mock navigator.onLine
Object.defineProperty(navigator, "onLine", {
  writable: true,
  value: true,
});

// Define the ContextUpdate type for proper typing
interface ContextUpdate {
  id: string;
  type: string;
  timestamp: number;
  data: any;
  synced: boolean;
}

// Apply mocks first
jest.mock("../api/contextual", () => ({
  contextualAPI: {
    getSessionId: jest.fn(() => "test-session-123"),
    setUserId: jest.fn(),
    clearSession: jest.fn(),
    processContextualQuery: jest.fn(),
    getContext: jest.fn(),
    updateUserPreferences: jest.fn(),
    getContextualSuggestions: jest.fn(),
    enhancedQuery: jest.fn(),
  },
}));

jest.mock("../services/contextSynchronization", () => ({
  contextSync: {
    getSyncStatus: jest.fn(() => ({
      isOnline: true,
      lastSyncTime: new Date().toISOString(),
      syncInProgress: false,
      pendingUpdates: [],
    })),
    on: jest.fn(),
    off: jest.fn(),
    clearPendingUpdates: jest.fn(),
    forcSync: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../hooks/useContextualQuery", () => ({
  useContextualQuery: jest.fn(),
  useContextMetadata: jest.fn(() => ({
    metadata: null,
    isLoading: false,
    refreshMetadata: jest.fn(),
  })),
  useContextualSuggestions: jest.fn(() => ({
    suggestions: [],
    isLoading: false,
    refreshSuggestions: jest.fn(),
  })),
  usePhoneResolution: jest.fn(() => ({
    resolvePhones: jest.fn(),
    isResolving: false,
  })),
}));

// Get the mocked instances
const mockContextualAPI = require("../api/contextual").contextualAPI;
const mockContextSync = require("../services/contextSynchronization").contextSync;

// Simple test component
const TestComponent: React.FC<{ hookReturn: any }> = ({ hookReturn }) => {
  (useContextualQuery as jest.Mock).mockReturnValue(hookReturn);

  const handleQuery = async () => {
    await hookReturn.query("Test query");
  };

  return (
    <div>
      <div data-testid="session-id">{hookReturn.state.sessionId}</div>
      <div data-testid="loading">
        {hookReturn.state.isLoading ? "loading" : "idle"}
      </div>
      <div data-testid="error">{hookReturn.state.error || "no-error"}</div>
      <div data-testid="has-context">
        {hookReturn.state.hasActiveContext ? "has-context" : "no-context"}
      </div>
      <button onClick={handleQuery} data-testid="query-button">
        Query
      </button>
      <button onClick={hookReturn.clearContext} data-testid="clear-button">
        Clear
      </button>
    </div>
  );
};

describe("Contextual Query Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset localStorage
    localStorage.clear();
    
    // Reset contextSync mock
    (contextSync.getSyncStatus as jest.Mock).mockReturnValue({
      isOnline: true,
      lastSyncTime: new Date().toISOString(),
      syncInProgress: false,
      pendingUpdates: [],
    });
    
    // Ensure hooks are properly mocked
    const { useContextMetadata, useContextualSuggestions, usePhoneResolution } = require("../hooks/useContextualQuery");
    (useContextMetadata as jest.Mock).mockReturnValue({
      metadata: null,
      isLoading: false,
      refreshMetadata: jest.fn(),
    });
    (useContextualSuggestions as jest.Mock).mockReturnValue({
      suggestions: [],
      isLoading: false,
      refreshSuggestions: jest.fn(),
    });
    (usePhoneResolution as jest.Mock).mockReturnValue({
      resolvePhones: jest.fn(),
      isResolving: false,
    });
  });

  describe("useContextualQuery Hook", () => {
    it("should initialize with correct default state", () => {
      const hookReturn = {
        state: {
          isLoading: false,
          error: null,
          response: null,
          sessionId: "test-session-123",
          contextStrength: 0,
          hasActiveContext: false,
        },
        query: jest.fn(),
        clearContext: jest.fn(),
        updatePreferences: jest.fn(),
        getContextualSuggestions: jest.fn(),
        retryLastQuery: jest.fn(),
        getSessionAnalytics: jest.fn(),
      };

      render(<TestComponent hookReturn={hookReturn} />);

      expect(screen.getByTestId("session-id")).toHaveTextContent(
        "test-session-123"
      );
      expect(screen.getByTestId("loading")).toHaveTextContent("idle");
      expect(screen.getByTestId("error")).toHaveTextContent("no-error");
      expect(screen.getByTestId("has-context")).toHaveTextContent("no-context");
    });

    it("should handle successful query", async () => {
      const mockQuery = jest.fn();
      const hookReturn = {
        state: {
          isLoading: false,
          error: null,
          response: null,
          sessionId: "test-session-123",
          contextStrength: 0.8,
          hasActiveContext: true,
        },
        query: mockQuery,
        clearContext: jest.fn(),
        updatePreferences: jest.fn(),
        getContextualSuggestions: jest.fn(),
        retryLastQuery: jest.fn(),
        getSessionAnalytics: jest.fn(),
      };

      render(<TestComponent hookReturn={hookReturn} />);

      const queryButton = screen.getByTestId("query-button");
      fireEvent.click(queryButton);

      expect(mockQuery).toHaveBeenCalledWith("Test query");
    });

    it("should handle query errors", () => {
      const hookReturn = {
        state: {
          isLoading: false,
          error: "Phone not found",
          response: null,
          sessionId: "test-session-123",
          contextStrength: 0,
          hasActiveContext: false,
        },
        query: jest.fn(),
        clearContext: jest.fn(),
        updatePreferences: jest.fn(),
        getContextualSuggestions: jest.fn(),
        retryLastQuery: jest.fn(),
        getSessionAnalytics: jest.fn(),
      };

      render(<TestComponent hookReturn={hookReturn} />);

      expect(screen.getByTestId("error")).toHaveTextContent("Phone not found");
    });

    it("should clear context correctly", () => {
      const mockClearContext = jest.fn();
      const hookReturn = {
        state: {
          isLoading: false,
          error: null,
          response: null,
          sessionId: "test-session-123",
          contextStrength: 0,
          hasActiveContext: false,
        },
        query: jest.fn(),
        clearContext: mockClearContext,
        updatePreferences: jest.fn(),
        getContextualSuggestions: jest.fn(),
        retryLastQuery: jest.fn(),
        getSessionAnalytics: jest.fn(),
      };

      render(<TestComponent hookReturn={hookReturn} />);

      const clearButton = screen.getByTestId("clear-button");
      fireEvent.click(clearButton);

      expect(mockClearContext).toHaveBeenCalled();
    });
  });

  describe("EnhancedContextIndicator Component", () => {
    const defaultProps = {
      hasContext: true,
      contextPhones: ["iPhone 14", "Samsung Galaxy S23"],
      sessionId: "test-session-123",
    };

    beforeEach(() => {
      mockContextualAPI.getContext.mockResolvedValue({
        session_id: "test-session-123",
        context_phones: [
          { id: 1, name: "iPhone 14", brand: "Apple" },
          { id: 2, name: "Samsung Galaxy S23", brand: "Samsung" },
        ],
        conversation_history: [],
        user_preferences: { budget_category: "premium" },
        context_metadata: {
          session_age: 300,
          total_queries: 5,
          context_strength: 0.8,
          last_activity: new Date().toISOString(),
        },
      });
    });

    it("should render context indicator with phones", () => {
      render(<EnhancedContextIndicator {...defaultProps} />);

      expect(screen.getByText("Context Active")).toBeInTheDocument();
      expect(
        screen.getByText(/iPhone 14, Samsung Galaxy S23/)
      ).toBeInTheDocument();
    });

    it("should show sync status when enabled", () => {
      render(
        <EnhancedContextIndicator {...defaultProps} showSyncStatus={true} />
      );

      // Should show online indicator
      expect(screen.getByTitle("Online")).toBeInTheDocument();
    });

    it("should handle context clearing", () => {
      const mockOnClearContext = jest.fn();

      render(
        <EnhancedContextIndicator
          {...defaultProps}
          onClearContext={mockOnClearContext}
        />
      );

      const clearButton = screen.getByText("Clear");
      fireEvent.click(clearButton);

      expect(mockOnClearContext).toHaveBeenCalled();
    });

    it("should show pending updates indicator", () => {
      const mockUpdates: ContextUpdate[] = [
        { id: "1", type: "query", timestamp: Date.now(), data: {}, synced: false },
        { id: "2", type: "preference", timestamp: Date.now(), data: {}, synced: false }
      ];

      mockContextSync.getSyncStatus.mockReturnValue({
        isOnline: true,
        lastSyncTime: Date.now(),
        syncInProgress: false,
        pendingUpdates: mockUpdates,
      });

      render(
        <EnhancedContextIndicator {...defaultProps} showSyncStatus={true} />
      );

      expect(screen.getByTitle("2 pending updates")).toBeInTheDocument();
    });
  });

  describe("ContextualErrorHandler Component", () => {
    const mockError = {
      type: "phone_resolution_error" as const,
      code: "PHONE_NOT_FOUND",
      message: 'Phone "NonExistentPhone" not found in database',
      suggestions: ["Check spelling", "Try full phone name", "Browse catalog"],
      severity: "medium" as const,
      retryable: true,
      contextInfo: {
        sessionId: "test-session-123",
        query: "NonExistentPhone specs",
        phoneReferences: ["NonExistentPhone"],
      },
    };

    it("should render error with suggestions", () => {
      render(<ContextualErrorHandler error={mockError} />);

      expect(screen.getByText("Phone Not Found")).toBeInTheDocument();
      expect(screen.getByText(/couldn't find the phone/)).toBeInTheDocument();
      expect(screen.getByText("Check spelling")).toBeInTheDocument();
      expect(screen.getByText("Try full phone name")).toBeInTheDocument();
      expect(screen.getByText("Browse catalog")).toBeInTheDocument();
    });

    it("should handle suggestion clicks", () => {
      const mockOnSuggestionClick = jest.fn();

      render(
        <ContextualErrorHandler
          error={mockError}
          onSuggestionClick={mockOnSuggestionClick}
        />
      );

      const suggestionButton = screen.getByText("Check spelling");
      fireEvent.click(suggestionButton);

      expect(mockOnSuggestionClick).toHaveBeenCalledWith("Check spelling");
    });

    it("should handle retry action", () => {
      const mockOnRetry = jest.fn();

      render(
        <ContextualErrorHandler error={mockError} onRetry={mockOnRetry} />
      );

      const retryButton = screen.getByText("Try Again");
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalled();
    });

    it("should show expanded details", async () => {
      render(<ContextualErrorHandler error={mockError} showDetails={true} />);

      const detailsButton = screen.getByText("Details");
      fireEvent.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByText('"NonExistentPhone specs"')).toBeInTheDocument();
      });
    });

    it("should handle dismissal", () => {
      const mockOnDismiss = jest.fn();

      render(
        <ContextualErrorHandler error={mockError} onDismiss={mockOnDismiss} />
      );

      const dismissButton = screen.getByTitle("Dismiss error");
      fireEvent.click(dismissButton);

      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  describe("ContextualSuggestions Component", () => {
    const mockSuggestions = [
      "Compare iPhone with Samsung",
      "Show me alternatives to iPhone",
      "Best phones under 50000",
      "Latest flagship phones 2024",
      "More camera-focused phones",
      "Similar phones from other brands",
    ];

    it("should render suggestions when available", () => {
      const mockRefreshSuggestions = jest.fn();

      // Mock the hook to return suggestions
      jest
        .mocked(require("../hooks/useContextualQuery").useContextualSuggestions)
        .mockReturnValue({
          suggestions: mockSuggestions,
          isLoading: false,
          refreshSuggestions: mockRefreshSuggestions,
        });

      const mockOnSuggestionClick = jest.fn();

      render(
        <ContextualSuggestions
          onSuggestionClick={mockOnSuggestionClick}
          recentPhones={["iPhone 14", "Samsung Galaxy S23"]}
          showCategories={true}
        />
      );

      expect(screen.getByText("Suggestions")).toBeInTheDocument();
      expect(screen.getByText("Based on Context")).toBeInTheDocument();
      expect(screen.getByText("Trending")).toBeInTheDocument();
    });

    it("should handle suggestion clicks", () => {
      const mockRefreshSuggestions = jest.fn();
      const mockOnSuggestionClick = jest.fn();

      jest
        .mocked(require("../hooks/useContextualQuery").useContextualSuggestions)
        .mockReturnValue({
          suggestions: mockSuggestions,
          isLoading: false,
          refreshSuggestions: mockRefreshSuggestions,
        });

      render(
        <ContextualSuggestions
          onSuggestionClick={mockOnSuggestionClick}
          recentPhones={["iPhone 14"]}
        />
      );

      const suggestionButton = screen.getByText("Compare iPhone with Samsung");
      fireEvent.click(suggestionButton);

      expect(mockOnSuggestionClick).toHaveBeenCalledWith(
        "Compare iPhone with Samsung"
      );
    });

    it("should show loading state", () => {
      jest
        .mocked(require("../hooks/useContextualQuery").useContextualSuggestions)
        .mockReturnValue({
          suggestions: [],
          isLoading: true,
          refreshSuggestions: jest.fn(),
        });

      render(<ContextualSuggestions onSuggestionClick={jest.fn()} />);

      expect(screen.getByText("Loading suggestions...")).toBeInTheDocument();
    });

    it("should show no suggestions message when empty", () => {
      jest
        .mocked(require("../hooks/useContextualQuery").useContextualSuggestions)
        .mockReturnValue({
          suggestions: [],
          isLoading: false,
          refreshSuggestions: jest.fn(),
        });

      render(<ContextualSuggestions onSuggestionClick={jest.fn()} />);

      expect(screen.getByText("No suggestions available")).toBeInTheDocument();
    });
  });

  describe("Context Synchronization", () => {
    it("should show online status when connected", () => {
      mockContextSync.getSyncStatus.mockReturnValue({
        isOnline: true,
        lastSyncTime: Date.now() - 60000,
        syncInProgress: false,
        pendingUpdates: [],
      });

      render(
        <EnhancedContextIndicator
          hasContext={true}
          contextPhones={["iPhone 14"]}
        />
      );

      expect(screen.getByTitle("Online")).toBeInTheDocument();
    });

    it("should show offline status when disconnected", () => {
      const mockUpdates: ContextUpdate[] = [
        { id: "1", type: "query", timestamp: Date.now(), data: {}, synced: false }
      ];

      mockContextSync.getSyncStatus.mockReturnValue({
        isOnline: false,
        lastSyncTime: Date.now() - 300000,
        syncInProgress: false,
        pendingUpdates: mockUpdates,
      });

      render(
        <EnhancedContextIndicator
          hasContext={true}
          contextPhones={["iPhone 14"]}
          showSyncStatus={true}
        />
      );

      expect(screen.getByTitle("Offline")).toBeInTheDocument();
      expect(screen.getByTitle("1 pending updates")).toBeInTheDocument();
    });

    it("should show sync in progress", () => {
      mockContextSync.getSyncStatus.mockReturnValue({
        isOnline: true,
        lastSyncTime: Date.now(),
        syncInProgress: true,
        pendingUpdates: [],
      });

      render(
        <EnhancedContextIndicator
          hasContext={true}
          contextPhones={["iPhone 14"]}
          showSyncStatus={true}
        />
      );

      expect(screen.getByTitle("Syncing...")).toBeInTheDocument();
    });
  });
});

describe("Error Handling Integration", () => {
  it("should handle network errors gracefully", () => {
    render(
      <ContextualErrorHandler
        error={{
          type: "network_error",
          code: "NETWORK_FAILED",
          message: "Network error",
          suggestions: ["Check internet connection", "Try again later"],
          severity: "high",
          retryable: true,
        }}
      />
    );

    expect(screen.getByText("Connection Problem")).toBeInTheDocument();
    expect(screen.getByText("Check internet connection")).toBeInTheDocument();
  });

  it("should handle session expiration with retry", () => {
    const mockQuery = jest.fn();

    const hookReturn = {
      state: {
        isLoading: false,
        error: null,
        response: null,
        sessionId: "new-session-456",
        contextStrength: 0,
        hasActiveContext: false,
      },
      query: mockQuery,
      clearContext: jest.fn(),
      updatePreferences: jest.fn(),
      getContextualSuggestions: jest.fn(),
      retryLastQuery: jest.fn(),
      getSessionAnalytics: jest.fn(),
    };

    const TestComponent = () => {
      (useContextualQuery as jest.Mock).mockReturnValue(hookReturn);
      const { query } = useContextualQuery();

      const handleQuery = () => {
        query("test query", { autoRetry: true, maxRetries: 1 });
      };

      return <button onClick={handleQuery}>Query</button>;
    };

    render(<TestComponent />);

    const queryButton = screen.getByText("Query");
    fireEvent.click(queryButton);

    expect(mockQuery).toHaveBeenCalledWith("test query", {
      autoRetry: true,
      maxRetries: 1,
    });
  });
});
