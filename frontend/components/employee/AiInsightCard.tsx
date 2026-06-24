"use client";

import Link from "next/link";
import { BsStars } from "react-icons/bs";
import { FiCheckCircle } from "react-icons/fi";
import type { EmployeeSummary } from "@/lib/types";

export function AiInsightCard({ summary }: { summary?: EmployeeSummary }) {
  const lateCount = summary?.late_arrivals_this_month ?? 0;
  const rate = summary?.attendance_rate_this_month ?? 0;
  const risk = summary?.risk_level ?? "low";

  const bullets = [
    lateCount > 0
      ? `You have ${lateCount} late arrival${lateCount !== 1 ? "s" : ""} this month — consider leaving 15 minutes earlier.`
      : "You have maintained punctual check-ins this month. Keep it up!",
    rate >= 90
      ? `Your ${rate}% attendance rate is above the team average.`
      : `Your attendance rate is ${rate}%. Aim for 90%+ for optimal performance.`,
    risk === "low"
      ? "Your risk level is low — no immediate HR follow-up expected."
      : `Your risk level is ${risk}. HR may reach out if the pattern continues.`,
  ];

  return (
    <div className="ds-card">
      <div className="mb-4 flex items-center gap-2">
        <BsStars size={18} className="text-[var(--color-primary)]" />
        <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
          AI Attendance Insight
        </h2>
      </div>
      <p className="mb-3.5 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
        Based on your attendance patterns this month, here are personalized recommendations
        to help you stay consistent and improve punctuality.
      </p>
      <ul className="space-y-2.5">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <FiCheckCircle
              size={14}
              className="mt-0.5 shrink-0 text-[var(--color-primary)]"
            />
            <span className="text-[13px] text-[var(--color-text-secondary)]">{b}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/employee/summary"
        className="mt-4 block w-full rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-primary)] py-2.5 text-center text-[13px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-xlight)]"
      >
        View Detailed Analysis
      </Link>
    </div>
  );
}
