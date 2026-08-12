"use client";

import { Check, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepState = "completed" | "in_progress" | "pending";

export const UPLOAD_STEPS = [
  { id: 1, label: "Uploading" },
  { id: 2, label: "Validating" },
  { id: 3, label: "Processing" },
  { id: 4, label: "Preparing for AI" },
  { id: 5, label: "Ready" },
] as const;

export function getStepState(stepIndex: number, activeStep: number, done: boolean): StepState {
  if (done) return "completed";
  if (stepIndex < activeStep) return "completed";
  if (stepIndex === activeStep) return "in_progress";
  return "pending";
}

export function PolicyUploadStepper({
  activeStep,
  done = false,
}: {
  activeStep: number;
  done?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      {UPLOAD_STEPS.map((step, index) => {
        const state = getStepState(index, activeStep, done);
        return (
          <div key={step.id} className="flex min-w-[72px] flex-1 flex-col items-center gap-1.5">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                state === "completed" && "border-[var(--color-success)] bg-[var(--color-success-light)]",
                state === "in_progress" && "border-[var(--color-policy-accent)] bg-[var(--color-primary-xlight)]",
                state === "pending" && "border-[var(--color-border-strong)] bg-white",
              )}
            >
              {state === "completed" ? (
                <Check className="h-4 w-4 text-[var(--color-success)]" />
              ) : state === "in_progress" ? (
                <Loader2 className="h-4 w-4 animate-spin text-[var(--color-policy-accent)]" />
              ) : (
                <Circle className="h-3 w-3 text-[var(--color-text-muted)]" />
              )}
            </div>
            <span className="text-center text-[10px] font-medium text-[var(--color-text-secondary)] sm:text-[11px]">
              {step.label}
            </span>
            <span
              className={cn(
                "text-[9px] font-semibold uppercase tracking-wide",
                state === "completed" && "text-[var(--color-success)]",
                state === "in_progress" && "text-[var(--color-policy-accent)]",
                state === "pending" && "text-[var(--color-text-muted)]",
              )}
            >
              {state === "completed" ? "Completed" : state === "in_progress" ? "In Progress" : "Pending"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export const STEP_DESCRIPTIONS = [
  "Uploading your document…",
  "Validating file format and size…",
  "Organizing the policy content…",
  "Generating embeddings for AI search…",
  "Policy is ready for the AI assistant.",
];
