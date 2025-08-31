import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import IntelligentResponseHandler from "../components/IntelligentResponseHandler";
import { smartChatService, ChatState } from "../services/smartChatService";
import { FormattedResponse } from "../services/directGeminiService";
import { useMobileResponsive } from "../hooks/useMobileResponsive";

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [smartChatState, setSmartChatState] = useState<ChatState>(() => smartChatService.getChatState());
  const chatContainerRef = useRef<HTMLDivElement>(null);
  useMobileResponsive();

  // Subscribe to smart chat state changes
  useEffect(() => {
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
  }, []);

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

      console.log(`🚀 Sending query via Smart Chat Service: "${messageToSend}"`);
      
      setMessage("");
      setError(null);
      setShowWelcome(false);

      try {
        // Use the smart chat service to send the query directly to Gemini
        const response = await smartChatService.sendQuery(messageToSend);
        
        console.log(`✅ Received response from Smart Chat Service:`, response);
        
        // The smart chat service handles everything - state updates will come through subscription
        
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('❌ Smart Chat Error:', error);
        
        // Display error message
        setError(`Sorry, I encountered an error: ${error.message}. Please try again.`);
        
        // Reset loading state
        setIsLoading(false);
      }
    },
    [message]
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

  const handleNewChat = () => {
    smartChatService.clearChat();
    setChatHistory([]);
    setShowWelcome(true);
    setError(null);
  };

  return (
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
          <div className="flex gap-2">
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
              <p className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                {error}
              </p>
            )}
            <div
              className={`text-xs text-center mt-2 ${
                darkMode ? "text-gray-500" : "text-gray-600"
              }`}
            >
              Ask me about smartphones in Bangladesh
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;