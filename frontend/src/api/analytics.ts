import { getSecureApiBase } from '../cache-buster';

const API_BASE = `${getSecureApiBase()}/api/v1/analytics`;

/**
 * Track a user search
 */
export async function trackSearch(token: string): Promise<void> {
    try {
        await fetch(`${API_BASE}/track-search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({})
        });
    } catch (error) {
        // Silently fail - tracking shouldn't break the user experience
        console.warn('Failed to track search:', error);
    }
}

/**
 * Track a user comparison
 */
export async function trackComparison(token: string): Promise<void> {
    try {
        await fetch(`${API_BASE}/track-comparison`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({})
        });
    } catch (error) {
        // Silently fail - tracking shouldn't break the user experience
        console.warn('Failed to track comparison:', error);
    }
}
