
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ChatPhoneCard from "./ChatPhoneCard";
import CompareSelection from "./CompareSelection";
import FollowUpSuggestions from "./FollowUpSuggestions";
import DrillDownOptions from "./DrillDownOptions";
import { navigateToComparison } from "../utils/navigationUtils";
import { SuggestionGenerator } from "../services/suggestionGenerator";
import { ContextualSuggestionGenerator } from "../services/contextualSuggestionGenerator";
import { RecommendationExplainer } from "../services/recommendationExplainer";
import { ChatContextManager } from "../services/chatContextManager";
import {
  FollowUpSuggestion,
  DrillDownOption,
  ContextualSuggestion,
} from "../types/suggestions";

// Import the Phone interface from api to ensure consistency
import { Phone } from "../api/phones";

interface ChatPhoneRecommendationProps {
  phones: Phone[];
  darkMode: boolean;
  originalQuery?: string;
  onSuggestionClick?: (
    suggestion: FollowUpSuggestion | ContextualSuggestion
  ) => void;
  onDrillDownClick?: (option: DrillDownOption) => void;
  isLoading?: boolean;
  chatContext?: any; // Current chat context
  onContextUpdate?: (context: any) => void; // Callback to update context
}

const ChatPhoneRecommendation: React.FC<ChatPhoneRecommendationProps> = ({
  phones,
  darkMode,
  originalQuery = "",
  onSuggestionClick,
  onDrillDownClick,
  isLoading = false,
  chatContext,
  onContextUpdate,
}) => {
  const navigate = useNavigate();
  const [phonesToCompare, setPhonesToCompare] = useState<Phone[]>([]);
  const contextUpdatedRef = useRef<string>("");

  // Ensure exactly 3 phones are displayed (or less if fewer available)
  const displayPhones = useMemo(() => {
    return phones.slice(0, 3);
  }, [phones]);

  // Generate contextual explanation for recommendations
  const explanation = useMemo(() => {
    return RecommendationExplainer.generateExplanation(
      displayPhones,
      originalQuery
    );
  }, [displayPhones, originalQuery]);

  // Generate top recommendation summary
  const topRecommendationSummary = useMemo(() => {
    if (displayPhones.length === 0) return "";
    return RecommendationExplainer.generateTopRecommendationSummary(
      displayPhones[0],
      originalQuery
    );
  }, [displayPhones, originalQuery]);

  // Capture phone recommendation context when phones are displayed
  useEffect(() => {
    if (
      displayPhones.length > 0 &&
      originalQuery &&
      chatContext &&
      onContextUpdate
    ) {
      // Create a unique key for this recommendation
      const recommendationKey = `${originalQuery}-${displayPhones.map((p) => p.id).join(",")}`;

      // Only update if we haven't already processed this exact recommendation
      if (contextUpdatedRef.current !== recommendationKey) {
        try {
          const updatedContext = ChatContextManager.addPhoneRecommendation(
            chatContext,
            displayPhones,
            originalQuery
          );
          onContextUpdate(updatedContext);
          contextUpdatedRef.current = recommendationKey;
        } catch (error) {
          console.warn(
            "Failed to capture phone recommendation context:",
            error
          );
        }
      }
    }
  }, [chatContext, displayPhones, onContextUpdate, originalQuery]); // Only depend on displayPhones and originalQuery

  // Get recent phone contexts for contextual suggestions and UI display
  const recentPhoneContext = useMemo(() => {
    return chatContext
      ? ChatContextManager.getRecentPhoneContext(chatContext, 600000) // 10 minutes
      : [];
  }, [chatContext]);

  // Generate contextual follow-up suggestions based on current and previous recommendations
  const suggestions = useMemo(() => {
    if (!displayPhones || displayPhones.length === 0) return [];

    try {
      // Use contextual suggestions if we have context, otherwise fall back to regular suggestions
      if (recentPhoneContext.length > 0) {
        return ContextualSuggestionGenerator.generateContextualSuggestions(
          displayPhones,
          originalQuery,
          recentPhoneContext
        );
      } else {
        // Fallback to regular suggestions but make them more comprehensive
        return SuggestionGenerator.generateSuggestions(
          displayPhones,
          originalQuery,
          [],
          chatContext
        );
      }
    } catch (error) {
      console.warn("Failed to generate contextual suggestions:", error);
      // Fallback to regular suggestions
      return SuggestionGenerator.generateSuggestions(
        displayPhones,
        originalQuery,
        [],
        chatContext
      );
    }
  }, [displayPhones, originalQuery, recentPhoneContext, chatContext]);

  // Generate contextual drill-down options for power users
  const drillDownOptions = useMemo((): DrillDownOption[] => {
    if (!displayPhones || displayPhones.length === 0) return [];

    // Get phone names for context
    const phoneNames = displayPhones.map(p => p.name).slice(0, 3);
    const brands = Array.from(new Set(displayPhones.map(p => p.brand)));

    return [
      {
        command: "full_specs",
        label: "Show full specifications",
        icon: "📋",
        contextualQuery: `Show full specifications for ${phoneNames.join(', ')}`,
        referencedPhones: phoneNames,
        contextType: "specification",
        contextIndicator: {
          icon: "🔗",
          tooltip: `Specifications for ${phoneNames.slice(0, 2).join(', ')}`,
          description: "Full technical specifications"
        }
      },
      {
        command: "chart_view",
        label: "Open performance charts",
        icon: "📊",
        contextualQuery: `Show performance charts comparing ${phoneNames.join(', ')}`,
        referencedPhones: phoneNames,
        contextType: "comparison",
        contextIndicator: {
          icon: "🔗",
          tooltip: `Performance comparison of ${phoneNames.slice(0, 2).join(', ')}`,
          description: "Visual performance metrics"
        }
      },
      {
        command: "detail_focus",
        label: "Compare display quality",
        icon: "📱",
        target: "display",
        contextualQuery: `Compare display specifications of ${phoneNames.join(', ')}`,
        referencedPhones: phoneNames,
        contextType: "specification",
        contextIndicator: {
          icon: "🔗",
          tooltip: `Display specs for ${phoneNames.slice(0, 2).join(', ')}`,
          description: "Screen technology and quality"
        }
      },
    ];
  }, [displayPhones]);

  const handleRemoveFromCompare = (phoneId: string) => {
    setPhonesToCompare((prev) =>
      prev.filter((p) => p.id !== parseInt(phoneId, 10))
    );
  };

  const handleCompareSelected = () => {
    if (phonesToCompare.length > 1) {
      const phoneIds = phonesToCompare.map((p) => String(p.id));
      navigateToComparison(navigate, phoneIds);
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* AI Reasoning Section */}
      <div
        className={`rounded-xl p-4 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-blue-50 border-blue-200"} border`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <span className="text-xl">🤖</span>
          </div>
          <div>
            <h3 className={`font-bold ${darkMode ? "text-blue-300" : "text-blue-700"}`}>
              AI Recommendation Insight
            </h3>
            <p className={`text-sm mt-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              {explanation || "Based on your query, I've selected these phones that best match your needs."}
            </p>
          </div>
        </div>
      </div>

      {/* Contextual explanation */}
      <div
        className={`text-base ${darkMode ? "text-gray-200" : "text-gray-800"}`}
      >
        <p className="font-semibold mb-2">
          📱 Here are the top 3 phones for you:
        </p>
        <p className="text-sm opacity-90">{explanation}</p>
      </div>

      {/* Top Phone Card */}
      {displayPhones.length > 0 && (
        <div className="space-y-2">
          {topRecommendationSummary && (
            <p
              className={`text-sm font-medium ${darkMode ? "text-green-400" : "text-green-600"}`}
            >
              ⭐ {topRecommendationSummary}
            </p>
          )}
          <ChatPhoneCard
            phone={displayPhones[0]}
            darkMode={darkMode}
            isTopResult={true}
          />
        </div>
      )}

      {/* Additional Recommendations (if more than one phone) */}
      {displayPhones.length > 1 && (
        <div className="mt-6">
          <h3
            className={`text-lg font-semibold mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}
          >
            Other Great Options
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayPhones.slice(1).map((phone, index) => (
              <ChatPhoneCard key={index} phone={phone} darkMode={darkMode} />
            ))}
          </div>
        </div>
      )}

      {/* Follow-up Suggestions */}
      <FollowUpSuggestions
        suggestions={suggestions}
        onSuggestionClick={onSuggestionClick || (() => {})}
        darkMode={darkMode}
        isLoading={isLoading}
        phoneContext={recentPhoneContext}
      />

      {/* Drill-down Options for Power Users */}
      <DrillDownOptions
        options={drillDownOptions}
        onOptionClick={onDrillDownClick || (() => {})}
        darkMode={darkMode}
        isLoading={isLoading}
        phones={displayPhones}
        chatContext={chatContext}
      />

      {/* Comparison Selection UI */}
      <CompareSelection
        selectedPhones={phonesToCompare}
        darkMode={darkMode}
        onRemovePhone={handleRemoveFromCompare}
        onCompareSelected={handleCompareSelected}
      />
    </div>
  );
};

export default ChatPhoneRecommendation;
