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
import { LateReasonModal } from "@/components/employee/LateReasonModal";
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
    <div className="mt-3 flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-success-light)] px-3 py-2.5 animate-fade-in">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-success)]">
        <FiCheck size={14} className="text-white" />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">{title}</p>
        <p className="text-[11px] text-[var(--color-text-secondary)]">{subtitle}</p>
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
        <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">Working hours progress</span>
        {loading ? (
          <span className="text-[10px] text-[var(--color-text-muted)]">Recording check-in…</span>
        ) : progress ? (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
            <span className="text-[var(--color-success)]">{formatDuration(progress.workedMin)} worked</span>
            <span className="text-[var(--color-text-muted)]">·</span>
            <span className="text-[var(--color-text-secondary)]">{formatDuration(progress.remainingMin)} remaining</span>
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
        <div className="mt-1 flex justify-between text-[10px] text-[var(--color-text-muted)]">
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
  const [showLateReasonModal, setShowLateReasonModal] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (summary?.late_reason_pending) {
      setShowLateReasonModal(true);
    }
  }, [summary?.late_reason_pending]);

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
  const reasonPending = summary?.late_reason_pending || checkIn?.requires_late_reason;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["employee-summary", employeeId] });
    qc.invalidateQueries({ queryKey: ["employee-history", employeeId] });
  };

  const handleCheckIn = async () => {
    setError(null);
    setCheckOut(null);
    setPhase("checking-in");
    try {
      const res = await api.checkIn();
      setCheckIn(res);
      refresh();
      setPhase("idle");
      if (res.requires_late_reason) {
        setShowLateReasonModal(true);
      }
    } catch (e) {
      setPhase("idle");
      setError(e instanceof ApiError ? e.message : "Check-in failed. Please try again.");
    }
  };

  const handleCheckOut = async () => {
    setError(null);
    setPhase("checking-out");
    try {
      const res = await api.checkOut();
      setCheckOut(res);
      refresh();
      setPhase("idle");
    } catch (e) {
      setPhase("idle");
      setError(e instanceof ApiError ? e.message : "Check-out failed. Please try again.");
    }
  };

  return (
    <>
      <LateReasonModal
        open={showLateReasonModal}
        onComplete={() => {
          setShowLateReasonModal(false);
          refresh();
        }}
      />
      <div className="ds-card">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[12px] font-medium leading-snug text-[var(--color-text-secondary)]">{formatFullDate()}</p>
          <p className="shrink-0 text-[32px] font-bold leading-none tracking-tight text-[var(--color-text-primary)] max-sm:text-[28px]">
            {formatLiveClock(now)}
          </p>
        </div>

        {isLate && lateMinutes > 0 && (isCheckedIn || isCheckedOut) && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-warning-light)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-warning)]">
            <FiClock size={12} />
            Late by {formatDuration(lateMinutes)}
          </span>
        )}

        {isCheckedIn && !isCheckingIn && !reasonPending && (
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
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--color-primary-dark)] active:scale-[0.99]"
          >
            <MdLogin size={16} />
            Check In
          </button>
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--color-danger-light)] p-2.5 text-[13px] text-[var(--color-danger)] animate-fade-in" role="alert">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 border-t border-[var(--color-border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] leading-snug text-[var(--color-text-muted)]">
            Office hours: 10:00 AM – 7:00 PM · Grace period until 10:15 AM
          </p>
          {isCheckedIn && !reasonPending && (
            <button
              type="button"
              onClick={handleCheckOut}
              disabled={isCheckingOut}
              className="flex shrink-0 items-center justify-center gap-1.5 self-end rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-white px-4 py-2 text-[13px] font-semibold text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[var(--color-primary-light)] hover:text-[var(--color-primary)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
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
    </>
  );
}
