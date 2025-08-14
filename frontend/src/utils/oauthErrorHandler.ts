/**
 * Utility functions for handling Google OAuth errors and providing user-friendly messages
 */

export interface OAuthError {
  message: string;
  code?: string;
  details?: string;
}

/**
 * Maps OAuth error types to user-friendly messages
 */
export const getOAuthErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }

  // Handle different types of OAuth errors
  if (error?.error) {
    switch (error.error) {
      case 'popup_closed_by_user':
        return 'Sign-in was cancelled. Please try again.';
      case 'access_denied':
        return 'Access was denied. Please try again.';
      case 'popup_blocked':
        return 'Pop-up was blocked. Please allow pop-ups and try again.';
      case 'network_error':
        return 'Network error occurred. Please check your connection and try again.';
      default:
        return 'Google authentication failed. Please try again.';
    }
  }

  // Handle HTTP errors from backend
  if (error?.status) {
    switch (error.status) {
      case 400:
        return 'Invalid authentication request. Please try again.';
      case 401:
        return 'Authentication failed. Please try again.';
      case 403:
        return 'Access forbidden. Please contact support.';
      case 500:
        return 'Server error occurred. Please try again later.';
      default:
        return 'Authentication failed. Please try again.';
    }
  }

  return error?.message || 'Google authentication failed. Please try again.';
};

/**
 * Handles OAuth success response and manages authentication state
 */
export const handleOAuthSuccess = async (
  credentialResponse: any,
  setLoading: (loading: boolean) => void,
  setError: (error: string) => void,
  setUser?: (user: any) => void,
  onSuccess?: () => void
): Promise<boolean> => {
  setLoading(true);
  setError('');

  try {
    const response = await fetch(
      `${process.env.REACT_APP_API_BASE}/api/v1/auth/google`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      }
    );

    const data = await response.json();

    if (response.ok && data.access_token) {
      // Store token
      localStorage.setItem('auth_token', data.access_token);
      
      // Update user state if setter provided
      if (setUser) {
        setUser(data.user || null);
      }
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      return true;
    } else {
      const errorMessage = getOAuthErrorMessage(data);
      setError(errorMessage);
      return false;
    }
  } catch (error) {
    const errorMessage = getOAuthErrorMessage(error);
    setError(errorMessage);
    return false;
  } finally {
    setLoading(false);
  }
};

/**
 * Handles OAuth errors with user-friendly messages
 */
export const handleOAuthError = (
  error: any,
  setError: (error: string) => void
): void => {
  const errorMessage = getOAuthErrorMessage(error);
  setError(errorMessage);
};

/**
 * Checks if Google OAuth is available
 */
export const isGoogleOAuthAvailable = (): boolean => {
  return !!(process.env.REACT_APP_GOOGLE_CLIENT_ID && (window as any).google);
};