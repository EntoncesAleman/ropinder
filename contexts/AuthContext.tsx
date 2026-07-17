"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface AuthUser {
  id: string; name: string; fullName: string; email: string; avatar: string; bio: string; phone: string; phoneVerified: boolean;
  address: string; crossStreets: string; postalCode: string;
  isPremium: boolean; premiumUntil: string | null; premiumPlan: string | null; credits: number; balance: number; latitude: number; longitude: number;
  role: string; bannedAt: string | null; ratingAvg: number; ratingCount: number;
  verified: boolean; emailVerified: boolean;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ user: null, loading: true, refresh: async () => {}, logout: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(res.ok ? data.user : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return <Ctx.Provider value={{ user, loading, refresh, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
