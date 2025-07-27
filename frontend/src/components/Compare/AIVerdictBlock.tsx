import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone } from '../../api/phones';

interface AIVerdictBlockProps {
  phones: Phone[];
  verdict: string | null;
  isLoading: boolean;
  error: string | null;
  onGenerateVerdict: () => void;
  onRetry: () => void;
}

const AIVerdictBlock: React.FC<AIVerdictBlockProps> = ({
  phones,
  verdict,
  isLoading,
  error,
  onGenerateVerdict,
  onRetry
}) => {
  const navigate = useNavigate();

  const handleAskAIMore = () => {
    const phoneNames = phones.map(p => `${p.brand} ${p.name}`).join(' vs ');
    const query = `Tell me more about comparing ${phoneNames}. Which one should I choose and why?`;
    navigate('/chat', { state: { initialMessage: query } });
  };

  const formatVerdict = (text: string) => {
    // Split by numbered points or bullet points
    const sections = text.split(/(?=\d+\.|•|\n-)/);
    
    return sections.map((section, index) => {
      const trimmedSection = section.trim();
      if (!trimmedSection) return null;
      
      // Check if it's a numbered point or bullet
      const isNumberedPoint = /^\d+\./.test(trimmedSection);
      const isBulletPoint = /^[•-]/.test(trimmedSection);
      
      if (isNumberedPoint || isBulletPoint) {
        return (
          <div key={index} className="mb-3">
            <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
              {trimmedSection}
            </p>
          </div>
        );
      } else {
        return (
          <p key={index} className="text-gray-800 dark:text-gray-200 leading-relaxed mb-4">
            {trimmedSection}
          </p>
        );
      }
    }).filter(Boolean);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-[#2d5016] to-[#4ade80] rounded-lg flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Epick AI Verdict
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                AI-powered comparison insights
              </p>
            </div>
          </div>
          
          {verdict && (
            <button
              onClick={handleAskAIMore}
              className="px-4 py-2 bg-[#2d5016] hover:bg-[#3d6b1f] text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Ask AI More
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-gray-500 bg-gray-100 dark:bg-gray-700 transition ease-in-out duration-150">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating AI verdict...
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="text-center py-8">
            <div className="mb-4">
              <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Verdict Content */}
        {verdict && !isLoading && !error && (
          <div 
            className="prose prose-gray dark:prose-invert max-w-none"
            role="region"
            aria-label="AI-generated comparison verdict"
            aria-live="polite"
          >
            {formatVerdict(verdict)}
          </div>
        )}

        {/* Empty State */}
        {!verdict && !isLoading && !error && (
          <div className="text-center py-8">
            <div className="mb-4">
              <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Get AI-Powered Insights
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Let our AI analyze these phones and provide personalized recommendations 
                based on your needs and budget.
              </p>
              <button
                onClick={onGenerateVerdict}
                disabled={phones.length === 0}
                className="px-6 py-3 bg-[#2d5016] hover:bg-[#3d6b1f] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center mx-auto"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate AI Verdict
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer with disclaimer */}
      {(verdict || isLoading) && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            AI-generated content. Please verify specifications and prices before making a purchase decision.
          </p>
        </div>
      )}
    </div>
  );
};

export default AIVerdictBlock;