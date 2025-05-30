import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, Send } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
}

interface Phone {
  id: number;
  name: string;
  brand: string;
  price: number;
  ram: number;
  internal_storage: number;
  display_size: number;
  battery: number;
  camera_score: number;
  performance_score: number;
  display_score: number;
  storage_score: number;
  battery_efficiency: number;
}

// API configuration
const API_BASE_URL = 'https://pickbd-ai.onrender.com';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Send the user's query to get AI-powered recommendations
      const response = await fetch(`${API_BASE_URL}/api/v1/natural-language/query?query=${encodeURIComponent(input)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const recommendations: Phone[] = await response.json();
      
      if (!recommendations || recommendations.length === 0) {
        throw new Error('No recommendations found for your query.');
      }

      // Format the recommendations into a readable message
      const recommendationsText = recommendations
        .slice(0, 5) // Show top 5 recommendations
        .map((phone, index) => 
          `📱 ${index + 1}. ${phone.brand} ${phone.name}\n` +
          `   💰 Price: BDT ${phone.price.toLocaleString()}\n` +
          `   💾 RAM: ${phone.ram}\n` +
          `   💿 Storage: ${phone.internal_storage}\n` +
          `   ⚡ Performance: ${phone.performance_score.toFixed(1)}/10\n` +
          `   📸 Camera: ${phone.camera_score.toFixed(1)}/10\n` +
          `   🖥️ Display: ${phone.display_score.toFixed(1)}/10\n` +
          `   🔋 Battery: ${phone.battery_efficiency.toFixed(1)}/10\n`
        )
        .join('\n');

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Based on your query "${input}", here are some phone recommendations:\n\n${recommendationsText}\n\n💡 Tip: Click on a phone to see more details.`,
        role: 'assistant',
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Sorry, there was an error: ${error instanceof Error ? error.message : 'Please try again.'}`,
        role: 'assistant',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <main className="container mx-auto px-4 py-8 flex flex-col h-screen">
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            PickBD
          </h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg ${
              darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900'
            }`}
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>

        {messages.length > 0 ? (
          <div className={`rounded-lg p-6 flex-grow overflow-y-auto lg:w-[800px] mx-auto ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } shadow-lg mb-4`}>
            <div className="space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-lg ${
                    message.role === 'user'
                      ? darkMode
                        ? 'bg-brand text-white ml-12'
                        : 'bg-brand text-white ml-12'
                      : darkMode
                      ? 'bg-gray-700 text-white mr-12'
                      : 'bg-gray-100 text-gray-900 mr-12'
                  }`}
                >
                  <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                </motion.div>
              ))}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-4 rounded-lg ${
                    darkMode ? 'bg-gray-700 text-white mr-12' : 'bg-gray-100 text-gray-900 mr-12'
                  }`}
                >
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center">
            <div className="text-center mb-8">
              <h2 className={`text-2xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Find Your Perfect Phone in Bangladesh
              </h2>
              <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Ask me about phones and I'll recommend the best options for you
              </p>
            </div>

            <div className="w-full max-w-2xl px-4">
              <form onSubmit={handleSubmit} className="w-full">
                <div className="relative w-full h-32 flex">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Describe what kind of phone you're looking for..."
                    className={`w-full h-full resize-none p-4 rounded-lg border sm:text-base text-lg ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-brand pr-12`}
                    rows={1}
                  />
                  <button
                    type="submit"
                    className="absolute right-2 bottom-2 p-2 rounded-md bg-brand text-white hover:bg-brand/90 transition-colors flex items-center justify-center"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="flex justify-center items-center w-full absolute bottom-8 left-0 right-0 px-4">
            <form onSubmit={handleSubmit} className="w-full max-w-2xl">
              <div className="relative w-full h-16 flex items-center">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe what kind of phone you're looking for..."
                  className={`w-full h-full resize-none py-4 px-2 rounded-lg border sm:text-base text-lg ${
                    darkMode 
                      ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-brand pr-12`}
                  rows={1}
                />
                <button
                  type="submit"
                  className="absolute right-2 bottom-2 p-2 rounded-md bg-brand text-white hover:bg-brand/90 transition-colors flex items-center justify-center"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;