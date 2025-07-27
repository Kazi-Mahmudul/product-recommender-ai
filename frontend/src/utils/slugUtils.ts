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
 * Parses phone IDs from URL parameters
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
 * Generates URL path for phone comparison
 * @param phoneIds - Array of phone IDs
 * @returns URL path for comparison
 */
export function generateComparisonUrl(phoneIds: number[]): string {
  if (phoneIds.length === 0) return '/compare';
  return `/compare/${phoneIds.join('-')}`;
}

/**
 * Validates phone IDs for comparison
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
 * Creates a shareable comparison URL with phone names
 * @param phones - Array of phones in comparison
 * @param baseUrl - Base URL of the application
 * @returns Shareable URL with phone names
 */
export function createShareableComparisonUrl(phones: Phone[], baseUrl: string = window.location.origin): string {
  const slug = generateComparisonSlug(phones);
  const phoneIds = phones.map(p => p.id).join('-');
  return `${baseUrl}/compare/${phoneIds}${slug ? `/${slug}` : ''}`;
}