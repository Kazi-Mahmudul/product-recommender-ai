/**
 * Navigation utility functions for the ePick application
 */

/**
 * Navigate to the phone details page
 * @param navigate React Router's navigate function
 * @param phoneId The ID of the phone to view
 */
export const navigateToPhoneDetails = (
  navigate: (path: string) => void,
  phoneId: string
) => {
  navigate(`/phones/${phoneId}`);
};

/**
 * Navigate to the comparison page with selected phones
 * @param navigate React Router's navigate function
 * @param phoneIds Array of phone IDs to compare
 */
export const navigateToComparison = (
  navigate: (path: string) => void,
  phoneIds: string[]
) => {
  if (phoneIds.length < 2) {
    console.error("At least 2 phones are required for comparison");
    return;
  }
  
  const phoneIdsParam = phoneIds.join(",");
  navigate(`/compare?phones=${phoneIdsParam}`);
};

/**
 * Generate a URL for the comparison page
 * @param phoneIds Array of phone IDs to compare
 * @returns The URL for the comparison page
 */
export const getComparisonUrl = (phoneIds: string[]): string => {
  if (phoneIds.length < 2) {
    return "";
  }
  
  const phoneIdsParam = phoneIds.join(",");
  return `/compare?phones=${phoneIdsParam}`;
};