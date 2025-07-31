/**
 * Utility functions for generating and parsing URL slugs for phone comparison
 */

import { Phone } from '../api/phones';

/**
 * Generates a URL-friendly slug from a phone name
 * @param phoneName - The phone name to convert to slug
 * @returns URL-friendly slug
 */
export function generatePhoneSlug(phoneName: string): string {
  return phoneName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Parses phone slugs from URL parameters
 * @param slugs - Comma or dash separated phone slugs from URL
 * @returns Array of phone slugs
 */
export function parsePhoneSlugsFromUrl(slugs: string): string[] {
  if (!slugs) return [];
  
  // Handle both comma-separated and dash-separated formats
  return slugs.split(/[,-]/).map(slug => slug.trim()).filter(slug => slug.length > 0);
}

/**
 * Parses comparison URL to extract slugs
 * @param urlParam - URL parameter containing phone slugs
 * @returns Object with slugs and format detection
 */
export function parseComparisonUrl(urlParam: string): {
  slugs: string[];
} {
  if (!urlParam) {
    return {
      slugs: [],
    };
  }

  // Parse slug-based format: "samsung-galaxy-a15-vs-realme-narzo-70"
  const slugs = urlParam.split('-vs-').map(slug => slug.trim()).filter(slug => slug.length > 0);
  return {
    slugs,
  };
}

/**
 * Generates URL path for phone comparison using slugs or Phone objects
 * @param phonesOrSlugs - Array of phone slugs or Phone objects to compare
 * @returns URL path for comparison
 */
export function generateComparisonUrl(phonesOrSlugs: (Phone | string)[]): string {
  if (phonesOrSlugs.length === 0) return '/compare';
  
  const slugs = phonesOrSlugs.map(item => {
    if (typeof item === 'string') {
      return item;
    }
    // Handle Phone object
    return item.slug || item.id.toString();
  });
  
  return `/compare/${slugs.join('-vs-')}`;
}

/**
 * Generates URL path for phone detail page using slug or Phone object
 * @param phoneOrSlug - Phone object or phone slug string
 * @returns URL path for phone detail page
 */
export function generatePhoneDetailUrl(phoneOrSlug: Phone | string): string {
  if (typeof phoneOrSlug === 'string') {
    return `/phones/${phoneOrSlug}`;
  }
  
  // Handle Phone object
  const phone = phoneOrSlug;
  if (phone.slug && phone.slug.trim()) {
    return `/phones/${phone.slug}`;
  }
  
  // Fallback to ID-based URL if no slug
  return `/phones/${phone.id}`;
}

/**
 * Validates phone slugs for comparison
 * @param slugs - Array of phone slugs to validate
 * @returns Validation result with errors if any
 */
export function validateComparisonPhoneSlugs(slugs: string[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (slugs.length < 2) {
    errors.push('At least 2 phones are required for comparison');
  }
  
  if (slugs.length > 5) {
    errors.push('Maximum 5 phones can be compared at once');
  }
  
  // Check for duplicate slugs
  const uniqueSlugs = new Set(slugs);
  if (uniqueSlugs.size !== slugs.length) {
    errors.push('Duplicate phones cannot be compared');
  }
  
  // Check for empty slugs
  const emptySlugs = slugs.filter(slug => !slug || slug.trim().length === 0);
  if (emptySlugs.length > 0) {
    errors.push('Invalid phone slugs detected');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Creates a shareable comparison URL with phone slugs
 * @param slugs - Array of phone slugs in comparison
 * @param baseUrl - Base URL of the application
 * @returns Shareable URL with phone slugs
 */
export function createShareableComparisonUrl(slugs: string[], baseUrl: string = window.location.origin): string {
  const comparisonUrl = generateComparisonUrl(slugs);
  return `${baseUrl}${comparisonUrl}`;
}