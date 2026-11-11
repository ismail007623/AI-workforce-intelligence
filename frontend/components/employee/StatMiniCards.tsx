"use client";

import {
  FiActivity,
  FiClock,
  FiShield,
  FiTrendingUp,
} from "react-icons/fi";
import type { EmployeeSummary } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

/*
 * Values come only from the employee summary API. No fabricated
 * trends or sparkline decorations: the supporting line is a plain
 * factual note (this month / no late arrivals / when late).
 */
const CARDS = [
  {
    key: "rate",
    label: "Attendance Rate",
    icon: FiTrendingUp,
    iconClass: "bg-[var(--color-primary-xlight)] text-[var(--color-primary)]",
    getValue: (s: EmployeeSummary) => `${s.attendance_rate_this_month}%`,
    getNote: () => "This month",
  },
  {
    key: "late",
    label: "Late Arrivals",
    icon: FiClock,
    iconClass: "bg-[var(--color-warning-light)] text-[var(--color-warning)]",
    getValue: (s: EmployeeSummary) => String(s.late_arrivals_this_month),
    getNote: (s: EmployeeSummary) =>
      s.late_arrivals_this_month === 0 ? "No late arrivals" : "This month",
  },
  {
    key: "delay",
    label: "Average Delay",
    icon: FiActivity,
    iconClass: "bg-[var(--color-info-light)] text-[var(--color-info)]",
    getValue: (s: EmployeeSummary) => `${s.average_delay_minutes} min`,
    getNote: () => "When late",
  },
  {
    key: "risk",
    label: "Risk Level",
    icon: FiShield,
    iconClass: "bg-[var(--color-success-light)] text-[var(--color-success)]",
    getValue: (s: EmployeeSummary) =>
      s.risk_level.charAt(0).toUpperCase() + s.risk_level.slice(1),
    getNote: (s: EmployeeSummary) =>
      s.risk_level === "low" ? "Looking good" : "Needs attention",
  },
] as const;

export function StatMiniCards({
  summary,
  loading,
}: {
  summary?: EmployeeSummary;
  loading?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.key} className="ds-stat-card">
            <div
              className={`mb-2 flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] ${card.iconClass}`}
            >
              <Icon size={18} />
            </div>
            <p className="text-xs font-medium text-[var(--color-text-muted)]">{card.label}</p>
            {loading ? (
              <Skeleton className="mt-1 h-8 w-20" />
            ) : (
              <p className="text-[28px] font-bold leading-tight text-[var(--color-text-primary)]">
                {summary ? card.getValue(summary) : "—"}
              </p>
            )}
            {summary && !loading && (
              <span className="text-xs font-medium text-[var(--color-text-muted)]">
                {card.getNote(summary)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
