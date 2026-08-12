"use client";

import type { PolicyStatusResponse } from "@/lib/types";
import { formatFileSize } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] py-2.5 last:border-0">
      <span className="text-[12px] text-[var(--color-text-muted)]">{label}</span>
      <span className="max-w-[55%] text-right text-[12px] font-semibold text-[var(--color-text-primary)]">
        {value}
      </span>
    </div>
  );
}

export function PolicyInformationCard({
  status,
  loading,
}: {
  status?: PolicyStatusResponse;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Policy Information</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : !status?.has_policy ? (
          <p className="text-[13px] text-[var(--color-text-muted)]">No policy uploaded yet.</p>
        ) : (
          <>
            <Row label="Status" value={status.status === "active" ? "Active" : (status.status ?? "—")} />
            <Row label="Pages" value={status.page_count != null ? String(status.page_count) : "—"} />
            <Row
              label="File size"
              value={status.file_size_bytes != null ? formatFileSize(status.file_size_bytes) : "—"}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
