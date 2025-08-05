import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
// Recharts imports removed as they're now handled by EnhancedComparison component
import ChatPhoneRecommendation from "../components/ChatPhoneRecommendation";
import EnhancedComparison from "../components/EnhancedComparison";
import {
  ChatContextManager,
  ChatContext,
} from "../services/chatContextManager";
import { ErrorHandler } from "../services/errorHandler";
import { AIResponseEnhancer } from "../services/aiResponseEnhancer";
import { useMobileResponsive } from "../hooks/useMobileResponsive";
import { useFeatureFlags } from "../utils/featureFlags";

interface ChatMessage {
  user: string;
  bot: string;
  phones?: any[];
}

interface ChatPageProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

const SUGGESTED_QUERIES = [
  // Budget-friendly options
  "Best phones under 25,000 BDT",
  "Budget phones with great cameras",
  "Affordable phones with good performance",

  // Mid-range recommendations
  "Best phones under 50,000 BDT",
  "Mid-range phones with 120Hz display",
  "Phones with wireless charging under 60,000",

  // Premium options
  "Latest flagship phones 2025",
  "Premium phones with best cameras",
  "High-end gaming phones",

  // Feature-specific queries
  "Phones with longest battery life",
  "Best camera phones for photography",
  "Phones with fast charging support",

  // Brand comparisons
  "Samsung vs iPhone comparison",
  "Compare Xiaomi POCO X6 vs Realme GT Neo",
  "Best OnePlus phones available",

  // Specific information
  "What's new in iPhone 15 series?",
  "Samsung Galaxy A55 full specifications",
  "Which phones support 5G in Bangladesh?",
];

const API_BASE_URL = process.env.REACT_APP_API_BASE;
const GEMINI_API_URL = process.env.REACT_APP_GEMINI_API;

// Comparison-related functions moved to EnhancedComparison component

const ChatPage: React.FC<ChatPageProps> = ({ darkMode }) => {
  const location = useLocation();
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [chatContext, setChatContext] = useState<ChatContext>(() => {
    try {
      return ChatContextManager.loadContext();
    } catch (err) {
      return ErrorHandler.handleContextError(err as Error);
    }
  });
  const [retryCount, setRetryCount] = useState(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const {} = useMobileResponsive();
  const featureFlags = useFeatureFlags();

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  useEffect(() => {
    if (chatHistory.length === 0 && showWelcome) {
      setChatHistory([
        {
          user: "",
          bot: `Hi there! 👋 Welcome to ePick AI\n\nI'm your personal smartphone advisor, here to help you discover the perfect phone that matches your needs and budget in Bangladesh. 🇧🇩📱\n\n✨ **What I can help you with:**
            • Find phones within your budget
            • Compare specifications side-by-side
            • Get detailed reviews and insights
            • Discover the latest releases
            • Answer technical questions\n\n💡 **Try asking me something like:**
            "Best phones under 30,000 BDT" or "Compare iPhone vs Samsung" \n\n Let's find your perfect phone together! 🚀`,
        },
      ]);
    }
  }, [chatHistory.length, showWelcome]);

  const handleSendMessage = useCallback(
    async (initialMessage?: string) => {
      const messageToSend = initialMessage || message;
      if (!messageToSend.trim()) return;

      setMessage("");
      setIsLoading(true);
      setError(null);
      setShowWelcome(false);

      const newChatHistory = [
        ...chatHistory.filter((msg) => msg.user || msg.bot),
        { user: messageToSend, bot: "" },
      ];
      setChatHistory(newChatHistory);

      // Create the message object for context tracking
      const messageForContext: ChatMessage = {
        user: messageToSend,
        bot: "",
        phones: [],
      };

      try {
        // 1. Send to Gemini intent parser
        const geminiRes = await fetch(`${GEMINI_API_URL}/parse-query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: messageToSend }),
        });

        if (!geminiRes.ok) {
          const err = await geminiRes.json();
          throw new Error(err.detail || "Failed to parse query");
        }

        const result = await geminiRes.json();

        if (result.type === "recommendation") {
          const phonesRes = await fetch(
            `${API_BASE_URL}/api/v1/natural-language/query?query=${encodeURIComponent(messageToSend)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            }
          );

          if (!phonesRes.ok) {
            const err = await phonesRes.json();
            throw new Error(err.detail || "Failed to fetch phones");
          }

          const phoneData = await phonesRes.json();

          setChatHistory((prev) => {
            const updated = [...prev];
            if (Array.isArray(phoneData)) {
              // Recommendation response with phone data
              updated[updated.length - 1].bot =
                "Based on your query, here are some recommendations:";
              // Extract phone objects from the recommendation response
              const phones = phoneData.map((item) => item.phone || item);
              updated[updated.length - 1].phones = phones;

              // Update context with the complete message if enabled
              if (featureFlags.contextManagement) {
                messageForContext.bot = updated[updated.length - 1].bot;
                messageForContext.phones = phones;
                const updatedContext = ChatContextManager.updateWithMessage(
                  chatContext,
                  messageForContext
                );
                setChatContext(updatedContext);
              }
            } else if (phoneData.type === "qa" || phoneData.type === "chat") {
              // QA or chat response
              updated[updated.length - 1].bot = phoneData.data;

              // Update context if enabled
              if (featureFlags.contextManagement) {
                messageForContext.bot = phoneData.data;
                const updatedContext = ChatContextManager.updateWithMessage(
                  chatContext,
                  messageForContext
                );
                setChatContext(updatedContext);
              }
            } else if (phoneData.type === "comparison") {
              // Comparison response
              updated[updated.length - 1].bot = phoneData;

              // Update context
              messageForContext.bot = phoneData;
              const updatedContext = ChatContextManager.updateWithMessage(
                chatContext,
                messageForContext
              );
              setChatContext(updatedContext);
            } else {
              // Fallback for other response types
              updated[updated.length - 1].bot =
                typeof phoneData === "string"
                  ? phoneData
                  : JSON.stringify(phoneData);

              // Update context
              messageForContext.bot = updated[updated.length - 1].bot;
              const updatedContext = ChatContextManager.updateWithMessage(
                chatContext,
                messageForContext
              );
              setChatContext(updatedContext);
            }
            return updated;
          });
        } else {
          // For non-recommendation queries, call the backend directly
          const phonesRes = await fetch(
            `${API_BASE_URL}/api/v1/natural-language/query?query=${encodeURIComponent(messageToSend)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            }
          );

          if (!phonesRes.ok) {
            const err = await phonesRes.json();
            throw new Error(err.detail || "Failed to process query");
          }

          const responseData = await phonesRes.json();

          setChatHistory((prev) => {
            const updated = [...prev];
            // Handle different response types
            if (responseData.type === "qa" || responseData.type === "chat") {
              updated[updated.length - 1].bot = responseData.data;

              // Update context
              messageForContext.bot = responseData.data;
              const updatedContext = ChatContextManager.updateWithMessage(
                chatContext,
                messageForContext
              );
              setChatContext(updatedContext);
            } else if (responseData.type === "comparison") {
              updated[updated.length - 1].bot = responseData;

              // Update context
              messageForContext.bot = responseData;
              const updatedContext = ChatContextManager.updateWithMessage(
                chatContext,
                messageForContext
              );
              setChatContext(updatedContext);
            } else {
              // Fallback for other response types
              updated[updated.length - 1].bot =
                typeof responseData === "string"
                  ? responseData
                  : JSON.stringify(responseData);

              // Update context
              messageForContext.bot = updated[updated.length - 1].bot;
              const updatedContext = ChatContextManager.updateWithMessage(
                chatContext,
                messageForContext
              );
              setChatContext(updatedContext);
            }
            return updated;
          });
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        // Use enhanced error handling if enabled
        if (featureFlags.errorRecovery) {
          const errorRecovery = ErrorHandler.handleError(error, chatContext);

          if (errorRecovery.retryAction && retryCount < 3) {
            // Attempt retry
            setRetryCount((prev) => prev + 1);
            try {
              await errorRecovery.retryAction();
              // Retry the original request
              handleSendMessage(messageToSend);
              return;
            } catch (retryError) {
              // If retry fails, continue with error handling
            }
          }

          // Reset retry count on successful error handling
          setRetryCount(0);
        }

        // Generate enhanced error message if AI enhancements are enabled
        const enhancedError = featureFlags.aiResponseEnhancements
          ? AIResponseEnhancer.generateContextualErrorMessage(
              error.message,
              chatContext
            )
          : {
              message: `Sorry, something went wrong: ${error.message}`,
              suggestions: [],
            };

        setError(enhancedError.message);
        setChatHistory((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].bot = enhancedError.message;

          // Add error suggestions if available
          if (
            enhancedError.suggestions &&
            enhancedError.suggestions.length > 0
          ) {
            updated[updated.length - 1].bot +=
              `\n\nHere are some things you can try:\n${enhancedError.suggestions.map((s) => `• ${s}`).join("\n")}`;
          }

          // Update context even for error messages if context management is enabled
          if (featureFlags.contextManagement) {
            messageForContext.bot = updated[updated.length - 1].bot;
            const updatedContext = ChatContextManager.updateWithMessage(
              chatContext,
              messageForContext
            );
            setChatContext(updatedContext);
          }

          return updated;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [
      message,
      chatHistory,
      isLoading,
      chatContext,
      featureFlags.aiResponseEnhancements,
      featureFlags.contextManagement,
      featureFlags.errorRecovery,
      retryCount,
    ]
  );

  useEffect(() => {
    if (location.state?.initialMessage) {
      handleSendMessage(location.state.initialMessage);
    }
  }, [handleSendMessage, location.state]);

  const handleSuggestionClick = (query: string) => {
    setShowWelcome(false);
    handleSendMessage(query);
  };

  return (
    <div
      className={`my-8 flex items-center justify-center bg-gradient-to-br from-brand/5 via-white to-brand-darkGreen/10 dark:from-brand/20 dark:via-gray-900 dark:to-brand-darkGreen/20 min-h-screen`}
    >
      <div
        className={`w-full max-w-3xl mx-auto my-8 rounded-3xl shadow-2xl ${
          darkMode
            ? "bg-[#232323] border-gray-800"
            : "bg-white border-[#eae4da]"
        } border flex flex-col`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b rounded-t-3xl ${
            darkMode
              ? "bg-[#232323] border-gray-800"
              : "bg-white border-[#eae4da]"
          }`}
        >
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <span className="font-bold text-xl sm:text-2xl text-brand truncate">
              ePick AI
            </span>
            <span className="text-base sm:text-lg">🤖</span>
          </div>
          <div className="flex gap-1 sm:gap-2 ml-2">
            <button
              className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold bg-brand text-white shadow-md hover:opacity-90 transition whitespace-nowrap"
              onClick={() => {
                setChatHistory([]);
                setShowWelcome(true);
              }}
            >
              <span className="hidden sm:inline">New chat</span>
              <span className="sm:hidden">New</span>
            </button>
            <button
              className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold bg-gray-500 text-white shadow-md hover:opacity-90 transition whitespace-nowrap"
              onClick={() => {
                const newContext = ChatContextManager.clearContext();
                setChatContext(newContext);
                setChatHistory([]);
                setShowWelcome(true);
              }}
              title="Clear all preferences and start fresh"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div ref={chatContainerRef} className="px-6 py-4 space-y-6 pb-32">
          <div className="flex flex-col space-y-4">
            {chatHistory.map((chat, index) => (
              <div key={index}>
                {chat.user && (
                  <div className="flex justify-end mb-2">
                    <div className="rounded-2xl px-5 py-3 max-w-xs shadow-md bg-brand text-white text-base font-medium whitespace-pre-wrap">
                      {chat.user}
                    </div>
                  </div>
                )}

                {/* Handle phone recommendation with enhanced components */}
                {chat.bot && chat.phones && chat.phones.length > 0 ? (
                  <div className="flex justify-start">
                    <div
                      className={`rounded-2xl px-0 py-0 max-w-2xl shadow-md text-base whitespace-pre-wrap border w-full overflow-x-auto ${
                        darkMode
                          ? "bg-[#181818] text-gray-100 border-gray-700"
                          : "bg-[#f7f3ef] text-gray-900 border-[#eae4da]"
                      }`}
                    >
                      {/* Use our new ChatPhoneRecommendation component */}
                      <ChatPhoneRecommendation
                        phones={chat.phones}
                        darkMode={darkMode}
                        originalQuery={
                          featureFlags.enhancedSuggestions
                            ? chat.user || ""
                            : ""
                        }
                        onSuggestionClick={
                          featureFlags.enhancedSuggestions
                            ? (suggestion) =>
                                handleSendMessage(suggestion.query)
                            : undefined
                        }
                        onDrillDownClick={
                          featureFlags.drillDownMode
                            ? (option) => {
                                // Handle drill-down commands
                                let query = "";
                                switch (option.command) {
                                  case "full_specs":
                                    query =
                                      "show full specifications for these phones";
                                    break;
                                  case "chart_view":
                                    query =
                                      "compare these phones in chart view";
                                    break;
                                  case "detail_focus":
                                    query = `tell me more about the ${option.target || "features"} of these phones`;
                                    break;
                                }
                                handleSendMessage(query);
                              }
                            : undefined
                        }
                        isLoading={isLoading}
                      />
                    </div>
                  </div>
                ) : (
                  typeof chat.bot === "string" && (
                    <div className="flex justify-start">
                      <div
                        className={`rounded-2xl px-5 py-3 max-w-2xl shadow-md text-base whitespace-pre-wrap border ${
                          darkMode
                            ? "bg-[#181818] text-gray-100 border-gray-700"
                            : "bg-[#f7f3ef] text-gray-900 border-[#eae4da]"
                        }`}
                      >
                        {chat.bot}
                      </div>
                    </div>
                  )
                )}

                {chat.bot &&
                  typeof chat.bot === "object" &&
                  (chat.bot as any).type === "comparison" &&
                  Array.isArray((chat.bot as any).phones) &&
                  Array.isArray((chat.bot as any).features) && (
                    <div className="my-8">
                      <EnhancedComparison
                        phones={(chat.bot as any).phones}
                        features={(chat.bot as any).features}
                        summary={(chat.bot as any).summary || ""}
                        darkMode={darkMode}
                        onFeatureFocus={(feature) => {
                          // Handle feature focus - could trigger detailed analysis
                          console.log("Feature focused:", feature);
                        }}
                      />
                    </div>
                  )}

                {/* Welcome Suggestions */}
                {index === 0 && showWelcome && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {SUGGESTED_QUERIES.map((suggestion) => (
                      <button
                        key={suggestion}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition ${
                          darkMode
                            ? "bg-[#181818] border-gray-700 text-gray-200 hover:bg-brand hover:text-white"
                            : "bg-[#f7f3ef] border-[#eae4da] text-gray-900 hover:bg-brand hover:text-white"
                        }`}
                        onClick={() => handleSuggestionClick(suggestion)}
                        disabled={isLoading}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Input */}
        <div className="fixed bottom-0 left-0 w-full flex justify-center z-30 pb-4 pointer-events-none">
          <div className="w-full max-w-xl mx-auto px-2 sm:px-4 pointer-events-auto">
            <div
              className={`flex items-center bg-white dark:bg-[#232323] border ${
                darkMode ? "border-gray-700" : "border-[#eae4da]"
              } shadow-lg rounded-2xl py-2 px-3 sm:py-3 sm:px-5 mb-2`}
            >
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                className={`flex-1 bg-transparent text-base focus:outline-none placeholder-gray-400 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
                placeholder="Type your message..."
                disabled={isLoading}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !message.trim()}
                className="ml-2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-transparent text-brand hover:scale-105 focus:outline-none focus:ring-2 focus:ring-brand transition disabled:text-gray-400 disabled:cursor-not-allowed"
                aria-label="Send"
              >
                {isLoading ? (
                  <svg
                    className="animate-spin h-6 w-6 text-brand"
                    xmlns="http://www.w3.org/2000/svg"
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
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-brand"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </div>
            {error && (
              <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
