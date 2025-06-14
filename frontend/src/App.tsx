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
  model: string;
  price: string;
  url: string;
  img_url: string;
  display_type: string;
  screen_size_inches: number;
  display_resolution: string;
  pixel_density_ppi: number;
  refresh_rate_hz: number;
  screen_protection: string;
  display_brightness: string;
  aspect_ratio: string;
  hdr_support: string;
  chipset: string;
  cpu: string;
  gpu: string;
  ram: string;
  ram_type: string;
  internal_storage: string;
  storage_type: string;
  camera_setup: string;
  primary_camera_resolution: string;
  selfie_camera_resolution: string;
  primary_camera_video_recording: string;
  selfie_camera_video_recording: string;
  primary_camera_ois: string;
  primary_camera_aperture: string;
  selfie_camera_aperture: string;
  camera_features: string;
  autofocus: string;
  flash: string;
  settings: string;
  zoom: string;
  shooting_modes: string;
  video_fps: string;
  battery_type: string;
  capacity: string;
  quick_charging: string;
  wireless_charging: string;
  reverse_charging: string;
  build: string;
  weight: string;
  thickness: string;
  colors: string;
  waterproof: string;
  ip_rating: string;
  ruggedness: string;
  network: string;
  speed: string;
  sim_slot: string;
  volte: string;
  bluetooth: string;
  wlan: string;
  gps: string;
  nfc: string;
  usb: string;
  usb_otg: string;
  fingerprint_sensor: string;
  finger_sensor_type: string;
  finger_sensor_position: string;
  face_unlock: string;
  light_sensor: string;
  infrared: string;
  fm_radio: string;
  operating_system: string;
  os_version: string;
  user_interface: string;
  status: string;
  made_by: string;
  release_date: string;
  price_original: number;
  price_category: string;
  storage_gb: number;
  ram_gb: number;
  price_per_gb: number;
  price_per_gb_ram: number;
  screen_size_numeric: number;
  resolution_width: number;
  resolution_height: number;
  ppi_numeric: number;
  refresh_rate_numeric: number;
  camera_count: number;
  primary_camera_mp: number;
  selfie_camera_mp: number;
  battery_capacity_numeric: number;
  has_fast_charging: boolean;
  has_wireless_charging: boolean;
  charging_wattage: number;
  battery_score: number;
  security_score: number;
  connectivity_score: number;
  is_popular_brand: boolean;
  release_date_clean: string;
  is_new_release: boolean;
  age_in_months: number;
  is_upcoming: boolean;
  overall_device_score: number;
  performance_score: number;
  display_score: number;
  camera_score: number;
}

// Helper to format field names for display
const formatFieldName = (field: string): string => {
  // Used for full specification table display
  const fieldMap: Record<string, string> = {
    id: 'ID',
    name: 'Name',
    brand: 'Brand',
    model: 'Model',
    price: 'Price',
    display_type: 'Display Type',
    screen_size_inches: 'Screen Size (inches)',
    display_resolution: 'Display Resolution',
    pixel_density_ppi: 'Pixel Density (PPI)',
    refresh_rate_hz: 'Refresh Rate (Hz)',
    screen_protection: 'Screen Protection',
    display_brightness: 'Display Brightness',
    aspect_ratio: 'Aspect Ratio',
    hdr_support: 'HDR Support',
    chipset: 'Chipset',
    cpu: 'CPU',
    gpu: 'GPU',
    ram: 'RAM',
    ram_type: 'RAM Type',
    internal_storage: 'Internal Storage',
    storage_type: 'Storage Type',
    camera_setup: 'Camera Setup',
    primary_camera_resolution: 'Primary Camera Resolution',
    selfie_camera_resolution: 'Selfie Camera Resolution',
    primary_camera_video_recording: 'Primary Camera Video Recording',
    selfie_camera_video_recording: 'Selfie Camera Video Recording',
    primary_camera_ois: 'Primary Camera OIS',
    primary_camera_aperture: 'Primary Camera Aperture',
    selfie_camera_aperture: 'Selfie Camera Aperture',
    camera_features: 'Camera Features',
    autofocus: 'Autofocus',
    flash: 'Flash',
    settings: 'Settings',
    zoom: 'Zoom',
    shooting_modes: 'Shooting Modes',
    video_fps: 'Video FPS',
    battery_type: 'Battery Type',
    capacity: 'Battery Capacity',
    quick_charging: 'Quick Charging',
    wireless_charging: 'Wireless Charging',
    reverse_charging: 'Reverse Charging',
    build: 'Build',
    weight: 'Weight',
    thickness: 'Thickness',
    colors: 'Colors',
    waterproof: 'Waterproof',
    ip_rating: 'IP Rating',
    ruggedness: 'Ruggedness',
    network: 'Network',
    speed: 'Speed',
    sim_slot: 'SIM Slot',
    volte: 'VoLTE',
    bluetooth: 'Bluetooth',
    wlan: 'WLAN',
    gps: 'GPS',
    nfc: 'NFC',
    usb: 'USB',
    usb_otg: 'USB OTG',
    fingerprint_sensor: 'Fingerprint Sensor',
    finger_sensor_type: 'Finger Sensor Type',
    finger_sensor_position: 'Finger Sensor Position',
    face_unlock: 'Face Unlock',
    light_sensor: 'Light Sensor',
    infrared: 'Infrared',
    fm_radio: 'FM Radio',
    operating_system: 'Operating System',
    os_version: 'OS Version',
    user_interface: 'User Interface',
    status: 'Status',
    made_by: 'Made By',
    release_date: 'Release Date',
  };
  return fieldMap[field] || field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

// Fields to show in full specification table
const fullSpecFields = [
  'id', 'name', 'brand', 'model', 'price', 'display_type', 'screen_size_inches', 'display_resolution', 'pixel_density_ppi',
  'refresh_rate_hz', 'screen_protection', 'display_brightness', 'aspect_ratio', 'hdr_support', 'chipset', 'cpu', 'gpu',
  'ram', 'ram_type', 'internal_storage', 'storage_type', 'camera_setup', 'primary_camera_resolution',
  'selfie_camera_resolution', 'primary_camera_video_recording', 'selfie_camera_video_recording', 'primary_camera_ois',
  'primary_camera_aperture', 'selfie_camera_aperture', 'camera_features', 'autofocus', 'flash', 'settings', 'zoom',
  'shooting_modes', 'video_fps', 'battery_type', 'capacity', 'quick_charging', 'wireless_charging', 'reverse_charging',
  'build', 'weight', 'thickness', 'colors', 'waterproof', 'ip_rating', 'ruggedness', 'network', 'speed', 'sim_slot',
  'volte', 'bluetooth', 'wlan', 'gps', 'nfc', 'usb', 'usb_otg', 'fingerprint_sensor', 'finger_sensor_type',
  'finger_sensor_position', 'face_unlock', 'light_sensor', 'infrared', 'fm_radio', 'operating_system', 'os_version',
  'user_interface', 'status', 'made_by', 'release_date'
]; // Used for full specification table
// API configuration
const API_BASE_URL = 'https://pickbd-ai.onrender.com';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  // For full specification feature
  const [lastRecommendations, setLastRecommendations] = useState<Phone[] | null>(null);
  const [lastUserQuery, setLastUserQuery] = useState<string>('');

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

      setLastRecommendations(recommendations);
      setLastUserQuery(input);

      // Detect if the user asked for a full specification
      const fullSpecRegex = /full specification of (.+)/i;
      const match = input.match(fullSpecRegex);
      if (match && recommendations.length === 1) {
        // Don't add a text message, just show the table below
        return;
      }

      // Format the recommendations into a readable message
      const recommendationsText = recommendations
        .slice(0, 5) // Show top 5 recommendations
        .map((phone, index) => 
          `📱 ${index + 1}. ${phone.brand} ${phone.name}\n` +
          `   💰 Price: BDT ${phone.price}\n` +
          `   💾 RAM: ${phone.ram}\n` +
          `   💿 Storage: ${phone.internal_storage}\n` +
          `   ⚡ Performance: ${phone.performance_score?.toFixed(1) ?? '-'}\n` +
          `   📸 Camera: ${phone.camera_score?.toFixed(1) ?? '-'}\n` +
          `   🖥️ Display: ${phone.display_score?.toFixed(1) ?? '-'}\n` +
          `   🔋 Battery: ${phone.battery_score?.toFixed(1) ?? '-'}\n`
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
          <>
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
            {/* Full specification table display */}
            {(() => {
              const fullSpecRegex = /full specification of (.+)/i;
              const match = lastUserQuery.match(fullSpecRegex);
              if (match && lastRecommendations && lastRecommendations.length === 1) {
                const phone = lastRecommendations[0];
                return (
                  <div className="w-full max-w-3xl mx-auto my-6">
                    <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Full Specification of {phone.brand} {phone.name}</h2>
                    <div className="overflow-x-auto">
                      <table className={`min-w-full border rounded-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
                        <tbody>
                          {fullSpecFields.map(field => (
                            <tr key={field} className="border-b border-gray-200">
                              <td className="py-2 px-4 font-semibold whitespace-nowrap w-1/3">{formatFieldName(field)}</td>
                              <td className="py-2 px-4">{(phone as any)[field] ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </>
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