import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function policyDisplayName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
}

export function formatFullDate(date: Date = new Date()): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function greeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Format minutes as "4h 12m" or "39m". */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem.toString().padStart(2, "0")}m` : `${h}h`;
}

const OFFICE_END_HOUR = 19;
const OFFICE_END_MINUTE = 0;

function officeEndToday(now: Date): Date {
  const end = new Date(now);
  end.setHours(OFFICE_END_HOUR, OFFICE_END_MINUTE, 0, 0);
  return end;
}

export function getWorkingHoursProgress(
  checkInIso: string,
  now: Date = new Date(),
): { workedMin: number; remainingMin: number; percent: number } {
  const checkIn = new Date(checkInIso);
  const end = officeEndToday(now);

  const workedMs = Math.max(0, now.getTime() - checkIn.getTime());
  const remainingMs = Math.max(0, end.getTime() - now.getTime());
  const workedMin = workedMs / 60_000;
  const remainingMin = remainingMs / 60_000;

  const total = workedMs + remainingMs;
  const percent = total > 0 ? Math.min(100, Math.max(0, (workedMs / total) * 100)) : 0;

  return { workedMin, remainingMin, percent };
}

export function formatOfficeEndLabel(): string {
  const d = new Date();
  d.setHours(OFFICE_END_HOUR, OFFICE_END_MINUTE, 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}
