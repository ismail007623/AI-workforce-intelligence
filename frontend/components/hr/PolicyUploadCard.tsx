"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { PolicyStatusResponse, PolicyUploadResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type UploadPhase = "idle" | "uploading" | "processing" | "success" | "error";

const PROCESSING_STEPS = [
  "Deleting old policy vectors",
  "Parsing document",
  "Generating embeddings",
  "Saving to index",
];

const ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PolicyUploadCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [status, setStatus] = useState<PolicyStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [result, setResult] = useState<PolicyUploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = phase === "uploading" || phase === "processing";

  const loadStatus = async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const res = await api.getPolicyStatus();
      setStatus(res);
    } catch (e) {
      setStatusError(
        e instanceof ApiError
          ? e.message
          : "Could not load policy status.",
      );
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    return () => {
      if (stepTimer.current) clearInterval(stepTimer.current);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setResult(null);
    setError(null);
    if (phase === "success" || phase === "error") setPhase("idle");
  };

  const handleUpload = async () => {
    if (!selectedFile || busy) return;

    setPhase("uploading");
    setUploadProgress(0);
    setError(null);
    setResult(null);
    setStepIdx(0);

    let processingStarted = false;
    const startProcessing = () => {
      if (processingStarted) return;
      processingStarted = true;
      setPhase("processing");
      stepTimer.current = setInterval(() => {
        setStepIdx((i) => (i + 1) % PROCESSING_STEPS.length);
      }, 1200);
    };

    try {
      const res = await api.uploadPolicyDocument(
        selectedFile,
        (percent) => {
          setUploadProgress(percent);
          if (percent >= 100) startProcessing();
        },
        startProcessing,
      );

      if (stepTimer.current) clearInterval(stepTimer.current);
      setResult(res);
      setPhase("success");
      await loadStatus();
    } catch (e) {
      if (stepTimer.current) clearInterval(stepTimer.current);
      setPhase("error");
      if (e instanceof ApiError && e.status === 503) {
        setError(
          "Policy upload service is not configured. Set PINECONE_API_KEY and OPENAI_API_KEY on the server.",
        );
      } else {
        setError(e instanceof ApiError ? e.message : "Upload failed. Please try again.");
      }
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Current policy index</CardTitle>
          <CardDescription>
            Only one active company policy is stored. Each upload replaces the previous document.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="flex items-center gap-2 text-[13px] text-[var(--color-text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading status…
            </div>
          ) : statusError ? (
            <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--color-danger-light)] p-3 text-[13px] text-[var(--color-danger)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {statusError}
            </div>
          ) : status?.has_policy ? (
            <p className="text-[13px] text-[var(--color-text-secondary)]">
              <span className="font-semibold text-[var(--color-success)]">Active policy indexed</span>
              {" · "}
              {status.chunk_count} chunk{status.chunk_count === 1 ? "" : "s"} in{" "}
              <span className="font-mono text-[12px]">{status.index_name}</span>
            </p>
          ) : (
            <p className="text-[13px] text-[var(--color-text-muted)]">No policy uploaded yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload company policy</CardTitle>
          <CardDescription>PDF or DOCX up to 10 MB. Previous vectors are deleted before indexing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="justify-center"
            >
              <FileText size={16} />
              Choose file
            </Button>
            {selectedFile && (
              <div className="min-w-0 text-[13px] text-[var(--color-text-secondary)]">
                <span className="font-medium text-[var(--color-text-primary)]">{selectedFile.name}</span>
                <span className="text-[var(--color-text-muted)]"> · {formatFileSize(selectedFile.size)}</span>
              </div>
            )}
          </div>

          <Button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || busy}
            className="w-full sm:w-auto"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload size={16} />}
            {busy ? "Uploading…" : "Upload & replace policy"}
          </Button>

          {phase === "uploading" && (
            <div className="space-y-2 animate-fade-in">
              <div className="flex justify-between text-[12px] text-[var(--color-text-muted)]">
                <span>Uploading file</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {phase === "processing" && (
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary-xlight)] px-3 py-2.5 text-[13px] text-[var(--color-primary)] animate-fade-in">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              {PROCESSING_STEPS[stepIdx]}…
            </div>
          )}

          {phase === "success" && result && (
            <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-success)]/30 bg-[var(--color-success-light)] p-3 text-[13px] text-[var(--color-success)] animate-fade-in">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">{result.message}</p>
                <p className="mt-0.5 text-[12px] opacity-90">
                  {result.filename} · {result.chunk_count} chunk{result.chunk_count === 1 ? "" : "s"} indexed
                </p>
              </div>
            </div>
          )}

          {phase === "error" && error && (
            <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--color-danger-light)] p-3 text-[13px] text-[var(--color-danger)] animate-fade-in">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
