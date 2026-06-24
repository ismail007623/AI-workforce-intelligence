"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Employee, UserRole } from "./types";

interface SessionState {
  role: UserRole | null;
  employee: Employee | null;
  hydrated: boolean;
  setEmployeeSession: (employee: Employee) => void;
  setHrSession: () => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionState | undefined>(undefined);

const ROLE_KEY = "awi.role";
const EMP_KEY = "awi.employee";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedRole = localStorage.getItem(ROLE_KEY) as UserRole | null;
      const storedEmp = localStorage.getItem(EMP_KEY);
      if (storedRole) setRole(storedRole);
      if (storedEmp) setEmployee(JSON.parse(storedEmp));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const setEmployeeSession = (emp: Employee) => {
    setRole("employee");
    setEmployee(emp);
    localStorage.setItem(ROLE_KEY, "employee");
    localStorage.setItem(EMP_KEY, JSON.stringify(emp));
  };

  const setHrSession = () => {
    setRole("hr");
    setEmployee(null);
    localStorage.setItem(ROLE_KEY, "hr");
    localStorage.removeItem(EMP_KEY);
  };

  const clearSession = () => {
    setRole(null);
    setEmployee(null);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(EMP_KEY);
  };

  return (
    <SessionContext.Provider
      value={{ role, employee, hydrated, setEmployeeSession, setHrSession, clearSession }}
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
