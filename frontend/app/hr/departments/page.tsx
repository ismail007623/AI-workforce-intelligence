"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Filter, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import type { DepartmentStats } from "@/lib/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorState } from "@/components/shared/states";
import { DeptKPICards } from "@/components/hr/departments/DeptKPICards";
import { DeptCards } from "@/components/hr/departments/DeptCards";
import { DeptDrawer } from "@/components/hr/departments/DeptDrawer";

type SortBy = "late_count" | "attendance" | "risk";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "late_count", label: "Most Late" },
  { value: "attendance", label: "Lowest Attendance" },
  { value: "risk", label: "Highest Risk" },
];

export default function DepartmentsPage() {
  const [sortBy, setSortBy] = useState<SortBy>("late_count");
  const [selectedDept, setSelectedDept] = useState<DepartmentStats | null>(null);

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["dashboard-departments", sortBy],
    queryFn: () => api.getDepartmentStats(sortBy),
    refetchInterval: 60_000,
  });

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => refetch()}
        disabled={isFetching}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] shadow-sm transition-colors hover:border-[var(--color-primary-light)] hover:text-[var(--color-primary)] disabled:opacity-40"
        aria-label="Refresh"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
      </button>
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2 text-[13px] font-medium text-[var(--color-text-secondary)] shadow-sm transition-colors hover:border-[var(--color-primary-light)]"
      >
        <Filter className="h-3.5 w-3.5" />
        Filter
      </button>
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2 text-[13px] font-medium text-[var(--color-text-secondary)] shadow-sm transition-colors hover:border-[var(--color-primary-light)]"
      >
        <Download className="h-3.5 w-3.5" />
        Export
      </button>
    </div>
  );

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Departments"
          description="Monitor department attendance, punctuality, and workforce risk across the organization."
        />
        <ErrorState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Monitor department attendance, punctuality, and workforce risk across the organization."
        action={headerActions}
      />

      {/* KPI summary row */}
      <DeptKPICards data={data} loading={isLoading} />

      {/* Sort pills */}
      {!isLoading && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-[var(--color-text-muted)]">Sort by:</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSortBy(opt.value)}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                sortBy === opt.value
                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                  : "border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-primary-light)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
          {isFetching && !isLoading && (
            <span className="flex items-center gap-1 text-[12px] text-[var(--color-text-muted)]">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Updating…
            </span>
          )}
        </div>
      )}

      {/* Department cards — full width */}
      <DeptCards data={data} loading={isLoading} onSelectDept={setSelectedDept} />

      {/* Detail drawer */}
      <DeptDrawer dept={selectedDept} onClose={() => setSelectedDept(null)} />
    </div>
  );
}
