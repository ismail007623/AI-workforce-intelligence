"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Clock,
  FileText,
  History,
  LogIn,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";

/* ------------------------------------------------------------------ */
/* Taqwi-style split auth layout: brand panel + form panel.           */
/* The form itself is passed in as children and is unchanged per      */
/* page — only the surrounding layout is shared.                      */
/* ------------------------------------------------------------------ */

const ORBIT_CHIPS = [
  { label: "Check-in", icon: LogIn, className: "left-[2%] top-[8%]" },
  { label: "History", icon: History, className: "right-[2%] top-[14%]" },
  { label: "Policy", icon: FileText, className: "left-0 top-[46%]" },
  { label: "Insights", icon: BarChart3, className: "right-0 top-[48%]" },
  { label: "Late", icon: Clock, className: "bottom-[10%] left-[8%]" },
  { label: "Departments", icon: UserCheck, className: "bottom-[6%] right-[6%]" },
];

const HIGHLIGHTS = [
  {
    title: "Late reason validation",
    desc: "Late arrivals submit a reason, and it is validated for HR.",
  },
  {
    title: "AI Attendance Insights",
    desc: "Ask a question in plain English and get an answer from real attendance data.",
  },
  {
    title: "HR Policy Assistant",
    desc: "Answers come from your company's own uploaded policy document only.",
  },
];

function HighlightedCapability() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((value) => (value + 1) % HIGHLIGHTS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);
  const item = HIGHLIGHTS[index];
  return (
    <div className="rounded-[20px] border border-[var(--color-border)] bg-white p-4">
      <p className="eyebrow">Highlighted capability</p>
      <div key={index} className="animate-fade-in mt-3">
        <p className="flex items-start gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
          {item.title}
        </p>
        <p className="mt-1 pl-6 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          {item.desc}
        </p>
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="flex flex-col bg-[var(--color-primary-xlight)] p-6 sm:p-10">
      <Link href="/" aria-label="Back to home" className="w-fit">
        <Logo />
      </Link>
      <h2 className="mt-10 text-3xl font-extrabold leading-[1.1] tracking-tight text-[var(--color-text-primary)]">
        Your AI Copilot for{" "}
        <span className="text-[var(--color-primary)]">Workforce Intelligence</span>
      </h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--color-text-secondary)]">
        Check in in one tap, see your own attendance, and let AI turn the
        whole company&apos;s attendance into clear answers for HR.
      </p>

      {/* Orbit diagram: centre circle ringed by feature chips */}
      <div className="relative mx-auto mt-10 h-64 w-full max-w-sm" aria-hidden>
        <div className="ai-bridge-gradient absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-center text-white shadow-[var(--shadow-overlay)]">
          <span className="text-sm font-bold leading-tight">AI Workforce</span>
          <span className="mt-0.5 text-[10px] font-medium text-white/80">Attendance intelligence</span>
        </div>
        {ORBIT_CHIPS.map((chip) => (
          <span
            key={chip.label}
            className={`absolute ${chip.className} inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)]`}
          >
            <chip.icon className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            {chip.label}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-8">
        <HighlightedCapability />
      </div>
    </div>
  );
}

export function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-soft)] px-4 py-10">
      <div className="w-full max-w-5xl">
        <div className="grid overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] lg:grid-cols-2">
          <BrandPanel />
          <div className="p-6 sm:p-10">{children}</div>
        </div>
        <p className="mt-4 flex items-start justify-center gap-1.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Your data is secure with us
        </p>
        <p className="mt-2 text-center text-xs text-[var(--color-text-muted)]">
          <Link href="/" className="hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
