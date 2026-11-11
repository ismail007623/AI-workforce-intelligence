"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { initials } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ErrorState, LoadingTable } from "@/components/shared/states";

type SortBy = "late" | "punctual" | "absent";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "late", label: "Most Late" },
  { value: "punctual", label: "Most Punctual" },
  { value: "absent", label: "Most Absent" },
];

export default function DepartmentDetailPage() {
  const params = useParams();
  const department = decodeURIComponent(params.department as string);
  const [sortBy, setSortBy] = useState<SortBy | null>(null);

  const { data = [], isLoading, isError, isFetching } = useQuery({
    queryKey: ["department-employees", department, sortBy],
    queryFn: () => api.getDepartmentEmployees(department, sortBy ?? undefined),
    refetchInterval: 60_000,
  });

  const showAnalyzing = sortBy === "late" && isFetching && !isLoading;

  return (
    <div className="space-y-6">
      <Link
        href="/hr/departments"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Departments
      </Link>

      <PageHeader
        title={department}
        description="All employees in this department. Choose a sort option — Most Late triggers AI analysis of submitted reasons."
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-medium text-[var(--color-text-muted)]">Sort by:</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSortBy(opt.value)}
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

      {showAnalyzing && (
        <Card className="border-[var(--color-primary)]/20 bg-[var(--color-primary-xlight)]/40">
          <CardContent className="flex items-center gap-3 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                Analyzing submitted reasons…
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                AI is evaluating pending late reasons to rank employees by genuine concern.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-2">
          {isLoading ? (
            <div className="p-3">
              <LoadingTable rows={6} />
            </div>
          ) : isError ? (
            <div className="p-3">
              <ErrorState />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Employee</TH>
                    <TH>Late (month)</TH>
                    <TH>On-time (month)</TH>
                    <TH>Absent (month)</TH>
                    {sortBy === "late" && (
                      <>
                        <TH>Concern Score</TH>
                        <TH>Avg Validity</TH>
                        <TH>Weak</TH>
                        <TH>Invalid</TH>
                      </>
                    )}
                    <TH>Reliability</TH>
                    <TH>Eval Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.map((r) => (
                    <TR key={r.employee_id}>
                      <TD>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-xlight)] text-xs font-bold text-[var(--color-primary)]">
                            {initials(r.employee_name)}
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--color-text-primary)]">{r.employee_name}</p>
                            <p className="font-mono text-xs text-[var(--color-text-muted)]">{r.employee_id}</p>
                          </div>
                        </div>
                      </TD>
                      <TD className="font-medium text-[var(--color-warning)]">{r.late_count_month}</TD>
                      <TD className="font-medium text-[var(--color-success)]">{r.on_time_count_month}</TD>
                      <TD className="font-medium text-[var(--color-danger)]">{r.absent_count_month}</TD>
                      {sortBy === "late" && (
                        <>
                          <TD className="font-bold text-[var(--color-text-primary)]">
                            {r.concern_score != null ? r.concern_score.toFixed(1) : "—"}
                          </TD>
                          <TD>{r.avg_validity ?? "—"}</TD>
                          <TD>{r.weak_reason_count}</TD>
                          <TD>{r.invalid_reason_count}</TD>
                        </>
                      )}
                      <TD>{r.reliability_score ?? "—"}</TD>
                      <TD>
                        <Badge
                          variant={
                            r.evaluation_status === "evaluated"
                              ? "valid"
                              : r.evaluation_status === "pending"
                                ? "late"
                                : "neutral"
                          }
                        >
                          {r.evaluation_status === "evaluated"
                            ? "Evaluated"
                            : r.evaluation_status === "pending"
                              ? "Pending"
                              : "None"}
                        </Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
