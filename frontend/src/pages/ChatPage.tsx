import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import IntelligentResponseHandler from "../components/IntelligentResponseHandler";
import ChatErrorBoundary from "../components/ChatErrorBoundary";
import { TypingIndicator, InlineSpinner } from "../components/LoadingIndicator";
import { smartChatService, ChatState } from "../services/smartChatService";
import { FormattedResponse } from "../services/directGeminiService";
import { useMobileResponsive } from "../hooks/useMobileResponsive";
import { chatContextManager } from "../services/chatContextManager";
import { apiConfig } from "../services/apiConfig";
import { httpClient } from "../services/httpClient";
import { useAuth } from "../context/AuthContext";
import HistorySidebar from "../components/HistorySidebar";
import { chatAPIService } from "../api/chat";
import { toast } from "react-toastify";

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
  "20000 takay best phone?",
  "Compare Apple iPhone 17 Air vs Sony Xperia 1 VII",
  "Long battery life phones?",
  "5G phones under 40k in Bangladesh?",
  "Best camera phone for students?",
  "Gaming phones under 50k?",
];

const ChatPage: React.FC<ChatPageProps> = ({ darkMode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [ragMessages, setRagMessages] = useState<RAGChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const { user, token } = useAuth();
  const [loadingStage, setLoadingStage] = useState<'sending' | 'processing' | 'receiving' | 'complete'>('processing');
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [sessionId, setSessionId] = useState<string>("");
  const [useRAGPipeline, setUseRAGPipeline] = useState(true);
  const [smartChatState, setSmartChatState] = useState<ChatState>(() => smartChatService.getChatState());
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const handleSendMessageRef = useRef<((initialMessage?: string) => Promise<void>) | null>(null);
  const { isMobile } = useMobileResponsive();

  // Initialize session on component mount
  useEffect(() => {
    // Check if we're coming from homepage with an initial message
    const hasInitialMessage = location.state?.initialMessage;

    // If user is logged in, we might want to start fresh or load last session? 
    // Current logic: Start fresh unless a session is selected from sidebar.
    // If not logged in, use local session logic.

    const initializeSession = () => {
      // Logic for selected session is handled by handleSelectSession
      // Here we just handle initial load / anonymous session

      if (!sessionId) {
        const newSessionId = chatContextManager.getSessionId();
        setSessionId(newSessionId);
      }

      const existingHistory = chatContextManager.getConversationHistory();

      // Convert chat context manager messages to local RAG messages format
      const convertedMessages: RAGChatMessage[] = existingHistory.map(msg => ({
        id: msg.id,
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata
      }));

      setRagMessages(convertedMessages);
      setChatHistory(convertRAGToLegacyFormat(convertedMessages));

      if (convertedMessages.length === 0) {
        setShowWelcome(true);
      } else {
        setShowWelcome(false);
      }
    };

    initializeSession();
  }, []); // Run once on mount

  const handleSelectSession = async (selectedSessionId: string) => {
    if (!token) return;

    try {
      setIsLoading(true);
      const session = await chatAPIService.getChatSession(token, selectedSessionId);

      setSessionId(session.id);

      // Convert backend messages to RAGChatMessage
      const convertedMessages: RAGChatMessage[] = (session.messages || []).map(msg => ({
        id: msg.id,
        type: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        metadata: msg.metadata
      }));

      setRagMessages(convertedMessages);
      setChatHistory(convertRAGToLegacyFormat(convertedMessages));
      setShowWelcome(false);
      if (isMobile) setMobileMenuOpen(false); // Close sidebar on mobile after selection
    } catch (error) {
      toast.error("Failed to load conversation");
    } finally {
      setIsLoading(false);
    }
  };


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
      // NOTE: Removed legacy text injection since we want the beautiful suggestions UI
      // to handle the welcome state.
      setChatHistory([]); // Clear history so welcome screen shows
    }
  }, [smartChatState.messages.length, showWelcome]);

  // Auto-resize textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

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

      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(`🚀 Sending query via ${useRAGPipeline ? 'RAG Pipeline' : 'Smart Chat Service'}: "${messageToSend}"`);
      }

      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'; // Reset height immediately
      }
      setError(null);
      setShowWelcome(false);
      setIsLoading(true);
      setLoadingStage('sending');

      // Guest User Notification
      if (!user) {
        const searchCount = parseInt(localStorage.getItem('guest_search_count') || '0');
        if (searchCount === 0 || searchCount % 5 === 0) {
          toast("Sign in to save your chat history!", {
            style: {
              borderRadius: '10px',
              background: darkMode ? '#333' : '#fff',
              color: darkMode ? '#fff' : '#333',
            },
            autoClose: 4000
          });
        }
        localStorage.setItem('guest_search_count', (searchCount + 1).toString());
      }

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

          // Use HTTP client with proper error handling - using RAG endpoint
          const ragResponse: any = await httpClient.post(apiConfig.getNaturalLanguageRagURL(), {
            query: messageToSend,
            conversation_history: ragMessages.map(msg => ({
              type: msg.type,
              content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
            })),
            session_id: sessionId, // Pass session ID to backend
            // Add context to help with first query filtering
            context: {
              first_query: ragMessages.length === 0,
              total_messages: ragMessages.length
            }
          });

          setLoadingStage('receiving');
          // Only log in development mode
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ Received RAG response:`, ragResponse);
          }

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
        }

      } catch (err) {
        // Remove loading message from UI
        const messagesWithoutLoading = ragMessages.concat([userMessage]);

        // Try fallback if RAG fails
        if (useRAGPipeline) {
          try {
            setLoadingStage('processing');
            const fallbackResponse = await smartChatService.sendQuery(messageToSend);

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

  // Store the latest handleSendMessage in ref
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }, [handleSendMessage]);

  // Handle initial message from navigation
  const [hasProcessedInitialMessage, setHasProcessedInitialMessage] = useState(false);
  const [processedNavigationIds, setProcessedNavigationIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Use a slight delay to ensure session initialization is complete
    const timer = setTimeout(() => {
      if (location.state?.initialMessage && !hasProcessedInitialMessage && handleSendMessageRef.current) {
        const navigationId = location.state.navigationId;
        const source = location.state.source || 'unknown';

        // Check if we've already processed this specific navigation
        if (navigationId && processedNavigationIds.has(navigationId)) {
          // Only log in development mode
          if (process.env.NODE_ENV === 'development') {
            console.log(`⚠️ Skipping duplicate navigation from ${source}:`, navigationId);
          }
          return;
        }

        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚀 Processing initial message from ${source}:`, location.state.initialMessage);
        }
        setHasProcessedInitialMessage(true);

        // Mark this navigation as processed
        if (navigationId) {
          setProcessedNavigationIds(prev => {
            const newSet = new Set(prev);
            newSet.add(navigationId);
            return newSet;
          });
        }

        // Process the message
        handleSendMessageRef.current(location.state.initialMessage);

        // Clear the navigation state to prevent reprocessing
        navigate(location.pathname, { replace: true, state: {} });
      }
    }, 100); // Small delay to ensure proper initialization order

    return () => clearTimeout(timer);
  }, [location.state?.initialMessage, location.state?.navigationId, hasProcessedInitialMessage, navigate, location.pathname]); // Remove handleSendMessage from dependencies

  const handleSuggestionClick = (query: string) => {
    setShowWelcome(false);
    if (handleSendMessageRef.current) {
      handleSendMessageRef.current(query);
    }
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
    if (retryQuery && handleSendMessageRef.current) {
      handleSendMessageRef.current(retryQuery);
    }
  }, []); // No dependencies needed

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
    setHasProcessedInitialMessage(false); // Reset initial message processing
    setProcessedNavigationIds(new Set()); // Clear processed navigation IDs

    // Clear navigation state to prevent any leftover initial messages
    navigate(location.pathname, { replace: true, state: {} });

    // Clear smart chat service as fallback
    smartChatService.clearChat();
  };

  return (
    <div className="flex h-screen pt-16 sm:pt-20 overflow-hidden bg-white dark:bg-[#343541]">
      <style>
        {`
          @keyframes dropIn {
            0% { transform: translateY(-100%); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          .animate-drop-in {
            animation: dropIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }
        `}
      </style>
      <ChatErrorBoundary
        darkMode={darkMode}
        onError={(error, errorInfo) => {
          console.error('Chat page error:', error, errorInfo);
        }}
      >
        {/* Sidebar */}
        <HistorySidebar
          isOpen={isMobile ? mobileMenuOpen : desktopSidebarOpen}
          onClose={() => isMobile ? setMobileMenuOpen(false) : setDesktopSidebarOpen(false)}
          onSelectSession={handleSelectSession}
          currentSessionId={sessionId}
          onNewChat={handleNewChat}
          darkMode={darkMode}
          variant={isMobile ? 'overlay' : 'sidebar'}
        />

        {/* Main Interface */}
        <div className="flex-1 flex flex-col relative h-full min-w-0 bg-white dark:bg-[#343541]">

          {/* Header - Minimalist & Clean */}
          <div className="h-12 border-b flex-shrink-0 flex items-center justify-between px-4 bg-white/95 dark:bg-[#343541]/95 backdrop-blur-sm sticky top-0 z-20 border-black/5 dark:border-white/10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => isMobile ? setMobileMenuOpen(true) : setDesktopSidebarOpen(!desktopSidebarOpen)}
                className="p-2 -ml-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 transition-colors"
                title={isMobile ? "Open Menu" : (desktopSidebarOpen ? "Close Sidebar" : "Open Sidebar")}
              >
                {isMobile || !desktopSidebarOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                )}
              </button>
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="font-bold text-black dark:text-white text-lg tracking-tight animate-drop-in">
                  Peyechi AI
                </span>
              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-600 scroll-smooth"
          >
            {/* Empty State / Welcome showing suggestions */}
            {showWelcome && (
              <div className="flex flex-col items-center justify-center min-h-full px-4 text-center space-y-4 md:space-y-8 animate-fade-in-up pb-32">
                <div className="bg-white dark:bg-[#444654] p-3 md:p-5 rounded-2xl md:rounded-3xl shadow-lg ring-1 ring-black/5 dark:ring-white/10 mb-0 md:mb-2 inline-flex relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <svg className="w-8 h-8 md:w-12 md:h-12 text-brand relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>

                <div className="space-y-1 md:space-y-2">
                  <h2 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
                    Peyechi AI
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm md:text-lg">
                    Your Personal Smartphone Expert
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 w-full max-w-2xl px-2 md:px-4 mt-4 md:mt-8">
                  {SUGGESTED_QUERIES.slice(0, 4).map((query, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(query)}
                      className="text-left p-3 md:p-4 rounded-xl text-xs md:text-sm transition-all duration-200 border border-gray-200 dark:border-gray-700
                             hover:bg-gray-50 dark:hover:bg-[#40414F]
                             text-gray-600 dark:text-gray-300 shadow-sm hover:shadow-md group"
                    >
                      <span className="font-medium text-gray-900 dark:text-gray-100 block mb-0.5 md:mb-1 group-hover:text-brand transition-colors">Suggestion</span>
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message Stream - Only shown when not welcoming or has history */}
            {!showWelcome && (
              <div className="flex flex-col pb-48 pt-4">
                {chatHistory.map((chat, index) => (
                  <div
                    key={index}
                    className="w-full px-4 border-b border-black/5 dark:border-white/5 last:border-0"
                  >
                    <div className="max-w-3xl mx-auto flex gap-5 py-6">
                      {/* Avatar */}
                      <div className="flex-shrink-0 flex flex-col relative items-end">
                        {chat.user ? (
                          <div className="w-8 h-8 rounded-sm bg-purple-600 flex items-center justify-center text-white font-semibold text-xs overflow-hidden">
                            {user?.profile_picture ? (
                              <img
                                src={user.profile_picture}
                                alt={user.first_name || "User"}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.parentElement) {
                                    e.currentTarget.parentElement.innerText = user?.first_name?.charAt(0).toUpperCase() || "U";
                                  }
                                }}
                              />
                            ) : (
                              user?.first_name?.charAt(0).toUpperCase() || "U"
                            )}
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-sm bg-brand flex items-center justify-center text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="relative flex-1 overflow-hidden min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">
                          {chat.user ? "You" : "Peyechi AI"}
                        </div>

                        <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-100 text-[15px] leading-7">
                          {chat.user ? (
                            <p className="whitespace-pre-wrap">{chat.user}</p>
                          ) : (
                            <ChatErrorBoundary darkMode={darkMode}>
                              <IntelligentResponseHandler
                                response={chat.bot}
                                darkMode={darkMode}
                                originalQuery={chat.user || ""}
                                onSuggestionClick={(s) => handleSuggestionClick(s.contextualQuery || s.query)}
                                onDrillDownClick={(o) => {
                                  if (handleSendMessageRef.current) handleSendMessageRef.current(o.label || "more info")
                                }}
                                isLoading={index === chatHistory.length - 1 && isLoading}
                                isWelcomeMessage={false}
                              />
                            </ChatErrorBoundary>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading State */}
                {isLoading && loadingStage === 'sending' && (
                  <div className="w-full px-4">
                    <div className="max-w-3xl mx-auto flex gap-5 py-6">
                      <div className="w-8 h-8 rounded-sm bg-brand flex items-center justify-center text-white">
                        <InlineSpinner darkMode={darkMode} />
                      </div>
                      <div className="flex-1 py-1">
                        <div className="animate-pulse h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input Area (Centered & Floating) */}
          <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-white via-white to-transparent dark:from-[#343541] dark:via-[#343541] pt-10 pb-6 px-4 z-20">
            <div className="max-w-3xl mx-auto">
              {error && (
                <div className="mb-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center justify-between text-sm text-red-600 dark:text-red-400">
                  <span>{error}</span>
                  <button onClick={() => handleRetry()} className="font-medium hover:underline">Retry</button>
                </div>
              )}

              <div className="relative flex items-end gap-2 bg-white dark:bg-[#40414F] shadow-lg rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden focus-within:ring-1 focus-within:ring-black/10 dark:focus-within:ring-white/10">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && handleSendMessageRef.current) {
                      e.preventDefault();
                      handleSendMessageRef.current();
                    }
                  }}
                  placeholder="Send a message..."
                  className="w-full max-h-[200px] py-3.5 pl-4 pr-12 bg-transparent border-0 focus:ring-0 resize-none text-gray-900 dark:text-white placeholder:text-gray-400 text-base m-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
                  rows={1}
                  style={{ height: 'auto', minHeight: '60px', maxHeight: '80px' }} // Increased min-height
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleSendMessageRef.current && handleSendMessageRef.current()}
                  disabled={isLoading || !message.trim()}
                  className="mr-2 md:mr-0 md:ml-2 flex items-center justify-center text-brand hover:text-brand-darkGreen rounded-xl px-6 py-6 transition-all duration-200"
                >
                  {isLoading ? <InlineSpinner darkMode={false} size="sm" /> : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 md:h-6 md:w-6"
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
              <div className="text-center mt-2 text-[10px] text-gray-400 dark:text-gray-500">
                Peyechi AI can make mistakes. Consider checking important information.
              </div>
            </div>
          </div>
        </div>
      </ChatErrorBoundary>
    </div>
  );
};

export default ChatPage;