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
 * Extracts user profile data from Google JWT credential
 */
export const extractGoogleProfileData = (credential: string) => {
  try {
    // Decode JWT payload (middle part of the token)
    const payload = credential.split('.')[1];
    const decodedPayload = JSON.parse(atob(payload));
    
    return {
      email: decodedPayload.email,
      given_name: decodedPayload.given_name,
      family_name: decodedPayload.family_name,
      picture: decodedPayload.picture,
      email_verified: decodedPayload.email_verified
    };
  } catch (error) {
    console.warn('Failed to extract Google profile data:', error);
    return null;
  }
};

/**
 * Validates profile picture URL
 */
export const validateProfilePictureUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  
  try {
    const urlObj = new URL(url);
    // Only allow HTTPS URLs from trusted domains
    if (urlObj.protocol === 'https:' && 
        (urlObj.hostname.includes('googleusercontent.com') || 
         urlObj.hostname.includes('googleapis.com'))) {
      return url;
    }
  } catch (error) {
    console.warn('Invalid profile picture URL:', url);
  }
  
  return undefined;
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
    // Extract Google profile data from credential
    const googleProfile = extractGoogleProfileData(credentialResponse.credential);
    
    // Ensure we always use HTTPS in production
    let API_BASE = process.env.REACT_APP_API_BASE || "/api";
    if (API_BASE.startsWith('http://')) {
      API_BASE = API_BASE.replace('http://', 'https://');
    }
    
    const response = await fetch(
      `${API_BASE}/api/v1/auth/google`,
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
      
      // Enhance user data with Google profile information
      if (setUser && data.user) {
        const enhancedUser = {
          ...data.user,
          auth_provider: 'google',
          profile_picture: validateProfilePictureUrl(googleProfile?.picture) || data.user.profile_picture,
          google_profile: googleProfile ? {
            picture: validateProfilePictureUrl(googleProfile.picture) || '',
            given_name: googleProfile.given_name || '',
            family_name: googleProfile.family_name || '',
            email_verified: googleProfile.email_verified || false
          } : undefined,
          last_login: new Date().toISOString()
        };
        setUser(enhancedUser);
      }
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      return true;
    } else {
      // Enhanced error handling for backend issues
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (response.status === 400) {
        if (data.detail && data.detail.includes('Google authentication failed')) {
          errorMessage = 'Google authentication failed. Please try again or contact support.';
        } else if (data.detail && data.detail.includes('Missing Google token')) {
          errorMessage = 'Authentication error. Please refresh the page and try again.';
        } else {
          errorMessage = data.detail || 'Authentication failed. Please try again.';
        }
      } else if (response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
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