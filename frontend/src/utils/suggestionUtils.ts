// Utility functions for suggestion categorization and processing

import { FollowUpSuggestion } from '../types/suggestions';

/**
 * Categorize suggestions by type
 */
export const categorizeSuggestions = (suggestions: FollowUpSuggestion[]) => {
  return {
    filter: suggestions.filter(s => s.category === 'filter'),
    comparison: suggestions.filter(s => s.category === 'comparison'),
    detail: suggestions.filter(s => s.category === 'detail'),
    alternative: suggestions.filter(s => s.category === 'alternative')
  };
};

/**
 * Get icon for suggestion category
 */
export const getCategoryIcon = (category: FollowUpSuggestion['category']): string => {
  const icons = {
    filter: '🔍',
    comparison: '⚖️',
    detail: '📋',
    alternative: '🔄'
  };
  return icons[category] || '💡';
};

/**
 * Get color class for suggestion category
 */
export const getCategoryColor = (category: FollowUpSuggestion['category'], darkMode: boolean): string => {
  const colors = {
    filter: darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600',
    comparison: darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600',
    detail: darkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600',
    alternative: darkMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-orange-500 hover:bg-orange-600'
  };
  return colors[category] || (darkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-500 hover:bg-gray-600');
};

/**
 * Validate suggestion object
 */
export const isValidSuggestion = (suggestion: any): suggestion is FollowUpSuggestion => {
  return (
    suggestion &&
    typeof suggestion.id === 'string' &&
    typeof suggestion.text === 'string' &&
    typeof suggestion.icon === 'string' &&
    typeof suggestion.query === 'string' &&
    ['filter', 'comparison', 'detail', 'alternative'].includes(suggestion.category) &&
    typeof suggestion.priority === 'number'
  );
};

/**
 * Filter and deduplicate suggestions
 */
export const processRawSuggestions = (rawSuggestions: any[]): FollowUpSuggestion[] => {
  const validSuggestions = rawSuggestions.filter(isValidSuggestion);
  
  // Remove duplicates based on query
  const uniqueSuggestions = validSuggestions.filter((suggestion, index, array) => 
    array.findIndex(s => s.query === suggestion.query) === index
  );
  
  return uniqueSuggestions;
};

/**
 * Generate suggestion ID from text
 */
export const generateSuggestionId = (text: string, category: string): string => {
  const cleanText = text.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `${category}-${cleanText}`;
};