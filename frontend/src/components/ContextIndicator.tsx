import React, { useState } from 'react';
import { ContextualSuggestion } from '../types/suggestions';
import { PhoneRecommendationContext } from '../services/chatContextManager';

interface ContextIndicatorProps {
  suggestion: ContextualSuggestion;
  phoneContext?: PhoneRecommendationContext[];
  darkMode: boolean;
  size?: 'small' | 'medium' | 'large';
}

const ContextIndicator: React.FC<ContextIndicatorProps> = ({
  suggestion,
  phoneContext,
  darkMode,
  size = 'medium'
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const hasContext = suggestion.referencedPhones.length > 0;
  
  if (!hasContext) return null;

  const sizeClasses = {
    small: 'w-3 h-3 text-xs',
    medium: 'w-4 h-4 text-sm',
    large: 'w-5 h-5 text-base'
  };

  const contextAge = phoneContext && phoneContext.length > 0 
    ? Date.now() - Math.max(...phoneContext.map(ctx => ctx.timestamp))
    : 0;

  const contextFreshness = contextAge < 60000 ? 'fresh' : contextAge < 300000 ? 'recent' : 'old';

  const freshnessColors = {
    fresh: darkMode ? 'from-green-400 to-green-600' : 'from-green-500 to-green-700',
    recent: darkMode ? 'from-blue-400 to-blue-600' : 'from-blue-500 to-blue-700',
    old: darkMode ? 'from-yellow-400 to-yellow-600' : 'from-yellow-500 to-yellow-700'
  };

  const freshnessLabels = {
    fresh: 'Fresh context (< 1 min)',
    recent: 'Recent context (< 5 min)',
    old: 'Older context (> 5 min)'
  };

  return (
    <div className="relative">
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-r ${freshnessColors[contextFreshness]} 
          flex items-center justify-center cursor-help animate-pulse hover:animate-none transition-all duration-200
          shadow-sm hover:shadow-md`}
        onMouseEnter={() => setShowDetails(true)}
        onMouseLeave={() => setShowDetails(false)}
        title={suggestion.contextIndicator.tooltip}
      >
        <span className="text-white font-bold">🔗</span>
      </div>

      {/* Enhanced tooltip with context details */}
      {showDetails && (
        <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 rounded-lg shadow-xl 
          z-50 min-w-64 max-w-80 ${darkMode ? 'bg-gray-800 text-white border border-gray-600' : 'bg-white text-gray-900 border border-gray-200'}`}>
          
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🔗</span>
            <span className="font-semibold">Contextual Suggestion</span>
          </div>

          {/* Context type and description */}
          <div className="mb-2">
            <div className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'} mb-1`}>
              {suggestion.contextType.charAt(0).toUpperCase() + suggestion.contextType.slice(1)} Suggestion
            </div>
            <div className="text-sm opacity-90">
              {suggestion.contextIndicator.description}
            </div>
          </div>

          {/* Referenced phones */}
          <div className="mb-2">
            <div className="text-sm font-medium mb-1">References:</div>
            <div className="text-sm">
              {suggestion.referencedPhones.slice(0, 3).map((phone, index) => (
                <div key={index} className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  • {phone}
                </div>
              ))}
              {suggestion.referencedPhones.length > 3 && (
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  +{suggestion.referencedPhones.length - 3} more phones
                </div>
              )}
            </div>
          </div>

          {/* Context freshness */}
          <div className="mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${freshnessColors[contextFreshness]}`}></div>
              <span className="text-xs">{freshnessLabels[contextFreshness]}</span>
            </div>
          </div>

          {/* Enhanced query preview */}
          <div className="border-t pt-2 mt-2">
            <div className="text-xs font-medium mb-1">Enhanced Query:</div>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} italic`}>
              "{suggestion.contextualQuery.length > 100 
                ? suggestion.contextualQuery.substring(0, 100) + '...' 
                : suggestion.contextualQuery}"
            </div>
          </div>

          {/* Tooltip arrow */}
          <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 rotate-45 
            ${darkMode ? 'bg-gray-800 border-r border-b border-gray-600' : 'bg-white border-r border-b border-gray-200'}`}>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContextIndicator;