/**
 * Loading Indicator Component
 * Provides various loading states and animations for the chat interface
 */

import React from 'react';

export interface LoadingState {
  isLoading: boolean;
  stage: 'sending' | 'processing' | 'receiving' | 'complete';
  message?: string;
  progress?: number;
}

interface LoadingIndicatorProps {
  darkMode: boolean;
  stage?: 'sending' | 'processing' | 'receiving' | 'complete';
  message?: string;
  showTyping?: boolean;
  compact?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  darkMode,
  stage = 'processing',
  message,
  showTyping = false,
  compact = false,
}) => {
  const getStageMessage = () => {
    if (message) return message;
    
    switch (stage) {
      case 'sending':
        return 'Sending your query...';
      case 'processing':
        return 'Analyzing your request...';
      case 'receiving':
        return 'Getting recommendations...';
      default:
        return 'Processing...';
    }
  };

  const getStageIcon = () => {
    switch (stage) {
      case 'sending':
        return (
          <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
          </svg>
        );
      case 'processing':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        );
      case 'receiving':
        return (
          <svg className="w-4 h-4 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  if (showTyping) {
    return (
      <div className={`flex items-center space-x-2 ${compact ? 'py-2' : 'py-3'}`}>
        <div className="flex space-x-1">
          <div className={`w-2 h-2 rounded-full animate-bounce ${darkMode ? 'bg-gray-400' : 'bg-gray-600'}`} style={{ animationDelay: '0ms' }} />
          <div className={`w-2 h-2 rounded-full animate-bounce ${darkMode ? 'bg-gray-400' : 'bg-gray-600'}`} style={{ animationDelay: '150ms' }} />
          <div className={`w-2 h-2 rounded-full animate-bounce ${darkMode ? 'bg-gray-400' : 'bg-gray-600'}`} style={{ animationDelay: '300ms' }} />
        </div>
        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          AI is typing...
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 ${compact ? 'py-2' : 'py-3 px-4'} ${
      darkMode ? 'text-gray-300' : 'text-gray-700'
    }`}>
      <div className={`flex-shrink-0 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
        {getStageIcon()}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          {getStageMessage()}
        </p>
        {stage === 'processing' && (
          <div className={`mt-1 w-full bg-gray-200 rounded-full h-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div className="bg-blue-600 h-1 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Typing Animation Component
 * Shows a simple typing indicator with animated dots
 */
export const TypingIndicator: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  return (
    <div className={`max-w-xs rounded-2xl px-5 py-3 shadow-md ${
      darkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'
    }`}>
      <div className="flex items-center space-x-2">
        <div className="flex space-x-1">
          <div className={`w-2 h-2 rounded-full animate-bounce ${
            darkMode ? 'bg-gray-400' : 'bg-gray-600'
          }`} style={{ animationDelay: '0ms' }} />
          <div className={`w-2 h-2 rounded-full animate-bounce ${
            darkMode ? 'bg-gray-400' : 'bg-gray-600'
          }`} style={{ animationDelay: '150ms' }} />
          <div className={`w-2 h-2 rounded-full animate-bounce ${
            darkMode ? 'bg-gray-400' : 'bg-gray-600'
          }`} style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-sm">AI is thinking...</span>
      </div>
    </div>
  );
};

/**
 * Inline Loading Spinner
 * Small spinner for inline loading states
 */
export const InlineSpinner: React.FC<{ darkMode: boolean; size?: 'sm' | 'md' | 'lg' }> = ({ 
  darkMode, 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  };

  return (
    <svg 
      className={`animate-spin ${sizeClasses[size]} ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4" 
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" 
      />
    </svg>
  );
};

export default LoadingIndicator;