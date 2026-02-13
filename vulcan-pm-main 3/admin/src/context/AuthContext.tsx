import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminApi, setToken, clearToken, isAuthenticated } from '../lib/api';

interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  admin: Admin | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithSso: (code: string, state: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      if (isAuthenticated()) {
        const result = await adminApi.getMe();
        if (result.success && result.data) {
          setAdmin(result.data);
        } else {
          clearToken();
        }
      }
      setIsLoading(false);
    }
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await adminApi.login(email, password);

    if (result.success && result.data) {
      setToken(result.data.token);
      setAdmin(result.data.admin);
      return { success: true };
    }

    return { success: false, error: result.error || 'Login failed' };
  };

  const loginWithSso = async (code: string, state: string) => {
    try {
      const response = await fetch('/api/v1/admin/auth/sso/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return { success: false, error: result.error || 'SSO login failed' };
      }

      setToken(result.data.token);
      setAdmin(result.data.admin);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'SSO login failed' };
    }
  };

  const logout = () => {
    clearToken();
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, isLoading, login, loginWithSso, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
