import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as authApi from '../api/auth';
import { EnhancedUser } from '../types/auth';

// Keep the original User interface for backward compatibility
export interface User {
  id: number;
  email: string;
  is_verified: boolean;
  created_at: string;
  first_name?: string;
  last_name?: string;
}

interface AuthContextType {
  user: EnhancedUser | null;
  loading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<EnhancedUser | null>;
  signup: (email: string, password: string, confirm: string, first_name: string, last_name: string) => Promise<void>;
  verify: (email: string, code: string) => Promise<void>;
  logout: () => void;
  setUser: (user: EnhancedUser | null) => void;
  googleLogin: () => Promise<void>;
  updateProfile: (profileData: { first_name?: string; last_name?: string }) => Promise<void>;
  uploadProfilePicture: (file: File) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  return useContext(AuthContext)!;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<EnhancedUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Function to get token from both localStorage and cookies
  const getToken = (): string | null => {
    // Check localStorage first
    const localStorageToken = localStorage.getItem('auth_token');
    if (localStorageToken) {
      return localStorageToken;
    }

    // Check cookies
    const cookieName = 'auth_token=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');

    for (let i = 0; i < cookieArray.length; i++) {
      let cookie = cookieArray[i];
      while (cookie.charAt(0) === ' ') {
        cookie = cookie.substring(1);
      }
      if (cookie.indexOf(cookieName) === 0) {
        return cookie.substring(cookieName.length, cookie.length);
      }
    }

    return null;
  };
  const [loading, setLoading] = useState(true);

  // Helper function to enhance user data with additional fields
  const enhanceUserData = (userData: any): EnhancedUser => {
    return {
      ...userData,
      auth_provider: userData.auth_provider || 'email',
      last_login: userData.last_login || new Date().toISOString(),
      // Prioritize explicit profile_picture_url > profile_picture > google_profile.picture
      profile_picture: userData.profile_picture_url || userData.profile_picture || userData.google_profile?.picture,
      google_profile: userData.google_profile || undefined,
      usage_stats: userData.usage_stats || undefined
    };
  };

  // Fetch user info if token exists
  useEffect(() => {
    const fetchUser = async () => {
      const currentToken = getToken();

      if (!currentToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await authApi.getCurrentUser(currentToken);
        if (data && data.email) {
          setUser(enhanceUserData(data));
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
      setLoading(false);
    };
    fetchUser();

    // Set initial token state
    const initialToken = getToken();
    if (initialToken) {
      setToken(initialToken);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    const data = await authApi.login(email, password);
    if (data.access_token) {
      setToken(data.access_token);
      localStorage.setItem('auth_token', data.access_token);
      // Fetch user info
      const userData = await authApi.getCurrentUser(data.access_token);
      const enhancedUser = enhanceUserData(userData);
      setUser(enhancedUser);
      setLoading(false);
      return enhancedUser;
    } else {
      setUser(null);
      setLoading(false);
      throw new Error(data.detail || 'Login failed');
    }
  };

  const googleLogin = async () => {
    setLoading(true);
    try {
      // Store the current URL so we can redirect back after authentication
      const currentPath = window.location.pathname + window.location.search;
      localStorage.setItem('post_auth_redirect', currentPath);

      // Call the backend to get the Google OAuth URL
      const API_BASE = process.env.REACT_APP_API_BASE || "/api";
      const response = await fetch(`${API_BASE}/api/v1/auth/google/login`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to initiate Google OAuth');
      }

      const data = await response.json();
      const authUrl = data.auth_url;

      // Redirect to Google OAuth URL
      window.location.href = authUrl;
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, confirm: string, first_name: string, last_name: string) => {
    setLoading(true);
    const data = await authApi.signup(email, password, confirm, first_name, last_name);
    if (!data.success) {
      setLoading(false);
      throw new Error(data.detail || data.message || 'Signup failed');
    }
    setLoading(false);
  };

  const verify = async (email: string, code: string) => {
    setLoading(true);
    const data = await authApi.verifyEmail(email, code);
    if (!data.success) {
      setLoading(false);
      throw new Error(data.detail || data.message || 'Verification failed');
    }
    setLoading(false);
  };

  const updateProfile = async (profileData: { first_name?: string; last_name?: string }) => {
    if (!token) {
      throw new Error('No authentication token available');
    }

    setLoading(true);
    try {
      const data = await authApi.updateProfile(token, profileData);
      if (data.success !== false) {
        // Fetch updated user info
        const userData = await authApi.getCurrentUser(token);
        setUser(enhanceUserData(userData));
      } else {
        throw new Error(data.detail || data.message || 'Profile update failed');
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const uploadProfilePicture = async (file: File) => {
    if (!token) {
      throw new Error('No authentication token available');
    }

    setLoading(true);
    try {
      const data = await authApi.uploadProfilePicture(token, file);
      if (data.success !== false) {
        // Fetch updated user info
        const userData = await authApi.getCurrentUser(token);
        setUser(enhanceUserData(userData));
      } else {
        throw new Error(data.detail || data.message || 'Profile picture upload failed');
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    // Also remove the auth token from cookies
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax;";
    authApi.logout();
  };

  return (
    <AuthContext.Provider value={{ user, loading, token, login, signup, verify, logout, setUser, googleLogin, updateProfile, uploadProfilePicture }}>
      {children}
    </AuthContext.Provider>
  );
};
