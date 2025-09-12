import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import IntelligentResponseHandler from "../components/IntelligentResponseHandler";
import ChatErrorBoundary from "../components/ChatErrorBoundary";
import { TypingIndicator, InlineSpinner } from "../components/LoadingIndicator";
import { smartChatService, ChatState } from "../services/smartChatService";
import { FormattedResponse } from "../services/directGeminiService";
import { useMobileResponsive } from "../hooks/useMobileResponsive";
import { chatContextManager } from "../services/chatContextManager";
import { apiConfig } from "../services/apiConfig";
import { httpClient } from "../services/httpClient";

// Enhanced chat message interface for RAG pipeline
interface RAGChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string | FormattedResponse | object;
  timestamp: Date;
  metadata?: {
    response_type?: string;
    phone_slugs?: string[];
    query_type?: string;
    processing_time?: number;
    session_id?: string;
    error?: boolean;
    confidence_score?: number;
    data_sources?: string[];
    loading?: boolean;
    fallback?: boolean;
  };
}

// Legacy interface for backward compatibility
interface ChatMessage {
  user: string;
  bot: string | FormattedResponse;
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

const ChatPage: React.FC<ChatPageProps> = ({ darkMode }) => {
  const location = useLocation();
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [ragMessages, setRagMessages] = useState<RAGChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [, setLoadingStage] = useState<'sending' | 'processing' | 'receiving' | 'complete'>('processing');
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [sessionId, setSessionId] = useState<string>("");
  const [useRAGPipeline, setUseRAGPipeline] = useState(true);
  const [smartChatState, setSmartChatState] = useState<ChatState>(() => smartChatService.getChatState());
  const chatContainerRef = useRef<HTMLDivElement>(null);
  useMobileResponsive();

  // Initialize session on component mount
  useEffect(() => {
    const initializeSession = () => {
      const existingHistory = chatContextManager.getConversationHistory();
      const currentSessionId = chatContextManager.getSessionId();
      
      setSessionId(currentSessionId);
      
      // Convert chat context manager messages to local RAG messages format
      const convertedMessages: RAGChatMessage[] = existingHistory.map(msg => ({
        id: msg.id,
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata
      }));
      
      setRagMessages(convertedMessages);
      
      // Convert RAG messages to legacy format for existing UI
      const legacyHistory = convertRAGToLegacyFormat(convertedMessages);
      setChatHistory(legacyHistory);
      
      // Show welcome if no existing messages
      setShowWelcome(convertedMessages.length === 0);
    };
    
    initializeSession();
  }, []);

  // Helper function to convert RAG messages to legacy format
  const convertRAGToLegacyFormat = (ragMessages: RAGChatMessage[]): ChatMessage[] => {
    const legacyHistory: ChatMessage[] = [];
    
    for (let i = 0; i < ragMessages.length; i += 2) {
      const userMsg = ragMessages[i];
      const botMsg = ragMessages[i + 1];
      
      if (userMsg && userMsg.type === 'user') {
        // Convert bot content to proper format
        let botContent: string | FormattedResponse = "";
        if (botMsg) {
          if (typeof botMsg.content === 'string') {
            botContent = botMsg.content;
          } else if (typeof botMsg.content === 'object') {
            // Assume it's already a FormattedResponse or convert it
            botContent = botMsg.content as FormattedResponse;
          }
        }
        
        legacyHistory.push({
          user: userMsg.content as string,
          bot: botContent,
          phones: typeof botMsg?.content === 'object' ? (botMsg.content as any)?.content?.phones || [] : []
        });
      }
    }
    
    return legacyHistory;
  };

  // Subscribe to smart chat state changes (fallback for non-RAG mode)
  useEffect(() => {
    if (!useRAGPipeline) {
      const unsubscribe = smartChatService.subscribe((newState) => {
        setSmartChatState(newState);
        setIsLoading(newState.isLoading);
        
        // Convert smart chat messages to legacy format for existing UI
        const legacyChatHistory: ChatMessage[] = [];
        
        for (let i = 0; i < newState.messages.length; i += 2) {
          const userMsg = newState.messages[i];
          const botMsg = newState.messages[i + 1];
          
          if (userMsg && userMsg.sender === 'user') {
            legacyChatHistory.push({
              user: userMsg.text,
              bot: botMsg ? (botMsg.response || botMsg.text) : "",
              phones: botMsg?.response?.content?.phones || []
            });
          }
        }
        
        setChatHistory(legacyChatHistory);
      });
      
      return unsubscribe;
    }
  }, [useRAGPipeline]);

  // Auto-scroll to bottom when chat history changes
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Initialize welcome message
  useEffect(() => {
    if (smartChatState.messages.length === 0 && showWelcome) {
      setChatHistory([
        {
          user: "",
          bot: `👋 Welcome to Peyechi AI - Your Smartphone Advisor for Bangladesh! 

I can help you:
• Find the perfect phone for your budget 💰
• Compare devices side-by-side 📊
• Get latest prices and specs 📱
• Answer any smartphone questions ❓

How can I help you today?`,
        },
      ]);
    }
  }, [smartChatState.messages.length, showWelcome]);

  // Simple debounced input handler
  const debouncedInputHandler = useCallback(
    ((fn: (value: string) => void, delay: number) => {
      let timeoutId: NodeJS.Timeout;
      return (value: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(value), delay);
      };
    })((value: string) => {
      setMessage(value);
    }, 150),
    []
  );

  // Enhanced error handling helper function
  const handleError = useCallback((error: any, currentMessages: RAGChatMessage[], sessionId: string) => {
    let errorMsg = 'An unexpected error occurred. Please try again.';
    let recoverySuggestions = ['Try again', 'Refresh the page', 'Contact support'];
    
    try {
      errorMsg = httpClient.getErrorMessage(error);
      recoverySuggestions = httpClient.getErrorSuggestions(error);
    } catch {
      // Use default error message if httpClient methods fail
    }
    
    setError(errorMsg);
    
    // Create error message for chat
    const errorChatMessage: RAGChatMessage = {
      id: `error-${Date.now()}`,
      type: 'assistant',
      content: {
        response_type: 'text',
        content: {
          text: errorMsg,
          error: true,
          suggestions: recoverySuggestions
        },
        formatting_hints: {
          text_style: 'error',
          show_suggestions: true
        }
      },
      timestamp: new Date(),
      metadata: {
        error: true,
        session_id: sessionId
      }
    };
    
    // Update messages
    const finalMessages = [...currentMessages, errorChatMessage];
    setRagMessages(finalMessages);
    setChatHistory(convertRAGToLegacyFormat(finalMessages));
    
    // Add to context manager
    chatContextManager.addMessage({
      id: errorChatMessage.id,
      type: errorChatMessage.type,
      content: errorChatMessage.content,
      timestamp: errorChatMessage.timestamp,
      metadata: errorChatMessage.metadata
    });
  }, []);

  const handleSendMessage = useCallback(
    async (initialMessage?: string) => {
      const messageToSend = initialMessage || message;
      if (!messageToSend.trim()) return;

      console.log(`🚀 Sending query via ${useRAGPipeline ? 'RAG Pipeline' : 'Smart Chat Service'}: "${messageToSend}"`);
      
      setMessage("");
      setError(null);
      setShowWelcome(false);
      setIsLoading(true);
      setLoadingStage('sending');

      // Add user message immediately
      const userMessage: RAGChatMessage = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: messageToSend,
        timestamp: new Date(),
        metadata: {
          session_id: sessionId
        }
      };

      // Add loading message
      const loadingMessage: RAGChatMessage = {
        id: `loading-${Date.now()}`,
        type: 'assistant',
        content: 'Processing your request...',
        timestamp: new Date(),
        metadata: {
          loading: true,
          session_id: sessionId
        }
      };

      // Update UI immediately
      const tempMessages = [...ragMessages, userMessage, loadingMessage];
      setRagMessages(tempMessages);
      const tempLegacyHistory = convertRAGToLegacyFormat(tempMessages);
      setChatHistory(tempLegacyHistory);

      try {
        if (useRAGPipeline) {
          setLoadingStage('processing');
          
          // Use HTTP client with proper error handling
          const ragResponse: any = await httpClient.post(apiConfig.getChatQueryURL(), {
            query: messageToSend,
            conversation_history: ragMessages.map(msg => ({
              type: msg.type,
              content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
            })),
            session_id: sessionId
          });

          setLoadingStage('receiving');
          console.log(`✅ Received RAG response:`, ragResponse);

          // Replace loading message with actual response
          const assistantMessage: RAGChatMessage = {
            id: `assistant-${Date.now()}`,
            type: 'assistant',
            content: ragResponse,
            timestamp: new Date(),
            metadata: {
              response_type: ragResponse.response_type,
              processing_time: ragResponse.processing_time,
              session_id: sessionId
            }
          };

          // Convert to chat context manager format and update session storage
          const userContextMessage = {
            id: userMessage.id,
            type: userMessage.type,
            content: userMessage.content,
            timestamp: userMessage.timestamp,
            metadata: userMessage.metadata
          };
          
          const assistantContextMessage = {
            id: assistantMessage.id,
            type: assistantMessage.type,
            content: assistantMessage.content,
            timestamp: assistantMessage.timestamp,
            metadata: assistantMessage.metadata
          };
          
          chatContextManager.addMessage(userContextMessage);
          chatContextManager.addMessage(assistantContextMessage);

          // Update local state (remove loading message, add real response)
          const finalMessages = [...ragMessages, userMessage, assistantMessage];
          setRagMessages(finalMessages);
          
          // Convert to legacy format for existing UI
          const legacyHistory = convertRAGToLegacyFormat(finalMessages);
          setChatHistory(legacyHistory);
          
          setLoadingStage('complete');

        } else {
          // Fallback to existing smart chat service
          const response = await smartChatService.sendQuery(messageToSend);
          console.log(`✅ Received response from Smart Chat Service:`, response);
        }
        
      } catch (err) {
        console.error(`❌ ${useRAGPipeline ? 'RAG Pipeline' : 'Smart Chat'} Error:`, err);
        
        // Remove loading message from UI
        const messagesWithoutLoading = ragMessages.concat([userMessage]);
        
        // Try fallback if RAG fails
        if (useRAGPipeline) {
          console.log('🔄 Falling back to Smart Chat Service...');
          try {
            setLoadingStage('processing');
            const fallbackResponse = await smartChatService.sendQuery(messageToSend);
            console.log(`✅ Fallback response received:`, fallbackResponse);
            
            // Create assistant message with fallback response
            const assistantMessage: RAGChatMessage = {
              id: `assistant-fallback-${Date.now()}`,
              type: 'assistant',
              content: fallbackResponse,
              timestamp: new Date(),
              metadata: {
                response_type: fallbackResponse.response_type,
                fallback: true,
                session_id: sessionId
              }
            };
            
            const finalMessages = [...messagesWithoutLoading, assistantMessage];
            setRagMessages(finalMessages);
            setChatHistory(convertRAGToLegacyFormat(finalMessages));
            
            setUseRAGPipeline(false); // Switch to fallback mode
            
          } catch (fallbackErr) {
            console.error('❌ Fallback also failed:', fallbackErr);
            handleError(fallbackErr, messagesWithoutLoading, sessionId);
          }
        } else {
          handleError(err, messagesWithoutLoading, sessionId);
        }
      } finally {
        setIsLoading(false);
        setLoadingStage('complete');
      }
    },
    [message, useRAGPipeline, ragMessages, sessionId, handleError]
  );

  // Handle initial message from navigation
  useEffect(() => {
    if (location.state?.initialMessage) {
      handleSendMessage(location.state.initialMessage);
    }
  }, [handleSendMessage, location.state]);

  const handleSuggestionClick = (query: string) => {
    setShowWelcome(false);
    handleSendMessage(query);
  };

  // Legacy error handling functions (kept for backward compatibility but not used)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getErrorMessage = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return "I'm having trouble connecting to my services. Please check your internet connection and try again.";
    } else if (message.includes('timeout')) {
      return "The request is taking longer than expected. Please try again with a simpler question.";
    } else if (message.includes('rate limit') || message.includes('429')) {
      return "I'm receiving a lot of requests right now. Please wait a moment and try again.";
    } else if (message.includes('500') || message.includes('server')) {
      return "My services are experiencing some issues. Please try again in a few minutes.";
    } else if (message.includes('400') || message.includes('invalid')) {
      return "I didn't understand your request. Could you please rephrase your question?";
    } else {
      return "I encountered an unexpected issue. Please try rephrasing your question or try again.";
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getRecoverySuggestions = (error: Error): string[] => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return [
        "Check your internet connection",
        "Try refreshing the page",
        "Ask a simpler question"
      ];
    } else if (message.includes('timeout')) {
      return [
        "Try a shorter question",
        "Ask about a specific phone model",
        "Use simpler terms"
      ];
    } else if (message.includes('rate limit')) {
      return [
        "Wait a moment and try again",
        "Try a different question",
        "Refresh the page to start over"
      ];
    } else {
      return [
        "Try rephrasing your question",
        "Ask about a specific phone model",
        "Start a new conversation",
        "Check popular phone recommendations"
      ];
    }
  };

  const handleRetry = useCallback((retryQuery?: string) => {
    setError(null);
    if (retryQuery) {
      handleSendMessage(retryQuery);
    }
  }, [handleSendMessage]);

  const handleNewChat = () => {
    // Clear session storage
    chatContextManager.clearSession();
    
    // Generate new session ID
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    setSessionId(newSessionId);
    
    // Clear local state
    setRagMessages([]);
    setChatHistory([]);
    setShowWelcome(true);
    setError(null);
    setUseRAGPipeline(true); // Reset to RAG pipeline
    
    // Clear smart chat service as fallback
    smartChatService.clearChat();
  };

  return (
    <ChatErrorBoundary 
      darkMode={darkMode}
      onError={(error, errorInfo) => {
        console.error('Chat page error:', error, errorInfo);
        // Could send to error tracking service here
      }}
    >
      <div className="my-8 flex items-center justify-center min-h-screen">
        <div
          className={`w-full max-w-4xl mx-auto my-8 rounded-3xl shadow-2xl ${
            darkMode ? "bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700" : "bg-gradient-to-br from-white to-gray-50 border-gray-200"
          } border flex flex-col overflow-hidden backdrop-blur-sm`}
        >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-5 border-b backdrop-blur-md ${
            darkMode ? "bg-gray-800/80 border-gray-600" : "bg-white/80 border-gray-200"
          }`}
        >
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand to-brand-darkGreen flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">AI</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-800 animate-pulse shadow-sm"></div>
            </div>
            <div>
              <h1 className="font-bold text-2xl bg-gradient-to-r from-brand to-brand-darkGreen bg-clip-text text-transparent">
                Peyechi AI
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Your Smart Phone Assistant
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button
              className="px-6 py-2.5 rounded-2xl text-sm font-semibold bg-gradient-to-r from-brand to-brand-darkGreen text-white hover:shadow-lg hover:scale-105 transition-all duration-200 ease-out"
              onClick={handleNewChat}
            >
              New Chat
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div 
          ref={chatContainerRef} 
          className="px-6 py-6 space-y-8 pb-32 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
        >
          <div className="flex flex-col space-y-4">
            {chatHistory.map((chat, index) => (
              <div key={index}>
                {chat.user && (
                  <div className="flex justify-end mb-4">
                    <div className="rounded-3xl px-6 py-4 max-w-md shadow-lg bg-gradient-to-r from-brand to-brand-darkGreen text-white text-base font-medium whitespace-pre-wrap transform hover:scale-[1.02] transition-transform duration-200">
                      {chat.user}
                    </div>
                  </div>
                )}

                {/* Handle all response types with IntelligentResponseHandler */}
                <div className="flex justify-start">
                  <ChatErrorBoundary 
                    darkMode={darkMode}
                    fallback={
                      <div className={`max-w-xs rounded-2xl px-5 py-3 shadow-md ${
                        darkMode ? 'bg-red-900/20 text-red-200 border border-red-800' : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        <p className="text-sm">Unable to display response. Please try asking again.</p>
                        <button
                          onClick={() => handleRetry()}
                          className="mt-2 px-3 py-1 text-xs bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-full hover:bg-red-200 dark:hover:bg-red-700 transition"
                        >
                          Retry
                        </button>
                      </div>
                    }
                  >
                    <IntelligentResponseHandler
                      response={chat.bot}
                      darkMode={darkMode}
                      originalQuery={chat.user || ""}
                      onSuggestionClick={(suggestion) => {
                        const queryToSend = suggestion.contextualQuery || suggestion.query;
                        handleSendMessage(queryToSend);
                      }}
                      onDrillDownClick={(option) => {
                        let query = option.contextualQuery || "";
                        if (!query) {
                          switch (option.command) {
                            case "full_specs":
                              query = "show full specifications for these phones";
                              break;
                            case "chart_view":
                              query = "compare these phones in chart view";
                              break;
                            case "detail_focus":
                              query = `tell me more about the ${option.target || "features"} of these phones`;
                              break;
                            default:
                              query = option.label || "show full specifications for these phones";
                          }
                        }
                        handleSendMessage(query);
                      }}
                      isLoading={isLoading}
                    />
                  </ChatErrorBoundary>
                </div>
                
                {/* Show loading indicator for the last message if it's loading */}
                {index === chatHistory.length - 1 && isLoading && (
                  <div className="flex justify-start mt-2">
                    <TypingIndicator darkMode={darkMode} />
                  </div>
                )}

                {/* Welcome Suggestions */}
                {index === 0 && showWelcome && (
                  <div className="flex flex-wrap gap-3 mt-6 justify-center">
                    {SUGGESTED_QUERIES.map((suggestion) => (
                      <button
                        key={suggestion}
                        className={`px-4 py-3 rounded-2xl border text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md ${
                          darkMode
                            ? "bg-gradient-to-r from-gray-800 to-gray-700 border-gray-600 text-gray-200 hover:from-brand hover:to-brand-darkGreen hover:text-white hover:border-brand"
                            : "bg-gradient-to-r from-gray-50 to-white border-gray-200 text-gray-700 hover:from-brand hover:to-brand-darkGreen hover:text-white hover:border-brand"
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
        <div className="fixed bottom-0 left-0 w-full flex justify-center z-30 pb-6 pointer-events-none">
          <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pointer-events-auto">
            <div
              className={`flex items-center backdrop-blur-md border shadow-2xl rounded-3xl py-4 px-6 mb-3 ${
                darkMode 
                  ? "bg-gray-800/90 border-gray-600" 
                  : "bg-white/90 border-gray-200"
              }`}
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
                className={`flex-1 bg-transparent text-lg focus:outline-none placeholder-gray-400 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
                placeholder="Ask me anything about smartphones..."
                disabled={isLoading}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !message.trim()}
                className="ml-4 w-14 h-14 rounded-2xl bg-gradient-to-r from-brand to-brand-darkGreen text-white focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover:scale-105 hover:shadow-lg"
                aria-label="Send"
              >
                {isLoading ? (
                  <InlineSpinner darkMode={darkMode} size="md" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
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
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-200 dark:border-red-800 backdrop-blur-sm">
                <p className="text-red-600 dark:text-red-400 text-sm font-medium mb-3">
                  {error}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleRetry()}
                    className="px-4 py-2 text-xs bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-xl hover:bg-red-200 dark:hover:bg-red-700 transition-all duration-200 hover:scale-105"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleNewChat}
                    className="px-4 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 hover:scale-105"
                  >
                    New Chat
                  </button>
                  <button
                    onClick={() => handleRetry("Show me popular phones")}
                    className="px-4 py-2 text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-700 transition-all duration-200 hover:scale-105"
                  >
                    Popular Phones
                  </button>
                </div>
              </div>
            )}
            <div
              className={`text-xs text-center mt-2 ${
                darkMode ? "text-gray-500" : "text-gray-600"
              }`}
            >
              Ask me about smartphones in Bangladesh
              {sessionId && (
                <div className="mt-1 opacity-75">
                  Session: {sessionId.split('-')[1]} • {ragMessages.length} messages
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </ChatErrorBoundary>
  );
};

export default ChatPage;