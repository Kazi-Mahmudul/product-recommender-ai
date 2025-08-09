/**
 * Enhanced Contextual Error Handler Component
 * Displays contextual error messages with helpful suggestions
 */
import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, HelpCircle, X, ChevronDown, ChevronUp } from 'lucide-react';

export interface ContextualError {
  type: 'phone_resolution_error' | 'context_processing_error' | 'external_service_error' | 'validation_error' | 'network_error' | 'session_error';
  code: string;
  message: string;
  suggestions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  contextInfo?: {
    sessionId?: string;
    query?: string;
    phoneReferences?: string[];
    lastSuccessfulQuery?: string;
  };
}

interface ContextualErrorHandlerProps {
  error: ContextualError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  onSuggestionClick?: (suggestion: string) => void;
  showDetails?: boolean;
  className?: string;
}

const ContextualErrorHandler: React.FC<ContextualErrorHandlerProps> = ({
  error,
  onRetry,
  onDismiss,
  onSuggestionClick,
  showDetails = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Auto-expand for critical errors
  useEffect(() => {
    if (error?.severity === 'critical') {
      setIsExpanded(true);
    }
  }, [error]);

  if (!error) return null;

  const handleRetry = async () => {
    if (!onRetry || !error.retryable) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    }
  };

  const getErrorIcon = () => {
    switch (error.severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <HelpCircle className="w-4 h-4 text-yellow-500" />;
      case 'low':
      default:
        return <HelpCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getErrorColors = () => {
    switch (error.severity) {
      case 'critical':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-800',
          button: 'bg-red-100 hover:bg-red-200 text-red-700',
          suggestion: 'bg-red-100 hover:bg-red-200 text-red-700',
        };
      case 'high':
        return {
          bg: 'bg-orange-50 border-orange-200',
          text: 'text-orange-800',
          button: 'bg-orange-100 hover:bg-orange-200 text-orange-700',
          suggestion: 'bg-orange-100 hover:bg-orange-200 text-orange-700',
        };
      case 'medium':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          text: 'text-yellow-800',
          button: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700',
          suggestion: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700',
        };
      case 'low':
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-800',
          button: 'bg-blue-100 hover:bg-blue-200 text-blue-700',
          suggestion: 'bg-blue-100 hover:bg-blue-200 text-blue-700',
        };
    }
  };

  const getErrorTitle = () => {
    switch (error.type) {
      case 'phone_resolution_error':
        return 'Phone Not Found';
      case 'context_processing_error':
        return 'Context Processing Issue';
      case 'external_service_error':
        return 'Service Temporarily Unavailable';
      case 'validation_error':
        return 'Invalid Input';
      case 'network_error':
        return 'Connection Problem';
      case 'session_error':
        return 'Session Issue';
      default:
        return 'Something Went Wrong';
    }
  };

  const getContextualHelp = () => {
    switch (error.type) {
      case 'phone_resolution_error':
        return "I couldn't find the phone you're looking for. This might be because the phone name is misspelled, not available in our database, or needs to be more specific.";
      case 'context_processing_error':
        return "I had trouble understanding the context of your conversation. This might affect my ability to provide relevant recommendations.";
      case 'external_service_error':
        return "Our AI service is temporarily unavailable. I can still help you with basic phone searches and comparisons.";
      case 'validation_error':
        return "There was an issue with your request format. Please check your input and try again.";
      case 'network_error':
        return "I'm having trouble connecting to our servers. Please check your internet connection.";
      case 'session_error':
        return "Your session has expired or encountered an issue. Starting a fresh conversation might help.";
      default:
        return "An unexpected error occurred. Please try again or contact support if the problem persists.";
    }
  };

  const colors = getErrorColors();

  return (
    <div className={`rounded-lg border p-4 mb-4 ${colors.bg} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {getErrorIcon()}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className={`font-medium ${colors.text}`}>
                {getErrorTitle()}
              </h4>
              <div className="flex items-center space-x-2">
                {showDetails && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${colors.button}`}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3 h-3 inline mr-1" />
                        Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 inline mr-1" />
                        Details
                      </>
                    )}
                  </button>
                )}
                {onDismiss && (
                  <button
                    onClick={onDismiss}
                    className={`text-xs p-1 rounded transition-colors ${colors.button}`}
                    title="Dismiss error"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            
            <p className={`text-sm mt-1 ${colors.text} opacity-90`}>
              {getContextualHelp()}
            </p>

            {/* Error message */}
            <p className={`text-xs mt-2 ${colors.text} opacity-75 font-mono`}>
              {error.message}
            </p>

            {/* Suggestions */}
            {error.suggestions.length > 0 && (
              <div className="mt-3">
                <p className={`text-xs font-medium ${colors.text} mb-2`}>
                  Try these suggestions:
                </p>
                <div className="flex flex-wrap gap-2">
                  {error.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={`text-xs px-3 py-1 rounded-full transition-colors ${colors.suggestion}`}
                      title={`Try: ${suggestion}`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Retry button */}
            {error.retryable && onRetry && (
              <div className="mt-3">
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className={`text-xs px-3 py-1 rounded transition-colors flex items-center space-x-1 ${colors.button} disabled:opacity-50`}
                >
                  <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                  <span>{isRetrying ? 'Retrying...' : 'Try Again'}</span>
                </button>
              </div>
            )}

            {/* Expanded details */}
            {isExpanded && error.contextInfo && (
              <div className="mt-4 pt-3 border-t border-current border-opacity-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {error.contextInfo.sessionId && (
                    <div>
                      <span className={`font-medium ${colors.text}`}>Session ID:</span>
                      <div className={`${colors.text} opacity-75 font-mono`}>
                        {error.contextInfo.sessionId.slice(-8)}
                      </div>
                    </div>
                  )}
                  
                  {error.contextInfo.query && (
                    <div>
                      <span className={`font-medium ${colors.text}`}>Query:</span>
                      <div className={`${colors.text} opacity-75`}>
                        "{error.contextInfo.query}"
                      </div>
                    </div>
                  )}
                  
                  {error.contextInfo.phoneReferences && error.contextInfo.phoneReferences.length > 0 && (
                    <div>
                      <span className={`font-medium ${colors.text}`}>Phone References:</span>
                      <div className={`${colors.text} opacity-75`}>
                        {error.contextInfo.phoneReferences.join(', ')}
                      </div>
                    </div>
                  )}
                  
                  {error.contextInfo.lastSuccessfulQuery && (
                    <div>
                      <span className={`font-medium ${colors.text}`}>Last Successful:</span>
                      <div className={`${colors.text} opacity-75`}>
                        "{error.contextInfo.lastSuccessfulQuery}"
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className={`font-medium ${colors.text}`}>Error Code:</span>
                      <span className={`ml-2 ${colors.text} opacity-75 font-mono`}>
                        {error.code}
                      </span>
                    </div>
                    <div>
                      <span className={`font-medium ${colors.text}`}>Severity:</span>
                      <span className={`ml-2 ${colors.text} opacity-75 capitalize`}>
                        {error.severity}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContextualErrorHandler;