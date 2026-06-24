import { cn } from "@/lib/utils";

type Variant =
  | "present"
  | "late"
  | "absent"
  | "early_left"
  | "on_time"
  | "not_checked_in"
  | "low"
  | "medium"
  | "high"
  | "neutral"
  | "primary";

const variants: Record<Variant, string> = {
  present: "bg-[var(--color-success-light)] text-[var(--color-success)] ring-[var(--color-success)]/20",
  on_time: "bg-[var(--color-success-light)] text-[var(--color-success)] ring-[var(--color-success)]/20",
  low: "bg-[var(--color-success-light)] text-[var(--color-success)] ring-[var(--color-success)]/20",
  late: "bg-[var(--color-warning-light)] text-[#d4a017] ring-[var(--color-warning)]/30",
  medium: "bg-[var(--color-warning-light)] text-[#d4a017] ring-[var(--color-warning)]/30",
  absent: "bg-[var(--color-danger-light)] text-[var(--color-danger)] ring-[var(--color-danger)]/20",
  high: "bg-[var(--color-danger-light)] text-[var(--color-danger)] ring-[var(--color-danger)]/20",
  early_left: "bg-[var(--color-warning-light)] text-[var(--color-danger)] ring-[var(--color-danger)]/20",
  not_checked_in: "bg-[var(--color-primary-xlight)] text-[var(--color-text-muted)] ring-[var(--color-border)]",
  neutral: "bg-[var(--color-primary-xlight)] text-[var(--color-text-muted)] ring-[var(--color-border)]",
  primary: "bg-[var(--color-primary-xlight)] text-[var(--color-primary)] ring-[var(--color-primary)]/20",
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ring-1 ring-inset",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
