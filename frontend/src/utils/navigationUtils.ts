/**
 * Navigation utility functions for the ePick application
 */

import { generateComparisonUrlLegacy } from './slugUtils';

/**
 * Navigate to the phone details page
 * @param navigate React Router's navigate function
 * @param phoneId The ID of the phone to view (will be redirected to slug-based URL by backend)
 */
export const navigateToPhoneDetails = (
  navigate: (path: string) => void,
  phoneId: string
) => {
  // For now, use ID-based URL and let backend handle redirect to slug-based URL
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
  
  // Convert string IDs to numbers for the legacy URL generator
  const numericIds = phoneIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
  navigate(generateComparisonUrlLegacy(numericIds));
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
  
  // Convert string IDs to numbers for the legacy URL generator
  const numericIds = phoneIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
  return generateComparisonUrlLegacy(numericIds);
};