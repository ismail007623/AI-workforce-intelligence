"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FiCheck, FiClock } from "react-icons/fi";
import { MdLogin, MdLogout } from "react-icons/md";
import { AlertTriangle, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type {
  AttendanceRecord,
  CheckInResponse,
  CheckOutResponse,
  EmployeeSummary,
} from "@/lib/types";
import {
  formatDuration,
  formatFullDate,
  formatOfficeEndLabel,
  formatTime,
  getWorkingHoursProgress,
} from "@/lib/utils";

type Phase = "idle" | "checking-in" | "checking-out";

function formatLiveClock(date: Date) {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function StatusBanner({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="relative mt-3 flex items-center gap-2 rounded-[var(--radius-md)] bg-white/10 px-3 py-2 animate-fade-in">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00e676]/20">
        <FiCheck size={14} className="text-[#00e676]" />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="text-[13px] font-semibold text-white">{title}</p>
        <p className="text-[11px] text-white/70">{subtitle}</p>
      </div>
    </div>
  );
}

function WorkingHoursProgress({
  checkInIso,
  now,
  loading = false,
}: {
  checkInIso?: string;
  now: Date;
  loading?: boolean;
}) {
  const progress = checkInIso ? getWorkingHoursProgress(checkInIso, now) : null;

  return (
    <div className="relative mt-3 animate-fade-in">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5">
        <span className="text-[11px] font-medium text-white/80">Working hours progress</span>
        {loading ? (
          <span className="text-[10px] text-white/50">Recording check-in…</span>
        ) : progress ? (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
            <span className="text-[#4ade80]">{formatDuration(progress.workedMin)} worked</span>
            <span className="text-white/40">·</span>
            <span className="text-white/60">{formatDuration(progress.remainingMin)} remaining</span>
          </div>
        ) : null}
      </div>

      <div className="working-hours-track working-hours-track-compact">
        <div
          className={`working-hours-fill-wrap ${loading ? "!w-[40%]" : ""}`}
          style={loading ? undefined : { width: `${progress?.percent ?? 0}%` }}
        >
          <div className={`working-hours-fill ${loading ? "working-hours-fill--loading" : ""}`} />
          {!loading && progress && progress.percent > 0 && (
            <div className="working-hours-knob working-hours-knob-compact" aria-hidden />
          )}
        </div>
      </div>

      {!loading && checkInIso && (
        <div className="mt-1 flex justify-between text-[10px] text-white/60">
          <span>{formatTime(checkInIso)} Actual Check In</span>
          <span>{formatOfficeEndLabel()} Office End</span>
        </div>
      )}
    </div>
  );
}

export function HeroCheckInCard({
  employeeId,
  summary,
  todayRecord,
}: {
  employeeId: string;
  summary?: EmployeeSummary;
  todayRecord?: AttendanceRecord;
}) {
  const qc = useQueryClient();
  const [now, setNow] = useState(() => new Date());
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState<CheckInResponse | null>(null);
  const [checkOut, setCheckOut] = useState<CheckOutResponse | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const checkInTime = todayRecord?.check_in_time ?? checkIn?.check_in_time ?? null;
  const checkOutTime = todayRecord?.check_out_time ?? checkOut?.check_out_time ?? null;
  const lateMinutes = todayRecord?.late_minutes ?? checkIn?.late_minutes ?? 0;

  const isCheckedOut = !!checkOutTime;
  const isCheckedIn = !!checkInTime && !isCheckedOut;
  const isCheckingIn = phase === "checking-in";
  const isCheckingOut = phase === "checking-out";
  const showProgress = isCheckingIn || isCheckedIn;
  const showCheckInButton = !checkInTime && !isCheckingIn && !isCheckedOut;
  const isLate =
    summary?.today_status === "late" ||
    todayRecord?.check_in_status === "late" ||
    checkIn?.check_in_status === "late";

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["employee-summary", employeeId] });
    qc.invalidateQueries({ queryKey: ["employee-history", employeeId] });
  };

  const handleCheckIn = async () => {
    setError(null);
    setCheckOut(null);
    setPhase("checking-in");
    try {
      const res = await api.checkIn(employeeId);
      setCheckIn(res);
      refresh();
      setPhase("idle");
    } catch (e) {
      setPhase("idle");
      setError(e instanceof ApiError ? e.message : "Check-in failed. Please try again.");
    }
  };

  const handleCheckOut = async () => {
    setError(null);
    setPhase("checking-out");
    try {
      const res = await api.checkOut(employeeId);
      setCheckOut(res);
      refresh();
      setPhase("idle");
    } catch (e) {
      setPhase("idle");
      setError(e instanceof ApiError ? e.message : "Check-out failed. Please try again.");
    }
  };

  return (
    <div className="hero-card hero-card-compact">
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[12px] font-medium leading-snug text-white/75">{formatFullDate()}</p>
        <p className="shrink-0 text-[32px] font-extrabold leading-none tracking-tight text-white max-sm:text-[28px]">
          {formatLiveClock(now)}
        </p>
      </div>

      {isLate && lateMinutes > 0 && (isCheckedIn || isCheckedOut) && (
        <span className="relative mt-1.5 inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white">
          <FiClock size={12} />
          Late by {formatDuration(lateMinutes)}
        </span>
      )}

      {isCheckedIn && !isCheckingIn && (
        <StatusBanner
          title="Checked in successfully"
          subtitle="You're all set. Have a productive day!"
        />
      )}

      {isCheckedOut && (
        <StatusBanner
          title="Checked out successfully"
          subtitle={`You checked out at ${formatTime(checkOutTime)}. See you tomorrow!`}
        />
      )}

      {showProgress && (
        <WorkingHoursProgress
          checkInIso={checkInTime ?? undefined}
          now={now}
          loading={isCheckingIn}
        />
      )}

      {showCheckInButton && (
        <button
          type="button"
          onClick={handleCheckIn}
          className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-white py-2.5 text-[13px] font-bold text-[var(--color-primary)] transition-opacity hover:opacity-92 active:scale-[0.97]"
        >
          <MdLogin size={16} />
          Check In
        </button>
      )}

      {error && (
        <div className="relative mt-3 flex items-start gap-2 rounded-[var(--radius-md)] bg-white/10 p-2.5 text-[13px] text-white animate-fade-in">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="relative mt-3 flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] leading-snug text-white/60">
          Office hours: 10:00 AM – 7:00 PM · Grace period until 10:15 AM
        </p>
        {isCheckedIn && (
          <button
            type="button"
            onClick={handleCheckOut}
            disabled={isCheckingOut}
            className="flex shrink-0 items-center justify-center gap-1.5 self-end rounded-[var(--radius-md)] border-[1.5px] border-white/50 bg-transparent px-4 py-2 text-[13px] font-bold text-white transition-all hover:border-white hover:bg-white/10 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            {isCheckingOut ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MdLogout size={15} />
            )}
            Check Out
          </button>
        )}
      </div>
    </div>
  );
}
