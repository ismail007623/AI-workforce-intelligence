"use client";

import { Sparkles, X } from "lucide-react";

export function ComingSoonModal({
  feature,
  onClose,
}: {
  feature: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[var(--color-text-primary)]/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm animate-scale-in rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-primary-xlight)] hover:text-[var(--color-text-primary)]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-xlight)] text-[var(--color-primary)]">
          <Sparkles className="h-6 w-6" />
        </div>

        <h3 className="mt-4 text-lg font-bold text-[var(--color-text-primary)]">Coming soon</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">
          <span className="font-semibold text-[var(--color-text-secondary)]">{feature}</span> is part of our Phase 2
          roadmap and isn&apos;t available in this POC yet. Stay tuned!
        </p>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-[var(--color-text-muted)]">
            <span>Development progress</span>
            <span>Phase 2</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-primary-xlight)]">
            <div className="h-full w-[35%] rounded-full gradient-primary" />
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-[var(--radius-md)] bg-[var(--color-primary)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] active:scale-[0.97]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
