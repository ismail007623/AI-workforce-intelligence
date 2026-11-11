import { Logo } from "@/components/layout/Logo";

export function Splash({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--background)]">
      <div className="animate-pulse-soft">
        <Logo className="h-12" />
      </div>
      <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}
