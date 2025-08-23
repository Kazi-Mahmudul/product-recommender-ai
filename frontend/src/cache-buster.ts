// Cache buster - Updated: 2025-08-23T12:29:55.429Z
// This file forces Vercel to rebuild by changing content

export const CACHE_BUSTER = '2025-08-23T12:29:55.429Z';

// Force all API calls to use HTTPS in production
export function ensureHttps(url: string): string {
  if (process.env.NODE_ENV === 'production' && url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  return url;
}

// Get API base with forced HTTPS
export function getSecureApiBase(): string {
  const base = process.env.REACT_APP_API_BASE || "/api";
  return ensureHttps(base);
}