"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { api } from "@/lib/api";
import { formatTime, initials } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingTable } from "@/components/shared/states";

export default function LatePage() {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["today-late"],
    queryFn: api.getTodayLate,
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Late Arrivals"
        description="Employees who checked in after the 10:15 AM grace period today."
      />

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
                icon={Clock}
                title="No late arrivals"
                description="Everyone who checked in today was on time. "
              />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Employee</TH>
                  <TH>Department</TH>
                  <TH>Check In</TH>
                  <TH>Late By</TH>
                </TR>
              </THead>
              <TBody>
                {data.map((r) => (
                  <TR key={r.employee_id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
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
                    <TD>
                      <Badge variant="late">+{r.late_minutes} min</Badge>
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
