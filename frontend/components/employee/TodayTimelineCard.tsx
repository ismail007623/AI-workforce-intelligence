"use client";

import type { AttendanceRecord } from "@/lib/types";
import { formatTime } from "@/lib/utils";

type TimelineState = "completed" | "active" | "upcoming" | "empty";

interface TimelineItem {
  time: string;
  label: string;
  state: TimelineState;
}

export function TodayTimelineCard({ todayRecord }: { todayRecord?: AttendanceRecord }) {
  const checkedIn = todayRecord?.check_in_time;
  const checkedOut = todayRecord?.check_out_time;

  const items: TimelineItem[] = [
    { time: "10:00 AM", label: "Expected Check In", state: checkedIn ? "completed" : "upcoming" },
    {
      time: checkedIn ? formatTime(checkedIn) : "—",
      label: "Checked In",
      state: checkedIn ? "active" : "empty",
    },
    { time: "07:00 PM", label: "Expected Check Out", state: checkedOut ? "completed" : "upcoming" },
    {
      time: checkedOut ? formatTime(checkedOut) : "—",
      label: "Checked Out",
      state: checkedOut ? "completed" : "empty",
    },
  ];

  return (
    <div className="ds-card">
      <h2 className="mb-5 text-[15px] font-semibold text-[var(--color-text-primary)]">
        Today&apos;s Timeline
      </h2>
      <div className="space-y-0">
        {items.map((item, i) => (
          <div key={item.label} className="relative flex items-start gap-3.5 pb-5 last:pb-0">
            {i < items.length - 1 && (
              <span
                className="absolute left-[11px] top-6 bottom-0 w-px bg-[var(--color-border)]"
                aria-hidden
              />
            )}
            <TimelineDot state={item.state} />
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                {item.time}
              </p>
              <p className="text-[13px] text-[var(--color-text-secondary)]">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineDot({ state }: { state: TimelineState }) {
  if (state === "active") {
    return (
      <div className="relative z-[1] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-primary)]">
        <span className="h-2 w-2 rounded-full bg-white" />
      </div>
    );
  }
  if (state === "completed") {
    return (
      <div className="relative z-[1] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-success)] bg-[var(--color-success-light)]">
        <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
      </div>
    );
  }
  if (state === "upcoming") {
    return (
      <div className="relative z-[1] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-border-strong)] bg-white">
        <span className="h-2 w-2 rounded-full border border-[var(--color-border-strong)]" />
      </div>
    );
  }
  return (
    <div className="relative z-[1] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-border)] bg-white" />
  );
}
