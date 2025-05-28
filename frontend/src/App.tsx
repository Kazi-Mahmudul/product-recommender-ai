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
      const response = await fetch(`${API_BASE_URL}/api/v1/phones/recommendations?query=${encodeURIComponent(input)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const recommendations: Phone[] = await response.json();
      
      // Format the recommendations into a readable message
      const recommendationsText = recommendations
        .slice(0, 5) // Show top 5 recommendations
        .map((phone, index) => 
          `📱 ${index + 1}. ${phone.brand} ${phone.name}\n` +
          `   💰 Price: BDT ${phone.price.toLocaleString()}\n` +
          `   💾 RAM: ${phone.ram}GB\n` +
          `   💿 Storage: ${phone.internal_storage}GB\n` +
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
        content: 'Sorry, there was an error getting recommendations. Please try again.',
        role: 'assistant',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-200">
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">PickBD</h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg hover:bg-accent"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <main className="container mx-auto p-4 max-w-4xl">
        <div className="flex flex-col h-[calc(100vh-8rem)]">
          <div className="flex-1 overflow-y-auto space-y-4 p-4">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`chat-bubble ${
                  message.role === 'user' ? 'user-bubble' : 'assistant-bubble'
                }`}
              >
                {message.content}
              </motion.div>
            ))}
            {isTyping && (
              <div className="typing-indicator">
                <div className="typing-dot" style={{ animationDelay: '0ms' }} />
                <div className="typing-dot" style={{ animationDelay: '150ms' }} />
                <div className="typing-dot" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe what kind of phone you're looking for..."
                className="flex-1 p-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <button
                type="submit"
                className="p-2 rounded-lg bg-brand text-white hover:bg-brand/90 transition-colors"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default App; 