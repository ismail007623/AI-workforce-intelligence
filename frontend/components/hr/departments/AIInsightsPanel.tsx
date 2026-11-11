"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Award, Clock, Lightbulb, Sparkles } from "lucide-react";
import type { DepartmentStats } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

interface Insight {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  body: string;
}

function buildInsights(data: DepartmentStats[]): Insight[] {
  if (data.length === 0) return [];

  const highRisk = data.filter((d) => (d.department_risk_level ?? "").toLowerCase() === "high");

  const best = [...data].sort((a, b) => {
    const ra = a.attendance_rate ?? (a.total_employees ? (a.present / a.total_employees) * 100 : 0);
    const rb = b.attendance_rate ?? (b.total_employees ? (b.present / b.total_employees) * 100 : 0);
    return rb - ra;
  })[0];
  const bestRate =
    best.attendance_rate ??
    (best.total_employees ? Math.round((best.present / best.total_employees) * 100) : 0);

  const topLate = data.filter((d) => d.late > 0).sort((a, b) => b.late - a.late).slice(0, 2);
  const worstDept = [...data].sort((a, b) => b.late - a.late)[0];

  return [
    {
      icon: AlertTriangle,
      iconBg: "bg-[var(--color-danger-light)]",
      iconColor: "text-[var(--color-danger)]",
      title: "Department Risk Overview",
      body:
        highRisk.length > 0
          ? `${highRisk.map((d) => d.department).join(" & ")} ${highRisk.length === 1 ? "has" : "have"} the highest risk due to increased absences and late arrivals.`
          : "All departments are within acceptable risk levels today.",
    },
    {
      icon: Award,
      iconBg: "bg-[var(--color-success-light)]",
      iconColor: "text-[var(--color-success)]",
      title: "Best Attendance",
      body: `${best.department} leads with ${bestRate}% attendance and consistent workforce performance.`,
    },
    {
      icon: Clock,
      iconBg: "bg-[var(--color-warning-light)]",
      iconColor: "text-[var(--color-warning)]",
      title: "Punctuality Watch",
      body:
        topLate.length > 0
          ? `${topLate.map((d) => d.department).join(" and ")} have the highest late arrivals today.`
          : "All departments have strong punctuality today.",
    },
    {
      icon: Lightbulb,
      iconBg: "bg-[var(--color-primary-xlight)]",
      iconColor: "text-[var(--color-primary)]",
      title: "Recommendation",
      body: `Focus on engagement initiatives and schedule optimization for ${worstDept.department} to improve attendance and reduce punctuality issues.`,
    },
  ];
}

export function AIInsightsPanel({
  data,
  loading,
}: {
  data: DepartmentStats[];
  loading: boolean;
}) {
  const insights = buildInsights(data);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-gradient-to-r from-[var(--color-primary-xlight)] to-white px-5 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] shadow-sm">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-[13px] font-bold text-[var(--color-text-primary)]">AI Insights</h3>
          <p className="text-[11px] text-[var(--color-text-muted)]">Powered by workforce AI</p>
        </div>
      </div>

      {/* Insight blocks */}
      <div className="flex-1 divide-y divide-[var(--color-border)]">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-4">
                <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-4/5 rounded" />
                </div>
              </div>
            ))
          : insights.map((item, i) => (
              <div
                key={i}
                className="flex gap-3 p-4 transition-colors hover:bg-[var(--color-bg-card-hover)]"
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}
                >
                  <item.icon className={`h-3.5 w-3.5 ${item.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-[var(--color-text-primary)]">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
      </div>

      {/* CTA */}
      <div className="border-t border-[var(--color-border)] p-4">
        <Link
          href="/hr/insights"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] px-4 py-2.5 text-[12px] font-bold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          <Sparkles className="h-3.5 w-3.5" />
          View Full AI Report
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
