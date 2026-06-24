"use client";

import { FiCheck, FiChevronDown, FiClock } from "react-icons/fi";
import type { AttendanceRecord } from "@/lib/types";

type DayStatus = "present" | "late" | "pending" | "off";

function getWeekDays() {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function resolveStatus(
  date: Date,
  records: AttendanceRecord[],
  today: Date,
): DayStatus {
  const iso = date.toLocaleDateString("en-CA");
  const todayIso = today.toLocaleDateString("en-CA");
  const record = records.find((r) => r.date === iso);

  if (date > today) return "off";
  if (date < today && !record?.check_in_time) return "off";
  if (iso === todayIso && !record?.check_in_time) return "pending";
  if (!record?.check_in_time) return "off";
  if (record.check_in_status === "late") return "late";
  return "present";
}

const STATUS_UI: Record<
  DayStatus,
  { label: string; color: string; bg: string; icon?: "check" | "clock" | "dash" }
> = {
  present: { label: "Present", color: "#00b894", bg: "#e0f8f3", icon: "check" },
  late: { label: "Late", color: "#fdcb6e", bg: "#fff4e5", icon: "clock" },
  pending: { label: "Pending", color: "#8e8ea0", bg: "#f4f3fb", icon: "clock" },
  off: { label: "Off", color: "#8e8ea0", bg: "transparent", icon: "dash" },
};

export function WeeklyAttendanceCard({ records }: { records: AttendanceRecord[] }) {
  const today = new Date();
  const days = getWeekDays();

  const counts = { present: 0, late: 0, pending: 0 };
  days.forEach((d) => {
    const s = resolveStatus(d, records, today);
    if (s === "present") counts.present++;
    else if (s === "late") counts.late++;
    else if (s === "pending") counts.pending++;
  });
  const total = counts.present + counts.late + counts.pending || 1;
  const presentPct = (counts.present / total) * 100;
  const latePct = (counts.late / total) * 100;
  const pendingPct = (counts.pending / total) * 100;

  return (
    <div className="ds-card">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
          Weekly Attendance
        </h2>
        <button
          type="button"
          className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)]"
        >
          This Week <FiChevronDown size={12} />
        </button>
      </div>

      <div className="mt-5 flex justify-between gap-2">
        {days.map((d) => {
          const status = resolveStatus(d, records, today);
          const ui = STATUS_UI[status];
          const isToday = d.toDateString() === today.toDateString();
          return (
            <div key={d.toISOString()} className="flex flex-col items-center gap-2">
              <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
                {d.toLocaleDateString("en-US", { weekday: "short" })}
              </span>
              <span
                className={`text-[11px] ${isToday ? "font-bold text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"}`}
              >
                {d.getDate()}
              </span>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: ui.bg }}
              >
                {ui.icon === "check" && <FiCheck size={18} style={{ color: ui.color }} />}
                {ui.icon === "clock" && (
                  <FiClock
                    size={18}
                    style={{ color: ui.color, opacity: status === "pending" ? 0.5 : 1 }}
                  />
                )}
                {ui.icon === "dash" && (
                  <span className="text-sm text-[var(--color-text-muted)]">–</span>
                )}
              </div>
              <span className="text-[11px] font-semibold" style={{ color: ui.color }}>
                {ui.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 border-t border-[var(--color-border)] pt-4">
        <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
          This Week Summary
        </p>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full"
          style={{
            backgroundImage: `linear-gradient(to right, #00b894 0% ${presentPct}%, #fdcb6e ${presentPct}% ${presentPct + latePct}%, #6c5ce7 ${presentPct + latePct}% 100%)`,
          }}
        />
        <div className="mt-2.5 flex flex-wrap gap-4">
          {[
            { label: "Present", color: "#00b894" },
            { label: "Late", color: "#fdcb6e" },
            { label: "Pending", color: "#6c5ce7" },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
