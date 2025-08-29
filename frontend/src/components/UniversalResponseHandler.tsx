import React, { useMemo } from "react";
import ChatPhoneRecommendation from "./ChatPhoneRecommendation";
import EnhancedComparison from "./EnhancedComparison";
import ConciseSpecView from "./ConciseSpecView";
import ChartVisualization from "./ChartVisualization";
import DetailedSpecView from "./DetailedSpecView";
import FeatureDetailView from "./FeatureDetailView";
import { Phone } from "../api/phones";

interface UniversalResponseHandlerProps {
  response: any;
  darkMode: boolean;
  originalQuery?: string;
  onSuggestionClick?: (suggestion: any) => void;
  onDrillDownClick?: (option: any) => void;
  isLoading?: boolean;
  chatContext?: any;
  onContextUpdate?: (context: any) => void;
}

const UniversalResponseHandler: React.FC<UniversalResponseHandlerProps> = ({
  response,
  darkMode,
  originalQuery = "",
  onSuggestionClick,
  onDrillDownClick,
  isLoading = false,
  chatContext,
  onContextUpdate,
}) => {
  // Handle error responses
  if (response?.error) {
    return (
      <div className={`p-4 rounded-lg ${darkMode ? "bg-red-900/20 border-red-700" : "bg-red-50 border-red-200"} border`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <span className="text-xl">⚠️</span>
          </div>
          <div>
            <h3 className={`font-bold ${darkMode ? "text-red-300" : "text-red-700"}`}>
              Error
            </h3>
            <p className={`text-sm mt-1 ${darkMode ? "text-red-200" : "text-red-700"}`}>
              {response.error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Handle string responses
  if (typeof response === "string") {
    return (
      <div className={`rounded-2xl px-5 py-3 max-w-2xl shadow-md text-base whitespace-pre-wrap border ${darkMode ? "bg-[#181818] text-gray-100 border-gray-700" : "bg-[#f7f3ef] text-gray-900 border-[#eae4da]"}`}>
        {response}
      </div>
    );
  }

  // Handle QA responses
  if (response?.type === "qa" && response?.data) {
    return (
      <div className={`rounded-2xl px-5 py-3 max-w-2xl shadow-md text-base whitespace-pre-wrap border ${darkMode ? "bg-[#181818] text-gray-100 border-gray-700" : "bg-[#f7f3ef] text-gray-900 border-[#eae4da]"}`}>
        {response.data}
      </div>
    );
  }

  // Handle chat responses
  if (response?.type === "chat" && response?.data) {
    return (
      <div className={`rounded-2xl px-5 py-3 max-w-2xl shadow-md text-base whitespace-pre-wrap border ${darkMode ? "bg-[#181818] text-gray-100 border-gray-700" : "bg-[#f7f3ef] text-gray-900 border-[#eae4da]"}`}>
        {response.data}
      </div>
    );
  }

  // Handle recommendation responses with phones
  if (response?.type === "recommendation" && Array.isArray(response)) {
    // This is a recommendation response with phone data
    const phones = response.map((item: any) => item.phone || item);
    if (phones.length > 0) {
      return (
        <div className={`rounded-2xl px-0 py-0 max-w-2xl shadow-md text-base whitespace-pre-wrap border w-full overflow-x-auto ${darkMode ? "bg-[#181818] text-gray-100 border-gray-700" : "bg-[#f7f3ef] text-gray-900 border-[#eae4da]"}`}>
          <ChatPhoneRecommendation
            phones={phones}
            darkMode={darkMode}
            originalQuery={originalQuery}
            onSuggestionClick={onSuggestionClick}
            onDrillDownClick={onDrillDownClick}
            isLoading={isLoading}
            chatContext={chatContext}
            onContextUpdate={onContextUpdate}
          />
        </div>
      );
    }
  }

  // Handle recommendation responses with phones (alternative format)
  if (Array.isArray(response) && response.length > 0 && (response[0].phone || response[0].id)) {
    // This is a recommendation response with phone data
    const phones = response.map((item: any) => item.phone || item);
    if (phones.length > 0) {
      return (
        <div className={`rounded-2xl px-0 py-0 max-w-2xl shadow-md text-base whitespace-pre-wrap border w-full overflow-x-auto ${darkMode ? "bg-[#181818] text-gray-100 border-gray-700" : "bg-[#f7f3ef] text-gray-900 border-[#eae4da]"}`}>
          <ChatPhoneRecommendation
            phones={phones}
            darkMode={darkMode}
            originalQuery={originalQuery}
            onSuggestionClick={onSuggestionClick}
            onDrillDownClick={onDrillDownClick}
            isLoading={isLoading}
            chatContext={chatContext}
            onContextUpdate={onContextUpdate}
          />
        </div>
      );
    }
  }

  // Handle comparison responses
  if (response?.type === "comparison" && Array.isArray(response?.phones) && Array.isArray(response?.features)) {
    return (
      <div className="my-8">
        <EnhancedComparison
          phones={response.phones}
          features={response.features}
          summary={response.summary || ""}
          darkMode={darkMode}
          onFeatureFocus={(feature) => {
            console.log("Feature focused:", feature);
          }}
        />
      </div>
    );
  }

  // Handle concise specifications response
  if (response?.type === "concise_specs" && Array.isArray(response?.phones)) {
    return (
      <div className="my-4">
        <ConciseSpecView
          phones={response.phones}
          message={response.message || "View phone details:"}
          darkMode={darkMode}
        />
      </div>
    );
  }

  // Handle chart visualization response
  if (response?.type === "chart_visualization" && response?.comparison_data) {
    return (
      <div className="my-4">
        <ChartVisualization
                  phones={response.phones}
                  darkMode={darkMode}
                  onBackToSimple={response.back_to_simple ? () => window.location.reload() : undefined}
                />
      </div>
    );
  }

  // Handle feature analysis response
  if (response?.type === "feature_analysis" && response?.analysis) {
    return (
      <div className="my-4">
        <FeatureDetailView
          phones={response.phones}
          analysis={response.analysis}
          message={response.message || `Detailed ${response.target} analysis:`}
          darkMode={darkMode}
        />
      </div>
    );
  }

  // Handle detailed specifications response
  if (response?.type === "detailed_specs" && Array.isArray(response?.phones)) {
    return (
      <div className="my-4">
        <DetailedSpecView
          phones={response.phones}
          message={response.message || "Complete specifications:"}
          darkMode={darkMode}
        />
      </div>
    );
  }

  // Handle object responses by converting to JSON string
  if (typeof response === "object" && response !== null) {
    return (
      <div className={`rounded-2xl px-5 py-3 max-w-2xl shadow-md text-base whitespace-pre-wrap border ${darkMode ? "bg-[#181818] text-gray-100 border-gray-700" : "bg-[#f7f3ef] text-gray-900 border-[#eae4da]"}`}>
        {JSON.stringify(response, null, 2)}
      </div>
    );
  }

  // Fallback for any other response type
  return (
    <div className={`rounded-2xl px-5 py-3 max-w-2xl shadow-md text-base whitespace-pre-wrap border ${darkMode ? "bg-[#181818] text-gray-100 border-gray-700" : "bg-[#f7f3ef] text-gray-900 border-[#eae4da]"}`}>
      {typeof response === "string" ? response : JSON.stringify(response, null, 2)}
    </div>
  );
};

export default UniversalResponseHandler;