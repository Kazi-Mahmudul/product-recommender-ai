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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden relative">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10"></div>
        <svg
          className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 transform translate-x-4 sm:translate-x-8 -translate-y-4 sm:-translate-y-8"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-blue-200 dark:text-blue-800"
          />
          <circle
            cx="50"
            cy="50"
            r="30"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-purple-200 dark:text-purple-800"
          />
          <circle
            cx="50"
            cy="50"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-blue-200 dark:text-blue-800"
          />
        </svg>
      </div>

      {/* Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-750 gap-4 sm:gap-0">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-white"
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
            <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <svg
                className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
              ✨ AI Verdict
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
              Intelligent comparison insights
            </p>
          </div>
        </div>

        {verdict && (
          <button
            onClick={handleAskAIMore}
            className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center sm:justify-start space-x-2 shadow-md hover:shadow-lg transform hover:scale-105 touch-manipulation"
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
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
            <span>Ask More</span>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 md:p-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-6 sm:py-8">
            <div className="flex items-center space-x-2 sm:space-x-3 text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
              <svg
                className="animate-spin w-4 h-4 sm:w-5 sm:h-5"
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
              <span className="text-xs sm:text-sm font-medium">
                {retryCount > 0 ? `Enhancing analysis... (Attempt ${retryCount + 1})` : 'Analyzing phones...'}
              </span>
            </div>
            {retryCount > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center px-4">
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
          <div className="space-y-4 sm:space-y-6">
            {/* Decorative quote marks */}
            <div className="relative">
              <div className="absolute -top-1 sm:-top-2 -left-1 sm:-left-2 text-2xl sm:text-4xl text-blue-200 dark:text-blue-800 font-serif">
                "
              </div>
              <div className="absolute -bottom-2 sm:-bottom-4 -right-1 sm:-right-2 text-2xl sm:text-4xl text-purple-200 dark:text-purple-800 font-serif rotate-180">
                "
              </div>

              <div className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-900/10 dark:via-gray-800 dark:to-purple-900/10 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-blue-100 dark:border-blue-800/30 shadow-inner">
                <div className="absolute top-0 left-0 w-6 h-6 sm:w-8 sm:h-8">
                  <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 w-3 sm:w-4 h-0.5 bg-gradient-to-r from-blue-400 to-transparent rounded-full"></div>
                  <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 w-0.5 h-3 sm:h-4 bg-gradient-to-b from-blue-400 to-transparent rounded-full"></div>
                </div>
                <div className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8">
                  <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 w-3 sm:w-4 h-0.5 bg-gradient-to-l from-purple-400 to-transparent rounded-full"></div>
                  <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 w-0.5 h-3 sm:h-4 bg-gradient-to-b from-purple-400 to-transparent rounded-full"></div>
                </div>
                <div className="absolute bottom-0 left-0 w-6 h-6 sm:w-8 sm:h-8">
                  <div className="absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 w-3 sm:w-4 h-0.5 bg-gradient-to-r from-blue-400 to-transparent rounded-full"></div>
                  <div className="absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 w-0.5 h-3 sm:h-4 bg-gradient-to-t from-blue-400 to-transparent rounded-full"></div>
                </div>
                <div className="absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8">
                  <div className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2 w-3 sm:w-4 h-0.5 bg-gradient-to-l from-purple-400 to-transparent rounded-full"></div>
                  <div className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2 w-0.5 h-3 sm:h-4 bg-gradient-to-t from-purple-400 to-transparent rounded-full"></div>
                </div>

                <div className="relative text-sm sm:text-base leading-relaxed text-gray-800 dark:text-gray-200">
                  <ReactMarkdown 
                    components={{
                      p: ({children}) => <p className="mb-3 last:mb-0">{children}</p>,
                      ul: ({children}) => <ul className="list-disc pl-4 sm:pl-6 mb-3 space-y-1">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal pl-4 sm:pl-6 mb-3 space-y-1">{children}</ol>,
                      li: ({children}) => <li className="text-sm sm:text-base">{children}</li>,
                      strong: ({children}) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
                      h1: ({children}) => <h1 className="text-lg sm:text-xl font-bold mb-3 text-gray-900 dark:text-white">{children}</h1>,
                      h2: ({children}) => <h2 className="text-base sm:text-lg font-semibold mb-2 text-gray-900 dark:text-white">{children}</h2>,
                      h3: ({children}) => <h3 className="text-sm sm:text-base font-medium mb-2 text-gray-800 dark:text-gray-200">{children}</h3>,
                    }}
                  >
                    {verdict}
                  </ReactMarkdown>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-center pt-4">
              <button
                onClick={handleAskAIMore}
                className="group px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-50 hover:from-blue-50 hover:to-purple-50 dark:from-gray-700 dark:to-gray-600 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-all duration-300 flex items-center space-x-3 border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 shadow-sm hover:shadow-md transform hover:scale-105"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <svg
                    className="w-4 h-4 text-white"
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
                </div>
                <span className="text-sm">Continue the conversation</span>
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!verdict && !isLoading && !error && (
          <div className="text-center py-12">
            <div className="relative mx-auto mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <svg
                  className="w-10 h-10 text-blue-600 dark:text-blue-400"
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
              {/* Floating sparkles */}
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
              <div className="absolute -bottom-1 -left-3 w-3 h-3 bg-pink-400 rounded-full animate-pulse delay-300"></div>
              <div className="absolute top-1/2 -right-4 w-2 h-2 bg-green-400 rounded-full animate-pulse delay-700"></div>
            </div>

            <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent mb-3">
              🎯 Get AI-Powered Insights
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
              Unlock intelligent analysis and personalized recommendations
              tailored to your specific needs and preferences.
            </p>

            <button
              onClick={onGenerateVerdict}
              disabled={phones.length === 0}
              className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 flex items-center space-x-3 mx-auto shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:hover:scale-100"
            >
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                <svg
                  className="w-4 h-4"
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
              <span>Generate AI Verdict</span>
              <svg
                className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
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
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-tight">
                🤖 AI-generated insights • Please verify specifications before purchase
              </p>
              </p>
            </div>
            {characterCount > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                {retryCount > 0 && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    Enhanced ({retryCount} retry)
                  </span>
                )}
                <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                  characterCount >= 800 
                    ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-200' 
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-200'
                }`}>
                  {characterCount} chars
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIVerdictBlock;
