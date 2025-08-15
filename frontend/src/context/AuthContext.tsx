import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, confirm: string, first_name: string, last_name: string) => Promise<void>;
  verify: (email: string, code: string) => Promise<void>;
  logout: () => void;
  setUser: (user: EnhancedUser | null) => void;
  googleLogin: (credential: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  return useContext(AuthContext)!;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<EnhancedUser | null>(null);
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('auth_token')
  );
  const [loading, setLoading] = useState(true);

  // Helper function to enhance user data with additional fields
  const enhanceUserData = (userData: any): EnhancedUser => {
    return {
      ...userData,
      auth_provider: userData.auth_provider || 'email',
      last_login: userData.last_login || new Date().toISOString(),
      profile_picture: userData.profile_picture || userData.google_profile?.picture,
      google_profile: userData.google_profile || undefined,
      usage_stats: userData.usage_stats || undefined
    };
  };

  // Fetch user info if token exists
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await authApi.getCurrentUser(token);
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
  }, [token]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    const data = await authApi.login(email, password);
    if (data.access_token) {
      setToken(data.access_token);
      localStorage.setItem('auth_token', data.access_token);
      // Fetch user info
      const userData = await authApi.getCurrentUser(data.access_token);
      setUser(enhanceUserData(userData));
    } else {
      setUser(null);
      throw new Error(data.detail || 'Login failed');
    }
    setLoading(false);
  };

  const googleLogin = async (credential: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/api/v1/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        setToken(data.access_token);
        localStorage.setItem('auth_token', data.access_token);
        
        // Fetch complete user info
        const userData = await authApi.getCurrentUser(data.access_token);
        setUser(enhanceUserData(userData));
      } else {
        setUser(null);
        throw new Error(data.detail || 'Google authentication failed');
      }
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

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    authApi.logout();
  };

  return (
    <AuthContext.Provider value={{ user, loading, token, login, signup, verify, logout, setUser, googleLogin }}>
      {children}
    </AuthContext.Provider>
  );
};
