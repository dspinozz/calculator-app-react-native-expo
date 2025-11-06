// src/utils/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../services/api';

export interface User {
  username: string;
  role: string;
  tenant_id: string | null;
  allow_parentheses?: boolean;
  allow_exponents?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async (): Promise<void> => {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      if (storedToken) {
        setToken(storedToken);
        const authData = await ApiService.checkAuth();
        if (authData.authenticated && authData.username && authData.role) {
          setUser({
            username: authData.username,
            role: authData.role,
            tenant_id: authData.tenant_id || null,
            allow_parentheses: authData.settings?.allow_parentheses ?? true,
            allow_exponents: authData.settings?.allow_exponents ?? true,
          });
        } else {
          await AsyncStorage.removeItem('auth_token');
          setToken(null);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await ApiService.login(username, password);
      if (response.success && response.token && response.username && response.role) {
        setToken(response.token);
        // Fetch settings after login
        const authData = await ApiService.checkAuth();
        setUser({
          username: response.username,
          role: response.role,
          tenant_id: response.tenant_id || null,
          allow_parentheses: authData.settings?.allow_parentheses ?? true,
          allow_exponents: authData.settings?.allow_exponents ?? true,
        });
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      return { success: false, message: errorMessage };
    }
  };

  const logout = async (): Promise<void> => {
    await ApiService.logout();
    setUser(null);
    setToken(null);
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
