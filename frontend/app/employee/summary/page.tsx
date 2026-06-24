"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Clock, Gauge, ShieldAlert, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, LoadingGrid } from "@/components/shared/states";

const RISK_TONE: Record<string, string> = {
  low: "bg-emerald-50 text-emerald-600",
  medium: "bg-amber-50 text-amber-600",
  high: "bg-red-50 text-red-600",
};

export default function EmployeeSummaryPage() {
  const { employee } = useSession();
  const employeeId = employee!.employee_id;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["employee-summary", employeeId],
    queryFn: () => api.getEmployeeSummary(employeeId),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Summary"
        description="Your attendance performance this month."
      />

      {isLoading ? (
        <LoadingGrid count={4} />
      ) : isError || !data ? (
        <ErrorState />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Attendance rate"
              value={`${data.attendance_rate_this_month}%`}
              icon={TrendingUp}
              iconClassName="bg-indigo-50 text-indigo-600"
              footer={
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${data.attendance_rate_this_month}%` }}
                  />
                </div>
              }
            />
            <StatCard
              title="Late arrivals"
              value={data.late_arrivals_this_month}
              icon={Clock}
              iconClassName="bg-amber-50 text-amber-600"
              trend="this month"
            />
            <StatCard
              title="Average delay"
              value={`${data.average_delay_minutes} min`}
              icon={Gauge}
              iconClassName="bg-violet-50 text-violet-600"
              trend="when late"
            />
            <StatCard
              title="Risk level"
              value={data.risk_level.charAt(0).toUpperCase() + data.risk_level.slice(1)}
              icon={ShieldAlert}
              iconClassName={RISK_TONE[data.risk_level] ?? "bg-slate-100 text-slate-500"}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <Row label="Name" value={data.employee_name} />
              <Row label="Employee ID" value={data.employee_id} mono />
              <Row label="Department" value={data.department} />
              <Row
                label="Today's status"
                value={<StatusBadge status={data.today_status} />}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-semibold text-slate-900 ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
