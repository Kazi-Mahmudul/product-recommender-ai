/**
 * Simplified tests for contextual components
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import ContextualErrorHandler from "../components/ContextualErrorHandler";

describe("ContextualErrorHandler", () => {
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

    render(<ContextualErrorHandler error={mockError} onRetry={mockOnRetry} />);

    const retryButton = screen.getByText("Try Again");
    fireEvent.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalled();
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

  it("should show expanded details when requested", () => {
    render(<ContextualErrorHandler error={mockError} showDetails={true} />);

    const detailsButton = screen.getByText("Details");
    fireEvent.click(detailsButton);

    expect(screen.getByText(/NonExistentPhone specs/)).toBeInTheDocument();
    expect(screen.getByText("PHONE_NOT_FOUND")).toBeInTheDocument();
  });

  it("should not render when error is null", () => {
    render(<ContextualErrorHandler error={null} />);
    
    // Check that no error-related content is rendered
    expect(screen.queryByText("Phone Not Found")).not.toBeInTheDocument();
    expect(screen.queryByText("Connection Problem")).not.toBeInTheDocument();
    expect(screen.queryByText("Invalid Input")).not.toBeInTheDocument();
    expect(screen.queryByText("Session Issue")).not.toBeInTheDocument();
    expect(screen.queryByText("Service Temporarily Unavailable")).not.toBeInTheDocument();
    expect(screen.queryByText("Context Processing Issue")).not.toBeInTheDocument();
  });

  it("should show different severity styles", () => {
    const criticalError = {
      ...mockError,
      severity: "critical" as const,
    };

    render(<ContextualErrorHandler error={criticalError} showDetails={true} />);

    // Should auto-expand for critical errors and show the Less button
    expect(screen.getByText(/Less/)).toBeInTheDocument();
  });
});

describe("Error Types", () => {
  const baseError = {
    code: "TEST_ERROR",
    message: "Test error message",
    suggestions: ["Test suggestion"],
    severity: "medium" as const,
    retryable: true,
  };

  it("should render network error correctly", () => {
    const networkError = {
      ...baseError,
      type: "network_error" as const,
    };

    render(<ContextualErrorHandler error={networkError} />);
    expect(screen.getByText("Connection Problem")).toBeInTheDocument();
  });

  it("should render validation error correctly", () => {
    const validationError = {
      ...baseError,
      type: "validation_error" as const,
    };

    render(<ContextualErrorHandler error={validationError} />);
    expect(screen.getByText("Invalid Input")).toBeInTheDocument();
  });

  it("should render session error correctly", () => {
    const sessionError = {
      ...baseError,
      type: "session_error" as const,
    };

    render(<ContextualErrorHandler error={sessionError} />);
    expect(screen.getByText("Session Issue")).toBeInTheDocument();
  });

  it("should render external service error correctly", () => {
    const serviceError = {
      ...baseError,
      type: "external_service_error" as const,
    };

    render(<ContextualErrorHandler error={serviceError} />);
    expect(
      screen.getByText("Service Temporarily Unavailable")
    ).toBeInTheDocument();
  });

  it("should render context processing error correctly", () => {
    const contextError = {
      ...baseError,
      type: "context_processing_error" as const,
    };

    render(<ContextualErrorHandler error={contextError} />);
    expect(screen.getByText("Context Processing Issue")).toBeInTheDocument();
  });
});
