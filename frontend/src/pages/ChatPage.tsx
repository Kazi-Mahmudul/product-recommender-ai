import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import ChatPhoneRecommendation from "../components/ChatPhoneRecommendation";

interface ChatMessage {
  user: string;
  bot: any; // Can be string or object
  phones?: any[];
}

interface ChatPageProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

const SUGGESTED_QUERIES = [
  "Best phones under 20,000 BDT",
  "Phones with 120Hz refresh rate",
  "Samsung phones with wireless charging",
  "What is the battery capacity of Samsung Galaxy A55?",
  "Compare Xiaomi POCO X6 vs Redmi Note 13 Pro",
  "New release phones 2025",
  "Phones with good camera under 50,000",
  "What is the refresh rate of iPhone 15?",
  "Phones with high camera score",
  "Budget phones with good performance",
  "What is the screen size of iPhone 16 Pro?",
  "Phones with fast charging support",
];

const API_BASE_URL = process.env.REACT_APP_API_BASE;

const ChatPage: React.FC<ChatPageProps> = ({ darkMode, setDarkMode }) => {
  const location = useLocation();
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.state?.initialMessage) {
      handleSendMessage(location.state.initialMessage);
    }
  }, [location.state]);

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
          bot: `Hi there 👋\n\nI’m your ePick assistant — here to help you find and compare the best smartphones in Bangladesh.\n\nAsk anything, and let’s explore the perfect pick together! 🌿📱\n\nHere are some things you can try:`,
        },
      ]);
    }
  }, [chatHistory.length, showWelcome]);

  const handleSendMessage = async (initialMessage?: string) => {
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

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/natural-language/query?query=${encodeURIComponent(messageToSend)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to fetch response");
      }

      const responseData = await res.json();

      setChatHistory((prev) => {
        const updated = [...prev];
        if (responseData.type === "chat" && responseData.data.recommended_phones) {
          updated[updated.length - 1].bot = responseData.data.ai_reply;
          updated[updated.length - 1].phones = responseData.data.recommended_phones;
        } else {
          updated[updated.length - 1].bot = responseData.data || "Sorry, I couldn't process that.";
        }
        return updated;
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setChatHistory((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].bot =
          `Sorry, something went wrong: ${errorMessage}`;
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (query: string) => {
    setShowWelcome(false);
    handleSendMessage(query);
  };

  const handleFollowUp = (question: string) => {
    handleSendMessage(question);
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
          className={`flex items-center justify-between px-8 py-6 border-b rounded-t-3xl ${
            darkMode
              ? "bg-[#232323] border-gray-800"
              : "bg-white border-[#eae4da]"
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className="font-bold text-2xl text-brand">ePick AI</span>
            <span className="text-lg">🤖</span>
          </div>
          <button
            className="px-4 py-2 rounded-full text-sm font-semibold bg-brand text-white shadow-md hover:opacity-90 transition"
            onClick={() => {
              setChatHistory([]);
              setShowWelcome(true);
            }}
          >
            New chat
          </button>
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

                {chat.bot && (
                  <div className="flex justify-start">
                    <div
                      className={`rounded-2xl px-5 py-3 max-w-2xl shadow-md text-base whitespace-pre-wrap border ${
                        darkMode
                          ? "bg-[#181818] text-gray-100 border-gray-700"
                          : "bg-[#f7f3ef] text-gray-900 border-[#eae4da]"
                      }`}
                    >
                      {typeof chat.bot === 'string' ? chat.bot : JSON.stringify(chat.bot, null, 2)}
                    </div>
                  </div>
                )}

                {chat.phones && chat.phones.length > 0 && (
                  <ChatPhoneRecommendation
                    phones={chat.phones}
                    darkMode={darkMode}
                    aiReply={typeof chat.bot === 'string' ? chat.bot : ''}
                    onFollowUp={handleFollowUp}
                  />
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
