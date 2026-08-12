"use client";

import { useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import type { DepartmentStats } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, LoadingTable } from "@/components/shared/states";

type SortBy = "late_count" | "attendance" | "risk";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "late_count", label: "Most Late" },
  { value: "attendance", label: "Lowest Attendance" },
  { value: "risk", label: "Highest Risk" },
];

function riskVariant(level?: string): "low" | "medium" | "high" | "neutral" {
  const l = (level ?? "").toLowerCase();
  if (l === "low") return "low";
  if (l === "medium") return "medium";
  if (l === "high") return "high";
  return "neutral";
}

function deptInitials(name: string) {
  return name
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function AttendanceBadge({ rate }: { rate: number }) {
  if (rate >= 90)
    return (
      <span className="inline-flex items-center rounded-full bg-[var(--color-success-light)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--color-success)]">
        {rate}%
      </span>
    );
  if (rate >= 75)
    return (
      <span className="inline-flex items-center rounded-full bg-[var(--color-warning-light)] px-2.5 py-0.5 text-[11px] font-bold text-[#d4a017]">
        {rate}%
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--color-danger-light)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--color-danger)]">
      {rate}%
    </span>
  );
}

export function DeptTable({
  data,
  loading,
  sortBy,
  onSortChange,
  onSelectDept,
}: {
  data: DepartmentStats[];
  loading: boolean;
  sortBy: SortBy;
  onSortChange: (s: SortBy) => void;
  onSelectDept: (d: DepartmentStats) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = data.filter((d) =>
    d.department.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Card className="overflow-hidden shadow-[var(--shadow-card)]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-card-hover)] px-5 py-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input
            placeholder="Search department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-[13px]"
          />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSortChange(opt.value)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                sortBy === opt.value
                  ? "bg-[var(--color-primary)] text-white"
                  : "border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-primary-light)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <CardContent className="p-0">
        {loading ? (
          <div className="p-5">
            <LoadingTable rows={6} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No departments found"
              description="Try adjusting your search term."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-card-hover)]">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Manager
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Employees
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Present
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Late
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Absent
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Attendance
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Risk
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Reliability
                  </th>
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, idx) => {
                  const rate =
                    d.attendance_rate ??
                    (d.total_employees
                      ? Math.round((d.present / d.total_employees) * 100)
                      : 0);
                  return (
                    <tr
                      key={d.department}
                      className={`border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-primary-xlight)]/30 ${idx % 2 === 0 ? "" : "bg-slate-50/40"}`}
                    >
                      {/* Department */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary-xlight)] text-[12px] font-bold text-[var(--color-primary)]">
                            {deptInitials(d.department)}
                          </div>
                          <span className="font-semibold text-[var(--color-text-primary)]">
                            {d.department}
                          </span>
                        </div>
                      </td>
                      {/* Manager */}
                      <td className="px-4 py-4 text-[var(--color-text-muted)]">—</td>
                      {/* Employees */}
                      <td className="px-4 py-4 text-center font-medium text-[var(--color-text-primary)]">
                        {d.total_employees}
                      </td>
                      {/* Present */}
                      <td className="px-4 py-4 text-center">
                        <span className="font-semibold text-[var(--color-success)]">{d.present}</span>
                      </td>
                      {/* Late */}
                      <td className="px-4 py-4 text-center">
                        <span className="font-semibold text-amber-500">{d.late}</span>
                      </td>
                      {/* Absent */}
                      <td className="px-4 py-4 text-center">
                        <span className="font-semibold text-[var(--color-danger)]">{d.absent}</span>
                      </td>
                      {/* Attendance */}
                      <td className="px-4 py-4 text-center">
                        <AttendanceBadge rate={rate} />
                      </td>
                      {/* Risk */}
                      <td className="px-4 py-4 text-center">
                        {d.department_risk_level ? (
                          <Badge variant={riskVariant(d.department_risk_level)}>
                            {d.department_risk_level}
                          </Badge>
                        ) : (
                          <span className="text-[var(--color-text-muted)]">—</span>
                        )}
                      </td>
                      {/* Reliability */}
                      <td className="px-4 py-4 text-center">
                        {d.avg_reliability != null ? (
                          <span
                            className={`font-semibold ${
                              d.avg_reliability >= 80
                                ? "text-[var(--color-success)]"
                                : d.avg_reliability >= 60
                                  ? "text-amber-500"
                                  : "text-[var(--color-danger)]"
                            }`}
                          >
                            {Math.round(d.avg_reliability)}/100
                          </span>
                        ) : (
                          <span className="text-[var(--color-text-muted)]">—</span>
                        )}
                      </td>
                      {/* Action */}
                      <td className="px-3 py-4">
                        <button
                          type="button"
                          onClick={() => onSelectDept(d)}
                          aria-label={`View ${d.department} details`}
                          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-primary-xlight)] hover:text-[var(--color-primary)]"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
