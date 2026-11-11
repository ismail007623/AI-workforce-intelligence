"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUp,
  Brain,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Sparkles,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { InsightsResponse } from "@/lib/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

const PRESETS = [
  "Which employees have attendance issues this month?",
  "Which department has the highest lateness rate?",
  "Which employees repeatedly submit weak reasons?",
  "Who has the lowest reliability score?",
  "Which departments have the most invalid late reasons?",
  "Are there employees with detected reason patterns?",
  "What actions should HR take to improve attendance?",
];

const THINKING_STEPS = [
  "Reading attendance records",
  "Aggregating department stats",
  "Analyzing patterns",
  "Generating recommendations",
];

export default function InsightsPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsightsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (stepTimer.current) clearInterval(stepTimer.current);
  }, []);

  const ask = async (q: string) => {
    const query = q.trim();
    if (!query || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setStepIdx(0);
    stepTimer.current = setInterval(() => {
      setStepIdx((i) => (i + 1) % THINKING_STEPS.length);
    }, 1200);

    try {
      const res = await api.queryInsights(query);
      setResult(res);
    } catch (e) {
      if (e instanceof ApiError && e.status === 503) {
        setError(
          "The AI service is not configured (missing OpenAI API key on the server). Please set it to enable insights.",
        );
      } else {
        setError(e instanceof ApiError ? e.message : "Failed to generate insights. Please try again.");
      }
    } finally {
      if (stepTimer.current) clearInterval(stepTimer.current);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Workforce Insights"
        description="Ask questions about attendance."
      />

      {/* Composer */}
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--color-border)] bg-gradient-to-r from-[var(--color-primary-xlight)]/60 to-[var(--color-primary-xlight)]/30 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">Attendance AI Assistant</p>
              <p className="text-xs text-[var(--color-text-muted)]">Powered by your live attendance data</p>
            </div>
          </div>
        </div>
        <CardContent className="p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
          >
            <div className="relative">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask(question);
                  }
                }}
                rows={3}
                placeholder="e.g. Which employees are at risk of attendance problems?"
                className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-white p-4 pr-14 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
          </form>

          {/* Presets */}
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={loading}
                onClick={() => {
                  setQuestion(p);
                  ask(p);
                }}
                className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary-light)] hover:bg-[var(--color-primary-xlight)] hover:text-[var(--color-primary)] disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Thinking */}
      {loading && (
        <Card className="animate-fade-in">
          <CardContent className="flex items-center gap-3 py-6">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{THINKING_STEPS[stepIdx]}…</p>
              <p className="text-xs text-[var(--color-text-muted)]">The AI agent is analyzing your workforce data</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-[var(--color-border)] animate-fade-in">
          <CardContent className="flex items-start gap-3 py-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-danger)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">Couldn&apos;t generate insights</p>
              <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="space-y-5 animate-fade-in">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-xlight)] text-[var(--color-primary)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                    Summary
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">{result.summary}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            {result.key_findings.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Key Findings</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {result.key_findings.map((f, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-[var(--color-text-secondary)]">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-success-light)]0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {result.recommendations.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-[var(--color-warning)]" />
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Recommendations</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {result.recommendations.map((r, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-[var(--color-text-secondary)]">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-warning-light)] text-[10px] font-bold text-[var(--color-warning)]">
                          {i + 1}
                        </span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {result.raw_answer && (
            <details className="group rounded-2xl border border-[var(--color-border)]/80 bg-white">
              <summary className="cursor-pointer list-none p-5 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]">
                View full AI response
              </summary>
              <div className="border-t border-[var(--color-border)] p-5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {result.raw_answer}
                </p>
              </div>
            </details>
          )}
        </div>
      )}

      {/* Empty initial */}
      {!result && !loading && !error && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-xlight)] text-[var(--color-primary)]">
              <Brain className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">Ask anything about attendance</p>
            <p className="mt-1 max-w-sm text-sm text-[var(--color-text-muted)]">
              Pick a suggested question above or type your own to get AI-generated findings and
              recommendations.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
