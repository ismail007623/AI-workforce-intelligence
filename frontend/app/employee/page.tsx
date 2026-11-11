"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MessageSquareText } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { formatDate, formatTime, greeting } from "@/lib/utils";
import { HeroCheckInCard } from "@/components/employee/HeroCheckInCard";
import { TodayStatusCard } from "@/components/employee/TodayStatusCard";
import { StatMiniCards } from "@/components/employee/StatMiniCards";
import { WeeklyAttendanceCard } from "@/components/employee/WeeklyAttendanceCard";
import { TodayTimelineCard } from "@/components/employee/TodayTimelineCard";
import { AiInsightCard } from "@/components/employee/AiInsightCard";
import { ProgressBanner } from "@/components/employee/ProgressBanner";
import { AiInsightBanner } from "@/components/employee/AiInsightBanner";
import { AttendanceStatusBadge } from "@/components/shared/AttendanceStatusBadge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { AttendanceRecord } from "@/lib/types";

function RecentAttendanceCard({ records }: { records: AttendanceRecord[] }) {
  const recent = records.slice(0, 5);
  return (
    <div className="ds-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
          Recent Attendance
        </h2>
        <Link
          href="/employee/history"
          className="flex items-center gap-0.5 text-xs font-semibold text-[var(--color-primary)] hover:underline"
        >
          View full history <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {recent.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--color-text-muted)]">
          No records yet. Once you check in, your attendance will appear here.
        </p>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Check In</TH>
              <TH>Check Out</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {recent.map((r) => (
              <TR key={r.date}>
                <TD className="font-semibold text-[var(--color-text-primary)]">
                  {formatDate(r.date)}
                </TD>
                <TD>{formatTime(r.check_in_time)}</TD>
                <TD>{formatTime(r.check_out_time)}</TD>
                <TD>
                  <AttendanceStatusBadge status={r.check_in_status} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}

function PolicyAssistantCard() {
  return (
    <div className="ds-card flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-xlight)]">
          <MessageSquareText size={22} className="text-[var(--color-primary)]" />
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-[var(--color-text-primary)]">
            HR Policy Assistant
          </h3>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            Ask questions about leave, working hours, and company policies — answers come
            from your company&apos;s own policy document.
          </p>
        </div>
      </div>
      <Link
        href="/employee/policy-chat"
        className="flex shrink-0 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors duration-200 hover:bg-[var(--color-primary-dark)] active:scale-[0.99]"
      >
        Ask a question
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}

export default function EmployeeHomePage() {
  const { employee } = useSession();
  const employeeId = employee!.employee_id;

  const summaryQ = useQuery({
    queryKey: ["employee-summary", employeeId],
    queryFn: () => api.getEmployeeSummary(),
  });
  const historyQ = useQuery({
    queryKey: ["employee-history", employeeId],
    queryFn: () => api.getEmployeeHistory(),
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
            Here&apos;s your attendance overview. Your check-in is one tap away.
          </p>
        </div>
        {summary && <AiInsightBanner summary={summary} />}
      </div>

      {/* Overview */}
      <StatMiniCards summary={summary} loading={summaryQ.isLoading} />

      {/* Attendance status + check-in */}
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

      {/* Recent attendance + AI insight */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <RecentAttendanceCard records={history} />
        <AiInsightCard summary={summary} />
      </div>

      {/* Policy assistant entry */}
      <PolicyAssistantCard />

      {/* Progress banner */}
      <ProgressBanner name={employee!.name} />
    </div>
  );
}
