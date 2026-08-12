import { Clock } from "lucide-react";

export function LatePageHeader() {
  return (
    <div className="flex items-center justify-between overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-primary-xlight)] px-6 py-5">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/60">
          <Clock className="h-6 w-6 text-[var(--color-primary)]" />
        </div>
        <div>
          <h1 className="text-[24px] font-bold text-[var(--color-text-primary)]">Late Arrivals</h1>
          <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            Today&apos;s late check-ins and submitted reasons. AI evaluation runs when HR sorts by Most
            Late on a department page.
          </p>
        </div>
      </div>

      <div className="hidden shrink-0 lg:block" aria-hidden>
        <svg width="180" height="110" viewBox="0 0 180 110" fill="none">
          {/* Decorative circles */}
          <circle cx="148" cy="30" r="24" fill="#c4b5fd" opacity="0.35" />
          <circle cx="148" cy="30" r="16" stroke="#a29bfe" strokeWidth="2" fill="white" opacity="0.7" />
          <path d="M148 19v7.5l5 5" stroke="#6c5ce7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Bar chart */}
          <rect x="10" y="70" width="14" height="30" rx="4" fill="#a29bfe" opacity="0.6" />
          <rect x="30" y="55" width="14" height="45" rx="4" fill="#6c5ce7" opacity="0.5" />
          <rect x="50" y="45" width="14" height="55" rx="4" fill="#a29bfe" opacity="0.7" />
          <rect x="70" y="60" width="14" height="40" rx="4" fill="#6c5ce7" opacity="0.4" />

          {/* Trend line */}
          <path
            d="M95 85 L110 70 L125 75 L140 58 L155 62 L170 48"
            stroke="#6c5ce7"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="110" cy="70" r="3" fill="#6c5ce7" />
          <circle cx="140" cy="58" r="3" fill="#6c5ce7" />
          <circle cx="170" cy="48" r="3" fill="#6c5ce7" />

          {/* Small person silhouette */}
          <circle cx="155" cy="85" r="7" fill="#c4b5fd" opacity="0.6" />
          <path
            d="M148 105 Q155 95 162 105"
            stroke="#a29bfe"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}
