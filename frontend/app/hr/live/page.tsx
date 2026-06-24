"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Search } from "lucide-react";
import { api } from "@/lib/api";
import { formatTime, initials } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingTable } from "@/components/shared/states";

export default function LiveAttendancePage() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["today-attendance"],
    queryFn: api.getTodayAttendance,
    refetchInterval: 20_000,
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? data.filter(
          (r) =>
            r.employee_name.toLowerCase().includes(q) ||
            r.employee_id.toLowerCase().includes(q) ||
            r.department.toLowerCase().includes(q),
        )
      : data;
    return [...list].sort((a, b) => {
      if (!a.check_in_time) return 1;
      if (!b.check_in_time) return -1;
      return new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime();
    });
  }, [data, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Attendance"
        description="Real-time check-ins across the organization today."
        action={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-10 w-56 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>
        }
      />

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
          ) : rows.length === 0 ? (
            <div className="p-3">
              <EmptyState icon={Clock} title="No check-ins yet" description="Records will appear as employees check in." />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Employee</TH>
                  <TH>Department</TH>
                  <TH>Check In</TH>
                  <TH>Check Out</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.employee_id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                          {initials(r.employee_name)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{r.employee_name}</p>
                          <p className="font-mono text-xs text-slate-400">{r.employee_id}</p>
                        </div>
                      </div>
                    </TD>
                    <TD>{r.department}</TD>
                    <TD>{formatTime(r.check_in_time)}</TD>
                    <TD>{formatTime(r.check_out_time)}</TD>
                    <TD>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={r.check_in_status} />
                        {r.check_out_status === "early_left" && (
                          <Badge variant="early_left">Early</Badge>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
