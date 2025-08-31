import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import IntelligentResponseHandler from "../components/IntelligentResponseHandler";
import {
  ChatContextManager,
  ChatContext,
} from "../services/chatContextManager";
import {
  IntelligentContextManager,
  ConversationContext
} from "../services/intelligentContextManager";
import { QueryEnhancer } from "../services/queryEnhancer";
import { ErrorHandler } from "../services/errorHandler";

import { ErrorRecoveryService } from "../services/errorRecoveryService";
import { ResponseCacheService } from "../services/responseCacheService";
import { PerformanceOptimizer } from "../services/performanceOptimizer";
import { SmartChatInitializer } from "../utils/smartChatInitializer";
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
  "Best phone under 30k?",
  "Compare iPhone vs Samsung",
  "Long battery life phones?",
  "5G phones in Bangladesh?",
  "Best camera phone?",
  "Gaming phones under 50k?",
];

// Ensure we always use HTTPS in production
let API_BASE_URL = process.env.REACT_APP_API_BASE || 'http://localhost:8000';
if (API_BASE_URL.startsWith('http://')) {
  API_BASE_URL = API_BASE_URL.replace('http://', 'https://');
}

const ChatPage: React.FC<ChatPageProps> = ({ darkMode }) => {
  const location = useLocation();
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [showWelcome, setShowWelcome] = useState(true);
  const [chatContext, setChatContext] = useState<ChatContext>(() => {
    try {
      return ChatContextManager.loadContext();
    } catch (err) {
      return ErrorHandler.handleContextError(err as Error);
    }
  });
  
  const [intelligentContext, setIntelligentContext] = useState<ConversationContext>(() => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    return IntelligentContextManager.createInitialContext(sessionId);
  });
  const [retryCount, setRetryCount] = useState(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  useMobileResponsive();
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
          bot: `👋 Welcome to Peyechi AI - Your Smartphone Advisor for Bangladesh! 🇧🇩

I can help you:
• Find the perfect phone for your budget 💰
• Compare devices side-by-side 📊
• Get latest prices and specs 📱
• Answer any smartphone questions ❓

Try asking:
• "Best phone under 30,000 BDT"
• "Compare iPhone 14 and Samsung Galaxy S23"
• "Phones with good battery life"

How can I help you today?`,
        },
      ]);
    }
  }, [chatHistory.length, showWelcome]);

  // Debounced input handler for better performance
  const debouncedInputHandler = useCallback(
    PerformanceOptimizer.debounce((value: string) => {
      setMessage(value);
    }, 150),
    []
  );

  const handleSendMessage = useCallback(
    async (initialMessage?: string) => {
      const messageToSend = initialMessage || message;
      if (!messageToSend.trim()) return;

      // Enhance query with intelligent context management
      let enhancedMessage = messageToSend;
      let contextRelevance = null;
      
      if (featureFlags.contextManagement) {
        try {
          // Use intelligent context analysis
          contextRelevance = IntelligentContextManager.analyzeContextRelevance(
            messageToSend,
            intelligentContext
          );

          if (contextRelevance.is_relevant) {
            enhancedMessage = IntelligentContextManager.buildContextualQuery(
              messageToSend,
              intelligentContext,
              contextRelevance
            );
            console.log("Query enhanced with intelligent context:", {
              relevance_score: contextRelevance.relevance_score,
              context_type: contextRelevance.context_type,
              relevant_phones: contextRelevance.relevant_phones.length
            });
          }

          // Detect topic shifts
          const topicShift = IntelligentContextManager.detectTopicShift(
            messageToSend,
            intelligentContext
          );

          if (topicShift.shift_detected) {
            console.log("Topic shift detected:", topicShift);
          }
        } catch (error) {
          console.warn("Failed to enhance query with intelligent context:", error);
          // Fallback to basic context enhancement
          try {
            const recentPhoneContext = ChatContextManager.getRecentPhoneContext(
              chatContext,
              600000
            );
            const enhancementResult = QueryEnhancer.enhanceQuery(
              messageToSend,
              recentPhoneContext
            );

            if (enhancementResult.contextUsed) {
              enhancedMessage = enhancementResult.enhancedQuery;
            }
          } catch (fallbackError) {
            console.warn("Fallback context enhancement also failed:", fallbackError);
          }
        }
      }

      setMessage("");
      setIsLoading(true);
      setError(null);
      setShowWelcome(false);
      setProcessingStatus("Analyzing your query...");

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
        // Use performance optimizer for parallel processing
        const optimizedResult = await PerformanceOptimizer.optimizeQueryProcessing(
          enhancedMessage,
          intelligentContext,
          async () => {
            // Check cache first
            setProcessingStatus("Checking for cached response...");
            const cachedResponse = await ResponseCacheService.getCachedResponse(
              enhancedMessage,
              intelligentContext
            );

            if (cachedResponse) {
              console.log("Using cached response");
              return cachedResponse;
            }

            setProcessingStatus("Getting intelligent response...");
            
            // Make API call to backend
            const backendRes = await fetch(
              `${API_BASE_URL}/api/v1/natural-language/query`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                  query: enhancedMessage,
                  conversation_history: chatHistory.slice(-5).map(msg => ({
                    user: msg.user,
                    bot: typeof msg.bot === 'string' ? msg.bot : JSON.stringify(msg.bot)
                  })),
                  session_id: intelligentContext.session_metadata.session_id,
                  context: {
                    recent_topics: intelligentContext.recent_topics,
                    mentioned_phones: intelligentContext.mentioned_phones.slice(0, 5),
                    user_preferences: intelligentContext.user_preferences
                  }
                }),
              }
            );

            if (!backendRes.ok) {
              const err = await backendRes.json();
              throw new Error(err.detail || "Failed to process query");
            }

            const responseData = await backendRes.json();
            setProcessingStatus("Processing response...");

            // Cache the response for future use (don't await to avoid blocking)
            ResponseCacheService.cacheResponse(
              enhancedMessage,
              responseData,
              intelligentContext
            ).catch(error => console.warn("Failed to cache response:", error));

            return responseData;
          }
        );

        const { response: responseData, contextAnalysis, processingTime } = optimizedResult;
        console.log(`Query processed in ${processingTime.toFixed(2)}ms with context analysis:`, contextAnalysis);

        setChatHistory((prev) => {
          const updated = [...prev];
          
          // Set the response data directly - IntelligentResponseHandler will parse it
          updated[updated.length - 1].bot = responseData;

          // Update intelligent context if enabled
          if (featureFlags.contextManagement) {
            try {
              // Detect topic shift for context update
              const topicShift = IntelligentContextManager.detectTopicShift(
                messageToSend,
                intelligentContext
              );

              // Update intelligent context
              const updatedIntelligentContext = IntelligentContextManager.updateConversationState(
                intelligentContext,
                messageToSend,
                responseData,
                topicShift.shift_detected ? topicShift : undefined
              );

              setIntelligentContext(updatedIntelligentContext);

              // Also update legacy context for backward compatibility
              messageForContext.bot = responseData;
              const updatedLegacyContext = ChatContextManager.updateWithMessage(
                chatContext,
                messageForContext
              );
              setChatContext(updatedLegacyContext);
            } catch (contextError) {
              console.warn("Failed to update intelligent context:", contextError);
              
              // Fallback to legacy context update
              messageForContext.bot = responseData;
              const updatedContext = ChatContextManager.updateWithMessage(
                chatContext,
                messageForContext
              );
              setChatContext(updatedContext);
            }
          }
          
          return updated;
        });

      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        // Use comprehensive error recovery
        const errorContext = {
          errorType: error.constructor.name,
          originalQuery: messageToSend,
          conversationContext: intelligentContext,
          attemptCount: retryCount,
          timestamp: new Date()
        };

        const recoveryStrategy = ErrorRecoveryService.analyzeError(error, errorContext);
        
        // Log error for monitoring
        ErrorRecoveryService.logError(error, errorContext, recoveryStrategy);

        // Attempt recovery if possible
        if (recoveryStrategy.canRecover && retryCount < 3) {
          setRetryCount((prev) => prev + 1);
          
          if (recoveryStrategy.recoveryType === 'retry' && recoveryStrategy.retryAction) {
            try {
              setProcessingStatus("Retrying with different approach...");
              await recoveryStrategy.retryAction();
              // Retry the original request
              handleSendMessage(messageToSend);
              return;
            } catch (retryError) {
              console.warn("Retry failed:", retryError);
              // Continue to fallback handling
            }
          } else if (recoveryStrategy.recoveryType === 'fallback' && recoveryStrategy.fallbackAction) {
            try {
              setProcessingStatus("Using fallback approach...");
              const fallbackResponse = await recoveryStrategy.fallbackAction();
              
              setChatHistory((prev) => {
                const updated = [...prev];
                updated[updated.length - 1].bot = fallbackResponse;
                return updated;
              });
              
              setRetryCount(0);
              return;
            } catch (fallbackError) {
              console.warn("Fallback failed:", fallbackError);
              // Continue to error display
            }
          }
        }

        // Reset retry count
        setRetryCount(0);

        // Display error message with recovery suggestions
        const errorResponse = {
          response_type: 'text',
          content: {
            text: recoveryStrategy.userMessage,
            suggestions: recoveryStrategy.suggestions
          },
          formatting_hints: {
            text_style: 'error',
            show_suggestions: true
          },
          metadata: {
            error: true,
            recovery_type: recoveryStrategy.recoveryType
          }
        };

        setError(recoveryStrategy.userMessage);
        setChatHistory((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].bot = JSON.stringify(errorResponse);

          // Update context even for error messages
          if (featureFlags.contextManagement) {
            try {
              const updatedIntelligentContext = IntelligentContextManager.updateConversationState(
                intelligentContext,
                messageToSend,
                errorResponse
              );
              setIntelligentContext(updatedIntelligentContext);
            } catch (contextError) {
              console.warn("Failed to update context after error:", contextError);
            }
          }

          return updated;
        });
      } finally {
        setIsLoading(false);
        setProcessingStatus("");
      }
    },
    [message, featureFlags.contextManagement, chatHistory, intelligentContext, chatContext, retryCount]
  );

  useEffect(() => {
    if (location.state?.initialMessage) {
      handleSendMessage(location.state.initialMessage);
    }
  }, [handleSendMessage, location.state]);

  // Smart Chat System initialization on mount
  useEffect(() => {
    const initializeSmartChatSystem = async () => {
      try {
        console.log('🚀 Initializing Smart Chat Integration System...');
        
        const initResult = await SmartChatInitializer.initialize({
          enableValidation: process.env.NODE_ENV === 'development',
          enablePerformanceMonitoring: true,
          enableCaching: true,
          enableErrorRecovery: true,
          cacheConfig: {
            maxEntries: 50,
            maxAge: 20 * 60 * 1000,
            similarityThreshold: 0.8
          },
          performanceConfig: {
            enableParallelProcessing: true,
            enableRequestDebouncing: true,
            maxConcurrentRequests: 2
          }
        });

        if (initResult.success) {
          console.log('✅ Smart Chat Integration System initialized successfully');
          
          // Log system status
          const systemStatus = SmartChatInitializer.getSystemStatus();
          console.log('📊 System Status:', systemStatus);
          
          // Show recommendations if any
          const recommendations = SmartChatInitializer.getInitializationRecommendations();
          if (recommendations.length > 0) {
            console.log('💡 Recommendations:', recommendations);
          }
        } else {
          console.error('❌ Smart Chat Integration System initialization failed');
          console.error('Errors:', initResult.errors);
          console.warn('Warnings:', initResult.warnings);
        }

        // Show validation report in development
        if (process.env.NODE_ENV === 'development' && initResult.validationReport) {
          console.log('🔍 Validation Report:', initResult.validationReport);
        }

      } catch (error) {
        console.error('💥 Critical error during Smart Chat System initialization:', error);
      }
    };

    initializeSmartChatSystem();

    // Cleanup on unmount
    return () => {
      SmartChatInitializer.cleanup();
    };
  }, []);

  const handleSuggestionClick = (query: string) => {
    setShowWelcome(false);
    handleSendMessage(query);
  };

  return (
    <div className="my-8 flex items-center justify-center min-h-screen">
      <div
        className={`w-full max-w-3xl mx-auto my-8 rounded-2xl shadow-xl ${darkMode ? "bg-[#232323] border-gray-800" : "bg-white border-[#eae4da]"} border flex flex-col`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-[#eae4da]"}`}
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center">
                <span className="text-white font-bold">AI</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></div>
            </div>
            <div>
              <span className="font-bold text-xl text-brand">
                Peyechi AI
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-full text-sm font-semibold bg-brand text-white hover:bg-brand-darkGreen transition"
              onClick={() => {
                setChatHistory([]);
                setShowWelcome(true);
              }}
            >
              New Chat
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

                {/* Handle all response types with IntelligentResponseHandler */}
                <div className="flex justify-start">
                  <IntelligentResponseHandler
                    response={chat.bot}
                    darkMode={darkMode}
                    originalQuery={chat.user || ""}
                    chatContext={intelligentContext}
                    onContextUpdate={(newContext) => setIntelligentContext(newContext)}
                    onSuggestionClick={
                      featureFlags.enhancedSuggestions
                        ? (suggestion) => {
                            // Use contextual query if available, otherwise fall back to regular query
                            const queryToSend =
                              suggestion.contextualQuery || suggestion.query;
                            handleSendMessage(queryToSend);
                          }
                        : undefined
                    }
                    onDrillDownClick={
                      featureFlags.drillDownMode
                        ? (option) => {
                            // Handle drill-down commands with context
                            // Use the contextualQuery if available, otherwise fallback to default queries
                            let query = option.contextualQuery || "";
                            if (!query) {
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
                                default:
                                  query = option.label || "show full specifications for these phones";
                              }
                            }
                            handleSendMessage(query);
                          }
                        : undefined
                    }
                    isLoading={isLoading}
                  />
                </div>

                {/* Processing Status */}
                {isLoading && processingStatus && (
                  <div className="flex justify-start mt-2">
                    <div className={`rounded-lg px-3 py-2 text-xs ${
                      darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-brand"></div>
                        <span>{processingStatus}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Welcome Suggestions */}
                {index === 0 && showWelcome && (
                  <div className="flex flex-wrap gap-2 mt-4 justify-center">
                    {SUGGESTED_QUERIES.map((suggestion) => (
                      <button
                        key={suggestion}
                        className={`px-3 py-2 rounded-full border text-sm font-medium transition ${
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
              className={`flex items-center bg-white dark:bg-gradient-to-br from-gray-800 to-gray-900 border ${
                darkMode ? "border-gray-700" : "border-[#eae4da]"
              } shadow-xl rounded-2xl py-3 px-4 mb-2`}
            >
              <input
                type="text"
                value={message}
                onChange={(e) => {
                  // Use debounced handler for better performance
                  if (e.target.value.length > 50) {
                    debouncedInputHandler(e.target.value);
                  } else {
                    setMessage(e.target.value);
                  }
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                className={`flex-1 bg-transparent text-base focus:outline-none placeholder-gray-400 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
                placeholder="Ask me anything about smartphones..."
                disabled={isLoading}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !message.trim()}
                className="ml-3 w-12 h-12 rounded-full text-brand  focus:outline-none focus:ring-2 focus:ring-brand transition disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send"
              >
                {isLoading ? (
                  <svg
                    className="animate-spin h-6 w-6 text-white mx-auto"
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
                    className="h-5 w-5"
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
              <p className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                {error}
              </p>
            )}
            <div className={`text-xs text-center mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
              Ask me about smartphones in Bangladesh
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;