import React from "react";

interface RecommendationFallbackProps {
  error: Error | string | null;
  resetError?: () => void;
  retry?: () => void;
  isNetworkError?: boolean;
  noRecommendations?: boolean;
  isInvalidPhoneSlug?: boolean | null | "";
}

/**
 * Fallback UI component for the SmartRecommendations component
 * Displays different messages based on the error type
 * 
 * Accessibility features:
 * - Semantic HTML structure with proper headings
 * - ARIA roles and labels for screen readers
 * - Accessible buttons with clear actions
 * - Descriptive error messages
 */
const RecommendationFallback: React.FC<RecommendationFallbackProps> = ({
  error,
  resetError,
  retry,
  isNetworkError = false,
  noRecommendations = false,
  isInvalidPhoneSlug = false,
}) => {
  const handleRetry = () => {
    if (resetError) resetError();
    if (retry) retry();
  };

  // Check if error message indicates invalid phone ID
  const isInvalidSlugError = isInvalidPhoneSlug || 
    (error && typeof error === "string" && error.includes("Invalid phone slug"));

  // Invalid phone ID error
  if (isInvalidSlugError) {
    return (
      <div 
        className="flex flex-col items-center justify-center py-8 px-4"
        role="alert"
        aria-labelledby="invalid-id-heading"
      >
        <div className="text-5xl mb-4" role="img" aria-label="Invalid phone ID">
          🚫
        </div>
        <h3 
          id="invalid-id-heading"
          className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Invalid Phone Reference
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
          We couldn't load recommendations because the phone reference is invalid.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          Please try viewing a different phone or contact support if this issue persists.
        </p>
      </div>
    );
  }

  // No recommendations available
  if (noRecommendations) {
    return (
      <div 
        className="flex flex-col items-center justify-center py-8 px-4"
        role="region"
        aria-labelledby="no-recommendations-heading"
      >
        <div className="text-5xl mb-4" role="img" aria-label="No recommendations">
          🔍
        </div>
        <h3 
          id="no-recommendations-heading"
          className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          No recommendations available
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
          We couldn't find any similar phones that match this device's specifications.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          Try checking back later as our phone database is regularly updated.
        </p>
      </div>
    );
  }

  // Network error
  if (isNetworkError) {
    return (
      <div 
        className="flex flex-col items-center justify-center py-8 px-4"
        role="alert"
        aria-labelledby="network-error-heading"
      >
        <div className="text-5xl mb-4" role="img" aria-label="Network error">
          📶
        </div>
        <h3 
          id="network-error-heading"
          className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Network connection issue
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
          Please check your internet connection and try again.
        </p>
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-brand/10 hover:bg-brand/20 text-brand dark:text-brand dark:hover:text-hover-light rounded-md transition focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-2 dark:focus:ring-offset-gray-900 hover:shadow-md"
          aria-label="Retry loading recommendations"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Generic error
  return (
    <div 
      className="flex flex-col items-center justify-center py-8 px-4"
      role="alert"
      aria-labelledby="error-heading"
    >
      <div className="text-5xl mb-4" role="img" aria-label="Error">
        ⚠️
      </div>
      <h3 
        id="error-heading"
        className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        Something went wrong
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
        {error instanceof Error ? error.message : error || "An unexpected error occurred"}
      </p>
      <button
        onClick={handleRetry}
        className="px-4 py-2 bg-brand/10 hover:bg-brand/20 text-brand dark:text-brand dark:hover:text-hover-light rounded-md transition focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-2 dark:focus:ring-offset-gray-900 hover:shadow-md"
        aria-label="Try loading recommendations again"
      >
        Try Again
      </button>
    </div>
  );
};

export default RecommendationFallback;