import React from 'react';
import { FollowUpSuggestion } from '../types/suggestions';

import { useMobileResponsive } from '../hooks/useMobileResponsive';
import { MobileUtils } from '../utils/mobileUtils';

interface FollowUpSuggestionsProps {
  suggestions: FollowUpSuggestion[];
  onSuggestionClick: (suggestion: FollowUpSuggestion) => void;
  darkMode: boolean;
  isLoading?: boolean;
}

const FollowUpSuggestions: React.FC<FollowUpSuggestionsProps> = ({
  suggestions,
  onSuggestionClick,
  darkMode,
  isLoading = false
}) => {
  const { isMobile, isTouchDevice } = useMobileResponsive();
  
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const handleSuggestionClick = (suggestion: FollowUpSuggestion) => {
    if (isTouchDevice) {
      MobileUtils.addHapticFeedback('light');
    }
    onSuggestionClick(suggestion);
  };

  return (
    <div className="mt-4 space-y-3">
      <div className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        💡 You might also want to:
      </div>
      
      <div className={`flex flex-wrap gap-2 ${isMobile ? 'justify-center' : ''}`}>
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            onClick={() => handleSuggestionClick(suggestion)}
            disabled={isLoading}
            style={{
              minHeight: isMobile ? '44px' : '36px',
              minWidth: isMobile ? '44px' : 'auto'
            }}
            className={`
              inline-flex items-center gap-2 rounded-full font-medium
              transition-all duration-200 transform hover:scale-105 active:scale-95
              ${isMobile ? 'px-4 py-3 text-base' : 'px-3 py-2 text-sm'}
              ${darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600' 
                : 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 shadow-sm'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md cursor-pointer'}
              focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2
              ${darkMode ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}
              ${isTouchDevice ? 'touch-manipulation' : ''}
            `}
            aria-label={`Ask: ${suggestion.text}`}
          >
            <span className={`${isMobile ? 'text-lg' : 'text-base'}`} role="img" aria-hidden="true">
              {suggestion.icon}
            </span>
            <span className={`${isMobile ? 'text-center' : 'whitespace-nowrap'}`}>
              {suggestion.text}
            </span>
          </button>
        ))}
      </div>
      
      {/* Category indicator for accessibility */}
      <div className="sr-only">
        {suggestions.map((suggestion) => (
          <span key={`${suggestion.id}-category`}>
            {suggestion.text} is a {suggestion.category} suggestion.
          </span>
        ))}
      </div>
    </div>
  );
};

export default FollowUpSuggestions;