import React from 'react';
import { ContextualSuggestion, FollowUpSuggestion } from '../types/suggestions';
import { PhoneRecommendationContext } from '../services/chatContextManager';

interface AccessibilityHelperProps {
  suggestions: (FollowUpSuggestion | ContextualSuggestion)[];
  phoneContext?: PhoneRecommendationContext[];
}

const AccessibilityHelper: React.FC<AccessibilityHelperProps> = ({
  suggestions,
  phoneContext
}) => {
  const contextualSuggestions = suggestions.filter(s => 
    'contextualQuery' in s && s.referencedPhones.length > 0
  ) as ContextualSuggestion[];

  const regularSuggestions = suggestions.filter(s => 
    !('contextualQuery' in s) || (s as ContextualSuggestion).referencedPhones.length === 0
  );

  return (
    <div className="sr-only" aria-live="polite">
      {/* Context availability announcement */}
      {phoneContext && phoneContext.length > 0 && (
        <div>
          Context available: {phoneContext.length} recent phone recommendation{phoneContext.length !== 1 ? 's' : ''} 
          from the last 10 minutes can be referenced in suggestions.
        </div>
      )}

      {/* Suggestions summary */}
      <div>
        {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} available: 
        {contextualSuggestions.length > 0 && (
          <span> {contextualSuggestions.length} contextual suggestion{contextualSuggestions.length !== 1 ? 's' : ''}</span>
        )}
        {regularSuggestions.length > 0 && (
          <span> {regularSuggestions.length} general suggestion{regularSuggestions.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Detailed suggestion descriptions */}
      {suggestions.map((suggestion, index) => {
        const isContextual = 'contextualQuery' in suggestion && suggestion.referencedPhones.length > 0;
        const contextualSuggestion = isContextual ? suggestion as ContextualSuggestion : null;
        
        return (
          <div key={suggestion.id}>
            Suggestion {index + 1}: {suggestion.text}. 
            Category: {suggestion.category}. 
            {isContextual && contextualSuggestion ? (
              <>
                This is a contextual suggestion of type {contextualSuggestion.contextType} 
                that references {contextualSuggestion.referencedPhones.length} phone{contextualSuggestion.referencedPhones.length !== 1 ? 's' : ''}: 
                {contextualSuggestion.referencedPhones.join(', ')}. 
                Enhanced query: {contextualSuggestion.contextualQuery}.
              </>
            ) : (
              'This is a general suggestion.'
            )}
          </div>
        );
      })}

      {/* Context usage instructions */}
      {contextualSuggestions.length > 0 && (
        <div>
          Contextual suggestions use information from your previous phone recommendations 
          to provide more relevant follow-up questions. These suggestions are marked with 
          a link icon and include enhanced queries that reference specific phones.
        </div>
      )}

      {/* Navigation instructions */}
      <div>
        Use Tab to navigate between suggestions, Enter or Space to select a suggestion, 
        and Escape to return focus to the main chat input.
      </div>
    </div>
  );
};

export default AccessibilityHelper;