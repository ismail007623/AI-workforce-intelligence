"use client";

import { useState } from "react";
import { CheckCircle2, Download, FileText, RefreshCw } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { PolicyStatusResponse } from "@/lib/types";
import {
  formatDateTime,
  formatFileSize,
  initials,
  policyDisplayName,
} from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CurrentPolicyCard({
  status,
  loading,
  onReplace,
}: {
  status?: PolicyStatusResponse;
  loading?: boolean;
  onReplace: () => void;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await api.downloadPolicyDocument();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!status?.has_policy || !status.filename) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            No company policy uploaded yet. Use the upload section below to add your first document.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle>Current Policy</CardTitle>
        <Badge variant="policy_active">Active</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-danger-light)]">
            <FileText className="h-7 w-7 text-[var(--color-danger)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[var(--color-text-primary)]">
              {policyDisplayName(status.filename)}
            </p>
            <p
              className="mt-0.5 truncate text-[12px] text-[var(--color-text-muted)]"
              title={status.filename}
            >
              {status.filename}
              {status.page_count != null && ` · ${status.page_count} pages`}
              {status.file_size_bytes != null && ` · ${formatFileSize(status.file_size_bytes)}`}
            </p>
            {status.uploaded_at && (
              <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                Uploaded {formatDateTime(status.uploaded_at)}
              </p>
            )}
            {status.last_updated_at && (
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Last updated {formatDateTime(status.last_updated_at)}
              </p>
            )}
            {status.uploaded_by && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary-xlight)] text-[10px] font-bold text-[var(--color-policy-accent)]">
                  {initials(status.uploaded_by)}
                </div>
                <span className="text-[12px] text-[var(--color-text-secondary)]">{status.uploaded_by}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
            <Download size={14} />
            {downloading ? "Downloading…" : "Download"}
          </Button>
          <Button variant="outline" size="sm" onClick={onReplace}>
            <RefreshCw size={14} />
            Replace Policy
          </Button>
        </div>

        {status.status === "active" && (
          <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-success)]/30 bg-[var(--color-success-light)] p-3 text-[13px] text-[var(--color-success)]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            This policy is active and available to the AI Workforce Assistant.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
