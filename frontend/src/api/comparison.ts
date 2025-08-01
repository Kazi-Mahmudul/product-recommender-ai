import { Phone } from './phones';

const API_BASE = process.env.REACT_APP_API_BASE || "/api";

export interface ComparisonItem {
  id: number;
  session_id?: string; // Optional, as it might be null for logged-in users
  user_id?: number; // Optional, for logged-in users
  slug: string;
  added_at: string;
}

export interface ComparisonSession {
  session_id: string;
  created_at: string;
  expires_at: string;
  items: ComparisonItem[];
}

// Production-ready session management with fallback strategies
const SESSION_STORAGE_KEY = 'comparison_session_id';
const SESSION_EXPIRY_KEY = 'comparison_session_expiry';

function getStoredSessionId(): string | null {
  // Check if session has expired
  const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
  if (expiry && new Date().getTime() > parseInt(expiry)) {
    // Session expired, clear it
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    return null;
  }
  
  return localStorage.getItem(SESSION_STORAGE_KEY);
}

function storeSessionId(sessionId: string): void {
  // Store session ID with 24-hour expiry (matching backend)
  const expiryTime = new Date().getTime() + (24 * 60 * 60 * 1000); // 24 hours
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  localStorage.setItem(SESSION_EXPIRY_KEY, expiryTime.toString());
}

function clearStoredSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(SESSION_EXPIRY_KEY);
}

export async function getComparisonSession(): Promise<ComparisonSession> {
  const response = await fetch(`${API_BASE}/api/v1/comparison/session`, {
    method: 'GET',
    credentials: 'include', // Include cookies in the request
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get comparison session: ${response.statusText}`);
  }
  
  const session = await response.json();
  
  // Store session ID for cross-origin compatibility
  storeSessionId(session.session_id);
  
  return session;
}

export async function addComparisonItem(slug: string): Promise<ComparisonItem> {
  // Get stored session ID for cross-origin compatibility
  const sessionId = getStoredSessionId();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add session ID as header for cross-origin support
  if (sessionId) {
    headers['X-Session-ID'] = sessionId;
  }
  
  const response = await fetch(`${API_BASE}/api/v1/comparison/items/${slug}`, {
    method: 'POST',
    credentials: 'include', // Include cookies when possible
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to add comparison item: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Update stored session ID if provided in response
  if (data.session_id) {
    storeSessionId(data.session_id);
  }
  
  return data;
}

export async function removeComparisonItem(slug: string): Promise<void> {
  // Get stored session ID for cross-origin compatibility
  const sessionId = getStoredSessionId();
  
  const headers: Record<string, string> = {};
  
  // Add session ID as header for cross-origin support
  if (sessionId) {
    headers['X-Session-ID'] = sessionId;
  }
  
  const response = await fetch(`${API_BASE}/api/v1/comparison/items/${slug}`, {
    method: 'DELETE',
    credentials: 'include', // Include cookies when possible
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to remove comparison item: ${response.statusText}`);
  }
}

// Export session management functions for advanced use cases
export { clearStoredSession };

export async function getComparisonItems(): Promise<ComparisonItem[]> {
  // Get stored session ID for cross-origin compatibility
  const sessionId = getStoredSessionId();
  
  const headers: Record<string, string> = {};
  
  // Add session ID as header for cross-origin support
  if (sessionId) {
    headers['X-Session-ID'] = sessionId;
  }
  
  const response = await fetch(`${API_BASE}/api/v1/comparison/items`, {
    method: 'GET',
    credentials: 'include', // Include cookies when possible
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get comparison items: ${response.statusText}`);
  }
  
  return response.json();
}
