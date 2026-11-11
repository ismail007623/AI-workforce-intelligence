"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Send, ShieldQuestion, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { PolicyCitation } from "@/lib/types";

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: PolicyCitation[];
  error?: boolean;
};

const SUGGESTED = [
  "What is the leave policy?",
  "How many sick days am I entitled to?",
  "What are the working hours?",
  "What is the policy on remote work?",
  "How do I apply for annual leave?",
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <BotAvatar />
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-[var(--color-border)] bg-white px-4 py-3 shadow-sm">
        <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-primary-light)] [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-primary-light)] [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-primary-light)] [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function BotAvatar() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] shadow-sm">
      <ShieldQuestion className="h-4 w-4 text-white" />
    </div>
  );
}

function CitationsAccordion({ citations }: { citations: PolicyCitation[] }) {
  const [open, setOpen] = useState(false);
  if (!citations.length) return null;

  return (
    <div className="mt-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-primary-xlight)] overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between px-3 py-2 text-[12px] font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-xlight)]"
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          {citations.length} source{citations.length !== 1 ? "s" : ""} used
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="divide-y divide-[var(--color-border)] px-3 pb-2">
          {citations.map((c, i) => (
            <div key={i} className="py-2">
              <p className="mb-1 text-[11px] font-semibold text-[var(--color-primary)]">
                Section {c.chunk_index ?? i + 1}
                {c.source_filename ? ` — ${c.source_filename}` : ""}
                <span className="ml-2 font-normal text-[var(--color-text-muted)]">
                  ({Math.round(c.score * 100)}% match)
                </span>
              </p>
              <p className="line-clamp-3 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
                {c.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className={`max-w-[75%] rounded-2xl rounded-br-sm px-4 py-3 text-[14px] leading-relaxed shadow-sm ${
            msg.error
              ? "bg-[var(--color-danger-light)] text-[var(--color-danger)]"
              : "bg-[var(--color-primary)] text-white"
          }`}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <BotAvatar />
      <div className="max-w-[78%]">
        <div
          className={`rounded-2xl rounded-bl-sm border px-4 py-3 text-[14px] leading-relaxed shadow-sm ${
            msg.error
              ? "border-red-200 bg-[var(--color-danger-light)] text-[var(--color-danger)]"
              : "border-[var(--color-border)] bg-white text-[var(--color-text-primary)]"
          }`}
        >
          {msg.content}
        </div>
        {msg.citations && msg.citations.length > 0 && (
          <CitationsAccordion citations={msg.citations} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PolicyChatPage() {
  const { employee } = useSession();
  const conversationId = useRef<string>(
    typeof crypto !== "undefined" ? crypto.randomUUID() : `conv-${Date.now()}`
  );

  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your Policy Assistant. Ask me anything about your company's HR policies — leave, working hours, code of conduct, benefits, and more.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading || !employee) return;

    const userMsg: ChatMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const res = await api.policyChat(
        employee.employee_id,
        conversationId.current,
        trimmed,
      );

      const botMsg: ChatMsg = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.succeed && res.data
          ? res.data.response
          : (res.message || "Sorry, I couldn't get an answer. Please try again."),
        citations: res.succeed && res.data ? res.data.citations : [],
        error: !res.succeed,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Something went wrong. Please check your connection and try again.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const showEmpty = messages.length === 1; // only the welcome message

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-page)] shadow-[var(--shadow-card)]">

      {/* ── Header ── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-white px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)] shadow">
          <ShieldQuestion className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-[15px] font-bold text-[var(--color-text-primary)]">Policy Assistant</p>
          <p className="text-[12px] text-[var(--color-text-muted)]">Powered by AI · Company policy Q&amp;A</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 rounded-full bg-[var(--color-success-light)] px-3 py-1">
          <span className="h-2 w-2 rounded-full bg-[var(--color-success-light)]0" />
          <span className="text-[11px] font-semibold text-[var(--color-success)]">Online</span>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {loading && <TypingIndicator />}

          {/* Suggested questions (only shown when chat is empty) */}
          {showEmpty && !loading && (
            <div className="mt-2">
              <p className="mb-3 text-center text-[12px] font-medium text-[var(--color-text-muted)]">
                Try asking one of these:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 text-[12px] font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-xlight)] hover:text-[var(--color-primary)]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input bar ── */}
      <div className="shrink-0 border-t border-[var(--color-border)] bg-white px-5 py-4">
        <div className="mx-auto flex max-w-3xl items-end gap-3">
          <div className="flex flex-1 items-end gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-page)] px-4 py-3 focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask about company policies… (Enter to send)"
              disabled={loading}
              className="flex-1 resize-none bg-transparent text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none disabled:opacity-50"
              style={{ height: "24px", maxHeight: "120px" }}
            />
          </div>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-sm transition-all hover:bg-[var(--color-primary-dark)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-[var(--color-text-muted)]">
          Answers are based on your company&apos;s uploaded policy document only.
        </p>
      </div>
    </div>
  );
}
