'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api, tokenStore } from './api';
import { closeSocket } from './socket';
import type { Role, User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    email: string;
    name: string;
    password: string;
    role: Role;
  }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // On first load, hydrate the session from a stored token. All state updates
  // happen in promise callbacks (never synchronously in the effect body).
  useEffect(() => {
    const token = tokenStore.get();
    const hydrate = token ? api.me() : Promise.resolve(null);
    hydrate
      .then((u) => {
        if (u) setUser(u);
      })
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password });
    tokenStore.set(res.accessToken);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (data: {
      email: string;
      name: string;
      password: string;
      role: Role;
    }) => {
      const res = await api.register(data);
      tokenStore.set(res.accessToken);
      setUser(res.user);
      return res.user;
    },
    [],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    closeSocket();
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
