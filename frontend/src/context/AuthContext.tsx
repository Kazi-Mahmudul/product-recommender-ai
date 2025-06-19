import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as authApi from '../api/auth';

export interface User {
  id: number;
  email: string;
  is_verified: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, confirm: string) => Promise<void>;
  verify: (email: string, code: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  return useContext(AuthContext)!;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('auth_token')
  );
  const [loading, setLoading] = useState(true);

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
          setUser(data);
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
      setUser(userData);
    } else {
      setUser(null);
      throw new Error(data.detail || 'Login failed');
    }
    setLoading(false);
  };

  const signup = async (email: string, password: string, confirm: string) => {
    setLoading(true);
    const data = await authApi.signup(email, password, confirm);
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
    <AuthContext.Provider value={{ user, loading, token, login, signup, verify, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
