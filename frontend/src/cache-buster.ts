// Cache buster - Updated: 2025-08-29T12:30:00.000Z
// This file forces Vercel to rebuild by changing content

export const CACHE_BUSTER = '2025-08-29T12:30:00.000Z';

// Force all API calls to use HTTPS in production
export function ensureHttps(url: string): string {
  // Always ensure HTTPS in production environment
  if (process.env.NODE_ENV === 'production' && url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  
  return url;
}

// Get API base with forced HTTPS
export function getSecureApiBase(): string {
  // Always use the environment variable or default to /api
  let base = process.env.REACT_APP_API_BASE || "/api";
  
  const secureBase = ensureHttps(base);
  
  // Log for debugging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('API Base URL:', secureBase);
  }
  
  return secureBase;
}