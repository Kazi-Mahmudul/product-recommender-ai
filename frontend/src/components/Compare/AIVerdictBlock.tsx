import React from "react";
import { useNavigate } from "react-router-dom";
import { Phone } from "../../api/phones";
import ReactMarkdown from 'react-markdown'
import AIVerdictErrorFallback from './AIVerdictErrorFallback';

interface AIVerdictBlockProps {
  phones: Phone[];
  verdict: string | null;
  isLoading: boolean;
  error: string | null;
  characterCount?: number;
  retryCount?: number;
  onGenerateVerdict: () => void;
  onRetry: () => void;
}

const AIVerdictBlock: React.FC<AIVerdictBlockProps> = ({
  phones,
  verdict,
  isLoading,
  error,
  characterCount = 0,
  retryCount = 0,
  onGenerateVerdict,
  onRetry,
}) => {
  const navigate = useNavigate();

  const handleAskAIMore = () => {
    const phoneNames = phones.map((p) => `${p.brand} ${p.name}`).join(" vs ");
    const query = `Tell me more about comparing ${phoneNames}. Which one should I choose and why?`;

    // Generate a unique session ID for this navigation to prevent infinite loops
    const navigationId = `compare-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    navigate("/chat", {
      state: {
        initialMessage: query,
        navigationId: navigationId,
        source: 'compare'
      }
    });
  };



  return (
    <div className=" max-w-[800px] mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-gray-800 dark:to-gray-750 gap-3 sm:gap-0">
        <div className="flex items-center space-x-3">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
              ✨ AI Verdict
            </h2>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
              Intelligent comparison insights
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-4 sm:py-6">
            <div className="flex items-center space-x-1.5 sm:space-x-2 text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">
              <svg
                className="animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="text-[10px] xs:text-xs sm:text-sm font-medium">
                {retryCount > 0 ? `Enhancing analysis... (Attempt ${retryCount + 1})` : 'Analyzing phones...'}
              </span>
            </div>
            {retryCount > 0 && (
              <div className="text-[10px] xs:text-xs text-gray-500 dark:text-gray-400 text-center px-3">
                <p>Generating more comprehensive analysis</p>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <AIVerdictErrorFallback onRetry={onRetry} />
        )}

        {/* Verdict Content */}
        {verdict && !isLoading && !error && (
          <div className="space-y-3 sm:space-y-4">
            {/* Decorative quote marks */}
            <div className="relative">
              <div className="absolute -top-1 -left-1 text-xl sm:text-2xl text-blue-200 dark:text-blue-800 font-serif">
                "
              </div>
              <div className="absolute -bottom-2 -right-1 text-xl sm:text-2xl text-purple-200 dark:text-purple-800 font-serif rotate-180">
                "
              </div>

              <div className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-900/10 dark:via-gray-800 dark:to-purple-900/10 rounded-md sm:rounded-lg md:rounded-xl p-3 sm:p-4 md:p-5 lg:p-6 border border-blue-100 dark:border-blue-800/30 shadow-inner">
                <div className="absolute top-0 left-0 w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8">
                  <div className="absolute top-1 sm:top-1.5 md:top-2 left-1 sm:left-1.5 md:left-2 w-2 sm:w-3 md:w-4 h-0.5 bg-gradient-to-r from-blue-400 to-transparent rounded-full"></div>
                  <div className="absolute top-1 sm:top-1.5 md:top-2 left-1 sm:left-1.5 md:left-2 w-0.5 h-2 sm:h-3 md:h-4 bg-gradient-to-b from-blue-400 to-transparent rounded-full"></div>
                </div>
                <div className="absolute top-0 right-0 w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8">
                  <div className="absolute top-1 sm:top-1.5 md:top-2 right-1 sm:right-1.5 md:right-2 w-2 sm:w-3 md:w-4 h-0.5 bg-gradient-to-l from-purple-400 to-transparent rounded-full"></div>
                  <div className="absolute top-1 sm:top-1.5 md:top-2 right-1 sm:right-1.5 md:right-2 w-0.5 h-2 sm:h-3 md:h-4 bg-gradient-to-b from-purple-400 to-transparent rounded-full"></div>
                </div>
                <div className="absolute bottom-0 left-0 w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8">
                  <div className="absolute bottom-1 sm:bottom-1.5 md:bottom-2 left-1 sm:left-1.5 md:left-2 w-2 sm:w-3 md:w-4 h-0.5 bg-gradient-to-r from-blue-400 to-transparent rounded-full"></div>
                  <div className="absolute bottom-1 sm:bottom-1.5 md:bottom-2 left-1 sm:left-1.5 md:left-2 w-0.5 h-2 sm:h-3 md:h-4 bg-gradient-to-t from-blue-400 to-transparent rounded-full"></div>
                </div>
                <div className="absolute bottom-0 right-0 w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8">
                  <div className="absolute bottom-1 sm:bottom-1.5 md:bottom-2 right-1 sm:right-1.5 md:right-2 w-2 sm:w-3 md:w-4 h-0.5 bg-gradient-to-l from-purple-400 to-transparent rounded-full"></div>
                  <div className="absolute bottom-1 sm:bottom-1.5 md:bottom-2 right-1 sm:right-1.5 md:right-2 w-0.5 h-2 sm:h-3 md:h-4 bg-gradient-to-t from-purple-400 to-transparent rounded-full"></div>
                </div>

                <div className="relative text-[10px] sm:text-xs md:text-sm lg:text-base leading-relaxed text-gray-800 dark:text-gray-200">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 md:mb-3 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-3 sm:pl-4 md:pl-5 mb-2 md:mb-3 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-3 sm:pl-4 md:pl-5 mb-2 md:mb-3 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="text-[10px] xs:text-xs md:text-sm">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
                      h1: ({ children }) => <h1 className="text-sm sm:text-base md:text-lg font-bold mb-2 md:mb-3 text-gray-900 dark:text-white">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-xs sm:text-sm md:text-base font-semibold mb-1.5 md:mb-2 text-gray-900 dark:text-white">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-[10px] xs:text-xs sm:text-sm font-medium mb-1.5 md:mb-2 text-gray-800 dark:text-gray-200">{children}</h3>,
                    }}
                  >
                    {verdict}
                  </ReactMarkdown>
                </div>
              </div>
            </div>

            {/* Action button */}
            <div className="flex justify-center">
              <button
                onClick={handleAskAIMore}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 border border-gray-300 dark:border-gray-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <span className="text-sm md:text-base">Continue the conversation</span>
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!verdict && !isLoading && !error && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Get AI-Powered Insights
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto text-sm">
              Unlock intelligent analysis and personalized recommendations
            </p>

            <button
              onClick={onGenerateVerdict}
              disabled={phones.length === 0}
              className="flex items-center justify-center space-x-2 mx-auto rounded-full px-6 py-2.5 font-medium text-brand dark:text-brand dark:hover:text-hover-light text-sm md:text-base bg-brand/10 hover:bg-brand/20 transition-colors duration-200 shadow-sm hover:shadow-md"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span>Generate AI Verdict</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer disclaimer */}
      {verdict && (
        <div className="relative px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50/30 dark:from-gray-750 dark:to-blue-900/10 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-2.5 h-2.5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-tight" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
                AI-generated insights • Market-Context এবং Specifications-এর উপর ভিত্তি করে তৈরি
              </p>
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
};

export default AIVerdictBlock;
