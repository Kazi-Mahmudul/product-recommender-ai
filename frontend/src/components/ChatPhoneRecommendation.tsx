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

  // Generate drill-down options for power users
  const drillDownOptions = useMemo((): DrillDownOption[] => {
    if (!displayPhones || displayPhones.length === 0) return [];

    return [
      {
        command: "full_specs",
        label: "Show full specs",
        icon: "📋",
      },
      {
        command: "chart_view",
        label: "Open chart view",
        icon: "📊",
      },
      {
        command: "detail_focus",
        label: "Tell me more about display",
        icon: "📱",
        target: "display",
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
