"use client";

import { useEffect, useState } from "react";
import { CreditCard, Lock, X } from "lucide-react";

/*
 * Payment modal — UI ONLY preview.
 * No payment provider SDK, no API call, no network request, no keys.
 * Submitting only shows an inline note; nothing is sent anywhere.
 */

export function PaymentModal({
  open,
  planName,
  priceLabel,
  onClose,
}: {
  open: boolean;
  planName: string;
  priceLabel: string;
  onClose: () => void;
}) {
  const [submitted, setSubmitted] = useState(false);

  // Reset the form state each time the modal opens for a plan.
  useEffect(() => {
    if (open) setSubmitted(false);
  }, [open ]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const inputCls =
    "mt-1.5 h-11 w-full rounded-xl border border-[var(--color-border-strong)] bg-white px-3.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#17172b]/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Subscribe to ${planName}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-[var(--shadow-overlay)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              Subscribe to {planName}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{priceLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-soft)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitted ? (
          <p className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3.5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Payment integration coming soon — this is a preview only.
          </p>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              // UI only: show the preview note, send nothing anywhere.
              setSubmitted(true);
            }}
          >
            <div>
              <label htmlFor="pm-card-name" className="text-sm font-semibold text-[var(--color-text-primary)]">
                Name on card
              </label>
              <input id="pm-card-name" type="text" autoComplete="cc-name" placeholder="Full name" className={inputCls} required />
            </div>
            <div>
              <label htmlFor="pm-card-number" className="text-sm font-semibold text-[var(--color-text-primary)]">
                Card number
              </label>
              <div className="relative">
                <input
                  id="pm-card-number"
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="1234 5678 9012 3456"
                  className={`${inputCls} pr-11`}
                  required
                />
                <CreditCard className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pm-card-expiry" className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Expiry
                </label>
                <input id="pm-card-expiry" type="text" inputMode="numeric" autoComplete="cc-exp" placeholder="MM / YY" className={inputCls} required />
              </div>
              <div>
                <label htmlFor="pm-card-cvc" className="text-sm font-semibold text-[var(--color-text-primary)]">
                  CVC
                </label>
                <input id="pm-card-cvc" type="text" inputMode="numeric" autoComplete="cc-csc" placeholder="123" className={inputCls} required />
              </div>
            </div>
            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--color-primary-dark)]"
            >
              <Lock className="h-4 w-4" /> Pay {priceLabel}
            </button>
            <p className="text-center text-xs leading-relaxed text-[var(--color-text-muted)]">
              Preview only — no payment is processed.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
