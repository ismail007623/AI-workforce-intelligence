"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Upload, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { PolicyUploadResponse } from "@/lib/types";
import { formatFileSize } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  PolicyUploadStepper,
  STEP_DESCRIPTIONS,
  UPLOAD_STEPS,
} from "./PolicyUploadStepper";

const ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type Phase = "idle" | "uploading" | "processing" | "success" | "error";

function progressToStep(percent: number, phase: Phase): number {
  if (phase === "success") return UPLOAD_STEPS.length - 1;
  if (percent < 20) return 0;
  if (percent < 30) return 1;
  if (percent < 55) return 2;
  if (percent < 90) return 3;
  return 4;
}

export function PolicyUploadSection({
  uploadRef,
  onSuccess,
}: {
  uploadRef?: React.RefObject<HTMLDivElement | null>;
  onSuccess: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<PolicyUploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = phase === "uploading" || phase === "processing";
  const activeStep = progressToStep(progress, phase);
  const showStepper = busy || phase === "success";

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    cancelRef.current = null;
    setPhase("idle");
    setProgress(0);
    setError(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const handleCancel = () => {
    cancelRef.current?.();
    reset();
    setSelectedFile(null);
  };

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const pickFile = (file: File | null) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx") {
      setError("Only PDF and DOCX files are supported.");
      return;
    }
    setSelectedFile(file);
    setError(null);
    if (phase === "success" || phase === "error") setPhase("idle");
  };

  const startUpload = async () => {
    if (!selectedFile || busy) return;

    setPhase("uploading");
    setProgress(0);
    setError(null);
    setResult(null);

    let processingStarted = false;
    const startProcessing = () => {
      if (processingStarted) return;
      processingStarted = true;
      setPhase("processing");
      timerRef.current = setInterval(() => {
        setProgress((p) => (p < 88 ? p + 2 : p));
      }, 400);
    };

    const { promise, cancel } = api.uploadPolicyDocument(
      selectedFile,
      (percent) => {
        setProgress((p) => Math.max(p, Math.min(percent * 0.2, 20)));
        if (percent >= 100) startProcessing();
      },
      startProcessing,
    );

    cancelRef.current = cancel;

    try {
      const res = await promise;
      if (timerRef.current) clearInterval(timerRef.current);
      setProgress(100);
      setResult(res);
      setPhase("success");
      onSuccess();
    } catch (e) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (e instanceof ApiError && e.message === "Upload cancelled.") {
        return;
      }
      setPhase("error");
      if (e instanceof ApiError && e.status === 503) {
        setError(
          "Policy upload service is not configured. Set PINECONE_API_KEY and OPENAI_API_KEY on the server.",
        );
      } else {
        setError(e instanceof ApiError ? e.message : "Upload failed. Please try again.");
      }
    }
  };

  return (
    <div ref={uploadRef}>
    <Card>
      <CardHeader>
        <CardTitle>Upload New Policy Document</CardTitle>
        <CardDescription>
          PDF or DOCX up to 10 MB. Uploading replaces the previous policy in the AI index.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />

        <div
          role="button"
          tabIndex={0}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pickFile(e.dataTransfer.files[0] ?? null);
          }}
          onClick={() => !busy && inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-lg)] border-2 border-dashed px-6 py-10 transition-colors ${
            dragOver
              ? "border-[var(--color-policy-accent)] bg-[var(--color-primary-xlight)]"
              : "border-[var(--color-border-strong)] bg-[var(--color-bg-card-hover)] hover:border-[var(--color-primary-light)]"
          } ${busy ? "pointer-events-none opacity-60" : ""}`}
        >
          <Upload className="mb-2 h-8 w-8 text-[var(--color-text-muted)]" />
          <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
            Drag and drop your policy file here
          </p>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">or click to browse · PDF, DOCX</p>
        </div>

        {selectedFile && (
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-primary-xlight)] px-3 py-2.5">
            <FileText className="h-5 w-5 shrink-0 text-[var(--color-policy-accent)]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{selectedFile.name}</p>
              <p className="text-[11px] text-[var(--color-text-muted)]">{formatFileSize(selectedFile.size)}</p>
            </div>
            {phase === "success" && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-success)]">
                <CheckCircle2 className="h-3.5 w-3.5" /> Upload complete
              </span>
            )}
          </div>
        )}

        {phase === "idle" && selectedFile && (
          <Button onClick={startUpload} className="bg-[var(--color-policy-accent)] hover:opacity-90">
            <Upload size={16} />
            Upload & replace policy
          </Button>
        )}

        {showStepper && (
          <div className="space-y-4 animate-fade-in">
            <PolicyUploadStepper activeStep={activeStep} done={phase === "success"} />
            <div className="space-y-1.5">
              <div className="flex justify-between text-[12px]">
                <span className="text-[var(--color-text-muted)]">
                  {STEP_DESCRIPTIONS[activeStep]}
                </span>
                <span className="font-semibold text-[var(--color-policy-accent)]">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2.5" barClassName="bg-[var(--color-policy-accent)]" />
            </div>
          </div>
        )}

        {busy && (
          <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--color-info-light)] px-3 py-2.5">
            <p className="text-[12px] text-[var(--color-text-secondary)]">Processing your document…</p>
            <Button variant="ghost" size="sm" onClick={handleCancel} className="h-8 text-[var(--color-danger)]">
              <X size={14} />
              Cancel
            </Button>
          </div>
        )}

        {phase === "success" && result && (
          <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-success)]/30 bg-[var(--color-success-light)] p-3 text-[13px] text-[var(--color-success)]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">{result.message}</p>
              <p className="mt-0.5 text-[12px] opacity-90">
                {result.filename} · {result.page_count} pages · {result.chunk_count} chunks indexed
              </p>
            </div>
          </div>
        )}

        {phase === "error" && error && (
          <div className="flex items-start gap-2 rounded-[var(--color-danger-light)] p-3 text-[13px] text-[var(--color-danger)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
