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

// Store session ID in localStorage for cross-origin compatibility
const SESSION_STORAGE_KEY = 'comparison_session_id';

function getStoredSessionId(): string | null {
  return localStorage.getItem(SESSION_STORAGE_KEY);
}

function storeSessionId(sessionId: string): void {
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
}

export async function getComparisonSession(): Promise<ComparisonSession> {
  console.log('🔍 getComparisonSession: Making API call...');
  const response = await fetch(`${API_BASE}/api/v1/comparison/session`, {
    method: 'GET',
    credentials: 'include', // Include cookies in the request
  });
  console.log('📡 getComparisonSession: Response status:', response.status);
  
  if (!response.ok) {
    throw new Error(`Failed to get comparison session: ${response.statusText}`);
  }
  
  const session = await response.json();
  console.log('📦 getComparisonSession: Session data:', session);
  
  // Store session ID for future requests
  storeSessionId(session.session_id);
  console.log('💾 getComparisonSession: Stored session ID:', session.session_id);
  
  return session;
}

export async function addComparisonItem(slug: string): Promise<ComparisonItem> {
  console.log('➕ addComparisonItem: Making API call for slug:', slug);
  
  // Get stored session ID
  const sessionId = getStoredSessionId();
  console.log('💾 addComparisonItem: Using stored session ID:', sessionId);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add session ID as header if available
  if (sessionId) {
    headers['X-Session-ID'] = sessionId;
  }
  
  const response = await fetch(`${API_BASE}/api/v1/comparison/items/${slug}`, {
    method: 'POST',
    credentials: 'include', // Include cookies in the request
    headers,
  });
  console.log('📡 addComparisonItem: Response status:', response.status);
  console.log('🍪 addComparisonItem: Response headers:', Object.fromEntries(response.headers.entries()));
  
  if (!response.ok) {
    throw new Error(`Failed to add comparison item: ${response.statusText}`);
  }
  const data = await response.json();
  console.log('📦 addComparisonItem: Response data:', data);
  
  // Store session ID from response if available
  if (data.session_id) {
    storeSessionId(data.session_id);
    console.log('💾 addComparisonItem: Updated stored session ID:', data.session_id);
  }
  
  return data;
}

export async function removeComparisonItem(slug: string): Promise<void> {
  console.log('🗑️ removeComparisonItem: Making API call for slug:', slug);
  
  // Get stored session ID
  const sessionId = getStoredSessionId();
  console.log('💾 removeComparisonItem: Using stored session ID:', sessionId);
  
  const headers: Record<string, string> = {};
  
  // Add session ID as header if available
  if (sessionId) {
    headers['X-Session-ID'] = sessionId;
  }
  
  const response = await fetch(`${API_BASE}/api/v1/comparison/items/${slug}`, {
    method: 'DELETE',
    credentials: 'include', // Include cookies in the request
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to remove comparison item: ${response.statusText}`);
  }
  console.log('✅ removeComparisonItem: Successfully removed:', slug);
}

export async function getComparisonItems(): Promise<ComparisonItem[]> {
  console.log('🔍 getComparisonItems: Making API call...');
  
  // Get stored session ID
  const sessionId = getStoredSessionId();
  console.log('💾 getComparisonItems: Using stored session ID:', sessionId);
  
  const headers: Record<string, string> = {};
  
  // Add session ID as header if available
  if (sessionId) {
    headers['X-Session-ID'] = sessionId;
  }
  
  const response = await fetch(`${API_BASE}/api/v1/comparison/items`, {
    method: 'GET',
    credentials: 'include', // Include cookies in the request
    headers,
  });
  console.log('📡 getComparisonItems: Response status:', response.status);
  console.log('🍪 getComparisonItems: Response headers:', Object.fromEntries(response.headers.entries()));
  
  if (!response.ok) {
    throw new Error(`Failed to get comparison items: ${response.statusText}`);
  }
  const data = await response.json();
  console.log('📦 getComparisonItems: Response data:', data);
  return data;
}
