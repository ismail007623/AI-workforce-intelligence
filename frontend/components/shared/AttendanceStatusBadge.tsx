import { CheckCircle2, Clock, Minus, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type BadgeVariant = React.ComponentProps<typeof Badge>["variant"];

/**
 * Attendance status badge with both an icon and text, so status is
 * never conveyed by color alone. Wraps the existing Badge variants.
 */
const CONFIG: Record<
  string,
  { variant: BadgeVariant; label: string; icon: React.ElementType }
> = {
  present: { variant: "present", label: "On Time", icon: CheckCircle2 },
  on_time: { variant: "on_time", label: "On Time", icon: CheckCircle2 },
  late: { variant: "late", label: "Late", icon: Clock },
  absent: { variant: "absent", label: "Absent", icon: UserX },
  early_left: { variant: "early_left", label: "Early Leave", icon: Clock },
  not_checked_in: { variant: "not_checked_in", label: "Not Checked In", icon: Minus },
};

export function AttendanceStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-sm text-[var(--color-text-muted)]">—</span>;
  const cfg = CONFIG[status] ?? { variant: "neutral" as BadgeVariant, label: status, icon: Minus };
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant}>
      <Icon className="h-3 w-3" aria-hidden />
      {cfg.label}
    </Badge>
  );
}
