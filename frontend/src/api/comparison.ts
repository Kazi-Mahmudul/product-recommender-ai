import SessionManager from '../services/sessionManager';

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

// Use centralized session manager
const sessionManager = SessionManager.getInstance();

export function clearStoredSession(): void {
  sessionManager.clearSession();
}

export async function getComparisonSession(): Promise<ComparisonSession> {
  // Use existing session if valid
  const existingSessionId = sessionManager.getSessionId();
  
  const headers: Record<string, string> = {};
  if (existingSessionId) {
    headers['X-Session-ID'] = existingSessionId;
  }
  
  const response = await fetch(`${API_BASE}/api/v1/comparison/session`, {
    method: 'GET',
    credentials: 'include',
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get comparison session: ${response.statusText}`);
  }
  
  const session = await response.json();
  
  // Update session manager with backend session ID
  sessionManager.setSessionId(session.session_id);
  
  return session;
}

export async function addComparisonItem(slug: string): Promise<ComparisonItem> {
  const sessionId = sessionManager.getSessionId();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Session-ID': sessionId,
  };
  
  const response = await fetch(`${API_BASE}/api/v1/comparison/items/${slug}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ slug }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to add comparison item: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Update session manager if backend provides a new session ID
  if (data.session_id && data.session_id !== sessionId) {
    sessionManager.setSessionId(data.session_id);
  }
  
  return data;
}

export async function removeComparisonItem(slug: string): Promise<void> {
  const sessionId = sessionManager.getSessionId();
  
  const headers: Record<string, string> = {
    'X-Session-ID': sessionId,
  };
  
  const response = await fetch(`${API_BASE}/api/v1/comparison/items/${slug}`, {
    method: 'DELETE',
    credentials: 'include',
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to remove comparison item: ${response.statusText}`);
  }
}

// Session management functions are exported above

export async function getComparisonItems(): Promise<ComparisonItem[]> {
  const sessionId = sessionManager.getSessionId();
  
  const headers: Record<string, string> = {
    'X-Session-ID': sessionId,
  };
  
  const response = await fetch(`${API_BASE}/api/v1/comparison/items`, {
    method: 'GET',
    credentials: 'include',
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get comparison items: ${response.statusText}`);
  }
  
  return response.json();
}
