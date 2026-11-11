import { AlertTriangle, Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-2xl" />
      ))}
    </div>
  );
}

export function LoadingTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 rounded-xl" />
      ))}
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-danger-light)] px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-danger-light)] text-[var(--color-danger)]">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">Something went wrong</p>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        {message ?? "Failed to load data. Please check the API connection and try again."}
      </p>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border-strong)] px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-bg-soft)] text-[var(--color-text-muted)]">
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
      {description && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>}
    </div>
  );
}
