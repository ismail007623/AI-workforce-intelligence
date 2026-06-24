import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  icon: Icon,
  iconClassName,
  trend,
  trendDirection,
  footer,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconClassName?: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  footer?: React.ReactNode;
}) {
  return (
    <div className="ds-stat-card">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-[var(--color-text-muted)]">{title}</p>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)]",
            iconClassName ?? "bg-[var(--color-primary-xlight)] text-[var(--color-primary)]",
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      <p className="text-[28px] font-bold leading-tight text-[var(--color-text-primary)]">{value}</p>
      {trend && (
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-medium",
            trendDirection === "up" && "text-[var(--color-success)]",
            trendDirection === "down" && "text-[var(--color-danger)]",
            (!trendDirection || trendDirection === "neutral") && "text-[var(--color-text-muted)]",
          )}
        >
          {trendDirection === "up" && <TrendingUp className="h-3.5 w-3.5" />}
          {trendDirection === "down" && <TrendingDown className="h-3.5 w-3.5" />}
          <span>{trend}</span>
        </div>
      )}
      {footer && <div>{footer}</div>}
    </div>
  );
}
