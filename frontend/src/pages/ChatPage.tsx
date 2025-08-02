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
  Legend,
  LabelList,
} from "recharts";
import ChatPhoneRecommendation from "../components/ChatPhoneRecommendation";

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
const GEMINI_API_URL = process.env.REACT_APP_GEMINI_API;

// Helper: Check if a message is a comparison response
function isComparisonResponse(bot: any): bot is { type: string; phones: any[]; features: any[] } {
  return bot && typeof bot === "object" && bot.type === "comparison" && Array.isArray(bot.phones) && Array.isArray(bot.features);
}

// Helper: Generate summary text for comparison
function generateComparisonSummary(phones: any[], features: any[]) {
  if (!phones || !features) return "";
  let summary = "";
  features.forEach((f) => {
    const maxIdx = f.percent.indexOf(Math.max(...f.percent));
    summary += `${phones[maxIdx].name} leads in ${f.label}. `;
  });
  return summary;
}

// Custom label component for percentage display on bars
const CustomBarLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  if (value > 0) {
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill="white"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="12"
        fontWeight="bold"
      >
        {value.toFixed(1)}%
      </text>
    );
  }
  return null;
};

// Custom label for LabelList (shows correct % for every phone, responsive, mode-aware)
const CustomBarLabelList = (props: any) => {
  const { x, y, width, height, value, fill } = props;
  const isMobile = window.innerWidth < 640;
  if (value > 0) {
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill={fill || '#fff'}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={isMobile ? 10 : 12}
        fontWeight={700}
      >
        {value.toFixed(1)}%
      </text>
    );
  }
  return null;
};

// Custom XAxis tick for wrapping and responsive font
const CustomXAxisTick = (props: any) => {
  const { x, y, payload, width } = props;
  const isMobile = window.innerWidth < 640;
  const words = String(payload.value).split(" ");
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        textAnchor="middle"
        fill={props.darkMode ? "#fff" : "#6b4b2b"}
        fontSize={isMobile ? 10 : 13}
        fontWeight={600}
      >
        {words.map((word: string, idx: number) => (
          <tspan key={idx} x={0} dy={idx === 0 ? 0 : 12}>
            {word}
          </tspan>
        ))}
      </text>
    </g>
  );
};

// Add a hook to track window width
function useWindowWidth() {
  const [width, setWidth] = React.useState(window.innerWidth);
  React.useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
}

const formatComparisonSummary = (phones: any[], features: any[], summary: string, darkMode: boolean) => {
  if (!phones || !features) return null;
  // Compose bullet points using feature.raw values
  const points: string[] = [];
  const getVals = (key: string, unit: string = "", isInt = false, addTaka = false) => {
    const f = features.find((f: any) => f.key === key);
    if (!f) return null;
    return f.raw.map((v: any, i: number) => {
      let val = v !== undefined && v !== null ? (isInt ? parseInt(v) : v) + unit : "N/A";
      if (addTaka && val !== "N/A") val = val + " Taka";
      return `${phones[i].name}: ${val}`;
    }).join(" | ");
  };
  // Price
  const priceVals = getVals("price_original", "", false, true);
  if (priceVals) points.push(`Price: ${priceVals}`);
  // RAM
  const ramVals = getVals("ram_gb", "GB", true);
  if (ramVals) points.push(`RAM: ${ramVals}`);
  // Storage
  const storageVals = getVals("storage_gb", "GB", true);
  if (storageVals) points.push(`Storage: ${storageVals}`);
  // Main Camera
  const mainCamVals = getVals("primary_camera_mp", "MP");
  if (mainCamVals) points.push(`Main Camera: ${mainCamVals}`);
  // Front Camera
  const frontCamVals = getVals("selfie_camera_mp", "MP");
  if (frontCamVals) points.push(`Front Camera: ${frontCamVals}`);
  // Display
  const displayVals = getVals("display_score");
  if (displayVals) points.push(`Display Score: ${displayVals}`);
  // Battery
  const batteryVals = getVals("battery_capacity_numeric", "mAh", true);
  if (batteryVals) points.push(`Battery: ${batteryVals}`);
  return (
    <ul className={`text-left mt-2 space-y-1 ${darkMode ? "text-[#e2b892]" : "text-[#6b4b2b]"}`}>
      {points.map((pt, idx) => (
        <li key={idx} className="list-disc ml-6 text-sm sm:text-base">{pt}</li>
      ))}
    </ul>
  );
};

const ChatPage: React.FC<ChatPageProps> = ({ darkMode, setDarkMode }) => {
  const location = useLocation();
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const windowWidth = useWindowWidth();

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
            updated[updated.length - 1].phones = phoneData.map(item => item.phone || item);
          } else if (phoneData.type === "qa" || phoneData.type === "chat") {
            // QA or chat response
            updated[updated.length - 1].bot = phoneData.data;
          } else if (phoneData.type === "comparison") {
            // Comparison response
            updated[updated.length - 1].bot = phoneData;
          } else {
            // Fallback for other response types
            updated[updated.length - 1].bot = typeof phoneData === "string" ? phoneData : JSON.stringify(phoneData);
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
          } else if (responseData.type === "comparison") {
            updated[updated.length - 1].bot = responseData;
          } else {
            // Fallback for other response types
            updated[updated.length - 1].bot = typeof responseData === "string" ? responseData : JSON.stringify(responseData);
          }
          return updated;
        });
      }
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

                {chat.bot && typeof chat.bot === "object" &&
                  (chat.bot as any).type === "comparison" &&
                  Array.isArray((chat.bot as any).phones) &&
                  Array.isArray((chat.bot as any).features) && (
                    <div className="my-8">
                      <div className="w-full overflow-x-auto" style={{ maxWidth: "100vw" }}>
                        <div
                          className="mx-auto"
                          style={{
                            minWidth: 400,
                            width: "100%",
                            maxWidth: 900,
                            height: 350,
                          }}
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={(chat.bot as any).features.map((f: any) => {
                                const obj: any = { feature: f.label };
                                (chat.bot as any).phones.forEach((p: any, idx: number) => {
                                  obj[p.name] = f.percent[idx];
                                  obj[`${p.name}_raw`] = f.raw[idx];
                                });
                                return obj;
                              })}
                              margin={{ top: 20, right: 30, left: 20, bottom: windowWidth < 640 ? 80 : 60 }}
                            >
                              <XAxis
                                dataKey="feature"
                                tick={<CustomXAxisTick darkMode={darkMode} />}
                                interval={0}
                                height={windowWidth < 640 ? 50 : 70}
                                tickMargin={windowWidth < 640 ? 16 : 24}
                              />
                              <YAxis
                                domain={[0, 100]}
                                tickFormatter={(v) => `${v}%`}
                                tick={{ fontSize: windowWidth < 640 ? 10 : 12, fill: darkMode ? "#fff" : "#6b4b2b" }}
                              />
                              <Tooltip
                                formatter={(value: any, name: string, props: any) => {
                                  const raw = props.payload[`${name}_raw`];
                                  return [`${value.toFixed(1)}% (${raw ?? "N/A"})`, name];
                                }}
                              />
                              <Legend wrapperStyle={{ fontSize: windowWidth < 640 ? 12 : 14 }} />
                              {(chat.bot as any).phones.map((p: any, idx: number) => (
                                <Bar
                                  key={p.name}
                                  dataKey={p.name}
                                  stackId="a"
                                  fill={p.color}
                                  radius={[0, 0, 0, 0]}
                                  isAnimationActive={true}
                                >
                                  <LabelList dataKey={p.name} content={CustomBarLabelList} />
                                </Bar>
                              ))}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="mt-4 w-full flex justify-center">
                        {formatComparisonSummary((chat.bot as any).phones, (chat.bot as any).features, (chat.bot as any).summary, darkMode)}
                      </div>
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