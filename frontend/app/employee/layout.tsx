"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { AppShell } from "@/components/layout/AppShell";
import { employeeNav } from "@/components/layout/nav";
import { Splash } from "@/components/shared/Splash";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const { role, employee, hydrated } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    // Access control: only an employee with a selected profile may enter.
    if (role !== "employee" || !employee) {
      router.replace(role === "hr" ? "/hr" : "/");
    }
  }, [hydrated, role, employee, router]);

  if (!hydrated || role !== "employee" || !employee) {
    return <Splash label="Opening your portal..." />;
  }

  return (
    <AppShell
      sections={employeeNav}
      userName={employee.name}
      userSubtitle={`${employee.employee_id} · ${employee.department}`}
    >
      {children}
    </AppShell>
  );
}
