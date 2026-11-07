"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, TOKEN_KEY } from "./api";

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string | null;
  phone: string | null;
  organization: string | null;
  locale: string;
  is_active: boolean;
  roles: string[];
  permissions: string[];
  last_login_at: string | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (perm: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string, remember: boolean) => {
    const { data } = await api.post("/auth/login", { username, password, remember });
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    window.location.href = "/login";
  }, []);

  const can = useCallback(
    (perm: string) => !!user && (user.roles.includes("super_admin") || user.permissions.includes(perm)),
    [user],
  );
  const hasRole = useCallback((role: string) => !!user && user.roles.includes(role), [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh, can, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
