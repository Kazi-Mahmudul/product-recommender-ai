import React, { useState } from "react";
import { Phone } from "../api/phones";

interface PhoneCardProps {
  phone: Phone;
  onFullSpecs: () => void;
  onCompare: () => void;
}

const PhoneCard: React.FC<PhoneCardProps> = ({ phone, onFullSpecs, onCompare }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="rounded-2xl shadow-lg bg-white dark:bg-gray-900 p-4 flex flex-col items-center transition hover:shadow-xl">
      <div className="w-full flex justify-between items-center mb-2 relative">
        <span className="bg-brand/10 text-brand text-xs font-semibold px-2 py-1 rounded-full">
          {phone.brand}
        </span>
        {/* Compare button with tooltip */}
        <div className="relative flex items-center">
          <button
            className="ml-1 md:ml-2 text-brand hover:text-white bg-brand/10 hover:bg-brand rounded-full p-1 focus:outline-none border border-brand transition"
            onClick={onCompare}
            aria-label="Compare"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
          >
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm-5 6a1 1 0 100 2h10a1 1 0 100-2H5z" />
            </svg>
          </button>
          {showTooltip && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-gray-900 text-white text-xs font-medium shadow-lg z-20 whitespace-nowrap">
              Compare
            </div>
          )}
        </div>
      </div>
      <img
        src={phone.img_url || "/phone.png"}
        alt={phone.name}
        className="w-32 h-32 object-contain mb-3 rounded-lg bg-gray-100 dark:bg-gray-800"
        loading="lazy"
      />
      <div className="text-center flex-1 flex flex-col justify-between w-full">
        <h3 className="font-semibold text-base md:text-lg text-gray-900 dark:text-white mb-1 break-words whitespace-normal" title={phone.name}>
          {phone.name}
        </h3>
        <div className="flex flex-col items-center justify-between gap-2 mb-2 w-full">
          <div className="font-bold text-xs sm:text-base md:text-base lg:text-base text-black dark:text-white break-words max-w-[120px] md:max-w-[140px] lg:max-w-[160px] xl:max-w-[180px]">
            {phone.price}
          </div>
          <button
            className="bg-brand/10 text-brand border border-brand rounded-full px-3 py-1 text-xs font-semibold transition hover:bg-brand hover:text-white ml-2 whitespace-nowrap"
            style={{ minWidth: 0 }}
            onClick={onFullSpecs}
          >
            Full Specs
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhoneCard; 