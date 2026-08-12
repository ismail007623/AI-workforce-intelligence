import { CheckCircle2, Clock, Shield, Users } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { LateStatsSummary } from "./late-utils";
import { Sparkline } from "./ScoreBar";

export function LateSummaryCards({
  stats,
  loading,
}: {
  stats: LateStatsSummary;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-[var(--radius-xl)]" />
        ))}
      </div>
    );
  }

  const donutData = [
    { name: "Acceptable", value: stats.acceptableCount, color: "#22c55e" },
    { name: "Weak", value: stats.weakCount, color: "#f97316" },
  ].filter((d) => d.value > 0);

  const donutEmpty = donutData.length === 0;

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <div className="ds-stat-card">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--color-text-muted)]">Total Late Arrivals</p>
            <p className="mt-1 text-[28px] font-bold leading-tight text-[var(--color-text-primary)]">
              {stats.totalLate}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Today</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary-xlight)] text-[var(--color-primary)]">
            <Users className="h-[18px] w-[18px]" />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Sparkline color="#a29bfe" />
        </div>
      </div>

      <div className="ds-stat-card">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--color-text-muted)]">Highest Delay</p>
            <p className="mt-1 text-[28px] font-bold leading-tight text-orange-500">
              {stats.highestDelay ? `+${stats.highestDelay.minutes} min` : "—"}
            </p>
            <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
              {stats.highestDelay?.name ?? "No late arrivals"}
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-orange-50 text-orange-500">
            <Clock className="h-[18px] w-[18px]" />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Sparkline color="#f97316" />
        </div>
      </div>

      <div className="ds-stat-card">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--color-text-muted)]">High Risk Cases</p>
            <p className="mt-1 text-[28px] font-bold leading-tight text-red-500">{stats.highRiskCount}</p>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Risk score ≥ 80</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-red-50 text-red-500">
            <Shield className="h-[18px] w-[18px]" />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Sparkline color="#ef4444" />
        </div>
      </div>

      <div className="ds-stat-card">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[var(--color-text-muted)]">AI Decision Summary</p>
            <div className="mt-2 space-y-1.5">
              <p className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-secondary)]">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {stats.acceptableCount} Acceptable
              </p>
              <p className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-secondary)]">
                <span className="text-orange-500">⚠</span>
                {stats.weakCount} Weak
              </p>
            </div>
          </div>
          <div className="h-16 w-16 shrink-0">
            {donutEmpty ? (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-400">
                N/A
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    innerRadius={18}
                    outerRadius={28}
                    paddingAngle={2}
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
