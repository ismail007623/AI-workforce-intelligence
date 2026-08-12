"use client";

import { FileText, Loader2 } from "lucide-react";
import type { PolicyHistoryItem } from "@/lib/types";
import { formatDateTime, formatFileSize } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, LoadingTable } from "@/components/shared/states";

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge variant="policy_active">Active</Badge>;
    case "indexing":
      return (
        <Badge variant="indexing">
          <Loader2 className="h-3 w-3 animate-spin" />
          Indexing in progress
        </Badge>
      );
    case "failed":
      return <Badge variant="failed">Failed</Badge>;
    case "replaced":
      return <Badge variant="replaced">Replaced</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

export function PolicyUploadHistoryTable({
  history,
  loading,
}: {
  history: PolicyHistoryItem[];
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Policy Upload History</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        {loading ? (
          <div className="p-3">
            <LoadingTable rows={3} />
          </div>
        ) : history.length === 0 ? (
          <div className="p-3">
            <EmptyState
              icon={FileText}
              title="No upload history"
              description="Uploaded policy documents will appear here."
            />
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>File name</TH>
                <TH>Uploaded by</TH>
                <TH>Upload date</TH>
                <TH>Status</TH>
                <TH>Pages</TH>
                <TH>Size</TH>
              </TR>
            </THead>
            <TBody>
              {history.map((row) => (
                <TR key={row.id}>
                  <TD>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-[var(--color-danger)]" />
                      <span className="max-w-[180px] truncate font-medium">{row.filename}</span>
                    </div>
                  </TD>
                  <TD>{row.uploaded_by}</TD>
                  <TD className="whitespace-nowrap text-[12px]">{formatDateTime(row.uploaded_at)}</TD>
                  <TD>{statusBadge(row.status)}</TD>
                  <TD>{row.page_count}</TD>
                  <TD>{formatFileSize(row.file_size_bytes)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
