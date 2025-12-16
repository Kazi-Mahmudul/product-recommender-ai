/**
 * Analytics Hook for tracking page views in SPA
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

// Get session ID from cookie or create new one
const getSessionId = (): string => {
    const name = 'session_id=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');

    for (let i = 0; i < cookieArray.length; i++) {
        let cookie = cookieArray[i].trim();
        if (cookie.indexOf(name) === 0) {
            return cookie.substring(name.length);
        }
    }

    // Generate new session ID if none exists
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Set cookie for 30 days
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    document.cookie = `session_id=${newSessionId}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

    return newSessionId;
};

export const usePageTracking = () => {
    const location = useLocation();

    useEffect(() => {
        // Track page view
        const trackPageView = async () => {
            try {
                const API_BASE = process.env.REACT_APP_API_BASE || '/api';
                const baseUrl = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;

                const sessionId = getSessionId();

                // Call analytics tracking endpoint
                await axios.post(
                    `${baseUrl}/api/v1/analytics/track`,
                    {
                        path: location.pathname + location.search,
                        session_id: sessionId
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );
            } catch (error) {
                // Silently fail - analytics should never break the app
                console.debug('Analytics tracking failed:', error);
            }
        };

        // Track after a small delay to avoid tracking during rapid navigation
        const timeoutId = setTimeout(trackPageView, 300);

        return () => clearTimeout(timeoutId);
    }, [location.pathname, location.search]);
};

/**
 * Analytics Tracker Component
 * Place this component in your App.tsx to automatically track all page views
 */
export const AnalyticsTracker: React.FC = () => {
    usePageTracking();
    return null; // This component doesn't render anything
};
