import React from 'react';
import { FollowUpSuggestion, ContextualSuggestion } from '../types/suggestions';
import { PhoneRecommendationContext } from '../services/chatContextManager';
import { ContextAnalytics } from '../services/contextAnalytics';
import ContextIndicator from './ContextIndicator';
import AccessibilityHelper from './AccessibilityHelper';

import { useMobileResponsive } from '../hooks/useMobileResponsive';
import { MobileUtils } from '../utils/mobileUtils';

interface FollowUpSuggestionsProps {
  suggestions: (FollowUpSuggestion | ContextualSuggestion)[];
  onSuggestionClick: (suggestion: FollowUpSuggestion | ContextualSuggestion) => void;
  darkMode: boolean;
  phoneContext?: PhoneRecommendationContext[];
  isLoading?: boolean;
}

const FollowUpSuggestions: React.FC<FollowUpSuggestionsProps> = ({
  suggestions,
  onSuggestionClick,
  darkMode,
  phoneContext,
  isLoading = false
}) => {
  const { isMobile, isTouchDevice } = useMobileResponsive();
  
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const handleSuggestionClick = (suggestion: FollowUpSuggestion | ContextualSuggestion) => {
    if (isTouchDevice) {
      MobileUtils.addHapticFeedback('light');
    }
    
    // Track suggestion click analytics
    try {
      ContextAnalytics.trackSuggestionClicked(suggestion, 'unknown'); // sessionId would need to be passed in
    } catch (error) {
      console.warn('Failed to track suggestion click analytics:', error);
    }
    
    onSuggestionClick(suggestion);
  };

  // Helper function to check if suggestion is contextual
  const isContextualSuggestion = (suggestion: FollowUpSuggestion | ContextualSuggestion): suggestion is ContextualSuggestion => {
    return 'contextualQuery' in suggestion && 'referencedPhones' in suggestion;
  };

  // Helper function to get context indicator styling
  const getContextIndicatorStyle = (suggestion: FollowUpSuggestion | ContextualSuggestion) => {
    if (!isContextualSuggestion(suggestion)) {
      return {
        hasContext: false,
        indicatorColor: '',
        tooltipText: '',
        borderStyle: ''
      };
    }

    const hasPhoneContext = suggestion.referencedPhones.length > 0;
    return {
      hasContext: hasPhoneContext,
      indicatorColor: hasPhoneContext 
        ? (darkMode ? 'text-blue-400' : 'text-blue-600')
        : (darkMode ? 'text-gray-500' : 'text-gray-400'),
      tooltipText: hasPhoneContext 
        ? suggestion.contextIndicator.tooltip 
        : 'General suggestion',
      borderStyle: hasPhoneContext 
        ? (darkMode ? 'border-blue-500/30' : 'border-blue-300/50')
        : ''
    };
  };

  return (
    <div className="mt-4 space-y-3">
      <div className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        💡 You might also want to:
        {phoneContext && phoneContext.length > 0 && (
          <span className={`ml-2 text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            (🔗 contextual suggestions available)
          </span>
        )}
      </div>
      
      <div className={`flex flex-wrap gap-2 ${isMobile ? 'justify-center' : ''}`}>
        {suggestions.map((suggestion) => {
          const contextStyle = getContextIndicatorStyle(suggestion);
          const isContextual = isContextualSuggestion(suggestion);
          
          return (
            <div key={suggestion.id} className="relative group">
              <button
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSuggestionClick(suggestion);
                  }
                }}
                style={{
                  minHeight: isMobile ? '44px' : '36px',
                  minWidth: isMobile ? '44px' : 'auto'
                }}
                className={`
                  inline-flex items-center gap-2 rounded-full font-medium relative
                  transition-all duration-200 transform hover:scale-105 active:scale-95
                  ${isMobile ? 'px-4 py-3 text-base' : 'px-3 py-2 text-sm'}
                  ${darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600' 
                    : 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 shadow-sm'
                  }
                  ${contextStyle.borderStyle}
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md cursor-pointer'}
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  ${darkMode ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}
                  ${isTouchDevice ? 'touch-manipulation' : ''}
                  group
                `}
                aria-label={`Ask: ${suggestion.text}${contextStyle.hasContext ? ' (contextual)' : ''}`}
                title={contextStyle.tooltipText}
              >
                {/* Enhanced context indicator with animation */}
                {contextStyle.hasContext && (
                  <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${contextStyle.indicatorColor} 
                    animate-pulse bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center`}>
                    <span className="text-xs text-white">🔗</span>
                  </span>
                )}
                
                {/* Loading indicator */}
                {isLoading && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-full">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </span>
                )}
                
                <span className={`${isMobile ? 'text-lg' : 'text-base'}`} role="img" aria-hidden="true">
                  {suggestion.icon}
                </span>
                <span className={`${isMobile ? 'text-center' : 'whitespace-nowrap'}`}>
                  {suggestion.text}
                </span>
              </button>
              
              {/* Enhanced tooltip for contextual suggestions */}
              {isContextual && contextStyle.hasContext && (
                <div className={`
                  absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 
                  text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 
                  transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap
                  ${darkMode ? 'bg-gray-800 text-white border border-gray-600' : 'bg-white text-gray-900 border border-gray-200'}
                `}>
                  <div className="font-medium">{suggestion.contextIndicator.description}</div>
                  <div className="text-xs opacity-75 mt-1">
                    References: {suggestion.referencedPhones.slice(0, 2).join(', ')}
                    {suggestion.referencedPhones.length > 2 && ` +${suggestion.referencedPhones.length - 2} more`}
                  </div>
                  {/* Tooltip arrow */}
                  <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 rotate-45 
                    ${darkMode ? 'bg-gray-800 border-r border-b border-gray-600' : 'bg-white border-r border-b border-gray-200'}
                  `}></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Enhanced accessibility information */}
      <AccessibilityHelper 
        suggestions={suggestions}
        phoneContext={phoneContext}
      />
      
      {/* Context legend for first-time users */}
      {phoneContext && phoneContext.length > 0 && suggestions.some(s => isContextualSuggestion(s)) && (
        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-2 flex items-center gap-1`}>
          <span>🔗</span>
          <span>Suggestions with this icon reference your previous phone recommendations</span>
        </div>
      )}
    </div>
  );
};

export default FollowUpSuggestions;