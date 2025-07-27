/**
 * Unit tests for ComparisonErrorBoundary component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ComparisonErrorBoundary } from '../ComparisonErrorBoundary';

// Mock the request manager
jest.mock('../../../services/requestManager', () => ({
  requestManager: {
    cancelAllRequests: jest.fn(),
    clearCache: jest.fn(),
  },
}));

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow: boolean; errorMessage?: string }> = ({ 
  shouldThrow, 
  errorMessage = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

describe('ComparisonErrorBoundary', () => {
  const { requestManager } = require('../../../services/requestManager');

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render children when there is no error', () => {
    render(
      <ComparisonErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ComparisonErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error UI when child component throws', () => {
    render(
      <ComparisonErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ComparisonErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred while loading the comparison data.')).toBeInTheDocument();
  });

  it('should call requestManager cleanup methods when error occurs', () => {
    render(
      <ComparisonErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ComparisonErrorBoundary>
    );

    expect(requestManager.cancelAllRequests).toHaveBeenCalled();
    expect(requestManager.clearCache).toHaveBeenCalled();
  });

  it('should call onError callback when provided', () => {
    const onError = jest.fn();

    render(
      <ComparisonErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ComparisonErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ComparisonErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ComparisonErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  describe('Error Message Handling', () => {
    it('should show network error message for fetch failures', () => {
      render(
        <ComparisonErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Failed to fetch" />
        </ComparisonErrorBoundary>
      );

      expect(screen.getByText('Network connection issue. Please check your internet connection and try again.')).toBeInTheDocument();
    });

    it('should show resource error message for insufficient resources', () => {
      render(
        <ComparisonErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="ERR_INSUFFICIENT_RESOURCES" />
        </ComparisonErrorBoundary>
      );

      expect(screen.getByText('The server is experiencing high load. Please try again in a moment.')).toBeInTheDocument();
    });

    it('should show chunk load error message', () => {
      render(
        <ComparisonErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="ChunkLoadError: Loading chunk failed" />
        </ComparisonErrorBoundary>
      );

      expect(screen.getByText('The application needs to be updated. Please refresh the page.')).toBeInTheDocument();
    });

    it('should show data loading error message for TypeError', () => {
      render(
        <ComparisonErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Cannot read property 'id' of undefined" />
        </ComparisonErrorBoundary>
      );

      expect(screen.getByText('A data loading issue occurred. Please try refreshing the page.')).toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('should show Try Again button initially', () => {
      render(
        <ComparisonErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ComparisonErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should retry and clear cache when Try Again is clicked', () => {
      const { rerender } = render(
        <ComparisonErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ComparisonErrorBoundary>
      );

      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.click(tryAgainButton);

      // After retry, should attempt to render children again
      rerender(
        <ComparisonErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ComparisonErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(requestManager.clearCache).toHaveBeenCalledTimes(2); // Once on error, once on retry
    });

    it('should show retry count after retries', () => {
      const { rerender } = render(
        <ComparisonErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ComparisonErrorBoundary>
      );

      // First retry
      fireEvent.click(screen.getByText('Try Again'));
      
      rerender(
        <ComparisonErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ComparisonErrorBoundary>
      );

      expect(screen.getByText('Retry attempt 1 of 3')).toBeInTheDocument();
    });

    it('should hide Try Again button after max retries', () => {
      const TestComponent = () => {
        const [retryCount, setRetryCount] = React.useState(0);
        
        return (
          <ComparisonErrorBoundary key={retryCount}>
            <ThrowError shouldThrow={true} />
          </ComparisonErrorBoundary>
        );
      };

      const { rerender } = render(<TestComponent />);

      // Simulate 3 retries
      for (let i = 0; i < 3; i++) {
        if (screen.queryByText('Try Again')) {
          fireEvent.click(screen.getByText('Try Again'));
          rerender(<TestComponent key={i + 1} />);
        }
      }

      // After 3 retries, Try Again button should not be available
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
      expect(screen.getByText('Reset Application')).toBeInTheDocument();
    });
  });

  describe('Reset Functionality', () => {
    it('should show Reset Application button', () => {
      render(
        <ComparisonErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ComparisonErrorBoundary>
      );

      expect(screen.getByText('Reset Application')).toBeInTheDocument();
    });

    it('should call cleanup methods when reset is clicked', () => {
      // Mock window.location.reload
      const mockReload = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      });

      render(
        <ComparisonErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ComparisonErrorBoundary>
      );

      fireEvent.click(screen.getByText('Reset Application'));

      expect(requestManager.cancelAllRequests).toHaveBeenCalled();
      expect(requestManager.clearCache).toHaveBeenCalled();
      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('should show Go to Home button', () => {
      render(
        <ComparisonErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ComparisonErrorBoundary>
      );

      expect(screen.getByText('Go to Home')).toBeInTheDocument();
    });
  });

  describe('Development Mode', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should show technical details in development mode', () => {
      process.env.NODE_ENV = 'development';

      render(
        <ComparisonErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Test error message" />
        </ComparisonErrorBoundary>
      );

      expect(screen.getByText('Technical Details (Development Only)')).toBeInTheDocument();
    });

    it('should not show technical details in production mode', () => {
      process.env.NODE_ENV = 'production';

      render(
        <ComparisonErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ComparisonErrorBoundary>
      );

      expect(screen.queryByText('Technical Details (Development Only)')).not.toBeInTheDocument();
    });
  });
});