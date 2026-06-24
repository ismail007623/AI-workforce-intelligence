import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  early_left: "Early Leave",
  on_time: "On Time",
  not_checked_in: "Not Checked In",
  low: "Low Risk",
  medium: "Medium Risk",
  high: "High Risk",
};

const VARIANTS = new Set([
  "present",
  "late",
  "absent",
  "early_left",
  "on_time",
  "not_checked_in",
  "low",
  "medium",
  "high",
]);

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-sm text-slate-400">—</span>;
  const variant = (VARIANTS.has(status) ? status : "neutral") as never;
  return <Badge variant={variant}>{LABELS[status] ?? status}</Badge>;
}
