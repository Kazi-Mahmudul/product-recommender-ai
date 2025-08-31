import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Check, Star, Battery, Camera, Zap } from "lucide-react";
import { generatePhoneDetailUrl } from "../utils/slugUtils";
import { useComparison } from "../context/ComparisonContext";
import { Phone } from "../api/phones";

interface ChatPhoneCardProps {
  phone: Phone;
  darkMode: boolean;
  isTopResult?: boolean;
}

const ChatPhoneCard: React.FC<ChatPhoneCardProps> = ({ phone, darkMode, 
  isTopResult = false }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const navigate = useNavigate();

  // Use comparison context
  const { addPhone, removePhone, isPhoneSelected } = useComparison();

  // Check if this phone is selected for comparison
  const isSelected = phone.slug ? isPhoneSelected(phone.slug) : false;

  const handleViewDetails = () => {
    if (phone.id) {
      navigate(generatePhoneDetailUrl(phone));
    }
  };

  // Handle compare button click
  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (phone.slug) {
      if (isSelected) {
        removePhone(phone.slug);
      } else {
        addPhone(phone);
      }
    }
  };

  // Format numbers for display
  const formatNumber = (num: number | undefined) => {
    if (!num) return "N/A";
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Get score color
  const getScoreColor = (score: number | undefined) => {
    if (!score) return "";
    if (score >= 8) return "text-green-500";
    if (score >= 6) return "text-yellow-500";
    if (score >= 4) return "text-orange-500";
    return "text-red-500";
  };

  // Determine if this is a top result card (larger, more detailed) or a regular result
  return isTopResult ? (
    // Top result card - larger with more details
    <div
      className={`rounded-2xl shadow-lg p-6 flex flex-col md:flex-row items-center gap-6 mx-auto w-full max-w-md 
        ${darkMode ? "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700" : "bg-gradient-to-br from-white to-gray-50 border-[#eae4da]"} border
        cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.01]`}
      onClick={handleViewDetails}
    >
      <div className="relative">
        <div className={`w-28 h-36 rounded-xl flex items-center justify-center ${darkMode ? "bg-gray-700" : "bg-white border border-gray-200"} border`}>
          <img
            src={phone.img_url || "/phone.png"}
            alt={phone.name}
            className="w-24 h-32 object-contain transition-transform duration-300 hover:scale-105"
          />
        </div>
        <div className="absolute -top-2 -left-2 px-2 py-0.5 rounded-full bg-brand text-white text-xs font-medium">
          {phone.brand}
        </div>
        {phone.overall_device_score && (
          <div className={`absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${getScoreColor(phone.overall_device_score)} ${darkMode ? "bg-gray-900/80" : "bg-white/80"} backdrop-blur-sm`}>
            <Star size={12} />
            {phone.overall_device_score.toFixed(1)}
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col gap-2">
        <div className="text-lg font-bold text-brand">
          {phone.name}
        </div>
        
        <div className={`text-xl font-extrabold ${darkMode ? "text-white" : "text-brand"}`}>
          ৳ {formatNumber(phone.price ? parseInt(phone.price, 10) : undefined)}
        </div>
        
        <div className={`grid grid-cols-2 gap-x-4 gap-y-2 text-xs mt-2 ${darkMode ? "text-gray-300" : "text-gray-900"}`}>
          <div className="flex items-center gap-1">
            <span className="font-semibold">📱</span>
            <span>{phone.display_type || "N/A"}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold">📏</span>
            <span>{phone.screen_size_inches ? `${phone.screen_size_inches}"` : "N/A"}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold">⚡</span>
            <span>{phone.chipset || phone.cpu || "N/A"}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold">💾</span>
            <span>{phone.ram || "N/A"}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold">💾</span>
            <span>{phone.internal_storage || "N/A"}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold">📸</span>
            <span>{phone.main_camera || "N/A"} / {phone.front_camera || "N/A"}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold">🔋</span>
            <span>{phone.battery_capacity_numeric ? `${phone.battery_capacity_numeric} mAh` : phone.capacity || "N/A"}</span>
          </div>
          {phone.overall_device_score && (
            <div className="flex items-center gap-1">
              <span className="font-semibold">⭐</span>
              <span>{phone.overall_device_score.toFixed(1)}</span>
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center mt-3">
          <button
            className="bg-brand hover:bg-brand-darkGreen text-white font-medium rounded-full px-4 py-1.5 text-sm transition-colors shadow-md hover:shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetails();
            }}
          >
            View Details
          </button>
          
          {/* Compare Button */}
          <button
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold shadow transition-all duration-200 focus:outline-none focus:ring-2 ${
              isSelected
                ? 'bg-brand hover:bg-brand-darkGreen text-white hover:text-black focus:ring-brand'
                : 'bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 focus:ring-gray-400 dark:focus:ring-gray-600'
            }`}
            title={isSelected ? 'Remove from comparison' : 'Add to comparison'}
            onClick={handleCompareClick}
          >
            {isSelected ? 'Added to Compare' : '+ Compare'}
          </button>
        </div>
      </div>
    </div>
  ) : (
    // Regular result card - smaller and more compact
    <div
      className={`rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] ${
        darkMode ? "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700" : "bg-gradient-to-br from-white to-gray-50 border-[#eae4da]"
      } border`}
      onClick={handleViewDetails}
    >
      <div className="relative h-32 bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center p-2">
        <div className="h-28 flex items-center justify-center">
          <img
            src={phone.img_url || "/phone.png"}
            alt={phone.name}
            className="h-24 object-contain transition-transform duration-300 hover:scale-105"
            loading="lazy"
          />
        </div>
        
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-brand text-white text-xs font-medium">
          {phone.brand}
        </div>
        {phone.overall_device_score && (
          <div className={`absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${getScoreColor(phone.overall_device_score)} ${darkMode ? "bg-gray-900/80" : "bg-white/80"} backdrop-blur-sm`}>
            <Star size={10} />
            {phone.overall_device_score.toFixed(1)}
          </div>
        )}
        {/* Compare Button */}
        <div className="absolute top-4 right-4">
          <button
            className={`w-8 h-8 flex items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-colors duration-200 ${
              isSelected
                ? 'bg-brand text-white hover:bg-brand-darkGreen'
                : 'bg-white/90 dark:bg-card/90 text-brand dark:text-white hover:bg-brand hover:text-white'
            }`}
            onClick={handleCompareClick}
            aria-label={isSelected ? "Remove from comparison" : "Add to comparison"}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
          >
            {isSelected ? <Check size={16} /> : <Plus size={16} />}
          </button>
          {showTooltip && (
            <div className="absolute -bottom-10 right-0 px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 text-brand dark:text-white text-xs font-medium shadow-soft z-20 whitespace-nowrap transition-opacity duration-200">
              {isSelected ? "Remove from comparison" : "Add to comparison"}
            </div>
          )}
        </div>
      </div>
      
      <div className="p-3">
        <h3 className="font-medium text-sm text-neutral-800 dark:text-white mb-1 line-clamp-1" title={phone.name}>
          {phone.name}
        </h3>
        
        <div className="grid grid-cols-3 gap-x-2 gap-y-1 mb-2 text-xs">
          {phone.primary_camera_mp && (
            <div className="flex items-center gap-1">
              <Camera size={12} className={`${darkMode ? "text-gray-400" : "text-gray-500"}`} />
              <span className={`${darkMode ? "text-gray-200" : "text-gray-900"} font-medium`}>{phone.primary_camera_mp}MP</span>
            </div>
          )}
          {phone.battery_capacity_numeric && (
            <div className="flex items-center gap-1">
              <Battery size={12} className={`${darkMode ? "text-gray-400" : "text-gray-500"}`} />
              <span className={`${darkMode ? "text-gray-200" : "text-gray-900"} font-medium`}>{phone.battery_capacity_numeric}mAh</span>
            </div>
          )}
          {phone.ram_gb && (
            <div className="flex items-center gap-1">
              <Zap size={12} className={`${darkMode ? "text-gray-400" : "text-gray-500"}`} />
              <span className={`${darkMode ? "text-gray-200" : "text-gray-900"} font-medium`}>{phone.ram_gb}GB</span>
            </div>
          )}
          <div>
            <span className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>RAM:</span>{" "}
            <span className={`${darkMode ? "text-gray-200" : "text-gray-900"} font-medium`}>{phone.ram || "N/A"}</span>
          </div>
          <div>
            <span className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>Storage:</span>{" "}
            <span className={`${darkMode ? "text-gray-200" : "text-gray-900"} font-medium`}>{phone.internal_storage || "N/A"}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="font-semibold text-xs text-brand dark:text-[#80EF80]">
            <span className="text-brand dark:text-[#80EF80] font-normal text-base">৳</span> {formatNumber(phone.price ? parseInt(phone.price, 10) : undefined)}
          </div>
          <div>
          <button
            className="bg-brand hover:bg-brand-darkGreen text-white rounded-full px-2.5 py-1 text-xs font-medium transition-colors shadow hover:shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetails();
            }}
          >
            Details
          </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPhoneCard;