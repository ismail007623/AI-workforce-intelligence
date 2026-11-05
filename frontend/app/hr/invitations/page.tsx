"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2, MailPlus } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import type { Invitation, InviteRole } from "@/lib/types";

const inputClass =
  "h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15";

const labelClass = "mb-1.5 block text-sm font-semibold text-[var(--color-text-primary)]";

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export default function InvitationsPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("hr");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  const loadInvitations = async () => {
    try {
      setInvitations(await api.listInvitations());
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to load invitations. Please try again.",
      );
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    void loadInvitations();
  }, []);

  const inviteLink = createdToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/invitations/accept?token=${createdToken}`
    : "";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setCopied(false);
    setLoading(true);
    try {
      const created = await api.createInvitation({ email: email.trim(), role });
      setCreatedToken(created.token);
      setCreatedEmail(created.invitation.email);
      setEmail("");
      await loadInvitations();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to create invitation. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
    } catch {
      setError("Could not copy the link. Copy it manually from the box below.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
          <MailPlus className="h-6 w-6 text-[var(--color-primary)]" />
          Invite HR & Admin
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          HR and Admin accounts are created by invite only. The invite link
          is valid for 24 hours and can be used once.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger-light)] px-3 py-2.5 text-sm text-[var(--color-danger)]"
        >
          {error}
        </div>
      )}

      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <div>
              <label htmlFor="invite-email" className={labelClass}>
                Email
              </label>
              <input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sara@company.com"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="invite-role" className={labelClass}>
                Role
              </label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as InviteRole)}
                className={inputClass}
              >
                <option value="hr">HR</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send invite
          </button>
        </form>

        {createdToken && (
          <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-primary)]/30 bg-[var(--color-primary-xlight)] p-4">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              Invite created for {createdEmail}. Share this link now — the
              token is shown only once.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <input
                readOnly
                value={inviteLink}
                aria-label="Invite link"
                className={`${inputClass} font-mono text-xs`}
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                onClick={handleCopy}
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 text-sm font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-primary-light)]"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              Email sending is not set up yet, so share the link yourself.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-base font-bold text-[var(--color-text-primary)]">
          Invitations
        </h2>
        {loadingList ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading invitations...
          </p>
        ) : invitations.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            No invitations yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {invitations.map((invitation) => (
              <li
                key={invitation.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {invitation.email}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {invitation.role === "hr" ? "HR" : "Admin"} · Created{" "}
                    {formatDate(invitation.created_at)} · Expires{" "}
                    {formatDate(invitation.expires_at)}
                  </p>
                </div>
                <span
                  className={
                    invitation.used_at
                      ? "rounded-full bg-[var(--color-success-light)] px-2.5 py-1 text-xs font-semibold text-[var(--color-success)]"
                      : "rounded-full bg-[var(--color-primary-xlight)] px-2.5 py-1 text-xs font-semibold text-[var(--color-primary)]"
                  }
                >
                  {invitation.used_at ? "Used" : "Pending"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
