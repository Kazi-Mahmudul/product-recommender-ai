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
 * Generates a comparison URL slug from multiple phones
 * @param phones - Array of phones to include in comparison
 * @returns Comparison URL slug
 */
export function generateComparisonSlug(phones: Phone[]): string {
  if (phones.length === 0) return '';
  
  const slugs = phones.map(phone => generatePhoneSlug(phone.name));
  return slugs.join('-vs-');
}

/**
 * Parses phone identifiers from URL parameters (supports both IDs and slugs)
 * @param identifiers - Comma or dash separated phone identifiers from URL
 * @returns Array of phone identifiers (numbers for IDs, strings for slugs)
 */
export function parsePhoneIdentifiersFromUrl(identifiers: string): string[] {
  if (!identifiers) return [];
  
  // Handle both comma-separated and dash-separated formats
  return identifiers.split(/[,-]/).map(id => id.trim()).filter(id => id.length > 0);
}

/**
 * Parses phone IDs from URL parameters (legacy function for backward compatibility)
 * @param phoneIds - Comma or dash separated phone IDs from URL
 * @returns Array of phone IDs
 */
export function parsePhoneIdsFromUrl(phoneIds: string): number[] {
  if (!phoneIds) return [];
  
  // Handle both comma-separated and dash-separated formats
  const ids = phoneIds.split(/[,-]/).map(id => parseInt(id.trim(), 10));
  return ids.filter(id => !isNaN(id) && id > 0);
}

/**
 * Parses comparison URL to detect format and extract identifiers
 * @param urlParam - URL parameter containing phone identifiers
 * @returns Object with identifiers, format detection, and metadata
 */
export function parseComparisonUrl(urlParam: string): {
  identifiers: string[];
  isSlugBased: boolean;
  isLegacyFormat: boolean;
} {
  if (!urlParam) {
    return {
      identifiers: [],
      isSlugBased: false,
      isLegacyFormat: false
    };
  }

  // Check if URL contains "-vs-" (new slug format)
  const isSlugBased = urlParam.includes('-vs-');
  
  if (isSlugBased) {
    // Parse slug-based format: "samsung-galaxy-a15-vs-realme-narzo-70"
    const identifiers = urlParam.split('-vs-').map(slug => slug.trim()).filter(slug => slug.length > 0);
    return {
      identifiers,
      isSlugBased: true,
      isLegacyFormat: false
    };
  } else {
    // Parse legacy ID format: "1958-1752" or comma-separated
    const identifiers = parsePhoneIdentifiersFromUrl(urlParam);
    const allNumeric = identifiers.every(id => /^\d+$/.test(id));
    
    return {
      identifiers,
      isSlugBased: false,
      isLegacyFormat: allNumeric
    };
  }
}

/**
 * Generates URL path for phone comparison using slugs
 * @param phones - Array of phones to compare
 * @returns URL path for comparison
 */
export function generateComparisonUrl(phones: Phone[]): string {
  if (phones.length === 0) return '/compare';
  
  // Use slugs if available, fallback to IDs
  const identifiers = phones.map(phone => phone.slug || phone.id.toString());
  
  // If all phones have slugs, use slug format with "-vs-"
  const allHaveSlugs = phones.every(phone => phone.slug);
  if (allHaveSlugs) {
    return `/compare/${identifiers.join('-vs-')}`;
  } else {
    // Fallback to legacy ID format
    const ids = phones.map(phone => phone.id);
    return `/compare/${ids.join('-')}`;
  }
}

/**
 * Generates URL path for phone comparison using IDs (legacy function)
 * @param phoneIds - Array of phone IDs
 * @returns URL path for comparison
 */
export function generateComparisonUrlLegacy(phoneIds: number[]): string {
  if (phoneIds.length === 0) return '/compare';
  return `/compare/${phoneIds.join('-')}`;
}

/**
 * Generates URL path for phone detail page using slug
 * @param phone - Phone object with slug
 * @returns URL path for phone detail page
 */
export function generatePhoneDetailUrl(phone: Phone): string {
  if (phone.slug) {
    return `/phones/${phone.slug}`;
  } else {
    // Fallback to ID-based URL
    return `/phones/${phone.id}`;
  }
}

/**
 * Validates phone identifiers for comparison (supports both IDs and slugs)
 * @param identifiers - Array of phone identifiers to validate
 * @returns Validation result with errors if any
 */
export function validateComparisonPhoneIdentifiers(identifiers: string[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (identifiers.length < 2) {
    errors.push('At least 2 phones are required for comparison');
  }
  
  if (identifiers.length > 5) {
    errors.push('Maximum 5 phones can be compared at once');
  }
  
  // Check for duplicate identifiers
  const uniqueIdentifiers = new Set(identifiers);
  if (uniqueIdentifiers.size !== identifiers.length) {
    errors.push('Duplicate phones cannot be compared');
  }
  
  // Check for empty identifiers
  const emptyIdentifiers = identifiers.filter(id => !id || id.trim().length === 0);
  if (emptyIdentifiers.length > 0) {
    errors.push('Invalid phone identifiers detected');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates phone IDs for comparison (legacy function for backward compatibility)
 * @param phoneIds - Array of phone IDs to validate
 * @returns Validation result with errors if any
 */
export function validateComparisonPhoneIds(phoneIds: number[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (phoneIds.length < 2) {
    errors.push('At least 2 phones are required for comparison');
  }
  
  if (phoneIds.length > 5) {
    errors.push('Maximum 5 phones can be compared at once');
  }
  
  // Check for duplicate IDs
  const uniqueIds = new Set(phoneIds);
  if (uniqueIds.size !== phoneIds.length) {
    errors.push('Duplicate phones cannot be compared');
  }
  
  // Check for invalid IDs
  const invalidIds = phoneIds.filter(id => !Number.isInteger(id) || id <= 0);
  if (invalidIds.length > 0) {
    errors.push('Invalid phone IDs detected');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Creates a shareable comparison URL with phone slugs
 * @param phones - Array of phones in comparison
 * @param baseUrl - Base URL of the application
 * @returns Shareable URL with phone slugs
 */
export function createShareableComparisonUrl(phones: Phone[], baseUrl: string = window.location.origin): string {
  const comparisonUrl = generateComparisonUrl(phones);
  return `${baseUrl}${comparisonUrl}`;
}