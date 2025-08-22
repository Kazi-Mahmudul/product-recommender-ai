import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import TrendingPhones from "./components/TrendingPhones";
import TopSearchedPhones from "./components/TopSearchedPhones";
import UpcomingPhones from "./components/UpcomingPhones";
import WhyChooseEpick from "./components/WhyChooseEpick";

import Footer from "./components/Footer";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import VerifyPage from "./pages/VerifyPage";
import ChatPage from "./pages/ChatPage";
import PhonesPage from "./pages/PhonesPage";
import PhoneDetailsPage from "./pages/PhoneDetailsPage";
import ComparePage from "./pages/ComparePage";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ComparisonProvider } from "./context/ComparisonContext";
import ComparisonWidget from "./components/ComparisonWidget";
import { GoogleOAuthProvider } from "@react-oauth/google";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
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
    id: "ID",
    name: "Name",
    brand: "Brand",
    model: "Model",
    price: "Price",
    display_type: "Display Type",
    screen_size_inches: "Screen Size (inches)",
    display_resolution: "Display Resolution",
    pixel_density_ppi: "Pixel Density (PPI)",
    refresh_rate_hz: "Refresh Rate (Hz)",
    screen_protection: "Screen Protection",
    display_brightness: "Display Brightness",
    aspect_ratio: "Aspect Ratio",
    hdr_support: "HDR Support",
    chipset: "Chipset",
    cpu: "CPU",
    gpu: "GPU",
    ram: "RAM",
    ram_type: "RAM Type",
    internal_storage: "Internal Storage",
    storage_type: "Storage Type",
    camera_setup: "Camera Setup",
    primary_camera_mp: "Primary Camera (MP)",
    selfie_camera_mp: "Selfie Camera (MP)",
    primary_camera_video_recording: "Primary Camera Video Recording",
    selfie_camera_video_recording: "Selfie Camera Video Recording",
    primary_camera_ois: "Primary Camera OIS",
    primary_camera_aperture: "Primary Camera Aperture",
    selfie_camera_aperture: "Selfie Camera Aperture",
    camera_features: "Camera Features",
    autofocus: "Autofocus",
    flash: "Flash",
    settings: "Settings",
    zoom: "Zoom",
    shooting_modes: "Shooting Modes",
    video_fps: "Video FPS",
    battery_type: "Battery Type",
    capacity: "Battery Capacity",
    quick_charging: "Quick Charging",
    wireless_charging: "Wireless Charging",
    reverse_charging: "Reverse Charging",
    build: "Build",
    weight: "Weight",
    thickness: "Thickness",
    colors: "Colors",
    waterproof: "Waterproof",
    ip_rating: "IP Rating",
    ruggedness: "Ruggedness",
    network: "Network",
    speed: "Speed",
    sim_slot: "SIM Slot",
    volte: "VoLTE",
    bluetooth: "Bluetooth",
    wlan: "WLAN",
    gps: "GPS",
    nfc: "NFC",
    usb: "USB",
    usb_otg: "USB OTG",
    fingerprint_sensor: "Fingerprint Sensor",
    finger_sensor_type: "Finger Sensor Type",
    finger_sensor_position: "Finger Sensor Position",
    face_unlock: "Face Unlock",
    light_sensor: "Light Sensor",
    infrared: "Infrared",
    fm_radio: "FM Radio",
    operating_system: "Operating System",
    os_version: "OS Version",
    user_interface: "User Interface",
    status: "Status",
    made_by: "Made By",
    release_date: "Release Date",
  };
  return (
    fieldMap[field] ||
    field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
};

// Fields to show in full specification table
const fullSpecFields = [
  "id",
  "name",
  "brand",
  "model",
  "price",
  "display_type",
  "screen_size_inches",
  "display_resolution",
  "pixel_density_ppi",
  "refresh_rate_hz",
  "screen_protection",
  "display_brightness",
  "aspect_ratio",
  "hdr_support",
  "chipset",
  "cpu",
  "gpu",
  "ram",
  "ram_type",
  "internal_storage",
  "storage_type",
  "camera_setup",
  "primary_camera_mp",
  "selfie_camera_mp",
  "primary_camera_video_recording",
  "selfie_camera_video_recording",
  "primary_camera_ois",
  "primary_camera_aperture",
  "selfie_camera_aperture",
  "camera_features",
  "autofocus",
  "flash",
  "settings",
  "zoom",
  "shooting_modes",
  "video_fps",
  "battery_type",
  "capacity",
  "quick_charging",
  "wireless_charging",
  "reverse_charging",
  "build",
  "weight",
  "thickness",
  "colors",
  "waterproof",
  "ip_rating",
  "ruggedness",
  "network",
  "speed",
  "sim_slot",
  "volte",
  "bluetooth",
  "wlan",
  "gps",
  "nfc",
  "usb",
  "usb_otg",
  "fingerprint_sensor",
  "finger_sensor_type",
  "finger_sensor_position",
  "face_unlock",
  "light_sensor",
  "infrared",
  "fm_radio",
  "operating_system",
  "os_version",
  "user_interface",
  "status",
  "made_by",
  "release_date",
]; // Used for full specification table

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [messages] = useState<Message[]>([]);
  // For full specification feature
  const [lastRecommendations] = useState<Phone[] | null>(null);
  const [lastUserQuery] = useState<string>("");
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  function HomePage() {
    const navigate = useNavigate();
    const [homeInput, setHomeInput] = useState("");
    const examplePlaceholders = [
      "Best phones under 20,000 BDT",
      "Top camera phones 2025",
      "Phones with best battery life",
      "Best gaming phones",
      "Latest Samsung phones",
      "Compare iPhone 16 vs Samsung S24",
      "Full specification of Realme 10 Pro",
    ];
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    useEffect(() => {
      const interval = setInterval(() => {
        setPlaceholderIndex((prev) => (prev + 1) % examplePlaceholders.length);
      }, 2000);
      return () => clearInterval(interval);
    }, [examplePlaceholders.length]);

    const handleHomeSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!homeInput.trim()) return;
      navigate("/chat", { state: { initialMessage: homeInput } });
    };

    return (
      <main className="flex flex-col items-center min-h-screen pt-16">
        <div className="w-full max-w-7xl px-2 md:px-6 mx-auto">
          {/* Hero Section and Search Form */}
          <section className="w-full mt-6 relative overflow-hidden rounded-3xl shadow-soft-lg bg-gradient-to-br from-brand/5 via-white to-brand-darkGreen/10 dark:from-brand/20 dark:via-gray-900 dark:to-brand-darkGreen/20 py-8 md:py-2 mb-12">
            {/* Decorative elements - contained within the section */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-brand/10 rounded-full filter blur-3xl -z-10 animate-float"></div>
            <div
              className="absolute bottom-0 left-0 w-72 h-72 bg-brand-darkGreen/10 rounded-full filter blur-3xl -z-10 animate-float"
              style={{ animationDelay: "2s" }}
            ></div>
            <div
              className="absolute top-1/4 right-1/4 w-16 h-16 rounded-full border-4 border-brand/20 animate-float"
              style={{ animationDelay: "1s" }}
            ></div>
            <div
              className="absolute bottom-1/3 left-1/3 w-10 h-10 rounded-md rotate-45 border-4 border-brand-darkGreen/30 animate-float"
              style={{ animationDelay: "3s" }}
            ></div>

            <div className="w-full px-4 py-10 md:py-0 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative">
              {/* Mobile BG image */}
              <div className="absolute inset-0 md:hidden bg-[url('https://i.ibb.co/JF7hWvmC/hero-bg.png')] bg-no-repeat bg-contain bg-right opacity-10 pointer-events-none" />
              {/* Left side content */}
              <div className="w-full md:w-1/2 text-center md:text-left z-10 px-2 md:px-0">
                <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-brand/10 text-brand font-medium text-sm">
                  AI-Powered Smartphone Assistant
                </div>
                <h1
                  className={`text-4xl md:text-6xl font-extrabold mb-6 leading-tight break-words ${darkMode ? "text-white" : "text-gray-900"}`}
                >
                  Find Your <span className="text-brand">Perfect Phone</span> in
                  Bangladesh
                </h1>
                <p
                  className={`text-lg md:text-xl mb-8 max-w-xl ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                >
                  Ask anything about smartphones, compare models, or get
                  personalized recommendations tailored to your specific needs.
                </p>

                {/* Search form */}
                <form onSubmit={handleHomeSubmit} className="w-full max-w-xl">
                  <div
                    className={`relative w-full flex items-center bg-white dark:bg-[#232323] border ${darkMode ? "border-gray-700" : "border-[#eae4da]"} rounded-2xl shadow-lg p-2 md:p-4 transition-all duration-200 hover:shadow-xl`}
                  >
                    <span className="pl-1 md:pr-2 text-brand flex items-center">
                      <Search className="h-5 w-5" />
                    </span>
                    <input
                      value={homeInput}
                      onChange={(e) => setHomeInput(e.target.value)}
                      placeholder={examplePlaceholders[placeholderIndex]}
                      className={`flex-grow px-1 py-2 md:py-3 rounded-lg bg-transparent focus:outline-none text-sm md:text-lg ${darkMode ? "text-white placeholder-gray-400" : "text-gray-900 placeholder-gray-500"}`}
                    />
                    <button
                      type="submit"
                      className="mr-2 md:mr-0 md:ml-2 flex items-center justify-center text-brand hover:text-brand-darkGreen rounded-xl md:px-4 md:py-2 transition-all duration-200"
                      disabled={!homeInput.trim()}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 md:h-6 md:w-6"
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
                    </button>
                  </div>
                </form>

                {/* Feature badges */}
                <div className="flex flex-wrap gap-3 mt-8">
                  {[
                    { icon: "💡", text: "Smart AI Recommendations" },
                    { icon: "🔍", text: "Detailed Comparisons" },
                    { icon: "🇧🇩", text: "Local BD Pricing" },
                    { icon: "⚡", text: "Instant Results" },
                  ].map((feature, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-sm backdrop-blur-sm"
                    >
                      <span>{feature.icon}</span>
                      <span
                        className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-800"}`}
                      >
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right side image */}
              <div className="hidden md:flex md:w-1/2 justify-center md:justify-end z-10">
                <div className="relative flex items-end">
                  <div className="absolute inset-0 from-brand/20 to-brand-darkGreen/20 rounded-3xl blur-2xl transform -rotate-6 scale-95"></div>
                  <img
                    src="https://i.ibb.co/JF7hWvmC/hero-bg.png"
                    alt="Smartphone with ePick interface"
                    className="relative z-10 max-w-full h-[700px] object-contain"
                    onError={(e) => {
                      // Fallback if image doesn't exist
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              </div>
            </div>
          </section>
          <TopSearchedPhones darkMode={darkMode} />
          <div className="my-8" />
          <TrendingPhones darkMode={darkMode} />
          <div className="my-8" />
          <UpcomingPhones darkMode={darkMode} />
          <div className="my-8" />
          <WhyChooseEpick darkMode={darkMode} />
          {/* Chat/Message Section */}
          {messages.length > 0 && (
            <div className="rounded-lg p-6 flex-grow overflow-y-auto lg:w-[800px] mx-auto bg-white shadow-lg mb-4 mt-8">
              <div className="space-y-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg ${
                      message.role === "user"
                        ? "bg-brand text-white ml-12"
                        : "bg-gray-100 text-gray-900 mr-12"
                    }`}
                  >
                    <pre className="whitespace-pre-wrap font-sans">
                      {message.content}
                    </pre>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          {/* Full Specification Table */}
          {(() => {
            const fullSpecRegex = /full specification of (.+)/i;
            const match = lastUserQuery.match(fullSpecRegex);
            if (
              match &&
              lastRecommendations &&
              lastRecommendations.length === 1
            ) {
              const phone = lastRecommendations[0];
              return (
                <div className="w-full max-w-3xl mx-auto my-6">
                  <h2
                    className={`text-xl font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    Full Specification of {phone.brand} {phone.name}
                  </h2>
                  <div className="overflow-x-auto">
                    <table
                      className={`min-w-full border rounded-lg ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"}`}
                    >
                      <tbody>
                        {fullSpecFields.map((field) => (
                          <tr key={field} className="border-b border-gray-200">
                            <td className="py-2 px-4 font-semibold whitespace-nowrap w-1/3">
                              {formatFieldName(field)}
                            </td>
                            <td className="py-2 px-4">
                              {(phone as any)[field] ?? "-"}
                            </td>
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
        </div>
      </main>
    );
  }

  // Use user from AuthContext
  const { user, logout } = useAuth();
  return (
    <ComparisonProvider>
      <div
        className={`min-h-screen w-full ${darkMode ? "bg-[#121212]" : "bg-[#fdfbf9]"}`}
      >
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={user}
          darkMode={darkMode}
          onLogout={logout}
        />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage darkMode={darkMode} />} />
          <Route path="/signup" element={<SignupPage darkMode={darkMode} />} />
          <Route path="/verify" element={<VerifyPage darkMode={darkMode} />} />
          <Route
            path="/chat"
            element={<ChatPage darkMode={darkMode} setDarkMode={setDarkMode} />}
          />
          <Route path="/phones" element={<PhonesPage />} />
          <Route path="/phones/:slug" element={<PhoneDetailsPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/compare/:phoneIdentifiers" element={<ComparePage />} />
        </Routes>
        {location.pathname !== "/chat" && <Footer />}

        {/* Comparison Widget - shown on all pages except chat */}
        {location.pathname !== "/chat" && <ComparisonWidget />}
      </div>
    </ComparisonProvider>
  );
}

const AppWithAuthProvider = () => {
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    console.error("Google Client ID not found in environment variables");
    // Fallback: render app without Google OAuth
    return (
      <AuthProvider>
        <App />
      </AuthProvider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
};

export default AppWithAuthProvider;
