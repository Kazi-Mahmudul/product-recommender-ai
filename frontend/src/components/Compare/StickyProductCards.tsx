import React from 'react';
import { Phone } from '../../api/phones';
import { selectPrimaryBadge } from '../../utils/badgeSelector';

interface StickyProductCardsProps {
  phones: Phone[];
  verdictBadges?: Record<number, string>;
  onRemovePhone: (phoneSlug: string) => void;
  onChangePhone: (phoneSlug: string) => void;
  onAddPhone: () => void;
  maxPhones: number;
}

const StickyProductCards: React.FC<StickyProductCardsProps> = ({
  phones,
  verdictBadges = {},
  onRemovePhone,
  onChangePhone,
  onAddPhone,
  maxPhones
}) => {
  return (
    <div className="sticky top-16 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 overflow-x-auto scrollbar-hide touch-pan-x pb-2">
          {/* Phone Cards */}
          {phones.map((phone, index) => {
            const primaryBadge = selectPrimaryBadge({
              phone,
              badges: verdictBadges[phone.id] ? [verdictBadges[phone.id]] : []
            });

            return (
              <div
                key={phone.slug}
                className="flex-shrink-0 bg-gray-50 dark:bg-gray-800 rounded-lg p-2 sm:p-3 md:p-4 min-w-[220px] sm:min-w-[260px] md:min-w-[280px] border border-gray-200 dark:border-gray-700 touch-manipulation"
              >
                {/* Phone Image and Badge */}
                <div className="relative mb-2 sm:mb-3">
                  <div className="flex justify-center">
                    <img
                      src={phone.img_url || "/no-image-placeholder.svg"}
                      alt={phone.name}
                      className="w-16 h-20 sm:w-18 sm:h-22 md:w-20 md:h-24 object-contain rounded-md bg-white p-1"
                      onError={(e) => {
                        e.currentTarget.src = "/no-image-placeholder.svg";
                      }}
                    />
                  </div>
                  
                  {/* Verdict Badge */}
                  {primaryBadge && (
                    <div className="absolute -top-1 sm:-top-2 left-1/2 transform -translate-x-1/2">
                      <span
                        className={`
                          inline-block text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full shadow-sm font-medium
                          ${primaryBadge.type === 'value' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 
                            primaryBadge.type === 'feature' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                            'bg-amber-100 text-amber-800 border border-amber-200'}
                          dark:${primaryBadge.type === 'value' ? 'bg-blue-900/30 text-blue-300 border-blue-800/50' : 
                            primaryBadge.type === 'feature' ? 'bg-emerald-900/30 text-emerald-300 border-emerald-800/50' : 
                            'bg-amber-900/30 text-amber-300 border-amber-800/50'}
                        `}
                      >
                        {primaryBadge.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Phone Info */}
                <div className="text-center mb-2 sm:mb-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                    {phone.brand}
                  </div>
                  <h3 className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-2 h-6 sm:h-8 leading-tight">
                    {phone.name}
                  </h3>
                  <div className="text-xs sm:text-sm font-bold text-[#2d5016] dark:text-[#4ade80] mt-1">
                    Tk. {phone.price}
                  </div>
                </div>

                {/* Key Specs */}
                <div className="grid grid-cols-2 gap-0.5 sm:gap-1 mb-2 sm:mb-3 text-xs">
                  {phone.ram_gb && (
                    <div className="flex items-center text-gray-600 dark:text-gray-300">
                      <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                      <span className="truncate">{phone.ram_gb}GB</span>
                    </div>
                  )}
                  {phone.storage_gb && (
                    <div className="flex items-center text-gray-600 dark:text-gray-300">
                      <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      <span className="truncate">{phone.storage_gb}GB</span>
                    </div>
                  )}
                  {phone.main_camera && (
                    <div className="flex items-center text-gray-600 dark:text-gray-300">
                      <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate">{phone.main_camera}</span>
                    </div>
                  )}
                  {phone.battery_capacity_numeric && (
                    <div className="flex items-center text-gray-600 dark:text-gray-300">
                      <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="truncate">{phone.battery_capacity_numeric}mAh</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-1.5 sm:gap-2">
                  <button
                    onClick={() => phone.slug && onChangePhone(phone.slug)}
                    className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 min-h-[32px] sm:min-h-[36px] touch-manipulation"
                  >
                    Change
                  </button>
                  <button
                    onClick={() => phone.slug && onRemovePhone(phone.slug)}
                    className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors duration-200 min-h-[32px] sm:min-h-[36px] touch-manipulation"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add Phone Card */}
          {phones.length < maxPhones && (
            <div className="flex-shrink-0 min-w-[220px] sm:min-w-[260px] md:min-w-[280px]">
              <button
                onClick={onAddPhone}
                className="w-full h-full min-h-[160px] sm:min-h-[180px] md:min-h-[200px] bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-[#2d5016] dark:hover:border-[#4ade80] hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 flex flex-col items-center justify-center p-3 sm:p-4 touch-manipulation"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand dark:bg-[#4ade80] rounded-full flex items-center justify-center mb-2 sm:mb-3">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white dark:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Add Phone
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center px-2">
                  Compare up to {maxPhones} phones
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StickyProductCards;