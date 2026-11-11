"use client";

import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import type { DepartmentStats } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

function riskVariant(level?: string): "low" | "medium" | "high" | "neutral" {
  const l = (level ?? "").toLowerCase();
  if (l === "low") return "low";
  if (l === "medium") return "medium";
  if (l === "high") return "high";
  return "neutral";
}

function MetricRow({ label, value, valueClass }: { label: string; value: string | number; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] py-2.5 last:border-0">
      <span className="text-[12px] text-[var(--color-text-muted)]">{label}</span>
      <span className={`text-[13px] font-semibold ${valueClass ?? "text-[var(--color-text-primary)]"}`}>
        {value}
      </span>
    </div>
  );
}

function StatPill({
  label,
  value,
  bg,
  text,
}: {
  label: string;
  value: number;
  bg: string;
  text: string;
}) {
  return (
    <div className={`flex flex-col items-center rounded-[var(--radius-md)] px-3 py-2.5 ${bg}`}>
      <span className={`text-[18px] font-bold ${text}`}>{value}</span>
      <span className={`text-[10px] font-semibold uppercase tracking-wide ${text} opacity-70`}>
        {label}
      </span>
    </div>
  );
}

export function DeptDrawer({
  dept,
  onClose,
}: {
  dept: DepartmentStats | null;
  onClose: () => void;
}) {
  if (!dept) return null;

  const rate =
    dept.attendance_rate ??
    (dept.total_employees ? Math.round((dept.present / dept.total_employees) * 100) : 0);

  const deptHref = `/hr/departments/${encodeURIComponent(dept.department)}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-[#17172b]/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <aside className="fixed inset-y-0 right-0 z-50 flex w-80 flex-col border-l border-[var(--color-border)] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Department
            </p>
            <h2 className="mt-0.5 truncate text-[16px] font-bold text-[var(--color-text-primary)]">
              {dept.department}
            </h2>
            {dept.department_risk_level && (
              <div className="mt-1.5">
                <Badge variant={riskVariant(dept.department_risk_level)}>
                  {dept.department_risk_level} Risk
                </Badge>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-secondary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Attendance rate hero */}
          <div className="flex flex-col items-center rounded-[var(--radius-xl)] bg-[var(--color-primary-xlight)] py-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
              Attendance Rate
            </p>
            <p className="mt-1 text-[40px] font-bold leading-none text-[var(--color-primary)]">
              {rate}%
            </p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">Today's attendance</p>
          </div>

          {/* Present / Late / Absent / Total pills */}
          <div className="grid grid-cols-2 gap-2">
            <StatPill label="Present" value={dept.present} bg="bg-[var(--color-success-light)]" text="text-[var(--color-success)]" />
            <StatPill label="Late" value={dept.late} bg="bg-[var(--color-warning-light)]" text="text-[var(--color-warning)]" />
            <StatPill label="Absent" value={dept.absent} bg="bg-[var(--color-danger-light)]" text="text-[var(--color-danger)]" />
            <StatPill label="Total" value={dept.total_employees} bg="bg-[var(--color-primary-xlight)]" text="text-[var(--color-primary)]" />
          </div>

          {/* Performance metrics */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card-hover)] px-4 py-1">
            <MetricRow
              label="Lateness Rate"
              value={dept.lateness_rate != null ? `${dept.lateness_rate}%` : "—"}
              valueClass={
                (dept.lateness_rate ?? 0) > 30
                  ? "text-[var(--color-danger)]"
                  : "text-[var(--color-text-primary)]"
              }
            />
            <MetricRow
              label="Avg Reliability"
              value={dept.avg_reliability != null ? `${Math.round(dept.avg_reliability)}/100` : "—"}
              valueClass={
                (dept.avg_reliability ?? 100) >= 80
                  ? "text-[var(--color-success)]"
                  : (dept.avg_reliability ?? 100) >= 60
                    ? "text-[var(--color-warning)]"
                    : "text-[var(--color-danger)]"
              }
            />
            <MetricRow label="Early Left" value={dept.early_left ?? 0} />
          </div>

          {/* Reason breakdown */}
          {(dept.valid_reasons != null || dept.weak_reasons != null || dept.invalid_reasons != null) && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Late Reason Breakdown
              </p>
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card-hover)] px-4 py-1">
                <MetricRow
                  label="Valid Reasons"
                  value={dept.valid_reasons ?? 0}
                  valueClass="text-[var(--color-success)]"
                />
                <MetricRow
                  label="Weak Reasons"
                  value={dept.weak_reasons ?? 0}
                  valueClass="text-[var(--color-warning)]"
                />
                <MetricRow
                  label="Invalid Reasons"
                  value={dept.invalid_reasons ?? 0}
                  valueClass="text-[var(--color-danger)]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 border-t border-[var(--color-border)] px-5 py-4">
          <Link
            href={deptHref}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            View full department
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </aside>
    </>
  );
}
