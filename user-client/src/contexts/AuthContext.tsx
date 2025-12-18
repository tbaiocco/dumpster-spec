import React, { createContext, useState, useEffect, useCallback } from 'react';
import i18n from '../i18n/config';
import { apiService } from '../services/api';
import type { User } from '../types/dump.types';

/**
 * Auth Context State
 */
export interface AuthContextState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (phone: string, verificationCode: string) => Promise<boolean>;
  sendCode: (phone: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

/**
 * Auth Context
 */
export const AuthContext = createContext<AuthContextState | undefined>(undefined);

/**
 * Auth Provider Component
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize auth state from localStorage
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (apiService.isAuthenticated()) {
          // Try to get user from localStorage
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            // Set i18n language from user profile
            if (userData.language) {
              i18n.changeLanguage(userData.language);
            }
          } else {
            // Token exists but no user data - clear tokens
            apiService.clearTokens();
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        apiService.clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Send verification code to phone
   */
  const sendCode = useCallback(async (phone: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiService.sendVerificationCode(phone);

      if (response.success) {
        return true;
      } else {
        setError(response.error?.message || 'Failed to send verification code');
        return false;
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'An unexpected error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Login with phone and verification code
   */
  const login = useCallback(async (phone: string, verificationCode: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiService.login(phone, verificationCode);

      if (response.success && response.data) {
        // Store authentication tokens
        apiService.setTokens({
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
        });

        // Set user data from login response
        const userData: User = {
          id: response.data.user.id,
          phoneNumber: response.data.user.phone_number,
          verifiedAt: response.data.user.verified_at,
          chatIdTelegram: response.data.user.chat_id_telegram,
          chatIdWhatsapp: response.data.user.chat_id_whatsapp,
          timezone: response.data.user.timezone,
          language: response.data.user.language,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        setUser(userData);
        // Store user in localStorage for persistence
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Set i18n language from user profile
        if (userData.language) {
          i18n.changeLanguage(userData.language);
        }

        return true;
      } else {
        setError(response.error?.message || 'Login failed');
        return false;
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'An unexpected error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    apiService.logout();
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextState = {
    user,
    isAuthenticated: !!user && apiService.isAuthenticated(),
    isLoading,
    error,
    login,
    sendCode,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
