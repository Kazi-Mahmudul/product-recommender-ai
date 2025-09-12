import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import IntelligentResponseHandler from "../components/IntelligentResponseHandler";
import ChatErrorBoundary from "../components/ChatErrorBoundary";
import { smartChatService, ChatState } from "../services/smartChatService";
import { FormattedResponse } from "../services/directGeminiService";
import { useMobileResponsive } from "../hooks/useMobileResponsive";
import { chatContextManager } from "../services/chatContextManager";

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

  const handleSendMessage = useCallback(
    async (initialMessage?: string) => {
      const messageToSend = initialMessage || message;
      if (!messageToSend.trim()) return;

      console.log(`🚀 Sending query via ${useRAGPipeline ? 'RAG Pipeline' : 'Smart Chat Service'}: "${messageToSend}"`);
      
      setMessage("");
      setError(null);
      setShowWelcome(false);
      setIsLoading(true);

      try {
        if (useRAGPipeline) {
          // Use RAG pipeline
          const response = await fetch('/api/v1/chat/query', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: messageToSend,
              conversation_history: ragMessages.map(msg => ({
                type: msg.type,
                content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
              })),
              session_id: sessionId
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const ragResponse = await response.json();
          console.log(`✅ Received RAG response:`, ragResponse);

          // Add user message to session
          const userMessage: RAGChatMessage = {
            id: `user-${Date.now()}`,
            type: 'user',
            content: messageToSend,
            timestamp: new Date(),
            metadata: {
              session_id: sessionId
            }
          };

          // Add assistant response to session
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

          // Update local state
          const updatedMessages = [...ragMessages, userMessage, assistantMessage];
          setRagMessages(updatedMessages);
          
          // Convert to legacy format for existing UI
          const legacyHistory = convertRAGToLegacyFormat(updatedMessages);
          setChatHistory(legacyHistory);

        } else {
          // Fallback to existing smart chat service
          const response = await smartChatService.sendQuery(messageToSend);
          console.log(`✅ Received response from Smart Chat Service:`, response);
        }
        
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error(`❌ ${useRAGPipeline ? 'RAG Pipeline' : 'Smart Chat'} Error:`, error);
        
        // Try fallback if RAG fails
        if (useRAGPipeline) {
          console.log('🔄 Falling back to Smart Chat Service...');
          try {
            const fallbackResponse = await smartChatService.sendQuery(messageToSend);
            console.log(`✅ Fallback response received:`, fallbackResponse);
            setUseRAGPipeline(false); // Switch to fallback mode
          } catch (fallbackErr) {
            console.error('❌ Fallback also failed:', fallbackErr);
            setError(`Sorry, I encountered an error: ${error.message}. Please try again.`);
          }
        } else {
          // Enhanced error handling with recovery suggestions
          const errorMsg = getErrorMessage(error);
          const recoverySuggestions = getRecoverySuggestions(error);
          
          setError(errorMsg);
          
          // Add recovery suggestions to the chat
          if (recoverySuggestions.length > 0) {
            const errorChatMessage: RAGChatMessage = {
              id: `error-${Date.now()}`,
              type: 'assistant',
              content: {
                response_type: 'text',
                content: {
                  text: errorMsg,
                  error: true
                },
                suggestions: recoverySuggestions
              },
              timestamp: new Date(),
              metadata: {
                error: true,
                session_id: sessionId
              }
            };
            
            // Convert to chat context manager format
            const contextMessage = {
              id: errorChatMessage.id,
              type: errorChatMessage.type,
              content: errorChatMessage.content,
              timestamp: errorChatMessage.timestamp,
              metadata: errorChatMessage.metadata
            };
            
            chatContextManager.addMessage(contextMessage);
            const updatedMessages = [...ragMessages, errorChatMessage];
            setRagMessages(updatedMessages);
            
            const legacyHistory = convertRAGToLegacyFormat(updatedMessages);
            setChatHistory(legacyHistory);
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [message, useRAGPipeline, ragMessages, sessionId]
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

  // Error handling helper functions
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
          className={`w-full max-w-3xl mx-auto my-8 rounded-2xl shadow-xl ${
            darkMode ? "bg-[#232323] border-gray-800" : "bg-white border-[#eae4da]"
          } border flex flex-col`}
        >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-[#eae4da]"
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center">
                <span className="text-white font-bold">AI</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></div>
            </div>
            <div>
              <span className="font-bold text-xl text-brand">Peyechi AI</span>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-2 text-xs">
              <span className={darkMode ? "text-gray-400" : "text-gray-600"}>
                {useRAGPipeline ? "RAG Enhanced" : "Fallback Mode"}
              </span>
              <div className={`w-2 h-2 rounded-full ${useRAGPipeline ? "bg-green-500" : "bg-yellow-500"}`}></div>
            </div>
            <button
              className="px-4 py-2 rounded-full text-sm font-semibold bg-brand text-white hover:bg-brand-darkGreen transition"
              onClick={handleNewChat}
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
                className="ml-3 w-12 h-12 rounded-full text-brand focus:outline-none focus:ring-2 focus:ring-brand transition disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-red-600 dark:text-red-400 text-sm font-medium mb-2">
                  {error}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleRetry()}
                    className="px-3 py-1 text-xs bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-full hover:bg-red-200 dark:hover:bg-red-700 transition"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleNewChat}
                    className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                  >
                    New Chat
                  </button>
                  <button
                    onClick={() => handleRetry("Show me popular phones")}
                    className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded-full hover:bg-blue-200 dark:hover:bg-blue-700 transition"
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