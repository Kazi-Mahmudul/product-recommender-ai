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

export async function getComparisonSession(): Promise<ComparisonSession> {
  const response = await fetch(`${API_BASE}/api/v1/comparison/session`, {
    method: 'GET',
    credentials: 'include', // Include cookies in the request
  });
  if (!response.ok) {
    throw new Error(`Failed to get comparison session: ${response.statusText}`);
  }
  return response.json();
}

export async function addComparisonItem(slug: string): Promise<ComparisonItem> {
  const response = await fetch(`${API_BASE}/api/v1/comparison/items/${slug}`, {
    method: 'POST',
    credentials: 'include', // Include cookies in the request
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to add comparison item: ${response.statusText}`);
  }
  return response.json();
}

export async function removeComparisonItem(slug: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/comparison/items/${slug}`, {
    method: 'DELETE',
    credentials: 'include', // Include cookies in the request
  });
  if (!response.ok) {
    throw new Error(`Failed to remove comparison item: ${response.statusText}`);
  }
}

export async function getComparisonItems(): Promise<ComparisonItem[]> {
  const response = await fetch(`${API_BASE}/api/v1/comparison/items`, {
    method: 'GET',
    credentials: 'include', // Include cookies in the request
  });
  if (!response.ok) {
    throw new Error(`Failed to get comparison items: ${response.statusText}`);
  }
  return response.json();
}
