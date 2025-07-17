import React from 'react';

/**
 * RecommendationCardSkeleton component displays a loading placeholder
 * for recommendation cards with a pulsing animation effect.
 * 
 * Accessibility features:
 * - ARIA attributes to communicate loading state
 * - Hidden text for screen readers
 * - Proper role assignment
 */
const RecommendationCardSkeleton: React.FC = () => {
  return (
    <div
      data-testid="recommendation-skeleton"
      className="
        min-w-[180px] max-w-[220px] flex-shrink-0
        md:min-w-0 md:w-full
        bg-white dark:bg-gray-800 rounded-xl p-3
        flex flex-col items-center shadow-sm
        border border-gray-100 dark:border-gray-700
        animate-pulse
      "
      role="status"
      aria-busy="true"
      aria-label="Loading recommendation"
    >
      {/* Phone image skeleton */}
      <div className="relative w-full flex justify-center mb-2">
        <div className="w-24 h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>

      {/* Phone brand skeleton */}
      <div className="w-full">
        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2 mx-auto"></div>
      </div>

      {/* Phone name skeleton */}
      <div className="w-full">
        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
      </div>

      {/* Phone price skeleton */}
      <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded my-2"></div>

      {/* Key specs tags skeleton */}
      <div className="flex flex-wrap justify-center gap-1 mb-2 w-full">
        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>

      {/* Highlights skeleton */}
      <div className="w-full mt-1 space-y-1.5">
        <div className="h-6 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-6 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    </div>
  );
};

export default RecommendationCardSkeleton;