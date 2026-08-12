import type { LateIntelligenceRecord } from "@/lib/types";

const AVATAR_PALETTE = [
  { bg: "#ede9ff", text: "#6c5ce7" },
  { bg: "#e0f8f3", text: "#00b894" },
  { bg: "#fff4e5", text: "#e17055" },
  { bg: "#eaf4ff", text: "#0984e3" },
  { bg: "#fce4ec", text: "#d63031" },
  { bg: "#f3e5f5", text: "#8e44ad" },
  { bg: "#e8f5e9", text: "#2e7d32" },
  { bg: "#fff3e0", text: "#ef6c00" },
];

export type SortBy = "risk" | "validity" | "late_minutes" | "reliability";

export const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "risk", label: "Highest Risk" },
  { value: "validity", label: "Lowest Validity" },
  { value: "late_minutes", label: "Most Late" },
  { value: "reliability", label: "Lowest Reliability" },
];

export function avatarColor(employeeId: string) {
  let hash = 0;
  for (let i = 0; i < employeeId.length; i++) {
    hash = employeeId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function latePillClass(minutes: number): string {
  if (minutes >= 90) return "bg-red-100 text-red-600 ring-red-300";
  if (minutes >= 60) return "bg-orange-100 text-orange-600 ring-orange-300";
  return "bg-amber-100 text-amber-700 ring-amber-300";
}

export function scoreBarColor(value: number, inverted = false): string {
  const v = inverted ? 100 - value : value;
  if (v > 75) return "#22c55e";
  if (v >= 60) return "#eab308";
  if (v >= 30) return "#f97316";
  return "#ef4444";
}

export function decisionVariant(
  decision: string | null,
): "valid" | "acceptable" | "weak" | "invalid" | "neutral" {
  const d = (decision ?? "").toLowerCase();
  if (d === "valid") return "valid";
  if (d === "acceptable") return "acceptable";
  if (d === "weak") return "weak";
  if (d === "invalid") return "invalid";
  return "neutral";
}

export function isPositiveDecision(decision: string | null): boolean {
  const d = (decision ?? "").toLowerCase();
  return d === "valid" || d === "acceptable";
}

export function isNegativeDecision(decision: string | null): boolean {
  const d = (decision ?? "").toLowerCase();
  return d === "weak" || d === "invalid";
}

export interface LateStatsSummary {
  totalLate: number;
  highestDelay: { minutes: number; name: string } | null;
  highRiskCount: number;
  acceptableCount: number;
  weakCount: number;
}

export function deriveLateStats(rows: LateIntelligenceRecord[]): LateStatsSummary {
  let highest: { minutes: number; name: string } | null = null;
  let highRiskCount = 0;
  let acceptableCount = 0;
  let weakCount = 0;

  for (const row of rows) {
    if (!highest || row.late_minutes > highest.minutes) {
      highest = { minutes: row.late_minutes, name: row.employee_name };
    }
    if (row.risk_score != null && row.risk_score >= 80) {
      highRiskCount += 1;
    }
    if (row.ai_decision) {
      if (isPositiveDecision(row.ai_decision)) acceptableCount += 1;
      if (isNegativeDecision(row.ai_decision)) weakCount += 1;
    }
  }

  return {
    totalLate: rows.length,
    highestDelay: highest,
    highRiskCount,
    acceptableCount,
    weakCount,
  };
}

export function filterLateRows(rows: LateIntelligenceRecord[], query: string): LateIntelligenceRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (r) =>
      r.employee_name.toLowerCase().includes(q) ||
      r.employee_id.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      (r.reason ?? "").toLowerCase().includes(q),
  );
}

export interface ActiveFilters {
  departments: string[];
  decisions: string[];
}

export const DEFAULT_ACTIVE_FILTERS: ActiveFilters = { departments: [], decisions: [] };

export const ALL_COLUMNS = [
  { key: "department" as const, label: "Department" },
  { key: "check_in" as const, label: "Check In" },
  { key: "late_by" as const, label: "Late By" },
  { key: "reason" as const, label: "Reason" },
  { key: "ai_category" as const, label: "AI Category" },
  { key: "ai_decision" as const, label: "AI Decision" },
  { key: "validity" as const, label: "Validity" },
  { key: "risk" as const, label: "Risk" },
  { key: "reliability" as const, label: "Reliability" },
];

export type ColumnKey = (typeof ALL_COLUMNS)[number]["key"];

export const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = [
  "department", "check_in", "late_by", "reason", "ai_category", "ai_decision", "validity", "risk", "reliability",
];

export function filterLateRowsAdvanced(
  rows: LateIntelligenceRecord[],
  query: string,
  filters: ActiveFilters,
): LateIntelligenceRecord[] {
  let result = filterLateRows(rows, query);
  if (filters.departments.length > 0) {
    result = result.filter((r) => filters.departments.includes(r.department));
  }
  if (filters.decisions.length > 0) {
    result = result.filter((r) => {
      const d = (r.ai_decision ?? "pending").toLowerCase();
      return filters.decisions.includes(d);
    });
  }
  return result;
}

export function exportToCsv(rows: LateIntelligenceRecord[], filename?: string): void {
  const headers = [
    "Employee", "ID", "Department", "Check In", "Late By (min)",
    "Reason", "AI Category", "AI Decision", "Validity", "Risk", "Reliability",
  ];
  const csvRows = rows.map((r) => [
    r.employee_name,
    r.employee_id,
    r.department,
    r.check_in_time ?? "",
    r.late_minutes,
    r.reason ?? "",
    r.ai_category ?? "",
    r.ai_decision ?? "",
    r.validity_score ?? "",
    r.risk_score ?? "",
    r.reliability_score ?? "",
  ]);
  const csv = [headers, ...csvRows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `late-intelligence-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function paginateRows<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function pageWindow(current: number, total: number, max = 5): number[] {
  if (total <= max) return Array.from({ length: total }, (_, i) => i + 1);
  const half = Math.floor(max / 2);
  let start = Math.max(1, current - half);
  const end = Math.min(total, start + max - 1);
  start = Math.max(1, end - max + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
