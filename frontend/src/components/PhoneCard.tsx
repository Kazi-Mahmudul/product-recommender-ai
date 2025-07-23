import React, { useState } from "react";
import { Phone } from "../api/phones";
import { Plus } from "lucide-react";

interface PhoneCardProps {
  phone: Phone;
  onFullSpecs: () => void;
  onCompare: () => void;
}

const PhoneCard: React.FC<PhoneCardProps> = ({ phone, onFullSpecs, onCompare }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="rounded-3xl bg-white dark:bg-card overflow-hidden transition-all duration-300 hover:shadow-soft-lg group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Header with Brand Badge */}
      <div className="relative">
        {/* Image Container with Gradient Background */}
        <div className="relative h-48 bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center p-4">
          <img
            src={phone.img_url || "/phone.png"}
            alt={phone.name}
            className="h-40 object-contain transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          
          {/* Brand Badge */}
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-white/90 dark:bg-card/90 shadow-sm backdrop-blur-sm text-xs font-medium text-brand dark:text-white">
            {phone.brand}
          </div>
          
          {/* Compare Button */}
          <div className="absolute top-4 right-4">
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/90 dark:bg-card/90 shadow-sm backdrop-blur-sm text-brand dark:text-white hover:bg-brand hover:text-white transition-colors duration-200"
              onClick={onCompare}
              aria-label="Compare"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onFocus={() => setShowTooltip(true)}
              onBlur={() => setShowTooltip(false)}
            >
              <Plus size={16} />
            </button>
            {showTooltip && (
              <div className="absolute -bottom-10 right-0 px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 text-brand dark:text-white text-xs font-medium shadow-soft z-20 whitespace-nowrap transition-opacity duration-200">
                Compare
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Card Content */}
      <div className="p-5">
        {/* Phone Name */}
        <h3 className="font-medium text-base text-neutral-800 dark:text-white mb-1.5 line-clamp-2 h-12" title={phone.name}>
          {phone.name}
        </h3>
        
        {/* Key Specs */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-4">
          {[
            { label: "RAM", value: phone.ram || "N/A" },
            { label: "Storage", value: phone.internal_storage || "N/A" },
            { label: "Display", value: phone.screen_size_inches ? `${phone.screen_size_inches}"` : "N/A" },
            { label: "Battery", value: phone.capacity || "N/A" }
          ].map((spec, idx) => (
            <div key={idx} className="text-xs">
              <span className="text-neutral-500 dark:text-neutral-400">{spec.label}: </span>
              <span className="text-neutral-800 dark:text-neutral-200 font-medium">{spec.value}</span>
            </div>
          ))}
        </div>
        
        {/* Price and Action */}
        <div className="flex items-center justify-between">
          <div className="font-bold text-lg text-brand dark:text-white">
            <span className="text-brand-darkGreen dark:text-brand-darkGreen font-normal text-xs mr-1">৳</span> {phone.price}
          </div>
          <button
            className="bg-brand hover:bg-brand-darkGreen hover:text-hover-light text-white rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200 shadow-sm"
            onClick={onFullSpecs}
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhoneCard; 