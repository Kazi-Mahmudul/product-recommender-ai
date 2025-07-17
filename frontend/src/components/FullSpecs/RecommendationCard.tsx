import { forwardRef } from 'react';
import { Phone } from '../../api/phones';

// Define the props interface for the RecommendationCard component
interface RecommendationCardProps {
  phone: Phone;
  highlights: string[];
  badges: string[];
  similarityScore: number;
  onClick: (id: number) => void;
  onMouseEnter: (id: number) => void;
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
    onClick(phone.id);
  };

  // Handle mouse enter event for prefetching
  const handleMouseEnter = () => {
    onMouseEnter(phone.id);
  };
  
  // Create accessible description for screen readers
  const getAccessibleDescription = () => {
    const specs = [];
    if (phone.primary_camera_mp) specs.push(`${phone.primary_camera_mp} megapixel camera`);
    if (phone.battery_capacity_numeric) specs.push(`${phone.battery_capacity_numeric} mAh battery`);
    if (phone.ram_gb) specs.push(`${phone.ram_gb} gigabytes of RAM`);
    if (phone.storage_gb) specs.push(`${phone.storage_gb} gigabytes of storage`);
    if (phone.screen_size_inches) specs.push(`${phone.screen_size_inches} inch screen`);
    
    return `${phone.brand} ${phone.name}. Price: ${phone.price}. ${specs.join(', ')}. ${highlights.join(', ')}`;
  };

  return (
    <div
      ref={ref}
      className="
        min-w-[180px] max-w-[220px] flex-shrink-0
        md:min-w-0 md:w-full
        bg-white dark:bg-gray-800 rounded-xl p-3
        flex flex-col items-center shadow-sm hover:shadow-md
        transition-all duration-300 cursor-pointer
        transform hover:scale-[1.02] hover:bg-brand/5
        border border-gray-100 dark:border-gray-700
        focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 dark:focus:ring-offset-gray-900
      "
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${phone.brand} ${phone.name}`}
      aria-describedby={`card-desc-${phone.id}`}
      data-testid={`recommendation-card-${phone.id}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); // Prevent page scroll on space
          handleClick();
        }
      }}
      style={{ order: index }} // For keyboard navigation order
    >
      {/* Phone image with badges overlay */}
      <div className="relative w-full flex justify-center mb-2">
        <div className="relative">
          <img
            src={phone.img_url || "/phone.png"}
            alt={phone.name}
            className="w-24 h-32 object-contain rounded bg-white p-2 border border-gray-100"
            loading="lazy"
          />
          
          {/* Badges */}
          {badges.length > 0 && (
            <div className="absolute top-0 right-0 flex flex-col items-end">
              {badges.map((badge, idx) => (
                <span
                  key={idx}
                  className="inline-block bg-brand text-white text-xs px-2 py-0.5 rounded-full mb-1 shadow-sm transform -translate-x-1 translate-y-1"
                >
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Phone name with brand accent */}
      <div className="w-full text-center">
        <div className="text-xs text-brand font-medium mb-0.5">
          {phone.brand}
        </div>
        <h3 className="font-bold text-sm text-gray-800 dark:text-white line-clamp-2 h-10">
          {phone.name}
        </h3>
      </div>

      {/* Phone price with styling */}
      <div className="text-sm font-semibold text-brand my-1">
        {phone.price}
      </div>

      {/* Key specs tags with icons */}
      <div className="flex flex-wrap justify-center gap-1 mb-2 w-full">
        {phone.primary_camera_mp && (
          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded flex items-center gap-1">
            <span role="img" aria-label="camera">📸</span> {phone.primary_camera_mp}MP
          </span>
        )}
        {phone.battery_capacity_numeric && (
          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded flex items-center gap-1">
            <span role="img" aria-label="battery">🔋</span> {phone.battery_capacity_numeric}mAh
          </span>
        )}
        {phone.ram_gb && (
          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded flex items-center gap-1">
            <span role="img" aria-label="memory">💾</span> {phone.ram_gb}GB
          </span>
        )}
        {phone.storage_gb && (
          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded flex items-center gap-1">
            <span role="img" aria-label="storage">💽</span> {phone.storage_gb}GB
          </span>
        )}
        {phone.screen_size_inches && (
          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded flex items-center gap-1">
            <span role="img" aria-label="display">📱</span> {phone.screen_size_inches}"
          </span>
        )}
      </div>

      {/* Highlights with modern styling */}
      {highlights.length > 0 && (
        <div className="w-full mt-1 space-y-1.5">
          {highlights.map((highlight, idx) => (
            <div
              key={idx}
              className="text-xs bg-brand/10 dark:bg-brand/20 rounded-lg px-2.5 py-1.5 text-center font-medium text-brand dark:text-brand-light"
            >
              {highlight}
            </div>
          ))}
        </div>
      )}
      
      {/* Hidden description for screen readers */}
      <span 
        id={`card-desc-${phone.id}`} 
        className="sr-only"
      >
        {getAccessibleDescription()}
      </span>
    </div>
  );
});

export default RecommendationCard;