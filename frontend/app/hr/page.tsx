"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  UserX,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import type { AttendanceRecord, DailyTrendPoint } from "@/lib/types";
import { greeting, formatFullDate, formatTime, initials } from "@/lib/utils";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingGrid } from "@/components/shared/states";

function delta(curr?: number, prev?: number): { trend?: string; dir?: "up" | "down" | "neutral" } {
  if (curr === undefined || prev === undefined) return {};
  const diff = curr - prev;
  if (diff === 0) return { trend: "No change vs yesterday", dir: "neutral" };
  return {
    trend: `${diff > 0 ? "+" : ""}${diff} vs yesterday`,
    dir: diff > 0 ? "up" : "down",
  };
}

export default function HrDashboardPage() {
  const summaryQ = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: api.getDashboardSummary,
    refetchInterval: 30_000,
  });
  const trendQ = useQuery({
    queryKey: ["dashboard-trend"],
    queryFn: () => api.getAttendanceTrend(7),
    refetchInterval: 60_000,
  });
  const deptQ = useQuery({
    queryKey: ["dashboard-departments"],
    queryFn: () => api.getDepartmentStats(),
    refetchInterval: 60_000,
  });
  const todayQ = useQuery({
    queryKey: ["today-attendance"],
    queryFn: api.getTodayAttendance,
    refetchInterval: 20_000,
  });

  const summary = summaryQ.data;
  const trend = trendQ.data ?? [];
  const depts = deptQ.data ?? [];

  const today: DailyTrendPoint | undefined = trend.at(-1);
  const yesterday: DailyTrendPoint | undefined = trend.length >= 2 ? trend.at(-2) : undefined;

  const checkedIn = (point?: DailyTrendPoint) =>
    point ? point.present : undefined;

  const liveRecords: AttendanceRecord[] = [...(todayQ.data ?? [])]
    .filter((r) => r.check_in_time)
    .sort(
      (a, b) =>
        new Date(b.check_in_time!).getTime() - new Date(a.check_in_time!).getTime(),
    )
    .slice(0, 6);

  const attention = buildAttention(summary, depts);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[13px] font-medium text-[var(--color-text-muted)]">{formatFullDate()}</p>
          <h1 className="mt-1 text-[22px] font-bold text-[var(--color-text-primary)]">
            {greeting()}, HR Admin
          </h1>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Here&apos;s what&apos;s happening across your workforce today.
          </p>
        </div>
        <Link
          href="/hr/insights"
          className="inline-flex items-center gap-2 self-start rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-dark)] active:scale-[0.97]"
        >
          <Sparkles className="h-4 w-4" />
          Ask AI Assistant
        </Link>
      </div>

      {/* KPIs */}
      {summaryQ.isLoading ? (
        <LoadingGrid count={4} />
      ) : !summary ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-red-500">
            Failed to load dashboard. Make sure the API server is running.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Total Employees"
            value={summary.total_employees}
            icon={Users}
            iconClassName="bg-slate-100 text-slate-600"
            trend="Active workforce"
          />
          <StatCard
            title="Present"
            value={summary.present}
            icon={CheckCircle2}
            iconClassName="bg-emerald-50 text-emerald-600"
            {...delta(checkedIn(today), checkedIn(yesterday))}
          />
          <StatCard
            title="Late"
            value={summary.late}
            icon={Clock}
            iconClassName="bg-amber-50 text-amber-600"
            {...delta(today?.late, yesterday?.late)}
          />
          <StatCard
            title="Absent"
            value={summary.absent}
            icon={UserX}
            iconClassName="bg-red-50 text-red-600"
            {...delta(today?.absent, yesterday?.absent)}
          />
          <StatCard
            title="Attendance Rate"
            value={`${summary.attendance_rate}%`}
            icon={TrendingUp}
            iconClassName="bg-[var(--color-primary-xlight)] text-[var(--color-primary)]"
            trend={`${summary.present}/${summary.total_employees} checked in`}
            trendDirection="neutral"
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Trend */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Attendance Trend</CardTitle>
            <CardDescription>Daily present / late / absent over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {trendQ.isLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trend} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gLate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="present"
                    name="Present"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#gPresent)"
                  />
                  <Area
                    type="monotone"
                    dataKey="late"
                    name="Late"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#gLate)"
                  />
                  <Area
                    type="monotone"
                    dataKey="absent"
                    name="Absent"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="transparent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
            <Legend />
          </CardContent>
        </Card>

        {/* Department lateness */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Department Lateness</CardTitle>
            <CardDescription>Lateness rate by department today</CardDescription>
          </CardHeader>
          <CardContent>
            {deptQ.isLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : depts.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-400">No department data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={depts} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="department"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    unit="%"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip suffix="%" single />} />
                  <Bar dataKey="lateness_rate" name="Lateness" radius={[6, 6, 0, 0]}>
                    {depts.map((d, i) => (
                      <Cell
                        key={i}
                        fill={
                          d.lateness_rate >= 40
                            ? "#ef4444"
                            : d.lateness_rate >= 20
                              ? "#f59e0b"
                              : "#6366f1"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live + attention */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Live Attendance</CardTitle>
              <CardDescription>Most recent check-ins today</CardDescription>
            </div>
            <Link
              href="/hr/live"
              className="flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {todayQ.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            ) : liveRecords.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">
                No check-ins recorded yet today.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {liveRecords.map((r) => (
                  <div key={r.employee_id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-xlight)] text-xs font-bold text-[var(--color-primary)]">
                        {initials(r.employee_name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{r.employee_name}</p>
                        <p className="text-xs text-slate-400">{r.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-500">
                        {formatTime(r.check_in_time)}
                      </span>
                      <StatusBadge status={r.check_in_status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attention required */}
        <Card>
          <CardHeader>
            <CardTitle>Attention Required</CardTitle>
            <CardDescription>Issues that may need follow-up</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {attention.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p className="mt-2 text-sm font-medium text-slate-600">All clear</p>
                <p className="text-xs text-slate-400">No issues require attention.</p>
              </div>
            ) : (
              attention.map((a) => (
                <div
                  key={a.text}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <p className="text-sm text-slate-600">{a.text}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${a.cls}`}
                  >
                    {a.level}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Legend() {
  const items = [
    { label: "Present", color: "#10b981" },
    { label: "Late", color: "#f59e0b" },
    { label: "Absent", color: "#ef4444" },
  ];
  return (
    <div className="mt-3 flex items-center justify-center gap-5">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} />
          <span className="text-xs font-medium text-slate-500">{i.label}</span>
        </div>
      ))}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  suffix = "",
  single = false,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string; fill?: string }[];
  label?: string;
  suffix?: string;
  single?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-slate-400">{label}</p>
      {(single ? payload.slice(0, 1) : payload).map((p) => (
        <p key={p.name} className="text-sm font-medium" style={{ color: p.color ?? p.fill }}>
          {p.name}: {p.value}
          {suffix}
        </p>
      ))}
    </div>
  );
}

function buildAttention(
  summary: { late: number; absent: number } | undefined,
  depts: {
    department: string;
    lateness_rate: number;
    total_employees: number;
    present: number;
    late: number;
    invalid_reasons?: number;
    weak_reasons?: number;
    department_risk_level?: string;
  }[],
) {
  if (!summary) return [] as { text: string; level: string; cls: string }[];

  const items: { text: string; level: string; cls: string }[] = [];

  if (summary.absent > 0)
    items.push({
      text: `${summary.absent} employee${summary.absent !== 1 ? "s" : ""} absent without check-in today`,
      level: "High",
      cls: "bg-red-100 text-red-700",
    });
  if (summary.late > 0)
    items.push({
      text: `${summary.late} employee${summary.late !== 1 ? "s" : ""} arrived late today`,
      level: "Medium",
      cls: "bg-amber-100 text-amber-700",
    });

  const highRiskDept = depts.find((d) => d.department_risk_level?.toLowerCase() === "high");
  if (highRiskDept)
    items.push({
      text: `${highRiskDept.department} flagged as high discipline risk (weak/invalid reasons)`,
      level: "High",
      cls: "bg-red-100 text-red-700",
    });

  const invalidHeavy = [...depts]
    .filter((d) => (d.invalid_reasons ?? 0) > 0)
    .sort((a, b) => (b.invalid_reasons ?? 0) - (a.invalid_reasons ?? 0))[0];
  if (invalidHeavy && (invalidHeavy.invalid_reasons ?? 0) > 0)
    items.push({
      text: `${invalidHeavy.department} has ${invalidHeavy.invalid_reasons} invalid late reason${invalidHeavy.invalid_reasons !== 1 ? "s" : ""} today`,
      level: "Medium",
      cls: "bg-amber-100 text-amber-700",
    });

  const worst = [...depts].sort((a, b) => b.lateness_rate - a.lateness_rate)[0];
  if (worst && worst.lateness_rate >= 20)
    items.push({
      text: `${worst.department} has the highest lateness rate (${worst.lateness_rate}%)`,
      level: "Medium",
      cls: "bg-amber-100 text-amber-700",
    });

  const lowAttendance = depts.filter(
    (d) => d.total_employees > 0 && d.present / d.total_employees < 0.8,
  );
  if (lowAttendance.length > 0)
    items.push({
      text: `${lowAttendance.length} department${lowAttendance.length !== 1 ? "s" : ""} below 80% attendance`,
      level: "Low",
      cls: "bg-indigo-100 text-indigo-700",
    });

  return items;
}
