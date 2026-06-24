"use client";

import {
  FiActivity,
  FiArrowDownRight,
  FiArrowUpRight,
  FiClock,
  FiShield,
  FiTrendingUp,
} from "react-icons/fi";
import type { EmployeeSummary } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

function Sparkline({ color }: { color: string }) {
  return (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none" className="ml-auto shrink-0">
      <path
        d="M0 18 L8 14 L16 16 L24 10 L32 12 L40 6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const CARDS = [
  {
    key: "rate",
    label: "Attendance Rate",
    icon: FiTrendingUp,
    iconBg: "#ede9ff",
    iconColor: "#6c5ce7",
    sparkColor: "#a29bfe",
    getValue: (s: EmployeeSummary) => `${s.attendance_rate_this_month}%`,
    getChange: () => ({ text: "+4.2% this month", positive: true }),
  },
  {
    key: "late",
    label: "Late Arrivals",
    icon: FiClock,
    iconBg: "#fff4e5",
    iconColor: "#fdcb6e",
    sparkColor: "#fdcb6e",
    getValue: (s: EmployeeSummary) => String(s.late_arrivals_this_month),
    getChange: (s: EmployeeSummary) => ({
      text: s.late_arrivals_this_month > 0 ? "this month" : "No late arrivals",
      positive: s.late_arrivals_this_month === 0,
    }),
  },
  {
    key: "delay",
    label: "Average Delay",
    icon: FiActivity,
    iconBg: "#eaf4ff",
    iconColor: "#74b9ff",
    sparkColor: "#74b9ff",
    getValue: (s: EmployeeSummary) => `${s.average_delay_minutes} min`,
    getChange: () => ({ text: "when late", positive: false }),
  },
  {
    key: "risk",
    label: "Risk Level",
    icon: FiShield,
    iconBg: "#e0f8f3",
    iconColor: "#00b894",
    sparkColor: "#00b894",
    getValue: (s: EmployeeSummary) =>
      s.risk_level.charAt(0).toUpperCase() + s.risk_level.slice(1),
    getChange: (s: EmployeeSummary) => ({
      text: s.risk_level === "low" ? "Looking good" : "Needs attention",
      positive: s.risk_level === "low",
    }),
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
        const change = summary ? card.getChange(summary) : null;
        return (
          <div key={card.key} className="ds-stat-card">
            <div
              className="mb-2 flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)]"
              style={{ background: card.iconBg }}
            >
              <Icon size={18} style={{ color: card.iconColor }} />
            </div>
            <p className="text-xs font-medium text-[var(--color-text-muted)]">{card.label}</p>
            {loading ? (
              <Skeleton className="mt-1 h-8 w-20" />
            ) : (
              <p className="text-[28px] font-bold leading-tight text-[var(--color-text-primary)]">
                {summary ? card.getValue(summary) : "—"}
              </p>
            )}
            <div className="flex items-center justify-between">
              {change && !loading && (
                <span
                  className={`flex items-center gap-1 text-xs font-medium ${
                    change.positive ? "text-[var(--color-success)]" : "text-[var(--color-text-muted)]"
                  }`}
                >
                  {change.positive ? (
                    <FiArrowUpRight size={14} />
                  ) : (
                    <FiArrowDownRight size={14} className="text-[var(--color-danger)]" />
                  )}
                  {change.text}
                </span>
              )}
              <Sparkline color={card.sparkColor} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
