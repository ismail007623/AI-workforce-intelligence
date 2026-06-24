"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { AppShell } from "@/components/layout/AppShell";
import { hrNav } from "@/components/layout/nav";
import { Splash } from "@/components/shared/Splash";

export default function HrLayout({ children }: { children: React.ReactNode }) {
  const { role, hydrated } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (role !== "hr") {
      router.replace(role === "employee" ? "/employee" : "/");
    }
  }, [hydrated, role, router]);

  if (!hydrated || role !== "hr") {
    return <Splash label="Opening HR command center..." />;
  }

  return (
    <AppShell sections={hrNav} userName="HR Admin" userSubtitle="Workforce Manager">
      {children}
    </AppShell>
  );
}
