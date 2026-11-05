"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, clearTokens, getRefreshToken, setTokens } from "./api";
import type { AuthUser, Employee, LoginPayload, SignupPayload, UserRole } from "./types";

interface SessionState {
  role: UserRole | null;
  user: AuthUser | null;
  employee: Employee | null;
  hydrated: boolean;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  signup: (payload: SignupPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  clearSession: () => void;
}

const SessionContext = createContext<SessionState | undefined>(undefined);

function employeeFromUser(user: AuthUser): Employee | null {
  if (!user.employee_id) return null;
  return {
    employee_id: user.employee_id,
    name: user.name,
    email: user.email,
    department: user.department ?? "",
  };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);

  const role = user?.role ?? null;
  const employee = user ? employeeFromUser(user) : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        localStorage.removeItem("awi.role");
        localStorage.removeItem("awi.employee");
        if (getRefreshToken()) {
          const me = await api.getMe();
          if (!cancelled) setUser(me);
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setLoading(true);
    try {
      const data = await api.login(payload);
      setTokens(data.tokens);
      setUser(data.user);
      setHydrated(true);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (payload: SignupPayload) => {
    setLoading(true);
    try {
      const data = await api.signup(payload);
      setTokens(data.tokens);
      setUser(data.user);
      setHydrated(true);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSession = useCallback(() => {
    clearTokens();
    setUser(null);
    setHydrated(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  return (
    <SessionContext.Provider
      value={{ role, user, employee, hydrated, loading, login, signup, logout, clearSession }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
