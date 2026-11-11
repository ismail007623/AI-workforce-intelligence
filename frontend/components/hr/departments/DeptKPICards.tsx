"use client";

import { AlertTriangle, Building2, Clock, TrendingUp } from "lucide-react";
import type { DepartmentStats } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

// Decorative sparkline using attendance rate as anchor (no real time-series data available)
function KpiSparkline({ value, color }: { value: number; color: string }) {
  const w = 72;
  const h = 32;
  // Build a gentle ascending wave anchored to the ratio
  const ratio = Math.min(Math.max(value / 100, 0), 1);
  const base = h - ratio * (h * 0.7) - 4;
  const pts: [number, number][] = [
    [0, base + 8],
    [12, base + 4],
    [24, base + 7],
    [36, base + 2],
    [48, base + 5],
    [60, base + 1],
    [w, base],
  ];
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${Math.max(2, Math.min(h - 2, y))}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <path d={path} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
  sparkColor,
  sparkValue,
  loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  subUp?: boolean;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  sparkColor: string;
  sparkValue: number;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
        <Skeleton className="mt-3 h-8 w-20 rounded" />
        <Skeleton className="mt-2 h-3 w-36 rounded" />
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-semibold text-[var(--color-text-muted)]">{label}</p>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon className={`h-[18px] w-[18px] ${iconColor}`} />
        </div>
      </div>
      <p className="mt-2 text-[28px] font-extrabold leading-none text-[var(--color-text-primary)]">
        {value}
      </p>
      <div className="mt-3 flex items-end justify-between gap-2">
        {sub && (
          <p className="text-[11px] font-medium text-[var(--color-text-muted)]">{sub}</p>
        )}
        <KpiSparkline value={sparkValue} color={sparkColor} />
      </div>
    </div>
  );
}

export function DeptKPICards({
  data,
  loading,
}: {
  data: DepartmentStats[];
  loading: boolean;
}) {
  const totalDepts = data.length;

  const avgAttendance =
    data.length > 0
      ? Math.round(
          data.reduce((sum, d) => {
            const rate =
              d.attendance_rate ??
              (d.total_employees ? (d.present / d.total_employees) * 100 : 0);
            return sum + rate;
          }, 0) / data.length,
        )
      : 0;

  const highRiskDept = data.find(
    (d) => (d.department_risk_level ?? "").toLowerCase() === "high",
  );

  const totalLate = data.reduce((sum, d) => sum + d.late, 0);
  const totalPresent = data.reduce((sum, d) => sum + d.present, 0);
  const totalEmployees = data.reduce((sum, d) => sum + d.total_employees, 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Total Departments"
        value={totalDepts}
        sub="Active teams"
        icon={Building2}
        iconBg="bg-[var(--color-primary-xlight)]"
        iconColor="text-[var(--color-primary)]"
        sparkColor="#6554e8"
        sparkValue={totalDepts * 14}
        loading={loading}
      />
      <KpiCard
        label="Average Attendance"
        value={`${avgAttendance}%`}
        sub={`${totalPresent} of ${totalEmployees} employees present today`}
        icon={TrendingUp}
        iconBg="bg-[var(--color-success-light)]"
        iconColor="text-[var(--color-success)]"
        sparkColor="#22c55e"
        sparkValue={avgAttendance}
        loading={loading}
      />
      <KpiCard
        label="Highest Risk Department"
        value={highRiskDept?.department ?? "None"}
        sub={highRiskDept ? "High Risk" : "All stable"}
        icon={AlertTriangle}
        iconBg="bg-[var(--color-danger-light)]"
        iconColor="text-[var(--color-danger)]"
        sparkColor="#dc5263"
        sparkValue={highRiskDept ? 25 : 85}
        loading={loading}
      />
      <KpiCard
        label="Total Late Today"
        value={totalLate}
        sub={`Across ${totalDepts} department${totalDepts !== 1 ? "s" : ""}`}
        icon={Clock}
        iconBg="bg-[var(--color-warning-light)]"
        iconColor="text-[var(--color-warning)]"
        sparkColor="#d58b25"
        sparkValue={totalLate}
        loading={loading}
      />
    </div>
  );
}
