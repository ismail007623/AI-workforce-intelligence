"use client";

import { BsStars } from "react-icons/bs";
import { FiChevronRight } from "react-icons/fi";
import type { EmployeeSummary } from "@/lib/types";

export function AiInsightBanner({ summary }: { summary?: EmployeeSummary }) {
  const text =
    summary?.today_status === "late"
      ? "You arrived late today. Try leaving 15 minutes earlier tomorrow to stay on track."
      : summary?.today_status === "present"
        ? "Great punctuality today! You're on track for a strong attendance record this month."
        : "Don't forget to check in before 10:15 AM to avoid being marked late.";

  return (
    <div className="flex max-w-[340px] items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3.5 shadow-[var(--shadow-card)]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary-xlight)]">
        <BsStars size={20} className="text-[var(--color-primary)]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-primary)]">
          AI Insight
        </p>
        <p className="mt-0.5 text-xs leading-snug text-[var(--color-text-secondary)]">{text}</p>
      </div>
      <FiChevronRight size={16} className="shrink-0 text-[var(--color-text-muted)]" />
    </div>
  );
}
