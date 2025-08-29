/**
 * Navigation utility functions for the Peyechi application
 */

import { generateComparisonUrl, generatePhoneDetailUrl } from './slugUtils';

/**
 * Navigate to the phone details page
 * @param navigate React Router's navigate function
 * @param phoneId The ID of the phone to view (will be redirected to slug-based URL by backend)
 */
export const navigateToPhoneDetails = (
  navigate: (path: string) => void,
  phoneSlug: string
) => {
  navigate(generatePhoneDetailUrl(phoneSlug));
};

/**
 * Navigate to the comparison page with selected phones
 * @param navigate React Router's navigate function
 * @param phoneIds Array of phone IDs to compare
 */
export const navigateToComparison = (
  navigate: (path: string) => void,
  phoneSlugs: string[]
) => {
  if (phoneSlugs.length < 2) {
    console.error("At least 2 phones are required for comparison");
    return;
  }
  
  navigate(generateComparisonUrl(phoneSlugs));
};

/**
 * Generate a URL for the comparison page
 * @param phoneIds Array of phone IDs to compare
 * @returns The URL for the comparison page
 */
export const getComparisonUrl = (phoneSlugs: string[]): string => {
  if (phoneSlugs.length < 2) {
    return "";
  }
  
  return generateComparisonUrl(phoneSlugs);
};