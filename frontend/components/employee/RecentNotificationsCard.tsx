"use client";

import { FiAlertCircle, FiArrowRight, FiCheck, FiFileText } from "react-icons/fi";
import type { AttendanceRecord, EmployeeSummary } from "@/lib/types";
import { formatDate, formatTime } from "@/lib/utils";

export function RecentNotificationsCard({
  summary,
  recent,
}: {
  summary?: EmployeeSummary;
  recent: AttendanceRecord[];
}) {
  const notifications = buildNotifications(summary, recent);

  return (
    <div className="ds-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
          Recent Notifications
        </h2>
        <span className="text-xs font-medium text-[var(--color-primary)]">View all</span>
      </div>

      <div>
        {notifications.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[var(--color-text-muted)]">
            No notifications yet.
          </p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-3 border-b border-[var(--color-border)] py-3 last:border-0"
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                style={{ background: n.iconBg }}
              >
                <n.icon size={16} style={{ color: n.iconColor }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                  {n.title}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{n.body}</p>
              </div>
              <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">
                {n.time}
              </span>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        className="mt-3 flex w-full items-center justify-center gap-1.5 text-[13px] font-medium text-[var(--color-primary)]"
      >
        Go to Notifications <FiArrowRight size={14} />
      </button>
    </div>
  );
}

function buildNotifications(summary?: EmployeeSummary, recent: AttendanceRecord[] = []) {
  const items: {
    id: string;
    title: string;
    body: string;
    time: string;
    icon: typeof FiCheck;
    iconBg: string;
    iconColor: string;
  }[] = [];

  const latest = recent[0];
  if (latest?.check_in_status === "late") {
    items.push({
      id: "late-warn",
      title: "Late Arrival Warning",
      body: `You checked in ${latest.late_minutes} minutes late on ${formatDate(latest.date)}.`,
      time: formatTime(latest.check_in_time),
      icon: FiAlertCircle,
      iconBg: "#fff4e5",
      iconColor: "#fdcb6e",
    });
  }

  if (latest?.check_in_time) {
    items.push({
      id: "checkin",
      title: "Check In Recorded",
      body: `Your check-in at ${formatTime(latest.check_in_time)} was successfully logged.`,
      time: "Today",
      icon: FiCheck,
      iconBg: "#e0f8f3",
      iconColor: "#00b894",
    });
  }

  if (summary) {
    items.push({
      id: "summary",
      title: "Weekly Summary",
      body: `Your attendance rate this month is ${summary.attendance_rate_this_month}%.`,
      time: "This month",
      icon: FiFileText,
      iconBg: "#eaf4ff",
      iconColor: "#74b9ff",
    });
  }

  return items.slice(0, 3);
}
