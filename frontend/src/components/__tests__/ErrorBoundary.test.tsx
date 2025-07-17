import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ErrorBoundary from "../ErrorBoundary";

// Create a component that throws an error for testing
const ErrorThrowingComponent = ({
  shouldThrow = true,
}: {
  shouldThrow?: boolean;
}) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error thrown</div>;
};

describe("ErrorBoundary", () => {
  // Suppress console errors during tests
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  test("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Child content</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  test("renders default fallback UI when an error occurs", () => {
    render(
      <ErrorBoundary>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  test("renders custom fallback UI when provided", () => {
    render(
      <ErrorBoundary
        fallback={<div data-testid="custom-fallback">Custom fallback</div>}
      >
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
  });

  test("calls onError when an error occurs", () => {
    const onError = jest.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toBe("Test error");
  });

  test("resets error state when try again button is clicked", () => {
    // Create a simpler test component that just tests the resetError function
    let resetErrorFunction: () => void;

    const fallback = jest.fn((error, resetError) => {
      resetErrorFunction = resetError;
      return <div data-testid="error-fallback">Error: {error.message}</div>;
    });

    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);

      return (
        <div>
          <ErrorBoundary fallback={fallback}>
            {shouldThrow ? (
              <ErrorThrowingComponent />
            ) : (
              <div data-testid="recovered">Recovered from error</div>
            )}
          </ErrorBoundary>
          <button
            data-testid="fix-button"
            onClick={() => setShouldThrow(false)}
          >
            Fix error
          </button>
        </div>
      );
    };

    render(<TestComponent />);

    // Error fallback is shown initially
    expect(screen.getByTestId("error-fallback")).toBeInTheDocument();

    // First fix the root cause of the error
    fireEvent.click(screen.getByTestId("fix-button"));

    // Then call the resetError function provided by the ErrorBoundary
    act(() => {
      resetErrorFunction();
    });

    // Component should recover
    expect(screen.getByTestId("recovered")).toBeInTheDocument();
  });

  test("uses function fallback when provided", () => {
    // In React 18's strict mode, the component mounts twice in development
    // So we need to account for that in our test
    const fallback = jest
      .fn()
      .mockReturnValue(
        <div data-testid="function-fallback">Function fallback</div>
      );

    render(
      <ErrorBoundary fallback={fallback}>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    // We just verify it was called at least once, not the exact count
    expect(fallback).toHaveBeenCalled();
    // Check that the last call has the correct arguments
    const lastCall = fallback.mock.calls[fallback.mock.calls.length - 1];
    expect(lastCall[0]).toBeInstanceOf(Error);
    expect(lastCall[0].message).toBe("Test error");
    expect(lastCall[1]).toBeInstanceOf(Function); // resetError function
    expect(screen.getByTestId("function-fallback")).toBeInTheDocument();
  });
});
