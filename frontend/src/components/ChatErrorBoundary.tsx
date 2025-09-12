/**
 * Chat Error Boundary Component
 * 
 * Provides error boundaries specifically for chat components with
 * recovery options and fallback UI.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, MessageCircle, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showRetry?: boolean;
  darkMode?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

class ChatErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Chat Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error for monitoring
    this.logError(error, errorInfo);
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    // Log error details for debugging
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error('Chat component error details:', errorDetails);

    // In production, you might want to send this to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error tracking service
      // errorTrackingService.captureException(error, { extra: errorDetails });
    }
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  };

  private getErrorMessage = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('chunk') || message.includes('loading')) {
      return 'Failed to load chat components. This might be due to a network issue.';
    } else if (message.includes('render') || message.includes('component')) {
      return 'There was an issue displaying the chat interface.';
    } else if (message.includes('memory') || message.includes('quota')) {
      return 'The chat is using too much memory. Try refreshing the page.';
    } else {
      return 'An unexpected error occurred in the chat interface.';
    }
  };

  private getRecoveryActions = (): Array<{
    label: string;
    action: () => void;
    icon: React.ComponentType<any>;
    variant: 'primary' | 'secondary' | 'danger';
  }> => {
    const actions = [];

    // Retry action (if not exceeded max retries)
    if (this.props.showRetry !== false && this.state.retryCount < this.maxRetries) {
      actions.push({
        label: 'Try Again',
        action: this.handleRetry,
        icon: RefreshCw,
        variant: 'primary' as const
      });
    }

    // Reset action
    actions.push({
      label: 'Reset Chat',
      action: this.handleReset,
      icon: MessageCircle,
      variant: 'secondary' as const
    });

    // Refresh page action
    actions.push({
      label: 'Refresh Page',
      action: () => window.location.reload(),
      icon: RefreshCw,
      variant: 'secondary' as const
    });

    // Go to home action
    actions.push({
      label: 'Go to Home',
      action: () => window.location.href = '/',
      icon: Home,
      variant: 'danger' as const
    });

    return actions;
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      const { darkMode = false } = this.props;
      const errorMessage = this.state.error ? this.getErrorMessage(this.state.error) : 'An unknown error occurred';
      const recoveryActions = this.getRecoveryActions();

      return (
        <div className={`flex items-center justify-center min-h-[400px] p-6 ${
          darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
        }`}>
          <div className={`max-w-md w-full text-center p-6 rounded-lg border ${
            darkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          } shadow-lg`}>
            {/* Error Icon */}
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              darkMode ? 'bg-red-900/20' : 'bg-red-50'
            }`}>
              <AlertTriangle className={`w-8 h-8 ${
                darkMode ? 'text-red-400' : 'text-red-500'
              }`} />
            </div>

            {/* Error Title */}
            <h3 className={`text-lg font-semibold mb-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Chat Error
            </h3>

            {/* Error Message */}
            <p className={`text-sm mb-6 ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {errorMessage}
            </p>

            {/* Retry Count Info */}
            {this.state.retryCount > 0 && (
              <p className={`text-xs mb-4 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Retry attempts: {this.state.retryCount}/{this.maxRetries}
              </p>
            )}

            {/* Recovery Actions */}
            <div className="space-y-2">
              {recoveryActions.map((action, index) => {
                const Icon = action.icon;
                const baseClasses = "w-full px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2";
                
                let variantClasses = "";
                if (action.variant === 'primary') {
                  variantClasses = darkMode 
                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                    : "bg-blue-600 hover:bg-blue-700 text-white";
                } else if (action.variant === 'secondary') {
                  variantClasses = darkMode 
                    ? "bg-gray-700 hover:bg-gray-600 text-gray-200" 
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700";
                } else if (action.variant === 'danger') {
                  variantClasses = darkMode 
                    ? "bg-red-800 hover:bg-red-700 text-red-200" 
                    : "bg-red-50 hover:bg-red-100 text-red-600";
                }

                return (
                  <button
                    key={index}
                    onClick={action.action}
                    className={`${baseClasses} ${variantClasses}`}
                  >
                    <Icon size={16} />
                    {action.label}
                  </button>
                );
              })}
            </div>

            {/* Debug Info (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className={`mt-6 text-left text-xs ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <summary className="cursor-pointer font-medium mb-2">
                  Debug Information
                </summary>
                <div className={`p-3 rounded border ${
                  darkMode ? 'bg-gray-900 border-gray-600' : 'bg-gray-50 border-gray-200'
                } font-mono overflow-auto max-h-32`}>
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap text-xs mt-1">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChatErrorBoundary;