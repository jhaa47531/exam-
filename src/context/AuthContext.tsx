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
  login: (credentials: { email?: string; identifier?: string; password: string }) => Promise<void>;
  adminLogin: (credentials: { identifier: string; password: string }) => Promise<void>;
  studentLogin: (credentials: { identifier: string; password: string }) => Promise<void>;
  register: (formData: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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
      setIsLoading(false);
    }
  }, [token]);

  const login = async (credentials: { email?: string; identifier?: string; password: string }) => {
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

  const adminLogin = async (credentials: { identifier: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await api.auth.adminLogin(credentials);
      tokenStorage.set(res.token);
      setToken(res.token);
      setUser(res.user);
      setVerification(null);
    } finally {
      setIsLoading(false);
    }
  };

  const studentLogin = async (credentials: { identifier: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await api.auth.studentLogin(credentials);
      tokenStorage.set(res.token);
      setToken(res.token);
      setUser(res.user);
      setVerification(res.verification || null);
      setEnrollment(res.enrollment || null);
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
        adminLogin,
        studentLogin,
        register,
        logout,
        refreshProfile,
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
