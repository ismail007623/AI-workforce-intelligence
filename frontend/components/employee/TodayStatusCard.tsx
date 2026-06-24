"use client";

import Link from "next/link";
import {
  FiBriefcase,
  FiChevronRight,
  FiClock,
  FiMonitor,
  FiUser,
} from "react-icons/fi";
import type { AttendanceRecord, Employee, EmployeeSummary } from "@/lib/types";
import { formatTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_CONFIG = {
  present: { label: "Present", color: "var(--color-success)", border: "var(--color-success)" },
  late: { label: "Late", color: "var(--color-warning)", border: "var(--color-warning)" },
  absent: { label: "Absent", color: "var(--color-danger)", border: "var(--color-danger)" },
  not_checked_in: { label: "Pending", color: "var(--color-text-muted)", border: "var(--color-border-strong)" },
} as const;

export function TodayStatusCard({
  employee,
  summary,
  todayRecord,
  loading,
}: {
  employee: Employee;
  summary?: EmployeeSummary;
  todayRecord?: AttendanceRecord;
  loading?: boolean;
}) {
  const status = summary?.today_status ?? "not_checked_in";
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.not_checked_in;
  const delayMinutes = todayRecord?.late_minutes ?? 0;

  const rows = [
    { icon: FiBriefcase, label: "Department", value: employee.department },
    { icon: FiUser, label: "Employee ID", value: employee.employee_id },
    { icon: FiMonitor, label: "Work Mode", value: "Office" },
    { icon: FiClock, label: "Expected Check In", value: "10:00 AM" },
    {
      icon: FiClock,
      label: "Actual Check In",
      value: todayRecord?.check_in_time ? formatTime(todayRecord.check_in_time) : "—",
    },
    {
      icon: FiClock,
      label: "Delay Duration",
      value: delayMinutes > 0 ? `${delayMinutes} min` : status === "late" ? "—" : "On time",
      danger: delayMinutes > 0,
    },
  ];

  return (
    <div className="ds-card ds-card-compact flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
          Today&apos;s Status
        </h2>
        <Link
          href="/employee/history"
          className="flex items-center gap-0.5 text-[11px] font-medium text-[var(--color-primary)] hover:underline"
        >
          View full history <FiChevronRight size={12} />
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex shrink-0 flex-col items-center sm:items-start">
          {loading ? (
            <Skeleton className="h-14 w-14 rounded-full" />
          ) : (
            <div
              className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-2 border-dashed"
              style={{ borderColor: cfg.border }}
            >
              <FiClock size={16} style={{ color: cfg.color }} />
              <span className="mt-0.5 text-[11px] font-semibold" style={{ color: cfg.color }}>
                {cfg.label}
              </span>
            </div>
          )}
        </div>

        <div className="grid flex-1 grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-1.5">
              <span className="flex min-w-0 items-center text-[12px] text-[var(--color-text-muted)]">
                <row.icon size={12} className="mr-1 shrink-0" />
                <span className="truncate">{row.label}</span>
              </span>
              {loading ? (
                <Skeleton className="h-3.5 w-14" />
              ) : (
                <span
                  className={`shrink-0 text-right text-[12px] font-semibold ${
                    row.danger
                      ? "text-[var(--color-danger)]"
                      : "text-[var(--color-text-primary)]"
                  }`}
                >
                  {row.value}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
