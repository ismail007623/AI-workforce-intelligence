import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  barClassName,
  indeterminate = false,
}: {
  value?: number;
  className?: string;
  barClassName?: string;
  indeterminate?: boolean;
}) {
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-[var(--color-primary-xlight)]", className)}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {indeterminate ? (
        <div
          className={cn("h-full w-1/2 rounded-full bg-[var(--color-primary)]", barClassName)}
          style={{ animation: "indeterminate 1.2s ease-in-out infinite" }}
        />
      ) : (
        <div
          className={cn(
            "h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300 ease-out",
            barClassName,
          )}
          style={{ width: `${Math.min(Math.max(value ?? 0, 0), 100)}%` }}
        />
      )}
    </div>
  );
}
