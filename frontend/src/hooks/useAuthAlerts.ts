import { useCallback, useRef } from 'react';
import { authAlerts } from '../utils/authAlerts';
import { EnhancedUser } from '../types/auth';

interface UseAuthAlertsReturn {
  showLoginSuccess: (user?: EnhancedUser) => Promise<void>;
  showSignupSuccess: (user?: EnhancedUser) => Promise<void>;
  showGoogleLoginSuccess: (user?: EnhancedUser) => Promise<void>;
  showLogoutSuccess: () => Promise<void>;
  showAuthError: (message?: string) => Promise<void>;
  showNetworkError: () => Promise<void>;
  showTokenExpired: () => Promise<void>;
  showProfileUpdateSuccess: () => Promise<void>;
  showVerificationSuccess: () => Promise<void>;
  confirmLogout: () => Promise<boolean>;
  cleanup: () => void;
}

export const useAuthAlerts = (darkMode: boolean = false): UseAuthAlertsReturn => {
  const activeAlertsRef = useRef<Set<Promise<any>>>(new Set());

  // Helper function to get user's display name
  const getUserDisplayName = useCallback((user?: EnhancedUser): string | undefined => {
    if (!user) return undefined;
    
    // Prefer Google profile name if available
    if (user.google_profile?.given_name) {
      return user.google_profile.given_name;
    }
    
    // Fall back to first_name
    if (user.first_name) {
      return user.first_name;
    }
    
    // Extract name from email as last resort
    if (user.email) {
      const emailName = user.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    
    return undefined;
  }, []);

  // Helper function to track and cleanup alerts
  const trackAlert = useCallback((alertPromise: Promise<any>) => {
    activeAlertsRef.current.add(alertPromise);
    alertPromise.finally(() => {
      activeAlertsRef.current.delete(alertPromise);
    });
    return alertPromise;
  }, []);

  const showLoginSuccess = useCallback(async (user?: EnhancedUser) => {
    const userName = getUserDisplayName(user);
    const alertPromise = authAlerts.showLoginSuccess(userName, darkMode);
    return trackAlert(alertPromise);
  }, [darkMode, getUserDisplayName, trackAlert]);

  const showSignupSuccess = useCallback(async (user?: EnhancedUser) => {
    const userName = getUserDisplayName(user);
    const alertPromise = authAlerts.showSignupSuccess(userName, darkMode);
    return trackAlert(alertPromise);
  }, [darkMode, getUserDisplayName, trackAlert]);

  const showGoogleLoginSuccess = useCallback(async (user?: EnhancedUser) => {
    const userName = getUserDisplayName(user);
    const alertPromise = authAlerts.showGoogleLoginSuccess(userName, darkMode);
    return trackAlert(alertPromise);
  }, [darkMode, getUserDisplayName, trackAlert]);

  const showLogoutSuccess = useCallback(async () => {
    const alertPromise = authAlerts.showLogoutSuccess(darkMode);
    return trackAlert(alertPromise);
  }, [darkMode, trackAlert]);

  const showAuthError = useCallback(async (message?: string) => {
    const alertPromise = authAlerts.showAuthError(message, darkMode);
    return trackAlert(alertPromise);
  }, [darkMode, trackAlert]);

  const showNetworkError = useCallback(async () => {
    const alertPromise = authAlerts.showNetworkError(darkMode);
    return trackAlert(alertPromise);
  }, [darkMode, trackAlert]);

  const showTokenExpired = useCallback(async () => {
    const alertPromise = authAlerts.showTokenExpired(darkMode);
    return trackAlert(alertPromise);
  }, [darkMode, trackAlert]);

  const showProfileUpdateSuccess = useCallback(async () => {
    const alertPromise = authAlerts.showProfileUpdateSuccess(darkMode);
    return trackAlert(alertPromise);
  }, [darkMode, trackAlert]);

  const showVerificationSuccess = useCallback(async () => {
    const alertPromise = authAlerts.showVerificationSuccess(darkMode);
    return trackAlert(alertPromise);
  }, [darkMode, trackAlert]);

  const confirmLogout = useCallback(async (): Promise<boolean> => {
    const alertPromise = authAlerts.confirmLogout(darkMode);
    trackAlert(alertPromise);
    return alertPromise;
  }, [darkMode, trackAlert]);

  // Cleanup function to dismiss all active alerts
  const cleanup = useCallback(() => {
    // Note: SweetAlert2 doesn't provide a direct way to cancel all alerts
    // This is mainly for cleanup of references
    activeAlertsRef.current.clear();
  }, []);

  return {
    showLoginSuccess,
    showSignupSuccess,
    showGoogleLoginSuccess,
    showLogoutSuccess,
    showAuthError,
    showNetworkError,
    showTokenExpired,
    showProfileUpdateSuccess,
    showVerificationSuccess,
    confirmLogout,
    cleanup
  };
};