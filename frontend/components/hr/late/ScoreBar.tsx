import { scoreBarColor } from "./late-utils";

export function ScoreBar({
  value,
  inverted = false,
}: {
  value: number | null;
  inverted?: boolean;
}) {
  if (value == null) {
    return <span className="text-[12px] text-[var(--color-text-muted)]">—</span>;
  }

  const color = scoreBarColor(value, inverted);
  const width = Math.max(0, Math.min(100, value));

  return (
    <div className="min-w-[60px]">
      <p className="text-[13px] font-bold text-[var(--color-text-primary)]">{value}</p>
      <div className="mt-1 h-2 w-16 overflow-hidden rounded-full bg-[var(--color-bg-soft)]">
        <div
          className="h-full rounded-full"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function Sparkline({ color }: { color: string }) {
  return (
    <svg width="56" height="28" viewBox="0 0 56 28" fill="none" className="shrink-0">
      <path
        d="M0 20 L10 16 L20 18 L28 12 L38 14 L48 8 L56 4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
