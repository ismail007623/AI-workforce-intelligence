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
  | "primary"
  | "indexing"
  | "policy_active"
  | "replaced"
  | "failed"
  | "valid"
  | "acceptable"
  | "weak"
  | "invalid";

const variants: Record<Variant, string> = {
  present: "bg-[var(--color-success-light)] text-[var(--color-success)] ring-[var(--color-success)]/20",
  on_time: "bg-[var(--color-success-light)] text-[var(--color-success)] ring-[var(--color-success)]/20",
  low: "bg-[var(--color-success-light)] text-[var(--color-success)] ring-[var(--color-success)]/20",
  late: "bg-[var(--color-warning-light)] text-[var(--color-warning)] ring-[var(--color-warning)]/30",
  medium: "bg-[var(--color-warning-light)] text-[var(--color-warning)] ring-[var(--color-warning)]/30",
  absent: "bg-[var(--color-danger-light)] text-[var(--color-danger)] ring-[var(--color-danger)]/20",
  high: "bg-[var(--color-danger-light)] text-[var(--color-danger)] ring-[var(--color-danger)]/20",
  early_left: "bg-[var(--color-warning-light)] text-[var(--color-warning)] ring-[var(--color-warning)]/30",
  not_checked_in: "bg-[var(--color-primary-xlight)] text-[var(--color-text-muted)] ring-[var(--color-border)]",
  neutral: "bg-[var(--color-primary-xlight)] text-[var(--color-text-muted)] ring-[var(--color-border)]",
  primary: "bg-[var(--color-primary-xlight)] text-[var(--color-primary)] ring-[var(--color-primary)]/20",
  indexing: "bg-[var(--color-primary-xlight)] text-[var(--color-policy-accent)] ring-[var(--color-policy-accent)]/20",
  policy_active: "bg-[var(--color-success-light)] text-[var(--color-success)] ring-[var(--color-success)]/20",
  replaced: "bg-[var(--color-primary-xlight)] text-[var(--color-text-muted)] ring-[var(--color-border)]",
  failed: "bg-[var(--color-danger-light)] text-[var(--color-danger)] ring-[var(--color-danger)]/20",
  valid: "bg-[var(--color-success-light)] text-[var(--color-success)] ring-[var(--color-success)]/20",
  acceptable: "bg-[var(--color-primary-xlight)] text-[var(--color-primary)] ring-[var(--color-primary)]/20",
  weak: "bg-[var(--color-warning-light)] text-[var(--color-warning)] ring-[var(--color-warning)]/30",
  invalid: "bg-[var(--color-danger-light)] text-[var(--color-danger)] ring-[var(--color-danger)]/20",
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
