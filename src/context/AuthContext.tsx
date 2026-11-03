import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, tokenStorage } from '../services/api';
import type { UserProfile, StudentVerification, StudentEnrollment } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  role: 'admin' | 'student' | null;
  token: string | null;
  verification: StudentVerification | null;
  enrollment: StudentEnrollment | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (formData: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchDemoUser: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(tokenStorage.get());
  const [verification, setVerification] = useState<StudentVerification | null>(null);
  const [enrollment, setEnrollment] = useState<StudentEnrollment | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      const data = await api.auth.me();
      setUser(data.user);
      setVerification(data.verification || null);
      setEnrollment(data.enrollment || null);
    } catch (err) {
      console.warn('Could not fetch user profile session:', err);
      setUser(null);
      setVerification(null);
      setEnrollment(null);
      tokenStorage.clear();
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshProfile();
    } else {
      // Auto-load default verified student for initial demo experience if not logged in
      setIsLoading(false);
    }
  }, [token]);

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login(credentials);
      tokenStorage.set(res.token);
      setToken(res.token);
      setUser(res.user);
      setVerification(res.verification || null);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (formData: any) => {
    setIsLoading(true);
    try {
      const res = await api.student.register(formData);
      tokenStorage.set(res.token);
      setToken(res.token);
      setUser(res.user);
      setVerification(res.verification);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    } finally {
      tokenStorage.clear();
      setToken(null);
      setUser(null);
      setVerification(null);
      setEnrollment(null);
    }
  };

  const switchDemoUser = async (email: string) => {
    const password = email.startsWith('admin') ? 'Admin@1234' : 'Student@1234';
    await login({ email, password });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        token,
        verification,
        enrollment,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
        switchDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
