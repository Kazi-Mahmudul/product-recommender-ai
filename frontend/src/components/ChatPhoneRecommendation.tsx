import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ChatPhoneCard from "./ChatPhoneCard";
import CompareSelection from "./CompareSelection";
import { navigateToPhoneDetails, navigateToComparison } from "../utils/navigationUtils";

// Import the Phone interface from api to ensure consistency
import { Phone } from '../api/phones';

interface ChatPhoneRecommendationProps {
  phones: Phone[];
  darkMode: boolean;
}

const ChatPhoneRecommendation: React.FC<ChatPhoneRecommendationProps> = ({
  phones,
  darkMode,
}) => {
  const navigate = useNavigate();
  const [phonesToCompare, setPhonesToCompare] = useState<Phone[]>([]);
  
  // Ensure all phones have IDs (use name as fallback)
  const phonesWithIds = phones.map(phone => ({
    ...phone,
    id: phone.id || parseInt(phone.name.replace(/\s+/g, "-").toLowerCase(), 36),
  }));
  
  const handleViewDetails = (phoneId: string) => {
    navigateToPhoneDetails(navigate, phoneId);
  };
  
  const handleAddToCompare = (phone: Phone) => {
    setPhonesToCompare(prev => {
      // Check if phone is already in the comparison list
      if (prev.some(p => p.id === phone.id)) {
        return prev;
      }
      // Limit to 4 phones maximum
      if (prev.length >= 4) {
        return [...prev.slice(1), phone];
      }
      return [...prev, phone];
    });
  };
  
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
      <p className="text-base font-semibold">📱 Here are some of the best phones according to your query right now:</p>
      {/* Top Phone Card */}
      {phones.length > 0 && (
        <ChatPhoneCard
          phone={phones[0]}
          darkMode={darkMode}
          isTopResult={true}
        />
      )}
      
      {/* Additional Recommendations (if more than one phone) */}
      {phones.length > 1 && (
        <div className="mt-6">
          <h3 className={`text-lg font-semibold mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}>
            Additional Recommendations
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {phones.slice(1).map((phone, index) => (
              <ChatPhoneCard
                key={index}
                phone={phone}
                darkMode={darkMode}
              />
            ))}
          </div>
        </div>
      )}
      
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