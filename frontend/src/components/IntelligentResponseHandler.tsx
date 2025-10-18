import React, { useState, useEffect } from 'react';
import { ConversationContext } from '../services/intelligentContextManager';
import ChatPhoneCard from './ChatPhoneCard';
import ChartVisualization from './ChartVisualization';
import { Phone } from '../api/phones';

interface IntelligentResponse {
  response_type: string;
  content: {
    text?: string;
    phones?: any[];
    filters_applied?: any;
    suggestions?: string[];
    drill_down_options?: DrillDownOption[];
    [key: string]: any;
  };
  formatting_hints?: {
    display_as?: string;
    text_style?: string;
    show_suggestions?: boolean;
    show_comparison?: boolean;
    highlight_specs?: boolean;
    show_drill_down?: boolean;
    show_specs_guidance?: boolean;
  };
  metadata?: {
    ai_confidence?: number;
    phone_count?: number;
    fallback?: boolean;
    [key: string]: any;
  };
}

interface DrillDownOption {
  label: string;
  command: string;
  target: string;
  contextualQuery?: string;
}

interface Suggestion {
  query: string;
  contextualQuery?: string;
}

interface IntelligentResponseHandlerProps {
  response: IntelligentResponse | string | any;
  darkMode: boolean;
  originalQuery: string;
  chatContext?: ConversationContext;
  onContextUpdate?: (context: ConversationContext) => void;
  onSuggestionClick?: (suggestion: Suggestion) => void;
  onDrillDownClick?: (option: DrillDownOption) => void;
  isLoading?: boolean;
  isWelcomeMessage?: boolean;
}

// Helper function to format response text
const formatResponseText = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  try {
    // Simple text formatting for response display
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/৳[\d,]+/g, '<span class="font-semibold text-green-600 dark:text-green-400">$&</span>')
      .replace(/\b(\d+GB|\d+MP|\d+mAh|\d+Hz|\d+inch|\d+\.?\d*")\b/g, '<span class="font-medium text-blue-600 dark:text-blue-400">$&</span>')
      .replace(/\n/g, '<br/>');
  } catch (error) {
    console.error('Error formatting response text:', error);
    return text;
  }
};

const IntelligentResponseHandler: React.FC<IntelligentResponseHandlerProps> = ({
  response,
  darkMode,
  originalQuery,
  chatContext,
  onContextUpdate,
  onSuggestionClick,
  onDrillDownClick,
  isLoading = false,
  isWelcomeMessage = false
}) => {
  const [parsedResponse, setParsedResponse] = useState<IntelligentResponse | null>(null);

  useEffect(() => {
    // Parse the response into a standardized format
    if (typeof response === 'string') {
      setParsedResponse({
        response_type: 'text',
        content: { text: response },
        formatting_hints: { text_style: 'conversational' }
      });
    } else if (response && typeof response === 'object') {
      // Check if it's already in the intelligent response format
      if (response.response_type && response.content) {
        setParsedResponse(response as IntelligentResponse);
      } else {
        // Convert legacy response formats
        setParsedResponse(convertLegacyResponse(response));
      }
    } else {
      setParsedResponse(null);
    }
  }, [response]);

  const convertLegacyResponse = (legacyResponse: any): IntelligentResponse => {
    // Handle comparison responses
    if (legacyResponse.type === 'comparison' && legacyResponse.phones) {
      return {
        response_type: 'comparison',
        content: legacyResponse,
        formatting_hints: {
          display_as: 'comparison_chart',
          show_comparison: true
        }
      };
    }

    // Handle recommendation responses (array of phones)
    if (Array.isArray(legacyResponse)) {
      return {
        response_type: 'recommendations',
        content: {
          text: 'Here are some great phone recommendations:',
          phones: legacyResponse.map(item => item.phone || item)
        },
        formatting_hints: {
          display_as: 'cards',
          show_comparison: legacyResponse.length > 1
        }
      };
    }

    // Handle Q&A responses
    if (legacyResponse.type === 'qa' || legacyResponse.type === 'chat') {
      return {
        response_type: 'text',
        content: {
          text: legacyResponse.data || legacyResponse.content || '',
          suggestions: legacyResponse.suggestions || []
        },
        formatting_hints: {
          text_style: 'conversational',
          show_suggestions: Boolean(legacyResponse.suggestions?.length)
        }
      };
    }

    // Fallback for unknown formats
    return {
      response_type: 'text',
      content: {
        text: typeof legacyResponse === 'string' ? legacyResponse : JSON.stringify(legacyResponse)
      },
      formatting_hints: { text_style: 'conversational' }
    };
  };

  if (isLoading) {
    return <LoadingIndicator darkMode={darkMode} />;
  }

  if (!parsedResponse) {
    return <ErrorDisplay darkMode={darkMode} message="Unable to process response" />;
  }

  switch (parsedResponse.response_type) {
    case 'text':
      return (
        <TextResponse
          content={parsedResponse.content}
          formatting={parsedResponse.formatting_hints}
          darkMode={darkMode}
          onSuggestionClick={onSuggestionClick}
          isWelcomeMessage={isWelcomeMessage}
        />
      );

    case 'recommendations':
      return (
        <RecommendationResponse
          content={parsedResponse.content}
          formatting={parsedResponse.formatting_hints}
          darkMode={darkMode}
          metadata={parsedResponse.metadata}
        />
      );

    case 'phone_details':
    case 'phone_search_results':
      return (
        <PhoneSearchResponse
          content={parsedResponse.content}
          formatting={parsedResponse.formatting_hints}
          darkMode={darkMode}
          responseType={parsedResponse.response_type}
          onSuggestionClick={onSuggestionClick}
        />
      );

    case 'comparison':
      return (
        <ComparisonResponse
          content={parsedResponse.content}
          formatting={parsedResponse.formatting_hints}
          darkMode={darkMode}
          onDrillDownClick={onDrillDownClick}
        />
      );

    case 'specs':
    case 'concise_specs':
      return (
        <SpecsResponse
          content={parsedResponse.content}
          formatting={parsedResponse.formatting_hints}
          darkMode={darkMode}
        />
      );

    default:
      return (
        <TextResponse
          content={parsedResponse.content}
          formatting={parsedResponse.formatting_hints}
          darkMode={darkMode}
          onSuggestionClick={onSuggestionClick}
          isWelcomeMessage={isWelcomeMessage}
        />
      );
  }
};

// Loading indicator component
const LoadingIndicator: React.FC<{ darkMode: boolean }> = ({ darkMode }) => (
  <div className={`rounded-2xl px-5 py-4 max-w-2xl shadow-md ${
    darkMode ? 'bg-[#181818] text-gray-200' : 'bg-[#f7f3ef] text-gray-900'
  }`}>
    <div className="flex items-center space-x-3">
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand"></div>
      <span className="text-sm">Thinking...</span>
    </div>
  </div>
);

// Error display component
const ErrorDisplay: React.FC<{ darkMode: boolean; message: string }> = ({ darkMode, message }) => (
  <div className={`rounded-2xl px-5 py-4 max-w-2xl shadow-md ${
    darkMode ? 'bg-red-900/20 text-red-200' : 'bg-red-50 text-red-800'
  }`}>
    <p className="text-sm">{message}</p>
  </div>
);

// Phone search response component for specific phone lookups
const PhoneSearchResponse: React.FC<{
  content: any;
  formatting?: any;
  darkMode: boolean;
  responseType: string;
  onSuggestionClick?: (suggestion: Suggestion) => void;
}> = ({ content, formatting, darkMode, responseType, onSuggestionClick }) => {
  
  if (responseType === 'phone_details' && content.phone) {
    // Single phone details view
    const phone = content.phone;
    
    return (
      <div className={`rounded-2xl px-5 py-4 max-w-2xl shadow-md ${
        darkMode ? 'bg-[#181818] text-gray-200' : 'bg-[#f7f3ef] text-gray-900'
      }`}>
        {content.text && (
          <div className="mb-4">
            <div dangerouslySetInnerHTML={{ __html: formatResponseText(content.text) }} />
          </div>
        )}
        
        {/* Phone Card */}
        <div className="mb-4">
          <ChatPhoneCard
            phone={phone}
            darkMode={darkMode}
            isTopResult={true}
            compactMode={false}
          />
        </div>
        
        {/* Suggestions */}
        {content.suggestions && Array.isArray(content.suggestions) && content.suggestions.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-medium mb-2 text-gray-500 dark:text-gray-400">What would you like to do next?</h4>
            <div className="flex flex-wrap gap-2">
              {content.suggestions.map((suggestion: string, index: number) => (
                <button
                  key={index}
                  onClick={() => onSuggestionClick?.({ query: suggestion })}
                  className={`px-3 py-1 rounded-full text-xs border transition ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-brand hover:text-white'
                      : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-brand hover:text-white'
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  if (responseType === 'phone_search_results' && content.phones) {
    // Multiple phones search results
    return (
      <div className={`rounded-2xl px-5 py-4 max-w-2xl shadow-md ${
        darkMode ? 'bg-[#181818] text-gray-200' : 'bg-[#f7f3ef] text-gray-900'
      }`}>
        {content.text && (
          <div className="mb-4">
            <div dangerouslySetInnerHTML={{ __html: formatResponseText(content.text) }} />
          </div>
        )}
        
        {/* Phone Results */}
        <div className="space-y-3">
          {content.phones.map((phone: any, index: number) => (
            <ChatPhoneCard
              key={phone.id || index}
              phone={phone}
              darkMode={darkMode}
              isTopResult={false}
              compactMode={true}
            />
          ))}
        </div>
        
        {/* Not found phones */}
        {content.not_found && content.not_found.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Could not find: {content.not_found.join(', ')}
            </p>
          </div>
        )}
        
        {/* Suggestions */}
        {content.suggestions && Array.isArray(content.suggestions) && content.suggestions.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-medium mb-2 text-gray-500 dark:text-gray-400">What would you like to do next?</h4>
            <div className="flex flex-wrap gap-2">
              {content.suggestions.map((suggestion: string, index: number) => (
                <button
                  key={index}
                  onClick={() => onSuggestionClick?.({ query: suggestion })}
                  className={`px-3 py-1 rounded-full text-xs border transition ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-brand hover:text-white'
                      : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-brand hover:text-white'
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Fallback to text response
  return (
    <TextResponse
      content={content}
      formatting={formatting}
      darkMode={darkMode}
      onSuggestionClick={onSuggestionClick}
    />
  );
};

// Text response component with rich formatting
const TextResponse: React.FC<{
  content: any;
  formatting?: any;
  darkMode: boolean;
  onSuggestionClick?: (suggestion: Suggestion) => void;
  isWelcomeMessage?: boolean;
}> = ({ content, formatting, darkMode, onSuggestionClick, isWelcomeMessage = false }) => {
  const textStyle = formatting?.text_style || 'conversational';
  const showSuggestions = formatting?.show_suggestions && content.suggestions && Array.isArray(content.suggestions) && content.suggestions.length > 0;
  
  // Extract actionable items from text
  const extractActionableItems = (text: string) => {
    if (!text || typeof text !== 'string') {
      return [];
    }
    
    const actionablePatterns = [
      /compare\s+([^.!?]+)/gi,
      /check\s+out\s+([^.!?]+)/gi,
      /consider\s+([^.!?]+)/gi,
      /look\s+at\s+([^.!?]+)/gi,
      /try\s+([^.!?]+)/gi
    ];
    
    const items: string[] = [];
    actionablePatterns.forEach(pattern => {
      try {
        const matches = text.match(pattern);
        if (matches) {
          items.push(...matches.filter(match => typeof match === 'string'));
        }
      } catch (error) {
        console.warn('Error matching pattern:', pattern, error);
      }
    });
    
    return items.slice(0, 3); // Limit to 3 actionable items
  };
  
  const actionableItems = content?.text && typeof content.text === 'string' ? extractActionableItems(content.text) : [];

  const formatText = (text: string) => {
    if (!text || typeof text !== 'string') return '';

    try {
      // Advanced text formatting with markdown support
      let formattedText = text
        // Bold text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
        // Italic text
        .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
        // Inline code
        .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-brand hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
        // Phone names (make them stand out)
        .replace(/\b(iPhone|Samsung Galaxy|Xiaomi|OnePlus|Google Pixel|Huawei|Oppo|Vivo)\s+[A-Za-z0-9\s]+/g, '<span class="font-medium text-brand">$&</span>')
        // Prices in BDT
        .replace(/৳[\d,]+/g, '<span class="font-semibold text-green-600 dark:text-green-400">$&</span>')
        // Technical specs (RAM, storage, etc.)
        .replace(/\b(\d+GB|\d+MP|\d+mAh|\d+Hz|\d+inch|\d+\.?\d*")\b/g, '<span class="font-medium text-blue-600 dark:text-blue-400">$&</span>');

      // Process lines for lists and special formatting
      const lines = formattedText.split('\n');
      const processedLines: string[] = [];
      let inList = false;
      let listItems: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Handle bullet points
        if (line.startsWith('• ') || line.startsWith('- ') || line.match(/^\d+\.\s/)) {
          if (!inList) {
            inList = true;
            listItems = [];
          }
          const listContent = line.replace(/^[•-]\s|^\d+\.\s/, '');
          listItems.push(`<li class="mb-1">${listContent}</li>`);
        } else {
          // End of list
          if (inList) {
            const listType = lines[i - 1]?.match(/^\d+\./) ? 'ol' : 'ul';
            const listClass = listType === 'ol' 
              ? 'list-decimal list-inside space-y-1 my-2 ml-4' 
              : 'list-disc list-inside space-y-1 my-2 ml-4';
            processedLines.push(`<${listType} class="${listClass}">${listItems.join('')}</${listType}>`);
            inList = false;
            listItems = [];
          }
          
          // Handle headers
          if (line.startsWith('# ')) {
            processedLines.push(`<h1 class="text-xl font-bold mt-4 mb-2">${line.substring(2)}</h1>`);
          } else if (line.startsWith('## ')) {
            processedLines.push(`<h2 class="text-lg font-semibold mt-3 mb-2">${line.substring(3)}</h2>`);
          } else if (line.startsWith('### ')) {
            processedLines.push(`<h3 class="text-base font-medium mt-2 mb-1">${line.substring(4)}</h3>`);
          } else if (line === '') {
            processedLines.push('<br />');
          } else {
            // Regular paragraph
            processedLines.push(`<p class="mb-2">${line}</p>`);
          }
        }
      }

      // Handle remaining list items
      if (inList && listItems.length > 0) {
        const lastLine = lines[lines.length - 1];
        const listType = lastLine?.match(/^\d+\./) ? 'ol' : 'ul';
        const listClass = listType === 'ol' 
          ? 'list-decimal list-inside space-y-1 my-2 ml-4' 
          : 'list-disc list-inside space-y-1 my-2 ml-4';
        processedLines.push(`<${listType} class="${listClass}">${listItems.join('')}</${listType}>`);
      }

      return processedLines.join('');
    } catch (error) {
      console.error('Error formatting text:', error);
      return text; // Fallback to plain text
    }
  };

  return (
    <div className={`rounded-2xl px-4 sm:px-5 py-4 max-w-2xl w-full shadow-md ${
      darkMode ? 'bg-[#181818] text-gray-200' : 'bg-[#f7f3ef] text-gray-900'
    }`}>
      <div 
        className={`text-sm sm:text-base leading-relaxed break-words ${
          textStyle === 'error' ? 'text-red-500' : ''
        } ${textStyle === 'detailed' ? 'text-xs sm:text-sm' : ''}`}
        dangerouslySetInnerHTML={{ __html: formatText(content.text || '') }}
      />
      
      {/* Actionable Items */}
      {!isWelcomeMessage && actionableItems.length > 0 && (
        <div className={`mt-3 p-3 rounded-lg border-l-4 border-brand ${
          darkMode ? 'bg-gray-800/50' : 'bg-blue-50'
        }`}>
          <h4 className="text-sm font-medium mb-2 text-brand">Quick Actions:</h4>
          <div className="space-y-1">
            {actionableItems.filter(item => typeof item === 'string' && item.trim()).map((item, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick?.({ query: String(item).replace(/^(compare|check out|consider|look at|try)\s+/i, '') })}
                className={`block text-left text-xs p-2 rounded transition ${
                  darkMode
                    ? 'hover:bg-gray-700 text-gray-300'
                    : 'hover:bg-blue-100 text-gray-700'
                }`}
              >
                💡 {item}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {showSuggestions && content.suggestions && Array.isArray(content.suggestions) && (
        <div className="mt-4">
          <h4 className="text-xs font-medium mb-2 text-gray-500 dark:text-gray-400">Suggestions:</h4>
          <div className="flex flex-wrap gap-2">
            {content.suggestions
              .filter((suggestion: any) => suggestion && typeof suggestion === 'string' && suggestion.trim())
              .map((suggestion: string, index: number) => (
              <button
                key={index}
                onClick={() => onSuggestionClick?.({ query: suggestion })}
                className={`px-3 py-1 rounded-full text-xs border transition ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-brand hover:text-white'
                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-brand hover:text-white'
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Recommendation response component with beautiful ChatPhoneCard
const RecommendationResponse: React.FC<{
  content: any;
  formatting?: any;
  darkMode: boolean;
  metadata?: any;
}> = ({ content, formatting, darkMode, metadata }) => {
  const phones = Array.isArray(content?.phones) ? content.phones : [];
  const displayText = (content?.text && typeof content.text === 'string') ? content.text : 'Here are some recommendations:';

  if (!content || phones.length === 0) {
    return (
      <div className={`rounded-2xl px-4 sm:px-5 py-4 max-w-5xl w-full shadow-md ${
        darkMode ? 'bg-[#181818] text-gray-200' : 'bg-[#f7f3ef] text-gray-900'
      }`}>
        <p className="text-sm sm:text-base leading-relaxed">No recommendations available at the moment.</p>
      </div>
    );
  }

  // Check if we should show the first phone as a top result (for single or primary recommendation)
  const showTopResult = phones.length === 1 || formatting?.show_top_result;
  const topPhone = showTopResult ? phones[0] : null;
  const remainingPhones = showTopResult ? phones.slice(1) : phones;

  return (
    <div className={`rounded-2xl px-4 sm:px-5 py-4 max-w-6xl w-full shadow-md ${
      darkMode ? 'bg-[#181818] text-gray-200' : 'bg-[#f7f3ef] text-gray-900'
    }`}>
      <div 
        className="text-sm sm:text-base leading-relaxed mb-4 break-words"
        dangerouslySetInnerHTML={{ __html: formatResponseText(displayText) }}
      />
      
      {/* Top Result (if applicable) */}
      {topPhone && (
        <div className="mb-6">
          <h3 className={`text-lg font-semibold mb-3 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            🏆 Top Recommendation
          </h3>
          <div className="flex justify-center">
            <ChatPhoneCard
              phone={topPhone as Phone}
              darkMode={darkMode}
              isTopResult={true}
            />
          </div>
        </div>
      )}
      
      {/* Other Recommendations */}
      {remainingPhones.length > 0 && (
        <div>
          {topPhone && (
            <h3 className={`text-base font-medium mb-3 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Other Great Options
            </h3>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {remainingPhones
              .filter((phone: any) => phone && typeof phone === 'object')
              .map((phone: any, index: number) => (
                <ChatPhoneCard
                  key={phone.id || phone.name || index}
                  phone={phone as Phone}
                  darkMode={darkMode}
                  isTopResult={false}
                />
              ))
            }
          </div>
        </div>
      )}

      {metadata?.phone_count && (
        <p className="text-xs text-gray-500 mt-4 text-center sm:text-left">
          Showing {phones.length} of {metadata.phone_count} results
        </p>
      )}
      
      {/* AI Confidence Indicator */}
      {metadata?.ai_confidence && (
        <div className={`mt-3 text-xs flex items-center gap-2 ${
          darkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          <span>🤖 AI Confidence:</span>
          <div className={`flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 max-w-24`}>
            <div 
              className="bg-brand h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(metadata.ai_confidence * 100, 100)}%` }}
            />
          </div>
          <span>{Math.round(metadata.ai_confidence * 100)}%</span>
        </div>
      )}
    </div>
  );
};

// Simple comparison table component (fallback for basic comparisons)
const SimpleComparisonTable: React.FC<{
  phones: any[];
  features: any[];
  darkMode: boolean;
}> = ({ phones, features, darkMode }) => {
  // Helper function to get units for different features
  const getUnit = (featureKey: string): string => {
    const units: Record<string, string> = {
      price: "BDT",
      price_original: "BDT",
      ram_gb: "GB",
      storage_gb: "GB",
      primary_camera_mp: "MP",
      selfie_camera_mp: "MP",
      battery_capacity_numeric: "mAh",
      display_score: "/10",
      camera_score: "/10",
      battery_score: "/10",
      performance_score: "/10",
      overall_device_score: "/10",
      screen_size_inches: "inches",
      refresh_rate_hz: "Hz",
      ppi: "PPI",
      weight: "g",
      thickness: "mm"
    };
    return units[featureKey] || "";
  };
  
  // Find the best value in each feature
  const bestValues = features.map(feature => {
    const values = (feature.values || feature.raw)?.filter((v: any) => v !== null && v !== undefined) || [];
    if (values.length === 0) return null;
    
    // For most features, higher is better, but for price, lower is better
    if (feature.key?.toLowerCase().includes('price')) {
      return Math.min(...values.map((v: any) => Number(v)).filter((v: number) => !isNaN(v)));
    } else {
      return Math.max(...values.map((v: any) => Number(v)).filter((v: number) => !isNaN(v)));
    }
  });
  
  return (
    <div className="min-w-full">
      <table className="w-full text-sm">
        <thead>
          <tr className={`border-b ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <th className="text-left py-3 px-3 font-semibold">Feature</th>
            {phones.map((phone, index) => (
              <th key={index} className="text-center py-3 px-3 min-w-32">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-medium mb-1">{phone.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{phone.brand}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((feature, featureIndex) => {
            const bestValue = bestValues[featureIndex];
            const unit = getUnit(feature.key);
            return (
              <tr key={featureIndex} className={`border-b ${
                darkMode ? 'border-gray-700/50' : 'border-gray-200/50'
              }`}>
                <td className="py-3 px-3 font-medium">
                  {feature.label}
                  {unit && (
                    <span className="text-xs opacity-75 ml-1">({unit})</span>
                  )}
                </td>
                {(feature.values || feature.raw)?.map((value: any, phoneIndex: number) => {
                  // Check if this is the best value for this feature
                  const isBest = value !== null && value !== undefined && 
                                bestValue !== null && 
                                Number(value) === Number(bestValue);
                  
                  // For price features, we want to indicate the best (lowest) price differently
                  const isPriceFeature = feature.key?.toLowerCase().includes('price');
                  const isBestPrice = isPriceFeature && isBest;
                  
                  return (
                    <td key={phoneIndex} className="py-3 px-3 text-center">
                      <span className={`text-sm ${isBest ? 'font-bold' : ''} ${
                        isBestPrice 
                          ? 'text-green-600 dark:text-green-400'  // Green for best price (lowest)
                          : isBest 
                            ? 'text-blue-600 dark:text-blue-400'  // Blue for other best values (highest)
                            : ''
                      }`}>
                        {value !== null && value !== undefined ? value : 'N/A'}
                        {isBest && (
                          <span className="ml-1">
                            {isPriceFeature ? ' 🔽' : ' 🔼'}
                          </span>
                        )}
                      </span>
                    </td>
                  );
                }) || phones.map((_: any, phoneIndex: number) => (
                  <td key={phoneIndex} className="py-3 px-3 text-center">
                    <span className="text-sm text-gray-400">N/A</span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
const ComparisonResponse: React.FC<{
  content: any;
  formatting?: any;
  darkMode: boolean;
  onDrillDownClick?: (option: DrillDownOption) => void;
}> = ({ content, formatting, darkMode, onDrillDownClick }) => {
  const [viewMode, setViewMode] = useState<'simple' | 'chart'>('simple');
  const phones = content.phones || [];
  const features = content.features || [];
  const summary = content.summary || '';
  const showChartVisualization = formatting?.display_as === 'comparison_chart' || viewMode === 'chart';

  // If we have enough phones and should show advanced visualization
  if (showChartVisualization && phones.length >= 2) {
    return (
      <div className={`rounded-2xl px-4 sm:px-5 py-4 max-w-7xl w-full shadow-md ${
        darkMode ? 'bg-[#181818] text-gray-200' : 'bg-[#f7f3ef] text-gray-900'
      }`}>
        {summary && (
          <div 
            className="text-sm sm:text-base leading-relaxed mb-4 break-words"
            dangerouslySetInnerHTML={{ __html: formatResponseText(summary) }}
          />
        )}
        
        <ChartVisualization
          phones={phones as Phone[]}
          darkMode={darkMode}
          onBackToSimple={() => setViewMode('simple')}
        />
        
        {formatting?.show_drill_down && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => onDrillDownClick?.({
                label: 'Full Specifications',
                command: 'full_specs',
                target: 'all_specs'
              })}
              className={`px-3 py-1.5 rounded-full text-xs border font-medium transition ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-brand hover:text-white'
                  : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-brand hover:text-white'
              }`}
            >
              📋 Full Specifications
            </button>
            <button
              onClick={() => onDrillDownClick?.({
                label: 'Detailed Analysis',
                command: 'detail_focus',
                target: 'analysis'
              })}
              className={`px-3 py-1.5 rounded-full text-xs border font-medium transition ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-brand hover:text-white'
                  : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-brand hover:text-white'
              }`}
            >
              🔍 Detailed Analysis
            </button>
          </div>
        )}
      </div>
    );
  }

  // Simple comparison view with option to switch to chart
  return (
    <div className={`rounded-2xl px-4 sm:px-5 py-4 max-w-6xl w-full shadow-md ${
      darkMode ? 'bg-[#181818] text-gray-200' : 'bg-[#f7f3ef] text-gray-900'
    }`}>
      {summary && (
        <div 
          className="text-sm sm:text-base leading-relaxed mb-4 break-words"
          dangerouslySetInnerHTML={{ __html: formatResponseText(summary) }}
        />
      )}
      
      {/* Quick comparison cards */}
      {phones.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {phones
            .filter((phone: any) => phone && typeof phone === 'object')
            .map((phone: any, index: number) => (
              <ChatPhoneCard
                key={phone.id || phone.name || index}
                phone={phone as Phone}
                darkMode={darkMode}
                isTopResult={false}
              />
            ))
          }
        </div>
      )}
      
      {/* Switch to chart view button */}
      {phones.length >= 2 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setViewMode('chart')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              darkMode
                ? 'bg-brand hover:bg-brand-darkGreen text-white'
                : 'bg-brand hover:bg-brand-darkGreen text-white'
            }`}
          >
            📊 Interactive Chart View
          </button>
        </div>
      )}
      
      {/* Simple comparison table (if features provided) */}
      {features.length > 0 && (
        <div className="overflow-x-auto">
          <SimpleComparisonTable
            phones={phones}
            features={features}
            darkMode={darkMode}
          />
        </div>
      )}

      {formatting?.show_drill_down && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => onDrillDownClick?.({
              label: 'Full Specifications',
              command: 'full_specs',
              target: 'all_specs'
            })}
            className={`px-3 py-1.5 rounded-full text-xs border font-medium transition ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-brand hover:text-white'
                : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-brand hover:text-white'
            }`}
          >
            📋 Full Specifications
          </button>
          <button
            onClick={() => onDrillDownClick?.({
              label: 'Detailed Analysis',
              command: 'detail_focus',
              target: 'analysis'
            })}
            className={`px-3 py-1.5 rounded-full text-xs border font-medium transition ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-brand hover:text-white'
                : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-brand hover:text-white'
            }`}
          >
            🔍 Detailed Analysis
          </button>
        </div>
      )}
    </div>
  );
};

// Specs response component with proper guidance to click details button
const SpecsResponse: React.FC<{
  content: any;
  formatting?: any;
  darkMode: boolean;
  onSuggestionClick?: (suggestion: Suggestion) => void;
}> = ({ content, formatting, darkMode, onSuggestionClick }) => {
  const phones = Array.isArray(content?.phones) ? content.phones : [];
  const displayText = (content?.text && typeof content.text === 'string') ? content.text : 'Here are the phones you asked about:';

  if (!content || phones.length === 0) {
    return (
      <div className={`rounded-2xl px-4 sm:px-5 py-4 max-w-5xl w-full shadow-md ${
        darkMode ? 'bg-[#181818] text-gray-200' : 'bg-[#f7f3ef] text-gray-900'
      }`}>
        <p className="text-sm sm:text-base leading-relaxed">No phone specifications available at the moment.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl px-4 sm:px-5 py-4 max-w-6xl w-full shadow-md ${
      darkMode ? 'bg-[#181818] text-gray-200' : 'bg-[#f7f3ef] text-gray-900'
    }`}>
      {/* Main message */}
      <div 
        className="text-sm sm:text-base leading-relaxed mb-4 break-words"
        dangerouslySetInnerHTML={{ __html: formatResponseText(displayText) }}
      />
      
      {/* Prominent guidance section */}
      <div className={`mb-6 p-4 rounded-xl border-2 border-dashed ${
        darkMode 
          ? 'border-blue-400 bg-blue-900/20 text-blue-200' 
          : 'border-blue-500 bg-blue-50 text-blue-800'
      }`}>
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            darkMode ? 'bg-blue-400' : 'bg-blue-500'
          }`}>
            <span className="text-white text-lg">📱</span>
          </div>
          <h3 className="text-lg font-semibold">
            💡 Want to see full specifications?
          </h3>
        </div>
        <p className="text-sm leading-relaxed mb-3">
          Click the <span className={`px-2 py-1 rounded-full font-semibold ${
            darkMode ? 'bg-green-400 text-green-900' : 'bg-green-500 text-white'
          }`}>"View Details"</span> button on any phone card below to see complete specifications, detailed features, and comprehensive reviews.
        </p>
        <div className="flex items-center gap-2 text-xs opacity-75">
          <span>🔍</span>
          <span>Each phone page contains all the technical details you need</span>
        </div>
      </div>
      
      {/* Phone Cards Grid */}
      <div className="space-y-4">
        {phones
          .filter((phone: any) => phone && typeof phone === 'object')
          .map((phone: any, index: number) => {
            // Add pulsing animation to the first phone as an example
            const isFirstPhone = index === 0;
            return (
              <div 
                key={phone.id || phone.name || index}
                className={`${isFirstPhone ? 'relative' : ''}`}
              >
                {isFirstPhone && (
                  <div className={`absolute -inset-2 rounded-2xl animate-pulse ${
                    darkMode ? 'bg-green-400/20' : 'bg-green-500/20'
                  } -z-10`} />
                )}
                <div className="flex justify-center">
                  <ChatPhoneCard
                    phone={phone as Phone}
                    darkMode={darkMode}
                    isTopResult={true}
                  />
                </div>
                {isFirstPhone && (
                  <div className="flex justify-center mt-2">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                      darkMode 
                        ? 'bg-green-400/20 text-green-300 border border-green-400/30'
                        : 'bg-green-100 text-green-700 border border-green-300'
                    }`}>
                      <span className="animate-bounce">👆</span>
                      <span>Try clicking "View Details" here!</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        }
      </div>
      
      {/* Additional guidance footer */}
      <div className={`mt-6 p-3 rounded-lg border-l-4 ${
        darkMode 
          ? 'border-yellow-400 bg-yellow-900/20 text-yellow-200'
          : 'border-yellow-500 bg-yellow-50 text-yellow-800'
      }`}>
        <div className="flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div className="text-sm">
            <p className="font-medium mb-1">Pro Tip:</p>
            <p className="leading-relaxed">
              Each phone's detail page includes comprehensive specifications, performance scores, 
              user reviews, and comparison tools. You can also add phones to compare side-by-side!
            </p>
          </div>
        </div>
      </div>
      
      {/* Suggestions */}
      {content.suggestions && Array.isArray(content.suggestions) && content.suggestions.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-medium mb-2 text-gray-500 dark:text-gray-400">What would you like to do next?</h4>
          <div className="flex flex-wrap gap-2">
            {content.suggestions
              .filter((suggestion: any) => suggestion && typeof suggestion === 'string' && suggestion.trim())
              .map((suggestion: string, index: number) => (
              <button
                key={index}
                onClick={() => onSuggestionClick?.({ query: suggestion })}
                className={`px-3 py-1 rounded-full text-xs border transition ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-brand hover:text-white'
                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-brand hover:text-white'
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IntelligentResponseHandler;