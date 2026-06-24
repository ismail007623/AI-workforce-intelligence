"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { greeting } from "@/lib/utils";
import { HeroCheckInCard } from "@/components/employee/HeroCheckInCard";
import { TodayStatusCard } from "@/components/employee/TodayStatusCard";
import { StatMiniCards } from "@/components/employee/StatMiniCards";
import { WeeklyAttendanceCard } from "@/components/employee/WeeklyAttendanceCard";
import { TodayTimelineCard } from "@/components/employee/TodayTimelineCard";
import { AiInsightCard } from "@/components/employee/AiInsightCard";
import { RecentNotificationsCard } from "@/components/employee/RecentNotificationsCard";
import { ProgressBanner } from "@/components/employee/ProgressBanner";
import { AiInsightBanner } from "@/components/employee/AiInsightBanner";

export default function EmployeeHomePage() {
  const { employee } = useSession();
  const employeeId = employee!.employee_id;

  const summaryQ = useQuery({
    queryKey: ["employee-summary", employeeId],
    queryFn: () => api.getEmployeeSummary(employeeId),
  });
  const historyQ = useQuery({
    queryKey: ["employee-history", employeeId],
    queryFn: () => api.getEmployeeHistory(employeeId),
  });

  const summary = summaryQ.data;
  const history = historyQ.data ?? [];

  const todayIso = new Date().toLocaleDateString("en-CA");
  const todayRecord = useMemo(
    () => history.find((r) => r.date === todayIso),
    [history, todayIso],
  );

  const firstName = employee!.name.split(" ")[0];

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      {/* Top bar */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--color-text-primary)]">
            {greeting()}, {firstName}!
          </h1>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Here&apos;s your attendance overview. Stay consistent and keep up the great work.
          </p>
        </div>
        {summary && <AiInsightBanner summary={summary} />}
      </div>

      {/* Stats */}
      <StatMiniCards summary={summary} loading={summaryQ.isLoading} />

      {/* Hero + Status */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <HeroCheckInCard employeeId={employeeId} summary={summary} todayRecord={todayRecord} />
        <TodayStatusCard
          employee={employee!}
          summary={summary}
          todayRecord={todayRecord}
          loading={summaryQ.isLoading}
        />
      </div>

      {/* Weekly + Timeline */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <WeeklyAttendanceCard records={history} />
        <TodayTimelineCard todayRecord={todayRecord} />
      </div>

      {/* AI + Notifications */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <AiInsightCard summary={summary} />
        <RecentNotificationsCard summary={summary} recent={history} />
      </div>

      {/* Progress banner */}
      <ProgressBanner name={employee!.name} />
    </div>
  );
}
