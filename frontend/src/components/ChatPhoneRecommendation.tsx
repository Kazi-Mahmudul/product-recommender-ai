import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ChatPhoneCard from "./ChatPhoneCard";
import { Phone } from '../api/phones';
import { navigateToComparison } from "../utils/navigationUtils";

interface ChatPhoneRecommendationProps {
  phones: Phone[];
  darkMode: boolean;
  aiReply: string;
  onFollowUp: (question: string) => void;
}

const ChatPhoneRecommendation: React.FC<ChatPhoneRecommendationProps> = ({
  phones,
  darkMode,
  aiReply,
  onFollowUp,
}) => {
  const navigate = useNavigate();
  const [showDrillDown, setShowDrillDown] = useState(false);

  const handleCompare = () => {
    const phoneIds = phones.slice(0, 3).map(p => String(p.id));
    navigateToComparison(navigate, phoneIds);
  };

  const followUpSuggestions = [
    "Show only phones with best battery",
    "Which one is better for gaming?",
    "Do these have 5G?",
  ];

  return (
    <div className="space-y-4 p-4">
      <p className={`text-lg ${darkMode ? "text-gray-300" : "text-gray-800"}`}>{aiReply}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {phones.slice(0, 3).map((phone, index) => (
          <ChatPhoneCard
            key={phone.id || index}
            phone={phone}
            darkMode={darkMode}
            isTopResult={index === 0}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {followUpSuggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onFollowUp(suggestion)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              darkMode
                ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <button
          onClick={() => setShowDrillDown(!showDrillDown)}
          className={`text-sm font-medium ${darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-500"}`}
        >
          {showDrillDown ? "Hide" : "Drill-down"}
        </button>

        {showDrillDown && (
          <div className="flex flex-wrap gap-2 mt-2">
            <button onClick={handleCompare} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${darkMode ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>
              Compare All Three
            </button>
            <button onClick={() => onFollowUp("show full specs")} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${darkMode ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>
              Show Full Specs
            </button>
            <button onClick={() => onFollowUp("open chart view")} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${darkMode ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>
              Open Chart View
            </button>
            <button onClick={() => onFollowUp("tell me more about the display")} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${darkMode ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>
              Tell me more about the display
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPhoneRecommendation;
