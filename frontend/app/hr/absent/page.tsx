"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, UserCheck } from "lucide-react";
import { api } from "@/lib/api";
import { initials } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingTable } from "@/components/shared/states";

const PAGE_SIZE = 10;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLong(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AbsentPage() {
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [selectedDate]);

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["absentees", selectedDate],
    queryFn: () => api.getAbsentees(selectedDate),
    refetchInterval: 30_000,
  });

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageRows = data.slice(start, start + PAGE_SIZE);

  const controls = (
    <div className="flex items-center gap-2">
      {/* Date picker */}
      <label className="relative flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-[13px] text-[var(--color-text-secondary)] shadow-sm transition-colors hover:border-[var(--color-primary-light)]">
        <CalendarDays className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
        <span className="font-medium text-[var(--color-text-primary)]">
          {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        <input
          type="date"
          value={selectedDate}
          max={todayStr()}
          onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>

      {/* Today */}
      <button
        type="button"
        onClick={() => setSelectedDate(todayStr())}
        className="rounded-[var(--radius-md)] border border-[var(--color-primary)] bg-white px-3 py-2 text-[13px] font-semibold text-[var(--color-primary)] shadow-sm transition-colors hover:bg-[var(--color-primary-xlight)]"
      >
        Today
      </button>

      {/* Clear — resets to today */}
      <button
        type="button"
        onClick={() => setSelectedDate(todayStr())}
        className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-[13px] font-semibold text-[var(--color-text-secondary)] shadow-sm transition-colors hover:bg-slate-50"
      >
        Clear
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Absentees"
        description="Employees who have not checked in on the selected date."
        action={controls}
      />

      {/* Info banner */}
      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-primary-light)] bg-[var(--color-primary-xlight)] px-4 py-2.5 text-[13px]">
        <CalendarDays className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
        <span className="text-[var(--color-text-muted)]">Showing absentees for</span>
        <span className="font-semibold text-[var(--color-primary)]">
          {formatDateLong(selectedDate)}
        </span>
      </div>

      <Card>
        <CardContent className="p-2">
          {isLoading ? (
            <div className="p-3">
              <LoadingTable rows={5} />
            </div>
          ) : isError ? (
            <div className="p-3">
              <ErrorState />
            </div>
          ) : data.length === 0 ? (
            <div className="p-3">
              <EmptyState
                icon={UserCheck}
                title="Full attendance"
                description="Every employee checked in on this date."
              />
            </div>
          ) : (
            <>
              <Table>
                <THead>
                  <TR>
                    <TH>Employee</TH>
                    <TH>Department</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {pageRows.map((r) => (
                    <TR key={r.employee_id}>
                      <TD>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">
                            {initials(r.employee_name)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{r.employee_name}</p>
                            <p className="font-mono text-xs text-slate-400">{r.employee_id}</p>
                          </div>
                        </div>
                      </TD>
                      <TD>{r.department}</TD>
                      <TD>
                        <Badge variant="absent">Absent</Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>

              {/* Pagination footer */}
              <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
                <p className="text-[13px] text-[var(--color-text-muted)]">
                  Showing {start + 1} to {Math.min(start + PAGE_SIZE, data.length)} of{" "}
                  {data.length} absentee{data.length !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border text-[13px] font-semibold transition-colors ${
                        p === page
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-xlight)] text-[var(--color-primary)]"
                          : "border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
