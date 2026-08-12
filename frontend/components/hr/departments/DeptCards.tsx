"use client";

import Link from "next/link";
import { ArrowRight, BarChart2, Briefcase, Code2, DollarSign, HeartPulse, Megaphone, Settings, ShoppingCart, Users } from "lucide-react";
import type { DepartmentStats } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function computedRiskVariant(rate: number): "low" | "medium" | "high" {
  if (rate >= 85) return "low";
  if (rate >= 60) return "medium";
  return "high";
}

function computedRiskLabel(rate: number): string {
  if (rate >= 85) return "Low";
  if (rate >= 60) return "Medium";
  return "High";
}

// Pick a deterministic icon + color from department name
const DEPT_THEMES = [
  { Icon: Code2, bg: "bg-violet-100", text: "text-violet-600", bar: "bg-violet-500" },
  { Icon: Briefcase, bg: "bg-blue-100", text: "text-blue-600", bar: "bg-blue-500" },
  { Icon: Users, bg: "bg-emerald-100", text: "text-emerald-600", bar: "bg-emerald-500" },
  { Icon: DollarSign, bg: "bg-amber-100", text: "text-amber-600", bar: "bg-amber-500" },
  { Icon: Megaphone, bg: "bg-pink-100", text: "text-pink-600", bar: "bg-pink-500" },
  { Icon: ShoppingCart, bg: "bg-sky-100", text: "text-sky-600", bar: "bg-sky-500" },
  { Icon: Settings, bg: "bg-slate-100", text: "text-slate-600", bar: "bg-slate-500" },
  { Icon: HeartPulse, bg: "bg-rose-100", text: "text-rose-600", bar: "bg-rose-500" },
  { Icon: BarChart2, bg: "bg-indigo-100", text: "text-indigo-600", bar: "bg-indigo-500" },
];

function deptTheme(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return DEPT_THEMES[Math.abs(hash) % DEPT_THEMES.length];
}

// Simple deterministic mini sparkline SVG (decorative — no time-series API data available)
function MiniSparkline({ rate, color }: { rate: number; color: string }) {
  // Generate a smooth wave anchored to the actual rate value
  const h = 28;
  const w = 64;
  const mid = h - (rate / 100) * h;
  const pts = [
    [0, mid + 6],
    [10, mid + 2],
    [20, mid - 4],
    [32, mid + 1],
    [44, mid - 3],
    [54, mid + 2],
    [w, mid],
  ];
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${Math.max(2, Math.min(h - 2, y))}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className="shrink-0">
      <path d={d} stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DeptCard({
  d,
  onSelectDept,
}: {
  d: DepartmentStats;
  onSelectDept: (dept: DepartmentStats) => void;
}) {
  const rate =
    d.attendance_rate ??
    (d.total_employees ? Math.round((d.present / d.total_employees) * 100) : 0);
  const theme = deptTheme(d.department);
  const { Icon } = theme;
  const rateColor =
    rate >= 85 ? "#22c55e" : rate >= 60 ? "#f59e0b" : "#ef4444";
  const rateLabel =
    rate >= 85 ? "Excellent" : rate >= 60 ? "Moderate" : "At Risk";
  const rateLabelClass =
    rate >= 85
      ? "text-[var(--color-success)]"
      : rate >= 60
        ? "text-amber-500"
        : "text-[var(--color-danger)]";

  return (
    <div className="group flex flex-col rounded-[18px] border border-[var(--color-border)] bg-white p-4 shadow-[0_8px_24px_rgba(30,20,60,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(108,92,231,0.12)]">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${theme.bg}`}
          >
            <Icon className={`h-4.5 w-4.5 ${theme.text}`} />
          </div>
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-[14px] font-bold leading-snug text-[var(--color-text-primary)]">
              {d.department}
            </h3>
            <p className="text-[11px] text-[var(--color-text-muted)]">Team of {d.total_employees}</p>
          </div>
        </div>
        <Badge variant={computedRiskVariant(rate)} className="shrink-0">
          {computedRiskLabel(rate)}
        </Badge>
      </div>

      {/* Attendance rate + sparkline */}
      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Attendance Rate
          </p>
          <p
            className="mt-0.5 text-[24px] font-extrabold leading-none"
            style={{ color: rateColor }}
          >
            {rate}%
          </p>
          <p className={`mt-0.5 text-[11px] font-semibold ${rateLabelClass}`}>{rateLabel}</p>
        </div>
        <MiniSparkline rate={rate} color={rateColor} />
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${rate}%`, backgroundColor: rateColor }}
        />
      </div>

      {/* Present / Late / Absent pills */}
      <div className="mt-3 flex items-stretch gap-2">
        <div className="flex flex-1 flex-col items-center gap-0.5 rounded-xl bg-[var(--color-success-light)] py-1.5">
          <span className="text-[14px] font-bold text-[var(--color-success)]">{d.present}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-success)] opacity-70">
            Present
          </span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-0.5 rounded-xl bg-[var(--color-warning-light)] py-1.5">
          <span className="text-[14px] font-bold text-amber-500">{d.late}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-500 opacity-70">
            Late
          </span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-0.5 rounded-xl bg-[var(--color-danger-light)] py-1.5">
          <span className="text-[14px] font-bold text-[var(--color-danger)]">{d.absent}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-danger)] opacity-70">
            Absent
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-2.5">
        <button
          type="button"
          onClick={() => onSelectDept(d)}
          className="flex items-center gap-1 text-[12px] font-semibold text-[var(--color-primary)] transition-all hover:gap-1.5"
        >
          View details
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <Link
          href={`/hr/departments/${encodeURIComponent(d.department)}`}
          className="text-[11px] font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-primary)]"
          onClick={(e) => e.stopPropagation()}
        >
          Full report
        </Link>
      </div>
    </div>
  );
}

export function DeptCards({
  data,
  loading,
  onSelectDept,
}: {
  data: DepartmentStats[];
  loading: boolean;
  onSelectDept: (d: DepartmentStats) => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-[18px]" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] py-16 text-center">
        <Users className="h-10 w-10 text-[var(--color-text-muted)]" />
        <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">
          No departments found
        </p>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Try adjusting your filters or search term.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((d) => (
        <DeptCard key={d.department} d={d} onSelectDept={onSelectDept} />
      ))}
    </div>
  );
}
