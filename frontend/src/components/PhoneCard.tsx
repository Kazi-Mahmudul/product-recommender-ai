import React, { useState } from "react";
import { Phone } from '../api/phones';
import { Plus, Check } from "lucide-react";
import { useComparison } from "../context/ComparisonContext";
import { generatePhoneDetailUrl } from "../utils/slugUtils";

interface PhoneCardProps {
  phone: Phone;
  onFullSpecs: (slug: string) => void;
  // onCompare removed - handled internally via context
}

const PhoneCard: React.FC<PhoneCardProps> = ({ phone, onFullSpecs }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Use comparison context
  const { addPhone, removePhone, isPhoneSelected } = useComparison();
  
  // Check if this phone is selected for comparison
  const isSelected = isPhoneSelected(phone.slug!);
  
  // Handle compare button click
  const handleCompareClick = (e: React.MouseEvent) => {
    // Prevent card click when clicking compare button
    e.stopPropagation();
    if (isSelected) {
      removePhone(phone.slug!);
    } else {
      addPhone(phone);
    }
  };

  return (
    // Make entire card clickable on mobile, but keep normal behavior on larger screens
    <div 
      className="rounded-2xl md:rounded-3xl bg-white dark:bg-card overflow-hidden transition-all duration-300 hover:shadow-soft-lg group cursor-pointer md:cursor-default"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        // Only trigger on mobile devices (when details button is hidden)
        const isMobile = window.innerWidth < 768;
        if (isMobile && phone.slug) {
          onFullSpecs(phone.slug);
        }
      }}
    >
      {/* Card Header with Brand Badge */}
      <div className="relative">
        {/* Image Container with Gradient Background */}
        <div className="relative h-32 md:h-48 bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center p-2 md:p-4">
          <img
            src={phone.img_url || "/no-image-placeholder.svg"}
            alt={phone.name}
            className="h-24 md:h-40 object-contain transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = "/no-image-placeholder.svg";
            }}
            loading="lazy"
          />
          
          {/* Brand Badge */}
          <div className="absolute top-2 md:top-4 left-2 md:left-4 px-2 py-1 md:px-3 md:py-1.5 rounded-full bg-white/90 dark:bg-card/90 shadow-sm backdrop-blur-sm text-[10px] md:text-xs font-medium text-brand dark:text-white">
            {phone.brand}
          </div>
          
          {/* Compare Button */}
          <div className="absolute top-2 md:top-4 right-2 md:right-4">
            <button
              className={`w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-colors duration-200 ${
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
              {isSelected ? <Check size={14} /> : <Plus size={14} />}
            </button>
            {showTooltip && (
              <div className="absolute -bottom-8 md:-bottom-10 right-0 px-2 py-1 md:px-2.5 md:py-1.5 rounded-lg bg-white dark:bg-neutral-800 text-brand dark:text-white text-[10px] md:text-xs font-medium shadow-soft z-20 whitespace-nowrap transition-opacity duration-200">
                {isSelected ? "Remove from comparison" : "Add to comparison"}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Card Content */}
      <div className="p-3 md:p-5">
        {/* Phone Name */}
        <h3 className="font-medium text-xs md:text-base text-neutral-800 dark:text-white mb-1 md:mb-1.5 line-clamp-2 h-8 md:h-12" title={phone.name}>
          {phone.name}
        </h3>
        
        {/* Key Specs - Hidden on mobile, visible on md and larger */}
        <div className="hidden md:grid grid-cols-2 gap-x-2 md:gap-x-4 gap-y-1 mb-2 md:mb-4">
          {[
            { label: "Main Camera", value: phone.main_camera || "N/A"},
            { label: "Front Camera", value: phone.front_camera || "N/A"},
            { label: "RAM", value: phone.ram || "N/A" },
            { label: "Storage", value: phone.internal_storage || "N/A" },
            { label: "Display", value: phone.screen_size_numeric ? `${phone.screen_size_numeric}"` : "N/A" },
            { label: "Battery", value: phone.capacity || "N/A" }
          ].map((spec, idx) => (
            <div key={idx} className="text-[10px] md:text-xs">
              <span className="text-neutral-500 dark:text-neutral-400">{spec.label}: </span>
              <span className="text-neutral-800 dark:text-neutral-200 font-medium">{spec.value}</span>
            </div>
          ))}
        </div>
        
        {/* Price and Action */}
        <div className="flex items-center justify-between">
          <div className="font-bold text-xs md:text-lg text-brand dark:text-white">
            <span className="text-brand dark:text-brand-darkGreen font-normal text-sm md:text-base mr-1">৳</span> {phone.price}
          </div>
          {/* Details button hidden on mobile, visible on md and larger */}
          <button
            className="hidden md:block bg-brand/10 hover:bg-brand/20 text-brand dark:text-brand dark:hover:text-hover-light rounded-full px-3 py-1 md:px-4 md:py-1.5 text-[10px] md:text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md"
            onClick={() => phone.slug && onFullSpecs(phone.slug)}
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhoneCard; 