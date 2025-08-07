import React, { useState } from 'react';
import { ContextualSuggestion, FollowUpSuggestion } from '../types/suggestions';

interface SuggestionFeedbackProps {
  suggestion: FollowUpSuggestion | ContextualSuggestion;
  darkMode: boolean;
  onFeedback: (suggestionId: string, rating: 'helpful' | 'not-helpful', comment?: string) => void;
}

const SuggestionFeedback: React.FC<SuggestionFeedbackProps> = ({
  suggestion,
  darkMode,
  onFeedback
}) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState<'helpful' | 'not-helpful' | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating) {
      onFeedback(suggestion.id, rating, comment.trim() || undefined);
      setSubmitted(true);
      setTimeout(() => {
        setShowFeedback(false);
        setSubmitted(false);
        setRating(null);
        setComment('');
      }, 2000);
    }
  };

  const isContextual = 'contextualQuery' in suggestion;

  if (submitted) {
    return (
      <div className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-600'} flex items-center gap-1`}>
        <span>✓</span>
        <span>Thank you for your feedback!</span>
      </div>
    );
  }

  if (!showFeedback) {
    return (
      <button
        onClick={() => setShowFeedback(true)}
        className={`text-xs ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'} 
          transition-colors duration-200`}
        title="Rate this suggestion"
      >
        Rate suggestion
      </button>
    );
  }

  return (
    <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
      <div className="mb-2">
        <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          How helpful was this {isContextual ? 'contextual' : 'regular'} suggestion?
        </p>
        {isContextual && (
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
            Referenced: {(suggestion as ContextualSuggestion).referencedPhones.slice(0, 2).join(', ')}
          </p>
        )}
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setRating('helpful')}
          className={`px-3 py-1 rounded text-sm transition-colors duration-200 ${
            rating === 'helpful'
              ? (darkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white')
              : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
          }`}
        >
          👍 Helpful
        </button>
        <button
          onClick={() => setRating('not-helpful')}
          className={`px-3 py-1 rounded text-sm transition-colors duration-200 ${
            rating === 'not-helpful'
              ? (darkMode ? 'bg-red-600 text-white' : 'bg-red-500 text-white')
              : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
          }`}
        >
          👎 Not helpful
        </button>
      </div>

      {rating === 'not-helpful' && (
        <div className="mb-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What could be improved? (optional)"
            className={`w-full p-2 text-sm rounded border resize-none ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
            rows={2}
            maxLength={200}
          />
        </div>
      )}

      <div className="flex justify-between items-center">
        <button
          onClick={() => setShowFeedback(false)}
          className={`text-xs ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'}`}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!rating}
          className={`px-3 py-1 rounded text-sm transition-colors duration-200 ${
            rating
              ? (darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white')
              : (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
          }`}
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default SuggestionFeedback;