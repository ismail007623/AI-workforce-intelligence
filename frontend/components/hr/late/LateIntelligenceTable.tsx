import { AlertTriangle, CheckCircle2, MoreVertical } from "lucide-react";
import type { LateIntelligenceRecord } from "@/lib/types";
import { formatTime, initials } from "@/lib/utils";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ScoreBar } from "./ScoreBar";
import type { ColumnKey } from "./late-utils";
import {
  avatarColor,
  decisionVariant,
  isPositiveDecision,
  latePillClass,
} from "./late-utils";

export function LateIntelligenceTable({
  rows,
  visibleColumns,
}: {
  rows: LateIntelligenceRecord[];
  visibleColumns: Set<ColumnKey>;
}) {
  const show = (key: ColumnKey) => visibleColumns.has(key);

  return (
    <div className="overflow-x-auto">
      <Table>
        <THead>
          <TR className="bg-slate-50/80">
            <TH>Employee</TH>
            {show("department") && <TH>Department</TH>}
            {show("check_in") && <TH>Check In</TH>}
            {show("late_by") && <TH>Late By</TH>}
            {show("reason") && <TH>Reason</TH>}
            {show("ai_category") && <TH>AI Category</TH>}
            {show("ai_decision") && <TH>AI Decision</TH>}
            {show("validity") && (
              <TH>
                <span className="inline-flex items-center gap-0.5">
                  Validity <InfoDot />
                </span>
              </TH>
            )}
            {show("risk") && (
              <TH>
                <span className="inline-flex items-center gap-0.5">
                  Risk <InfoDot />
                </span>
              </TH>
            )}
            {show("reliability") && (
              <TH>
                <span className="inline-flex items-center gap-0.5">
                  Reliability <InfoDot />
                </span>
              </TH>
            )}
            <TH className="w-10" />
          </TR>
        </THead>
        <TBody>
          {rows.map((r) => {
            const colors = avatarColor(r.employee_id);
            return (
              <TR
                key={r.employee_id}
                className="transition-colors hover:bg-[var(--color-bg-card-hover)]"
              >
                <TD>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {initials(r.employee_name)}
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--color-text-primary)]">
                        {r.employee_name}
                      </p>
                      <p className="font-mono text-[11px] text-[var(--color-text-muted)]">
                        {r.employee_id}
                      </p>
                    </div>
                  </div>
                </TD>
                {show("department") && <TD className="text-[13px]">{r.department}</TD>}
                {show("check_in") && <TD className="text-[13px]">{formatTime(r.check_in_time)}</TD>}
                {show("late_by") && (
                  <TD>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${latePillClass(r.late_minutes)}`}
                    >
                      +{r.late_minutes} min
                    </span>
                  </TD>
                )}
                {show("reason") && (
                  <TD className="max-w-[160px]">
                    {r.reason ? (
                      <span
                        title={
                          r.pattern_summary ? `${r.reason}\n\nPattern: ${r.pattern_summary}` : r.reason
                        }
                        className="line-clamp-2 text-[12px] text-[var(--color-text-secondary)]"
                      >
                        {r.reason}
                        {r.pattern_detected && (
                          <span className="ml-1 text-[10px] font-semibold text-amber-600">⚠</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-[12px] italic text-[var(--color-text-muted)]">Pending</span>
                    )}
                  </TD>
                )}
                {show("ai_category") && <TD className="text-[12px]">{r.ai_category ?? "—"}</TD>}
                {show("ai_decision") && (
                  <TD>
                    <DecisionBadge decision={r.ai_decision} reasonStatus={r.reason_status} />
                  </TD>
                )}
                {show("validity") && (
                  <TD>
                    <ScoreBar value={r.validity_score} />
                  </TD>
                )}
                {show("risk") && (
                  <TD>
                    <ScoreBar value={r.risk_score} inverted />
                  </TD>
                )}
                {show("reliability") && (
                  <TD>
                    <ScoreBar value={r.reliability_score} />
                  </TD>
                )}
                <TD>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-slate-100"
                    aria-label="Row actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}

function InfoDot() {
  return (
    <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-500">
      i
    </span>
  );
}

function DecisionBadge({
  decision,
  reasonStatus,
}: {
  decision: string | null;
  reasonStatus: string | null;
}) {
  if (!decision) {
    if (reasonStatus === "pending_ai_evaluation") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200 ring-inset">
          Pending AI
        </span>
      );
    }
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
        Pending
      </span>
    );
  }

  const positive = isPositiveDecision(decision);
  const variant = decisionVariant(decision);

  if (positive) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200 ring-inset">
        <CheckCircle2 className="h-3 w-3" />
        {decision}
      </span>
    );
  }

  if (variant === "weak" || variant === "invalid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700 ring-1 ring-orange-200 ring-inset">
        <AlertTriangle className="h-3 w-3" />
        {decision}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
      {decision}
    </span>
  );
}
