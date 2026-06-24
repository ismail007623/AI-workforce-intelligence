"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ErrorState, LoadingTable } from "@/components/shared/states";

export default function DepartmentsPage() {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["dashboard-departments"],
    queryFn: api.getDepartmentStats,
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Attendance breakdown and lateness rate by department."
      />

      {isLoading ? (
        <Card>
          <CardContent className="p-3">
            <LoadingTable rows={5} />
          </CardContent>
        </Card>
      ) : isError ? (
        <ErrorState />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((d) => {
              const checkedIn = d.present;
              const rate = d.total_employees
                ? Math.round((checkedIn / d.total_employees) * 100)
                : 0;
              return (
                <Card key={d.department}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-slate-900">{d.department}</h3>
                      <span className="text-sm font-bold text-indigo-600">{rate}%</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {checkedIn}/{d.total_employees} checked in
                    </p>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-emerald-50 py-2">
                        <p className="text-sm font-bold text-emerald-600">{d.present}</p>
                        <p className="text-[10px] font-medium text-emerald-600/70">Present</p>
                      </div>
                      <div className="rounded-lg bg-amber-50 py-2">
                        <p className="text-sm font-bold text-amber-600">{d.late}</p>
                        <p className="text-[10px] font-medium text-amber-600/70">Late</p>
                      </div>
                      <div className="rounded-lg bg-red-50 py-2">
                        <p className="text-sm font-bold text-red-600">{d.absent}</p>
                        <p className="text-[10px] font-medium text-red-600/70">Absent</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardContent className="p-2">
              <Table>
                <THead>
                  <TR>
                    <TH>Department</TH>
                    <TH>Total</TH>
                    <TH>Present</TH>
                    <TH>Late</TH>
                    <TH>Absent</TH>
                    <TH>Early Leave</TH>
                    <TH>Lateness Rate</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.map((d) => (
                    <TR key={d.department}>
                      <TD className="font-semibold text-slate-900">{d.department}</TD>
                      <TD>{d.total_employees}</TD>
                      <TD className="font-medium text-emerald-600">{d.present}</TD>
                      <TD className="font-medium text-amber-600">{d.late}</TD>
                      <TD className="font-medium text-red-600">{d.absent}</TD>
                      <TD className="font-medium text-orange-600">{d.early_left}</TD>
                      <TD>
                        <span className="font-bold text-indigo-600">{d.lateness_rate}%</span>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
