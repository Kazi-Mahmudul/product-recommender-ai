import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
interface ChatMessage {
  user: string;
  bot: string;
  phones?: any[]; // Store recommendations for this message
}

interface ChatPageProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

const SUGGESTED_QUERIES = [
  "Best phones under 20,000 BDT",
  "Top camera phones 2025",
  "Phones with best battery life",
  "Best gaming phones",
  "Latest Samsung phones",
];

const ChatPage: React.FC<ChatPageProps> = ({ darkMode, setDarkMode }) => {
  const location = useLocation();
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const API_BASE_URL = "https://pickbd-ai.onrender.com";

  useEffect(() => {
    if (location.state?.initialMessage) {
      handleSendMessage(location.state.initialMessage);
    }
    // eslint-disable-next-line
  }, [location.state]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  useEffect(() => {
    // Show welcome message on first load
    if (chatHistory.length === 0 && showWelcome) {
      setChatHistory([
        {
          user: "",
          bot: `Hi there 👋\n\nI’m your ePick assistant — here to help you find and compare the best smartphones in Bangladesh.\n\nAsk anything, and let’s explore the perfect pick together! 🌿📱 \n\nHere are some things you can try:`,
        },
      ]);
    }
  }, [showWelcome, chatHistory.length]);

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
      const response = await fetch(
        `${API_BASE_URL}/api/v1/natural-language/query?query=${encodeURIComponent(messageToSend)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || `HTTP error! status: ${response.status}`
        );
      }

      const recommendations = await response.json();
      

      const recommendationsText = recommendations
        .slice(0, 5)
        .map(
          (phone: any, index: number) =>
            `📱 ${index + 1}. ${phone.brand} ${phone.name}\n` +
            `   💰 Price: BDT ${phone.price}\n` +
            `   💾 RAM: ${phone.ram}\n` +
            `   💿 Storage: ${phone.internal_storage}\n` +
            `   ⚡ Performance: ${phone.performance_score?.toFixed(1) ?? "-"}\n` +
            `   📸 Camera: ${phone.camera_score?.toFixed(1) ?? "-"}\n` +
            `   🖥️ Display: ${phone.display_score?.toFixed(1) ?? "-"}\n` +
            `   🔋 Battery: ${phone.battery_score?.toFixed(1) ?? "-"}\n`
        )
        .join("\n");

      const botResponse = `Based on your query "${messageToSend}", here are some phone recommendations:\n\n${recommendationsText}\n\n💡 Tip: Click on a phone to see more details.`;

      setChatHistory((prev) => {
        const updatedHistory = [...prev];
        updatedHistory[updatedHistory.length - 1].bot = botResponse;
        updatedHistory[updatedHistory.length - 1].phones = Array.isArray(recommendations) ? recommendations : [];
        return updatedHistory;
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      setChatHistory((prev) => {
        const updatedHistory = [...prev];
        updatedHistory[updatedHistory.length - 1].bot = `Sorry, there was an error: ${errorMessage}`;
        return updatedHistory;
      });
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setShowWelcome(false);
    handleSendMessage(suggestion);
  };

  return (
    <div
      className={`flex items-center justify-center min-h-screen ${darkMode ? "bg-[#121212]" : "bg-[#fdfbf9]"} overflow-x-hidden`}
    >
      <div
        className={`w-full max-w-3xl mx-auto my-8 rounded-3xl shadow-2xl ${darkMode ? "bg-[#232323] border-gray-800" : "bg-white border-[#eae4da]"} border flex flex-col overflow-x-hidden`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-8 py-6 border-b rounded-t-3xl ${darkMode ? "bg-[#232323] border-gray-800" : "bg-white border-[#eae4da]"}`}
        >
          <div className="flex items-center space-x-2">
            <span className="font-bold text-2xl text-brand">ePick Chat</span>
            <span className="text-lg">🤖</span>
          </div>
          <button
            className="px-4 py-2 rounded-full text-sm font-semibold bg-brand text-white shadow-md hover:opacity-90 transition"
            onClick={() => setChatHistory([])}
          >
            New chat
          </button>
        </div>
        {/* Chat Area */}
        <div ref={chatContainerRef} className="px-6 py-4 space-y-6 pb-32">
          {/* Show chat history as a normal conversation */}
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
                {/* If this bot message has phone recommendations, show the card/chart/table as the bot's reply */}
                {chat.bot && chat.phones && chat.phones.length > 0 ? (
                  <div className="flex justify-start">
                    <div
                      className={`rounded-2xl px-0 py-0 max-w-2xl shadow-md text-base whitespace-pre-wrap border w-full overflow-x-auto ${darkMode ? 'bg-[#181818] text-gray-100 border-gray-700' : 'bg-[#f7f3ef] text-gray-900 border-[#eae4da]'}`}
                    >
                      <div className="space-y-6 p-4">
                        {/* Top phone card */}
                        <div
                          className={`rounded-2xl shadow-lg p-6 flex flex-col md:flex-row items-center gap-6 mx-auto w-full max-w-md 
                          ${darkMode ? "bg-gray-900 border-gray-700" : "bg-[#fff7f0] border-[#eae4da]"} border`}
                        >
                          <img
                            src={chat.phones[0].img_url}
                            alt={chat.phones[0].name}
                            className={`w-28 h-36 object-contain rounded-xl ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-[#eae4da]"} border`}
                          />
                          <div className="flex-1 flex flex-col gap-2">
                            <div className="text-lg font-bold text-brand">
                              {chat.phones[0].name}
                            </div>
                            <div
                              className={`text-xl font-extrabold ${darkMode ? "text-[#e2b892]" : "text-[#6b4b2b]"}`}
                            >
                              {chat.phones[0].price}
                            </div>
                            <div
                              className={`grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2 ${darkMode ? "text-gray-300" : "text-gray-900"}`}
                            >
                              <div>
                                <span className="font-semibold">Display:</span>{" "}
                                {chat.phones[0].display_type}
                              </div>
                              <div>
                                <span className="font-semibold">Screen:</span>{" "}
                                {chat.phones[0].screen_size_numeric} inches
                              </div>
                              <div>
                                <span className="font-semibold">
                                  Processor:
                                </span>{" "}
                                {chat.phones[0].chipset ||
                                  chat.phones[0].cpu}
                              </div>
                              <div>
                                <span className="font-semibold">RAM:</span>{" "}
                                {chat.phones[0].ram}
                              </div>
                              <div>
                                <span className="font-semibold">Storage:</span>{" "}
                                {chat.phones[0].internal_storage}
                              </div>
                              <div>
                                <span className="font-semibold">Camera:</span>{" "}
                                {chat.phones[0].primary_camera_resolution} /{" "}
                                {chat.phones[0].selfie_camera_resolution}
                              </div>
                              <div>
                                <span className="font-semibold">Battery:</span>{" "}
                                {chat.phones[0].battery_capacity_numeric} mAh
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Bar chart for device scores */}
                        <div
                          className={`rounded-2xl shadow p-2 sm:p-4 mx-auto w-full max-w-xs sm:max-w-md md:max-w-lg 
    ${darkMode ? "bg-gray-900 border-gray-700" : "bg-[#fff7f0] border-[#eae4da]"} border overflow-x-auto`}
                        >
                          <div className="font-semibold mb-2 text-brand">
                            Device Score Comparison
                          </div>
                          <ResponsiveContainer width="100%" height={220}>
                            <BarChart
                              data={chat.phones}
                              margin={{ top: 0, right: 0, left: 0, bottom: 30 }}
                              barCategoryGap="15%" // More breathing room between bars
                            >
                              <XAxis
                                dataKey="name"
                                interval={0}
                                tickLine={false}
                                height={70}
                                tick={({
                                  x,
                                  y,
                                  payload,
                                }: {
                                  x: number;
                                  y: number;
                                  payload: { value: string };
                                }) => {
                                  const words: string[] =
                                    payload.value.split(" ");
                                  return (
                                    <text
                                      x={x}
                                      y={y + 10}
                                      textAnchor="middle"
                                      fill={darkMode ? "#fff" : "#6b4b2b"}
                                      fontSize={11}
                                      fontWeight={500}
                                    >
                                      {words.map(
                                        (word: string, index: number) => (
                                          <tspan
                                            key={index}
                                            x={x}
                                            dy={index === 0 ? 0 : 12}
                                          >
                                            {word}
                                          </tspan>
                                        )
                                      )}
                                    </text>
                                  );
                                }}
                              />

                              <YAxis
                                tick={{
                                  fill: darkMode ? "#fff" : "#6b4b2b",
                                  fontWeight: 600,
                                  fontSize: 10,
                                }}
                                tickLine={false}
                                width={30}
                              />
                              <Tooltip
                                contentStyle={{
                                  background: darkMode ? "#232323" : "#fff7f0",
                                  color: darkMode ? "#e2b892" : "#6b4b2b",
                                  borderRadius: 8,
                                  fontSize: 12,
                                }}
                                labelStyle={{
                                  color: darkMode ? "#fff" : "#222",
                                  fontWeight: 700,
                                }}
                                itemStyle={{
                                  color: darkMode ? "#fff" : "#222",
                                  fontWeight: 600,
                                }}
                              />
                              <Bar
                                dataKey="overall_device_score"
                                radius={[6, 6, 0, 0]}
                                minPointSize={2}
                              >
                                {chat.phones.map((_, idx) => (
                                  <Cell
                                    key={idx}
                                    fill={darkMode ? "#e2b892" : "#d4a88d"}
                                    cursor="pointer"
                                    onMouseOver={(e) => {
                                      const target =
                                        e && (e.target as SVGElement);
                                      if (target && target.setAttribute)
                                        target.setAttribute(
                                          "fill",
                                          darkMode ? "#d4a88d" : "#b07b50"
                                        );
                                    }}
                                    onMouseOut={(e) => {
                                      const target =
                                        e && (e.target as SVGElement);
                                      if (target && target.setAttribute)
                                        target.setAttribute(
                                          "fill",
                                          darkMode ? "#e2b892" : "#d4a88d"
                                        );
                                    }}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Table of specifications */}
                        <div
                          className={`rounded-2xl shadow p-4 ${darkMode ? "bg-gray-900 border-gray-700" : "bg-[#fff7f0] border-[#eae4da]"} border`}
                        >
                          <div className="font-semibold mb-2 text-brand">
                            Phone Specifications
                          </div>
                          <div className="overflow-x-auto">
                            <table
                              className={`min-w-full border rounded-lg text-xs md:text-sm ${darkMode ? "bg-gray-900 text-white border-gray-700" : "bg-white text-gray-900 border-[#eae4da]"}`}
                            >
                              <thead>
                                <tr className="bg-brand text-white">
                                  <th className="px-2 py-1">Name</th>
                                  <th className="px-2 py-1">Brand</th>
                                  <th className="px-2 py-1">Price</th>
                                  <th className="px-2 py-1">Processor</th>
                                  <th className="px-2 py-1">RAM</th>
                                  <th className="px-2 py-1">Storage</th>
                                  <th className="px-2 py-1">Primary Camera</th>
                                  <th className="px-2 py-1">Selfie Camera</th>
                                  <th className="px-2 py-1">Battery</th>
                                </tr>
                              </thead>
                              <tbody>
                                {chat.phones.map((phone, idx) => (
                                  <tr
                                    key={idx}
                                    className={
                                      idx % 2 === 0
                                        ? darkMode
                                          ? "bg-gray-800"
                                          : "bg-white"
                                        : darkMode
                                          ? "bg-gray-900"
                                          : "bg-[#fff7f0]"
                                    }
                                  >
                                    <td className="px-2 py-1 font-semibold">
                                      {phone.name}
                                    </td>
                                    <td className="px-2 py-1">{phone.brand}</td>
                                    <td className="px-2 py-1">{phone.price}</td>
                                    <td className="px-2 py-1">
                                      {phone.chipset || phone.cpu}
                                    </td>
                                    <td className="px-2 py-1">{phone.ram}</td>
                                    <td className="px-2 py-1">
                                      {phone.internal_storage}
                                    </td>
                                    <td className="px-2 py-1">
                                      {phone.primary_camera_resolution}
                                    </td>
                                    <td className="px-2 py-1">
                                      {phone.selfie_camera_resolution}
                                    </td>
                                    <td className="px-2 py-1">
                                      {phone.battery_capacity_numeric} mAh
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  chat.bot && (
                    <div className="flex justify-start">
                      <div
                        className={`rounded-2xl px-5 py-3 max-w-xs shadow-md text-base whitespace-pre-wrap border ${darkMode ? "bg-[#181818] text-gray-100 border-gray-700" : "bg-[#f7f3ef] text-gray-900 border-[#eae4da]"}`}
                      >
                        {chat.bot}
                      </div>
                    </div>
                  )
                )}
                {/* Show suggestions only for the welcome message */}
                {index === 0 && showWelcome && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {SUGGESTED_QUERIES.map((suggestion) => (
                      <button
                        key={suggestion}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition ${darkMode ? "bg-[#181818] border-gray-700 text-gray-200 hover:bg-brand hover:text-white" : "bg-[#f7f3ef] border-[#eae4da] text-gray-900 hover:bg-brand hover:text-white"}`}
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
        {/* Fixed Input Area at the bottom of the viewport */}
        <div className="fixed bottom-0 left-0 w-full flex justify-center z-30 pb-4 pointer-events-none">
          <div
            className={`w-full max-w-xl mx-auto px-2 sm:px-4 pointer-events-auto`}
          >
            <div
              className={`flex items-center bg-white dark:bg-[#232323] border ${darkMode ? "border-gray-700" : "border-[#eae4da]"} shadow-lg rounded-2xl py-2 px-3 sm:py-3 sm:px-5 mb-2 transition-all duration-200`}
            >
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSendMessage();
                  }
                }}
                className={`flex-1 bg-transparent text-base focus:outline-none placeholder-gray-400 ${darkMode ? "text-white" : "text-gray-900"}`}
                placeholder="Type your message..."
                disabled={isLoading}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !message.trim()}
                className="ml-2 flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-transparent text-brand hover:scale-105 focus:outline-none focus:ring-2 focus:ring-brand transition disabled:text-gray-400 disabled:cursor-not-allowed"
                style={{ minWidth: 44, minHeight: 44 }}
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
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
