/**
 * Error boundary component specifically for comparison features
 * Handles catastrophic failures and provides recovery options
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { requestManager } from '../../services/requestManager';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class ComparisonErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ComparisonErrorBoundary caught an error:', error, errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Cancel any pending requests to prevent further issues
    try {
      requestManager.cancelAllRequests();
      requestManager.clearCache();
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }

    // Report error to monitoring service (if available)
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real application, you would send this to your error reporting service
    // For now, we'll just log it
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.state.retryCount,
    };

    console.error('Error Report:', errorReport);

    // Example: Send to error reporting service
    // errorReportingService.report(errorReport);
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
      }));

      // Clear any cached data that might be causing issues
      try {
        requestManager.clearCache();
      } catch (error) {
        console.error('Error clearing cache during retry:', error);
      }
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });

    // Clear all cached data and pending requests
    try {
      requestManager.cancelAllRequests();
      requestManager.clearCache();
    } catch (error) {
      console.error('Error during reset:', error);
    }

    // Reload the page as a last resort
    window.location.reload();
  };

  private getErrorMessage = (error: Error): string => {
    // Provide user-friendly error messages based on error type
    if (error.message?.includes('ChunkLoadError')) {
      return 'The application needs to be updated. Please refresh the page.';
    }
    
    if (error.message?.includes('Network Error') || error.message?.includes('Failed to fetch')) {
      return 'Network connection issue. Please check your internet connection and try again.';
    }
    
    if (error.message?.includes('ERR_INSUFFICIENT_RESOURCES')) {
      return 'The server is experiencing high load. Please try again in a moment.';
    }
    
    if (error.name === 'TypeError' && error.message?.includes('Cannot read property')) {
      return 'A data loading issue occurred. Please try refreshing the page.';
    }
    
    return 'An unexpected error occurred while loading the comparison data.';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const canRetry = this.state.retryCount < this.maxRetries;
      const errorMessage = this.state.error ? this.getErrorMessage(this.state.error) : 'An unexpected error occurred.';

      return (
        <div className="min-h-screen bg-[#fdfbf9] dark:bg-[#121212] pt-16">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              {/* Error Icon */}
              <div className="mb-6">
                <svg 
                  className="w-16 h-16 mx-auto text-red-500" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>

              {/* Error Title */}
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Something went wrong
              </h1>

              {/* Error Message */}
              <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
                {errorMessage}
              </p>

              {/* Retry Information */}
              {this.state.retryCount > 0 && (
                <div className="mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Retry attempt {this.state.retryCount} of {this.maxRetries}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {canRetry && (
                  <button
                    onClick={this.handleRetry}
                    className="px-6 py-3 bg-[#2d5016] hover:bg-[#3d6b1f] text-white font-medium rounded-lg transition-colors duration-200"
                  >
                    Try Again
                  </button>
                )}
                
                <button
                  onClick={this.handleReset}
                  className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  Reset Application
                </button>
                
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium rounded-lg transition-colors duration-200"
                >
                  Go to Home
                </button>
              </div>

              {/* Technical Details (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-8 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    Technical Details (Development Only)
                  </summary>
                  <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
                    <div className="mb-4">
                      <strong className="text-red-600 dark:text-red-400">Error:</strong>
                      <pre className="mt-1 text-xs overflow-x-auto text-gray-800 dark:text-gray-200">
                        {this.state.error.message}
                      </pre>
                    </div>
                    
                    {this.state.error.stack && (
                      <div className="mb-4">
                        <strong className="text-red-600 dark:text-red-400">Stack Trace:</strong>
                        <pre className="mt-1 text-xs overflow-x-auto text-gray-800 dark:text-gray-200">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <strong className="text-red-600 dark:text-red-400">Component Stack:</strong>
                        <pre className="mt-1 text-xs overflow-x-auto text-gray-800 dark:text-gray-200">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ComparisonErrorBoundary;