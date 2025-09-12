/**
 * RAG Response Handler Component
 *
 * Handles different types of responses from the RAG pipeline and renders
 * appropriate UI components with dynamic rendering based on response type.
 */

import React, { useState } from 'react';
import ChatPhoneCard from './ChatPhoneCard';
import ChatComparisonChart from './ChatComparisonChart';
import ChatSpecTable from './ChatSpecTable';
import { Phone } from '../api/phones';

// RAG Response interfaces
interface RAGResponse {
  response_type: 'text' | 'recommendations' | 'comparison' | 'specs';
  content: {
    text?: string;
    phones?: Phone[];
    comparison_data?: ComparisonData;
    specifications?: PhoneSpecs;
    filters_applied?: Record<string, any>;
    total_found?: number;
  };
  suggestions?: string[];
  metadata?: {
    confidence_score?: number;
    data_sources?: string[];
    processing_time?: number;
    phone_count?: number;
    error?: boolean;
  };
}

interface ComparisonData {
  phones: Array<{
    slug: string;
    name: string;
    brand: string;
    image: string;
    price: number;
  }>;
  features: Array<{
    key: string;
    label: string;
    values: any[];
    unit?: string;
  }>;
  summary: string;
}

interface PhoneSpecs {
  basic_info: {
    slug: string;
    name: string;
    brand: string;
    price: number;
    image: string;
  };
  specifications: {
    display: Record<string, any>;
    performance: Record<string, any>;
    camera: Record<string, any>;
    battery: Record<string, any>;
    connectivity: Record<string, any>;
    design: Record<string, any>;
    scores: Record<string, any>;
  };
}

interface RAGResponseHandlerProps {
  response: RAGResponse | string;
  darkMode: boolean;
  originalQuery: string;
  onSuggestionClick?: (suggestion: string) => void;
  onPhoneClick?: (phoneSlug: string) => void; // ✅ switched to slug
  isLoading?: boolean;
  className?: string;
}

const RAGResponseHandler: React.FC<RAGResponseHandlerProps> = ({
  response,
  darkMode,
  originalQuery,
  onSuggestionClick,
  onPhoneClick,
  isLoading = false,
  className = "",
}) => {
  const [expandedSpecs, setExpandedSpecs] = useState(false);

  // Handle string responses (legacy format)
  if (typeof response === 'string') {
    return (
      <div
        className={`max-w-xs rounded-2xl px-5 py-3 shadow-md ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
        } ${className}`}
      >
        <div className="text-base font-medium whitespace-pre-wrap">{response}</div>
      </div>
    );
  }

  // Handle RAG responses
  const ragResponse = response as RAGResponse;
  const { response_type, content, suggestions, metadata } = ragResponse;

  // Loading state
  if (isLoading) {
    return (
      <div
        className={`max-w-xs rounded-2xl px-5 py-3 shadow-md ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
        } ${className}`}
      >
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand"></div>
          <span className="text-sm">Processing your request...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (metadata?.error) {
    return (
      <div
        className={`max-w-md rounded-2xl px-5 py-3 shadow-md border-l-4 border-red-500 ${
          darkMode ? 'bg-red-900/20 text-red-200' : 'bg-red-50 text-red-800'
        } ${className}`}
      >
        <div className="text-base font-medium">
          {content.text || 'Sorry, I encountered an error processing your request.'}
        </div>
        {suggestions && suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick?.(suggestion)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  darkMode
                    ? 'bg-red-800 text-red-200 hover:bg-red-700'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Render based on response type
  const renderContent = () => {
    switch (response_type) {
      case 'recommendations':
        return renderRecommendations();
      case 'comparison':
        return renderComparison();
      case 'specs':
        return renderSpecifications();
      case 'text':
      default:
        return renderText();
    }
  };

  // Render text responses
  const renderText = () => (
    <div
      className={`max-w-md rounded-2xl px-5 py-3 shadow-md ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
      }`}
    >
      <div className="text-base font-medium whitespace-pre-wrap">
        {content.text || "I'm here to help with your smartphone questions!"}
      </div>

      {/* Related phones if available */}
      {content.phones && content.phones.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-semibold mb-2">Related phones:</div>
          <div className="grid gap-2">
            {content.phones.slice(0, 3).map((phone, index) => (
              <div
                key={phone.slug || index}
                onClick={() => phone.slug && onPhoneClick?.(phone.slug)}
                className={`p-2 rounded-lg cursor-pointer transition ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="text-sm font-medium">{phone.name}</div>
                <div className="text-xs opacity-75">
                  ৳{phone.price?.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {renderSuggestions()}
    </div>
  );

  // Render phone recommendations
  const renderRecommendations = () => (
    <div
      className={`max-w-4xl rounded-2xl px-5 py-3 shadow-md ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
      }`}
    >
      {/* Response text */}
      {content.text && (
        <div className="text-base font-medium mb-4 whitespace-pre-wrap">
          {content.text}
        </div>
      )}

      {/* Phone recommendations */}
      {content.phones && content.phones.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">
              {content.total_found
                ? `${content.total_found} phones found`
                : `${content.phones.length} recommendations`}
            </div>
            {metadata?.processing_time && (
              <div className="text-xs opacity-75">
                {(metadata.processing_time * 1000).toFixed(0)}ms
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {content.phones.slice(0, 6).map((phone, index) => (
              <ChatPhoneCard
                key={phone.slug || index}
                phone={phone}
                darkMode={darkMode}
                onClick={() => phone.slug && onPhoneClick?.(phone.slug)}
                showRelevanceScore={true}
              />
            ))}
          </div>

          {content.phones.length > 6 && (
            <div className="text-center">
              <button
                onClick={() =>
                  onSuggestionClick?.('Show me more phone recommendations')
                }
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  darkMode
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Show {content.phones.length - 6} more phones
              </button>
            </div>
          )}
        </div>
      )}

      {renderSuggestions()}
    </div>
  );

  // Render phone comparison
  const renderComparison = () => (
    <div
      className={`max-w-5xl rounded-2xl px-5 py-3 shadow-md ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
      }`}
    >
      {content.text && (
        <div className="text-base font-medium mb-4 whitespace-pre-wrap">
          {content.text}
        </div>
      )}

      {content.comparison_data && (
        <div className="space-y-4">
          <ChatComparisonChart
            comparisonData={content.comparison_data}
            darkMode={darkMode}
            onPhoneClick={onPhoneClick}
          />

          {content.comparison_data.summary && (
            <div
              className={`p-3 rounded-lg ${
                darkMode ? 'bg-gray-700' : 'bg-white'
              }`}
            >
              <div className="text-sm font-semibold mb-1">Summary:</div>
              <div className="text-sm">{content.comparison_data.summary}</div>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() =>
                onSuggestionClick?.('Take me to the detailed comparison page')
              }
              className="px-4 py-2 rounded-full text-sm font-medium bg-brand text-white hover:bg-brand-darkGreen transition"
            >
              View Detailed Comparison
            </button>
          </div>
        </div>
      )}

      {renderSuggestions()}
    </div>
  );

  // Render phone specifications
  const renderSpecifications = () => (
    <div
      className={`max-w-4xl rounded-2xl px-5 py-3 shadow-md ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
      }`}
    >
      {content.text && (
        <div className="text-base font-medium mb-4 whitespace-pre-wrap">
          {content.text}
        </div>
      )}

      {content.specifications && (
        <div className="space-y-4">
          {content.specifications.basic_info && (
            <div className="flex items-center space-x-4">
              {content.specifications.basic_info.image && (
                <img
                  src={content.specifications.basic_info.image}
                  alt={content.specifications.basic_info.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              )}
              <div>
                <div className="font-semibold text-lg">
                  {content.specifications.basic_info.name}
                </div>
                <div className="text-brand font-medium">
                  ৳{content.specifications.basic_info.price?.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          <ChatSpecTable
            specifications={content.specifications.specifications}
            darkMode={darkMode}
            expandedByDefault={expandedSpecs}
            onToggleExpand={() => setExpandedSpecs(!expandedSpecs)}
          />

          <div className="text-center">
            <button
              onClick={() => {
                const slug = content.specifications?.basic_info?.slug;
                if (slug) {
                  onPhoneClick?.(slug);
                }
              }}
              className="px-4 py-2 rounded-full text-sm font-medium bg-brand text-white hover:bg-brand-darkGreen transition"
            >
              View Full Specifications
            </button>
          </div>
        </div>
      )}

      {renderSuggestions()}
    </div>
  );

  // Render suggestions
  const renderSuggestions = () => {
    if (!suggestions || suggestions.length === 0) return null;

    return (
      <div className="mt-4 pt-3 border-t border-gray-300 dark:border-gray-600">
        <div className="text-xs font-semibold mb-2 opacity-75">Suggestions:</div>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSuggestionClick?.(suggestion)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                darkMode
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Render metadata info
  const renderMetadata = () => {
    if (!metadata || (!metadata.confidence_score && !metadata.data_sources))
      return null;

    return (
      <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
        <div className="flex items-center justify-between text-xs opacity-75">
          {metadata.confidence_score && (
            <div>Confidence: {(metadata.confidence_score * 100).toFixed(0)}%</div>
          )}
          {metadata.data_sources && (
            <div>Sources: {metadata.data_sources.join(', ')}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={className}>
      {renderContent()}
      {renderMetadata()}
    </div>
  );
};

export default RAGResponseHandler;