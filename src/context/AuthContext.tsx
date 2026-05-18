'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export interface UserProfile {
  id: string;
  username: string;
  accountNumber: string;
  isGuest: boolean;
}

interface AuthContextResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (username: string, password?: string) => Promise<AuthContextResult>;
  register: (username: string, password?: string, contact?: string, referralCode?: string) => Promise<AuthContextResult>;
  loginAsGuest: () => Promise<AuthContextResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // ── Bootstrap: load session from server ──
  useEffect(() => {
    // Load initial session
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setUser({
              id: data.user.id || `user-${data.user.username}`,
              username: data.user.username,
              accountNumber: data.user.accountNumber,
              isGuest: data.user.isGuest,
            });
          }
        }
      } catch {
        // session absent or offline — silently ignore
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (username: string, password?: string): Promise<AuthContextResult> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, isGuest: false }),
      });
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        setUser({
          id: data.user.id || `user-${data.user.username}`,
          username: data.user.username,
          accountNumber: data.user.accountNumber,
          isGuest: data.user.isGuest,
        });
        router.push('/virtuals');
        return { success: true };
      }
      return { success: false, error: data.error || 'Authentication failed' };
    } catch {
      return { success: false, error: 'Authorization server offline' };
    }
  };

  const register = async (username: string, password?: string, contact?: string, referralCode?: string): Promise<AuthContextResult> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, contact, referralCode }),
      });
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        setUser({
          id: data.user.id || `user-${data.user.username}`,
          username: data.user.username,
          accountNumber: data.user.accountNumber,
          isGuest: false,
        });
        router.push('/virtuals');
        return { success: true };
      }
      return { success: false, error: data.error || 'Registration failed' };
    } catch {
      return { success: false, error: 'Registration server offline' };
    }
  };

  const loginAsGuest = async (): Promise<AuthContextResult> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isGuest: true }),
      });
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        setUser({
          id: data.user.id || `guest-${data.user.username}`,
          username: data.user.username,
          accountNumber: data.user.accountNumber,
          isGuest: true,
        });
        router.push('/virtuals');
        return { success: true };
      }
      return { success: false, error: data.error || 'Guest session failed' };
    } catch {
      return { success: false, error: 'Authentication server offline' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      // Also sign out from Supabase client-side to clear JWT cookie
      await getSupabaseBrowser().auth.signOut();
    } catch {
      // ignore
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
