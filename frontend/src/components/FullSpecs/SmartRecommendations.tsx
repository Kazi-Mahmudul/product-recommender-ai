import React, { useEffect, useState, useRef, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import useRecommendations from "../../hooks/useRecommendations";
import usePrefetch from "../../hooks/usePrefetch";
import { useIntersectionObserverOnce } from "../../hooks/useIntersectionObserver";
import RecommendationCard from "./RecommendationCard";
import RecommendationCardSkeleton from "./RecommendationCardSkeleton";
import RecommendationFallback from "./RecommendationFallback";
import ErrorBoundary from "../ErrorBoundary";

// Define the props interface for the SmartRecommendations component
interface SmartRecommendationsProps {
  phoneId: number | string;
  className?: string;
}

/**
 * SmartRecommendations component displays intelligent phone recommendations
 * with comprehensive error handling and fallbacks
 *
 * Accessibility features:
 * - Keyboard navigation between recommendation cards
 * - ARIA labels and roles for screen readers
 * - Focus management for interactive elements
 * - WCAG AA color contrast compliance
 */
const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({
  phoneId,
  className = "",
}) => {
  // Convert phoneId to number if it's a string
  const numericPhoneId = typeof phoneId === 'string' ? parseInt(phoneId, 10) : phoneId;

  // Use the recommendations hook to manage data fetching and state
  const {
    recommendations,
    loading,
    error,
    isNetworkError,
    isRetrying,
    retryCount,
    refetch,
    retry,
    resetError,
  } = useRecommendations(numericPhoneId);

  // Use the prefetch hook to prefetch phone details on hover
  const { prefetchPhone } = usePrefetch();

  // Use navigate for handling card clicks
  const navigate = useNavigate();

  // Track if we've attempted to load recommendations
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  // Track the currently focused card index for keyboard navigation
  const [focusedCardIndex, setFocusedCardIndex] = useState(-1);

  // Reference to the container for keyboard navigation
  const containerRef = useRef<HTMLDivElement>(null);

  // References to individual card elements for focus management
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Use the intersection observer hook to detect when recommendations come into view
  const { ref: recommendationsRef, isIntersecting } =
    useIntersectionObserverOnce<HTMLDivElement>({
      threshold: 0.1, // Trigger when at least 10% of the element is visible
      rootMargin: "200px", // Start loading a bit before the element comes into view
    });

  // Fetch recommendations when they come into view
  useEffect(() => {
    if (isIntersecting && !loading && !hasAttemptedLoad) {
      refetch();
      setHasAttemptedLoad(true);
    }
  }, [isIntersecting, loading, hasAttemptedLoad, refetch]);

  // Reset card refs when recommendations change
  useEffect(() => {
    if (recommendations.length > 0) {
      cardRefs.current = cardRefs.current.slice(0, recommendations.length);
    }
  }, [recommendations]);

  // Handle retry when there's an error
  const handleRetry = () => {
    retry(); // Use the enhanced retry function with reset
  };

  // Handle card click to navigate to phone details
  const handleCardClick = (id: number) => {
    // Skip navigation for invalid IDs
    if (!id) return;
    navigate(`/phones/${id}`);
  };

  // Handle card hover to prefetch phone details
  const handleCardHover = (id: number) => {
    // Skip prefetching for invalid IDs
    if (!id) return;
    prefetchPhone(id);
  };

  // Handle keyboard navigation between cards
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!recommendations.length) return;

    // Only handle arrow keys
    if (
      ![
        "ArrowRight",
        "ArrowLeft",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ].includes(e.key)
    )
      return;

    e.preventDefault(); // Prevent page scrolling

    let newIndex = focusedCardIndex;
    const lastIndex = recommendations.length - 1;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        newIndex = focusedCardIndex < lastIndex ? focusedCardIndex + 1 : 0;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        newIndex = focusedCardIndex > 0 ? focusedCardIndex - 1 : lastIndex;
        break;
      case "Home":
        newIndex = 0;
        break;
      case "End":
        newIndex = lastIndex;
        break;
    }

    // Update focused index and focus the card
    setFocusedCardIndex(newIndex);
    cardRefs.current[newIndex]?.focus();
  };

  // Check if error message indicates invalid phone ID
  const isInvalidPhoneId = error && typeof error === "string" && error.includes("Invalid phone ID");

  // Render the error boundary fallback UI
  const renderErrorBoundaryFallback = (
    error: Error,
    resetErrorBoundary: () => void
  ) => {
    return (
      <div
        className={`rounded-2xl shadow p-4 border bg-white border-brand dark:bg-gray-900 dark:border-gray-700 ${className}`}
        role="region"
        aria-label="Smart Recommendations Error"
      >
        <div className="font-semibold mb-2 flex justify-between items-center text-brand">
          Smart Recommendations
        </div>
        <RecommendationFallback
          error={error}
          resetError={() => {
            resetErrorBoundary();
            resetError();
          }}
          retry={handleRetry}
          isInvalidPhoneId={isInvalidPhoneId}
        />
      </div>
    );
  };

  // Filter out recommendations with invalid phone IDs or null phones
  const validRecommendations = recommendations.filter(
    (rec) => rec && rec.phone && rec.phone.id && rec.phone.id > 0
  );

  return (
    <ErrorBoundary fallback={renderErrorBoundaryFallback}>
      <div
        ref={recommendationsRef}
        className={`rounded-2xl shadow-md p-6 border bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700 ${className}`}
        role="region"
        aria-labelledby="recommendations-heading"
      >
        <div className="mb-4 flex justify-between items-center">
          <h2
            id="recommendations-heading"
            className="text-lg font-bold text-gray-800 dark:text-white m-0"
          >
            Alternatives Worth Checking
          </h2>
          <div className="flex items-center">
            {isRetrying && (
              <span className="text-xs text-gray-500 mr-2" aria-live="polite">
                Retrying {retryCount}/3...
              </span>
            )}
            <button
              onClick={handleRetry}
              className="ml-2 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 rounded-full text-xs font-medium transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              disabled={loading || isRetrying}
              aria-label="Refresh recommendations"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Loading state with skeleton cards */}
        {loading && (
          <div className="flex flex-nowrap md:flex-wrap gap-4 overflow-x-auto md:overflow-x-visible pb-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="
                  md:min-w-0 md:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1rem)] xl:w-[calc(25%-1rem)]
                "
              >
                <RecommendationCardSkeleton />
              </div>
            ))}
          </div>
        )}

        {/* Error state with network detection and invalid phone ID detection */}
        {error && !loading && (
          <RecommendationFallback
            error={error}
            retry={handleRetry}
            isNetworkError={isNetworkError}
            isInvalidPhoneId={isInvalidPhoneId}
          />
        )}

        {/* Empty state with graceful degradation */}
        {!loading &&
          !error &&
          hasAttemptedLoad &&
          validRecommendations.length === 0 && (
            <RecommendationFallback
              error={null}
              retry={handleRetry}
              noRecommendations={true}
            />
          )}

        {/* Recommendations display - Responsive Layout */}
        {!loading && !error && validRecommendations.length > 0 && (
          <div
            ref={containerRef}
            className="flex flex-nowrap md:flex-wrap gap-4 overflow-x-auto md:overflow-x-visible pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent"
            role="region"
            aria-label="Phone recommendations"
            onKeyDown={handleKeyDown}
            tabIndex={-1}
          >
            {validRecommendations.map((recommendation, index) => (
              <div
                key={`recommendation-${recommendation?.phone?.id || index}-${index}`}
                className="
                  min-w-[200px] flex-shrink-0
                  md:min-w-0 md:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)] xl:w-[calc(25%-0.75rem)]
                "
              >
                <RecommendationCard
                  ref={(el) => (cardRefs.current[index] = el)}
                  phone={recommendation?.phone || {
                    id: 0,
                    brand: "Unknown",
                    name: "Unknown Phone",
                    model: "Unknown Model",
                    price: "",
                    url: ""
                  }}
                  highlights={recommendation?.highlights || []}
                  badges={recommendation?.badges || []}
                  similarityScore={recommendation?.similarityScore || 0}
                  onClick={handleCardClick}
                  onMouseEnter={handleCardHover}
                  index={index}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default SmartRecommendations;