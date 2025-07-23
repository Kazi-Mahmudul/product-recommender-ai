import React from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { getThemeClasses } from "../utils/colorUtils";

import { Phone } from "../types/phone";

interface ChatPhoneCardProps {
  phone: Phone;
  darkMode: boolean;
  onAddToCompare?: (phone: Phone) => void;
  isTopResult?: boolean;
}

const ChatPhoneCard: React.FC<ChatPhoneCardProps> = ({ 
  phone, 
  darkMode, 
  onAddToCompare,
  isTopResult = false
}) => {
  const navigate = useNavigate();
  const themeClasses = getThemeClasses(darkMode);
  
  const handleViewDetails = () => {
    if (phone.id) {
      navigate(`/phones/${phone.id}`);
    }
  };
  
  const handleAddToCompare = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from triggering
    if (onAddToCompare) {
      onAddToCompare(phone);
    }
  };

  // Determine if this is a top result card (larger, more detailed) or a regular result
  return isTopResult ? (
    // Top result card - larger with more details
    <div
      className={`rounded-2xl shadow-lg p-6 flex flex-col md:flex-row items-center gap-6 mx-auto w-full max-w-md 
        ${darkMode ? "bg-gray-900 border-gray-700" : "bg-[#fff7f0] border-[#eae4da]"} border
        cursor-pointer hover:shadow-xl transition-shadow duration-300`}
      onClick={handleViewDetails}
    >
      <div className="relative">
        <img
          src={phone.img_url || "/phone.png"}
          alt={phone.name}
          className={`w-28 h-36 object-contain rounded-xl ${
            darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-[#eae4da]"
          } border transition-transform duration-300 hover:scale-105`}
        />
        <div className="absolute -top-2 -left-2 px-2 py-0.5 rounded-full bg-[#377D5B] text-white text-xs font-medium">
          {phone.brand}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col gap-2">
        <div className="text-lg font-bold text-[#377D5B]">
          {phone.name}
        </div>
        
        <div className={`text-xl font-extrabold ${darkMode ? "text-white" : "text-brand"}`}>
          ৳ {phone.price}
        </div>
        
        <div className={`grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2 ${darkMode ? "text-gray-300" : "text-gray-900"}`}>
          <div>
            <span className="font-semibold">Display:</span>{" "}
            {phone.display_type || "N/A"}
          </div>
          <div>
            <span className="font-semibold">Screen:</span>{" "}
            {phone.screen_size_inches ? `${phone.screen_size_inches}"` : "N/A"}
          </div>
          <div>
            <span className="font-semibold">Processor:</span>{" "}
            {phone.chipset || phone.cpu || "N/A"}
          </div>
          <div>
            <span className="font-semibold">RAM:</span>{" "}
            {phone.ram || "N/A"}
          </div>
          <div>
            <span className="font-semibold">Storage:</span>{" "}
            {phone.internal_storage || "N/A"}
          </div>
          <div>
            <span className="font-semibold">Camera:</span>{" "}
            {phone.main_camera || "N/A"} / {phone.front_camera || "N/A"}
          </div>
          <div>
            <span className="font-semibold">Battery:</span>{" "}
            {phone.battery_capacity_numeric ? `${phone.battery_capacity_numeric} mAh` : phone.capacity || "N/A"}
          </div>
          {phone.overall_device_score && (
            <div>
              <span className="font-semibold">Score:</span>{" "}
              {phone.overall_device_score.toFixed(1)}
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center mt-3">
          <button
            className="bg-[#377D5B] hover:bg-[#377D5B]/90 text-white font-medium rounded-full px-4 py-1.5 text-sm transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetails();
            }}
          >
            View Details
          </button>
          
          {onAddToCompare && (
            <button
              className={`flex items-center gap-1 ${
                darkMode 
                  ? "bg-gray-800 hover:bg-gray-700 text-white" 
                  : "bg-[#eae4da] hover:bg-[#d4c8b8] text-[#6b4b2b]"
              } font-medium rounded-full px-3 py-1.5 text-sm transition-colors`}
              onClick={handleAddToCompare}
            >
              <Plus size={16} />
              Compare
            </button>
          )}
        </div>
      </div>
    </div>
  ) : (
    // Regular result card - smaller and more compact
    <div
      className={`rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-300 ${
        darkMode ? "bg-gray-900 border-gray-700" : "bg-white border-[#eae4da]"
      } border`}
      onClick={handleViewDetails}
    >
      <div className="relative h-32 bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center p-2">
        <img
          src={phone.img_url || "/phone.png"}
          alt={phone.name}
          className="h-28 object-contain transition-transform duration-300 hover:scale-105"
          loading="lazy"
        />
        
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#377D5B] text-white text-xs font-medium">
          {phone.brand}
        </div>
        
        {onAddToCompare && (
          <div className="absolute top-2 right-2">
            <button
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white/90 dark:bg-gray-800/90 shadow-sm backdrop-blur-sm text-[#377D5B] dark:text-white hover:bg-[#377D5B] hover:text-white transition-colors duration-200"
              onClick={handleAddToCompare}
              aria-label="Compare"
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>
      
      <div className="p-3">
        <h3 className="font-medium text-sm text-neutral-800 dark:text-white mb-1 line-clamp-1" title={phone.name}>
          {phone.name}
        </h3>
        
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mb-2 text-xs">
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
          <div className="font-bold text-sm text-[#377D5B] dark:text-[#80EF80]">
            <span className="text-[#80EF80] dark:text-[#80EF80] font-normal text-xs mr-0.5">৳</span> {phone.price}
          </div>
          <button
            className="bg-[#377D5B] hover:bg-[#377D5B]/90 text-white rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
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
  );
};

export default ChatPhoneCard;