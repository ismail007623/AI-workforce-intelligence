"use client";

import { AlertTriangle, Clock, TrendingDown } from "lucide-react";
import type { DepartmentStats } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

function riskVariant(level?: string): "low" | "medium" | "high" | "neutral" {
  const l = (level ?? "").toLowerCase();
  if (l === "low") return "low";
  if (l === "medium") return "medium";
  if (l === "high") return "high";
  return "neutral";
}

function AttentionCard({
  accentColor,
  icon: Icon,
  category,
  department,
  metric,
  sub,
  risk,
}: {
  accentColor: string;
  icon: React.ElementType;
  category: string;
  department: string;
  metric: string;
  sub?: string;
  risk?: string;
}) {
  return (
    <div
      className="relative flex flex-col gap-3 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]"
      style={{ borderLeftWidth: 3, borderLeftColor: accentColor }}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
          style={{ background: `${accentColor}18` }}
        >
          <Icon className="h-4 w-4" style={{ color: accentColor }} />
        </div>
        {risk && <Badge variant={riskVariant(risk)}>{risk}</Badge>}
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {category}
        </p>
        <p className="mt-0.5 text-[17px] font-bold text-[var(--color-text-primary)]">{department}</p>
        <p className="mt-1 text-[13px] font-semibold" style={{ color: accentColor }}>
          {metric}
        </p>
        {sub && (
          <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">{sub}</p>
        )}
      </div>
    </div>
  );
}

export function DeptNeedsAttention({ data }: { data: DepartmentStats[] }) {
  if (data.length === 0) return null;

  const mostLate = [...data].sort((a, b) => b.late - a.late)[0];
  const mostLatePercent = mostLate.total_employees
    ? Math.round((mostLate.late / mostLate.total_employees) * 100)
    : 0;

  const lowestAttendance = [...data].sort((a, b) => {
    const rateA = a.attendance_rate ?? (a.total_employees ? (a.present / a.total_employees) * 100 : 0);
    const rateB = b.attendance_rate ?? (b.total_employees ? (b.present / b.total_employees) * 100 : 0);
    return rateA - rateB;
  })[0];
  const lowestRate =
    lowestAttendance.attendance_rate ??
    (lowestAttendance.total_employees
      ? Math.round((lowestAttendance.present / lowestAttendance.total_employees) * 100)
      : 0);

  const highestRisk =
    data.find((d) => (d.department_risk_level ?? "").toLowerCase() === "high") ??
    [...data].sort((a, b) => (b.lateness_rate ?? 0) - (a.lateness_rate ?? 0))[0];

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-[15px] font-bold text-[var(--color-text-primary)]">Needs attention</h2>
        <p className="text-[13px] text-[var(--color-text-muted)]">
          Departments that require your focus today.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AttentionCard
          accentColor="#f59e0b"
          icon={Clock}
          category="Most Late"
          department={mostLate.department}
          metric={`${mostLate.late} late · ${mostLatePercent}% of team`}
          risk={mostLate.department_risk_level}
        />
        <AttentionCard
          accentColor="#ef4444"
          icon={TrendingDown}
          category="Lowest Attendance"
          department={lowestAttendance.department}
          metric={`${lowestRate}% attendance`}
          sub={`${lowestAttendance.absent} absent today`}
          risk={lowestAttendance.department_risk_level}
        />
        <AttentionCard
          accentColor="#6c5ce7"
          icon={AlertTriangle}
          category="Highest Risk"
          department={highestRisk.department}
          metric={
            highestRisk.avg_reliability != null
              ? `Reliability score: ${highestRisk.avg_reliability}/100`
              : `Lateness rate: ${highestRisk.lateness_rate ?? 0}%`
          }
          risk={highestRisk.department_risk_level}
        />
      </div>
    </div>
  );
}
