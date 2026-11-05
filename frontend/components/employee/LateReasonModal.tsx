"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

export function LateReasonModal({
  open,
  onComplete,
}: {
  open: boolean;
  onComplete: () => void;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < 3 || loading) return;
    setLoading(true);
    setError(null);
    try {
      await api.submitLateReason(trimmed);
      setSubmitted(true);
      setTimeout(() => {
        onComplete();
        setReason("");
        setSubmitted(false);
      }, 1500);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to submit reason.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md rounded-[var(--radius-xl)] bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="late-reason-title"
      >
        {!submitted ? (
          <>
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-warning-light)]">
                <AlertTriangle className="h-5 w-5 text-[var(--color-warning)]" />
              </div>
              <div>
                <h2 id="late-reason-title" className="text-[16px] font-semibold text-[var(--color-text-primary)]">
                  Late arrival reason required
                </h2>
                <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
                  You have exceeded the company&apos;s grace period. Please provide the reason for your late arrival.
                </p>
              </div>
            </div>

            <label className="mb-1 block text-[12px] font-medium text-[var(--color-text-secondary)]">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              disabled={loading}
              placeholder="Describe why you arrived late today…"
              className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border-strong)] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />

            {error && (
              <p className="mt-2 text-[12px] text-[var(--color-danger)]">{error}</p>
            )}

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || reason.trim().length < 3}
              className="mt-4 w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Submitting…" : "Submit"}
            </Button>
          </>
        ) : (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--color-success)]" />
            <p className="mt-3 text-[15px] font-semibold text-[var(--color-text-primary)]">
              Reason submitted
            </p>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
              Your reason has been recorded. Thank you.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
