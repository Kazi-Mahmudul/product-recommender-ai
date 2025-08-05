import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ChatPhoneCard from "./ChatPhoneCard";
import CompareSelection from "./CompareSelection";
import FollowUpSuggestions from "./FollowUpSuggestions";
import DrillDownOptions from "./DrillDownOptions";
import { navigateToComparison } from "../utils/navigationUtils";
import { SuggestionGenerator } from "../services/suggestionGenerator";
import { RecommendationExplainer } from "../services/recommendationExplainer";
import { FollowUpSuggestion, DrillDownOption } from "../types/suggestions";

// Import the Phone interface from api to ensure consistency
import { Phone } from '../api/phones';

interface ChatPhoneRecommendationProps {
  phones: Phone[];
  darkMode: boolean;
  originalQuery?: string;
  onSuggestionClick?: (suggestion: FollowUpSuggestion) => void;
  onDrillDownClick?: (option: DrillDownOption) => void;
  isLoading?: boolean;
}

const ChatPhoneRecommendation: React.FC<ChatPhoneRecommendationProps> = ({
  phones,
  darkMode,
  originalQuery = '',
  onSuggestionClick,
  onDrillDownClick,
  isLoading = false
}) => {
  const navigate = useNavigate();
  const [phonesToCompare, setPhonesToCompare] = useState<Phone[]>([]);
  
  // Ensure exactly 3 phones are displayed (or less if fewer available)
  const displayPhones = useMemo(() => {
    return phones.slice(0, 3);
  }, [phones]);
  
  // Generate contextual explanation for recommendations
  const explanation = useMemo(() => {
    return RecommendationExplainer.generateExplanation(displayPhones, originalQuery);
  }, [displayPhones, originalQuery]);
  
  // Generate top recommendation summary
  const topRecommendationSummary = useMemo(() => {
    if (displayPhones.length === 0) return '';
    return RecommendationExplainer.generateTopRecommendationSummary(displayPhones[0], originalQuery);
  }, [displayPhones, originalQuery]);
  
  // Generate follow-up suggestions based on current recommendations
  const suggestions = useMemo(() => {
    if (!displayPhones || displayPhones.length === 0) return [];
    return SuggestionGenerator.generateSuggestions(displayPhones, originalQuery);
  }, [displayPhones, originalQuery]);

  // Generate drill-down options for power users
  const drillDownOptions = useMemo((): DrillDownOption[] => {
    if (!displayPhones || displayPhones.length === 0) return [];
    
    return [
      {
        command: 'full_specs',
        label: 'Show full specs',
        icon: '📋'
      },
      {
        command: 'chart_view',
        label: 'Open chart view',
        icon: '📊'
      },
      {
        command: 'detail_focus',
        label: 'Tell me more about display',
        icon: '📱',
        target: 'display'
      }
    ];
  }, [displayPhones]);
  

  
  const handleRemoveFromCompare = (phoneId: string) => {
    setPhonesToCompare(prev => prev.filter(p => p.id !== parseInt(phoneId, 10)));
  };
  
  const handleCompareSelected = () => {
    if (phonesToCompare.length > 1) {
      const phoneIds = phonesToCompare.map(p => String(p.id));
      navigateToComparison(navigate, phoneIds);
    }
  };
  
  
  return (
    <div className="space-y-6 p-4">
      {/* Contextual explanation */}
      <div className={`text-base ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
        <p className="font-semibold mb-2">📱 Here are the top 3 phones for you:</p>
        <p className="text-sm opacity-90">{explanation}</p>
      </div>
      
      {/* Top Phone Card */}
      {displayPhones.length > 0 && (
        <div className="space-y-2">
          {topRecommendationSummary && (
            <p className={`text-sm font-medium ${darkMode ? "text-green-400" : "text-green-600"}`}>
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
          <h3 className={`text-lg font-semibold mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}>
            Other Great Options
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayPhones.slice(1).map((phone, index) => (
              <ChatPhoneCard
                key={index}
                phone={phone}
                darkMode={darkMode}
              />
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