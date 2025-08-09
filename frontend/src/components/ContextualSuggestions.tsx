/**
 * Enhanced Contextual Suggestions Component
 * Provides intelligent query suggestions based on conversation context
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Lightbulb, TrendingUp, Clock, Zap, RefreshCw } from "lucide-react";
import { useContextualSuggestions } from "../hooks/useContextualQuery";

interface ContextualSuggestionsProps {
  sessionId?: string;
  onSuggestionClick: (suggestion: string) => void;
  currentQuery?: string;
  recentPhones?: string[];
  userPreferences?: any;
  className?: string;
  maxSuggestions?: number;
  showCategories?: boolean;
  autoRefresh?: boolean;
}

interface CategorizedSuggestions {
  contextual: string[];
  trending: string[];
  followUp: string[];
  related: string[];
}

const ContextualSuggestions: React.FC<ContextualSuggestionsProps> = ({
  sessionId,
  onSuggestionClick,
  currentQuery = "",
  recentPhones = [],
  userPreferences,
  className = "",
  maxSuggestions = 6,
  showCategories = true,
  autoRefresh = true,
}) => {
  const { suggestions, isLoading, refreshSuggestions } =
    useContextualSuggestions(sessionId);

  const [selectedCategory, setSelectedCategory] =
    useState<keyof CategorizedSuggestions>("contextual");

  // Auto-refresh suggestions when context changes
  useEffect(() => {
    if (autoRefresh && (recentPhones.length > 0 || currentQuery)) {
      const timer = setTimeout(() => {
        refreshSuggestions();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [recentPhones, currentQuery, autoRefresh, refreshSuggestions]);

  // Categorize suggestions based on type and context using useMemo
  const categorizedSuggestions = useMemo((): CategorizedSuggestions => {
    const contextual: string[] = [];
    const trending: string[] = [];
    const followUp: string[] = [];
    const related: string[] = [];

    suggestions.forEach((suggestion) => {
      const lowerSuggestion = suggestion.toLowerCase();

      // Contextual suggestions (reference recent phones or conversation)
      if (
        recentPhones.some(
          (phone) =>
            lowerSuggestion.includes(phone.toLowerCase()) ||
            lowerSuggestion.includes("it") ||
            lowerSuggestion.includes("them") ||
            lowerSuggestion.includes("alternative") ||
            lowerSuggestion.includes("compare")
        )
      ) {
        contextual.push(suggestion);
      }
      // Follow-up suggestions (build on current query)
      else if (
        currentQuery &&
        (lowerSuggestion.includes("more") ||
          lowerSuggestion.includes("other") ||
          lowerSuggestion.includes("similar") ||
          lowerSuggestion.includes("better"))
      ) {
        followUp.push(suggestion);
      }
      // Trending suggestions (popular queries)
      else if (
        lowerSuggestion.includes("best") ||
        lowerSuggestion.includes("latest") ||
        lowerSuggestion.includes("2024") ||
        lowerSuggestion.includes("2025") ||
        lowerSuggestion.includes("flagship")
      ) {
        trending.push(suggestion);
      }
      // Related suggestions (everything else)
      else {
        related.push(suggestion);
      }
    });

    return { contextual, trending, followUp, related };
  }, [suggestions, currentQuery, recentPhones]);

  const handleSuggestionClick = (suggestion: string) => {
    onSuggestionClick(suggestion);
  };

  const handleRefresh = () => {
    refreshSuggestions();
  };

  const getCategoryIcon = (category: keyof CategorizedSuggestions) => {
    switch (category) {
      case "contextual":
        return <Lightbulb className="w-4 h-4" />;
      case "trending":
        return <TrendingUp className="w-4 h-4" />;
      case "followUp":
        return <Zap className="w-4 h-4" />;
      case "related":
        return <Clock className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getCategoryLabel = (category: keyof CategorizedSuggestions) => {
    switch (category) {
      case "contextual":
        return "Based on Context";
      case "trending":
        return "Trending";
      case "followUp":
        return "Follow Up";
      case "related":
        return "Related";
      default:
        return "Suggestions";
    }
  };

  const getCategoryColor = (
    category: keyof CategorizedSuggestions,
    isSelected: boolean
  ) => {
    const colors = {
      contextual: isSelected
        ? "bg-blue-100 text-blue-700 border-blue-300"
        : "bg-gray-100 text-gray-600 border-gray-300",
      trending: isSelected
        ? "bg-green-100 text-green-700 border-green-300"
        : "bg-gray-100 text-gray-600 border-gray-300",
      followUp: isSelected
        ? "bg-purple-100 text-purple-700 border-purple-300"
        : "bg-gray-100 text-gray-600 border-gray-300",
      related: isSelected
        ? "bg-orange-100 text-orange-700 border-orange-300"
        : "bg-gray-100 text-gray-600 border-gray-300",
    };
    return colors[category];
  };

  const getCurrentSuggestions = () => {
    const current = categorizedSuggestions[selectedCategory];
    return current.slice(0, maxSuggestions);
  };

  const getTotalSuggestions = () => {
    return Object.values(categorizedSuggestions).reduce(
      (total, arr) => total + arr.length,
      0
    );
  };

  if (isLoading) {
    return (
      <div
        className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}
      >
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-4 h-4 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-600">Loading suggestions...</span>
        </div>
      </div>
    );
  }

  if (getTotalSuggestions() === 0) {
    return (
      <div
        className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}
      >
        <div className="text-center text-gray-500">
          <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No suggestions available</p>
          <button
            onClick={handleRefresh}
            className="text-xs text-blue-600 hover:text-blue-800 mt-2"
          >
            Refresh suggestions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-800 flex items-center space-x-2">
          <Lightbulb className="w-4 h-4 text-blue-500" />
          <span>Suggestions</span>
        </h3>
        <button
          onClick={handleRefresh}
          className="text-xs text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
          title="Refresh suggestions"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Category tabs */}
      {showCategories && (
        <div className="flex space-x-1 mb-3 overflow-x-auto">
          {(
            Object.keys(categorizedSuggestions) as Array<
              keyof CategorizedSuggestions
            >
          ).map((category) => {
            const count = categorizedSuggestions[category].length;
            if (count === 0) return null;

            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${getCategoryColor(category, selectedCategory === category)}`}
              >
                {getCategoryIcon(category)}
                <span>{getCategoryLabel(category)}</span>
                <span className="bg-white bg-opacity-50 px-1 rounded-full text-xs">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Suggestions */}
      <div className="space-y-2">
        {getCurrentSuggestions().map((suggestion, index) => (
          <button
            key={`${selectedCategory}-${index}`}
            onClick={() => handleSuggestionClick(suggestion)}
            className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
          >
            <div className="flex items-start justify-between">
              <span className="text-sm text-gray-700 group-hover:text-blue-700 flex-1">
                {suggestion}
              </span>
              <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Show more indicator */}
      {categorizedSuggestions[selectedCategory].length > maxSuggestions && (
        <div className="mt-3 text-center">
          <span className="text-xs text-gray-500">
            +{categorizedSuggestions[selectedCategory].length - maxSuggestions}{" "}
            more suggestions
          </span>
        </div>
      )}

      {/* Context indicator */}
      {recentPhones.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>
              Based on: {recentPhones.slice(0, 2).join(", ")}
              {recentPhones.length > 2 &&
                ` and ${recentPhones.length - 2} more`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContextualSuggestions;
