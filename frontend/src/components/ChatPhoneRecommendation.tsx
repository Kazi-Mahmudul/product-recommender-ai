import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ChatPhoneCard from "./ChatPhoneCard";
import ChatComparisonChart from "./ChatComparisonChart";
import ChatSpecTable from "./ChatSpecTable";
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
  
  // Generate comparison data for the chart
  const generateComparisonData = () => {
    if (phones.length < 2) return null;
    
    // Define the features to compare
    const featureKeys = [
      { key: "overall_device_score" as keyof Phone, label: "Overall Score" },
      { key: "performance_score" as keyof Phone, label: "Performance" },
      { key: "display_score" as keyof Phone, label: "Display" },
    ];
    
    // Generate the features array with percentages
    const features = featureKeys.map(feature => {
      const raw = phones.map(phone => (phone[feature.key] as number | undefined) ?? 0);
      const max = Math.max(...raw.filter(v => !isNaN(Number(v))).map(v => Number(v)));
      const percent = raw.map(v => max > 0 ? (Number(v) / max) * 100 : 0);
      
      return {
        key: feature.key,
        label: feature.key.toString().replace("_", " ").replace(/\w\S*/g, (w: string) => (w.replace(/^\w/, (c: string) => c.toUpperCase()))),
        raw,
        percent,
      };
    });
    
    return {
      phones,
      features: features.filter(f => f.raw.some(v => v > 0)), // Only include features with data
    };
  };
  
  const comparisonData = generateComparisonData();
  
  return (
    <div className="space-y-6 p-4">
      {/* Top Phone Card */}
      {phones.length > 0 && (
        <ChatPhoneCard
          phone={phones[0]}
          darkMode={darkMode}
          onAddToCompare={handleAddToCompare}
          isTopResult={true}
        />
      )}
      
      {/* Device Score Chart (if we have comparison data) */}
      {comparisonData && comparisonData.features.length > 0 && (
        <ChatComparisonChart
          phones={comparisonData.phones}
          features={comparisonData.features}
          darkMode={darkMode}
          onPhoneSelect={handleViewDetails}
          onViewDetailedComparison={phonesToCompare.length >= 2 ? handleCompareSelected : undefined}
        />
      )}
      
      {/* Specification Table */}
      <ChatSpecTable
        phones={phonesWithIds}
        darkMode={darkMode}
        onPhoneSelect={handleViewDetails}
      />
      
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
                onAddToCompare={handleAddToCompare}
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