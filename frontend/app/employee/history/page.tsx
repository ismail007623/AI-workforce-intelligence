"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarX } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { formatDate, formatTime } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingTable } from "@/components/shared/states";

export default function EmployeeHistoryPage() {
  const { employee } = useSession();
  const employeeId = employee!.employee_id;

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["employee-history", employeeId],
    queryFn: () => api.getEmployeeHistory(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Attendance"
        description="Your personal attendance history"
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
          ) : data.length === 0 ? (
            <div className="p-3">
              <EmptyState
                icon={CalendarX}
                title="No records yet"
                description="Once you check in, your attendance history will appear here."
              />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Check In</TH>
                  <TH>Check Out</TH>
                  <TH>Status</TH>
                  <TH>Late</TH>
                  <TH>Early Leave</TH>
                </TR>
              </THead>
              <TBody>
                {data.map((r) => (
                  <TR key={r.date}>
                    <TD className="font-semibold text-slate-900">{formatDate(r.date)}</TD>
                    <TD>{formatTime(r.check_in_time)}</TD>
                    <TD>{formatTime(r.check_out_time)}</TD>
                    <TD>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={r.check_in_status} />
                        {r.check_out_status === "early_left" && (
                          <Badge variant="early_left">Early Leave</Badge>
                        )}
                      </div>
                    </TD>
                    <TD>
                      {r.late_minutes > 0 ? (
                        <span className="font-semibold text-amber-600">+{r.late_minutes}m</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </TD>
                    <TD>
                      {r.early_leave_minutes > 0 ? (
                        <span className="font-semibold text-orange-600">
                          {r.early_leave_minutes}m
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
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
