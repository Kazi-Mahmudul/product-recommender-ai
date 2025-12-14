import { forwardRef } from 'react';
import { Phone } from '../../api/phones';
import { selectPrimaryBadge, Badge } from '../../utils/badgeSelector';

// Define the props interface for the RecommendationCard component
interface RecommendationCardProps {
  phone: Phone;
  highlights: string[];
  badges: string[];
  similarityScore: number;
  onClick: (phone: Phone) => void;
  onMouseEnter: (slug: string) => void;
  index?: number; // For keyboard navigation order
}

/**
 * RecommendationCard component displays a single phone recommendation with
 * modern design, badges, highlights, and key specifications.
 * 
 * Accessibility features:
 * - Keyboard navigation with Enter and Space keys
 * - ARIA roles and labels for screen readers
 * - Focus visible indicators
 * - Semantic HTML structure
 */
const RecommendationCard = forwardRef<HTMLDivElement, RecommendationCardProps>((props, ref) => {
  const {
    phone,
    highlights,
    badges,
    onClick,
    onMouseEnter,
    index = 0
  } = props;

  // Handle click event
  const handleClick = () => {
    onClick(phone);
  };

  // Handle mouse enter event for prefetching
  const handleMouseEnter = () => {
    onMouseEnter(phone?.slug || "");
  };
  
  // Select the primary badge using our badge selector utility
  const primaryBadge = selectPrimaryBadge({
    phone,
    badges
  });
  
  // Ensure phone object has all required properties with fallbacks
  const safePhone = {
    id: phone?.id || 0,
    slug: phone?.slug || "",
    brand: phone?.brand || "Unknown",
    name: phone?.name || "Unknown Phone",
    model: phone?.model || "Unknown Model",
    price: phone?.price || "",
    price_original: phone?.price_original || 0,
    img_url: phone?.img_url || "/no-image-placeholder.svg",
    primary_camera_mp: phone?.primary_camera_mp,
    main_camera: phone?.main_camera,
    front_camera: phone?.front_camera,
    battery_capacity_numeric: phone?.battery_capacity_numeric,
    ram_gb: phone?.ram_gb,
    storage_gb: phone?.storage_gb,
    screen_size_inches: phone?.screen_size_inches,
  };
  
  // Create accessible description for screen readers
  const getAccessibleDescription = () => {
    const specs = [];
    if (safePhone.main_camera) specs.push(`Main camera: ${safePhone.main_camera}`);
    else if (safePhone.primary_camera_mp) specs.push(`${safePhone.primary_camera_mp} megapixel camera`);
    
    if (safePhone.front_camera) specs.push(`Front camera: ${safePhone.front_camera}`);
    if (safePhone.battery_capacity_numeric) specs.push(`${safePhone.battery_capacity_numeric} mAh battery`);
    if (safePhone.ram_gb) specs.push(`${safePhone.ram_gb} gigabytes of RAM`);
    if (safePhone.storage_gb) specs.push(`${safePhone.storage_gb} gigabytes of storage`);
    if (safePhone.screen_size_inches) specs.push(`${safePhone.screen_size_inches} inch screen`);
    
    return `${safePhone.brand} ${safePhone.name}. Price: BDT ${safePhone.price}. ${specs.join(', ')}. ${highlights.join(', ')}`;
  };

  return (
    <div
      ref={ref}
      className="
        min-w-[150px] max-w-[180px] flex-shrink-0
        md:min-w-0 md:w-full
        bg-white dark:bg-gray-800 rounded-lg md:rounded-xl p-2 md:p-3
        flex flex-col items-center shadow-sm hover:shadow-md
        transition-all duration-300 cursor-pointer
        transform hover:scale-[1.02] hover:bg-gray-50 dark:hover:bg-gray-750
        border border-gray-100 dark:border-gray-700
        focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 dark:focus:ring-offset-gray-900
      "
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${safePhone.brand} ${safePhone.name}`}
      aria-describedby={`card-desc-${safePhone.slug}`} 
      data-testid={`recommendation-card-${safePhone.slug}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); // Prevent page scroll on space
          handleClick();
        }
      }}
      style={{ order: index }} // For keyboard navigation order
    >
      {/* Phone image with single badge overlay */}
      <div className="relative w-full flex justify-center mb-1 md:mb-2">
        <div className="relative">
          <img
            src={safePhone.img_url}
            alt={safePhone.name}
            className="w-20 h-24 md:w-24 md:h-32 object-contain rounded-md md:rounded-lg bg-white p-1.5 md:p-2 border border-gray-100 dark:border-gray-700"
            loading="lazy"
            onError={(e) => {
              // Use local SVG placeholder to avoid external service dependency
              e.currentTarget.src = "/no-image-placeholder.svg";
            }}
          />
          
          {/* Single Primary Badge */}
          {primaryBadge && (
            <div className="absolute top-0 left-0 right-0 flex justify-center">
              <span
                className={`
                  inline-block text-[10px] md:text-xs px-2 py-0.5 md:px-3 md:py-1 rounded-full shadow-sm font-medium transform -translate-y-1 md:-translate-y-2
                  ${primaryBadge.type === 'value' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 
                    primaryBadge.type === 'feature' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                    'bg-amber-50 text-amber-700 border border-amber-100'}
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
      </div>

      {/* Phone name with brand accent */}
      <div className="w-full text-center">
        <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">
          {safePhone.brand}
        </div>
        <h3 className="font-bold text-xs md:text-sm text-gray-800 dark:text-white line-clamp-2 h-8 md:h-10">
          {safePhone.name}
        </h3>
      </div>

      {/* Phone price with styling */}
      <div className="text-xs md:text-sm font-semibold text-gray-900 dark:text-gray-100 my-1">
        Tk. {safePhone.price}
      </div>

      {/* Key specs tags with icons - cleaner design */}
      <div className="grid grid-cols-2 gap-1 md:gap-2 mb-2 md:mb-3 w-full">
        {safePhone.main_camera ? (
          <div className="flex items-center justify-center text-[10px] md:text-xs text-gray-700 dark:text-gray-300">
            <svg className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {safePhone.main_camera}
          </div>
        ) : safePhone.primary_camera_mp && (
          <div className="flex items-center justify-center text-[10px] md:text-xs text-gray-700 dark:text-gray-300">
            <svg className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {safePhone.primary_camera_mp}MP
          </div>
        )}
        {safePhone.front_camera ? (
          <div className="flex items-center justify-center text-[10px] md:text-xs text-gray-700 dark:text-gray-300">
            <svg className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {safePhone.front_camera}
          </div>
        ) : safePhone.battery_capacity_numeric && (
          <div className="flex items-center justify-center text-[10px] md:text-xs text-gray-700 dark:text-gray-300">
            <svg className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {safePhone.battery_capacity_numeric}mAh
          </div>
        )}
        {safePhone.ram_gb && (
          <div className="flex items-center justify-center text-[10px] md:text-xs text-gray-700 dark:text-gray-300">
            <svg className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            {safePhone.ram_gb}GB
          </div>
        )}
        {safePhone.storage_gb && (
          <div className="flex items-center justify-center text-[10px] md:text-xs text-gray-700 dark:text-gray-300">
            <svg className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            {safePhone.storage_gb}GB
          </div>
        )}
      </div>

      {/* Single Primary Highlight with modern styling */}
      {highlights.length > 0 && (
        <div className="w-full mt-1">
          <div
            className="text-[10px] md:text-xs bg-gray-50 dark:bg-gray-700 rounded-md md:rounded-lg px-2 py-1 md:px-3 md:py-2 text-center font-medium text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-gray-600"
          >
            {highlights[0]}
          </div>
        </div>
      )}
      
      {/* Hidden description for screen readers */}
      <span 
        id={`card-desc-${safePhone.id}`} 
        className="sr-only"
      >
        {getAccessibleDescription()}
      </span>
    </div>
  );
});

export default RecommendationCard;
