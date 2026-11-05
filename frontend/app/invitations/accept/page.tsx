"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";

const inputClass =
  "h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15";

const labelClass = "mb-1.5 block text-sm font-semibold text-[var(--color-text-primary)]";

function AcceptInvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { acceptInvitation, loading } = useSession();
  const [token] = useState(searchParams.get("token") ?? "");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    token ? null : "No invitation token was provided. Open the invite link you received.",
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    try {
      const user = await acceptInvitation({ token, name: name.trim(), password });
      router.push(user.role === "employee" ? "/employee" : "/hr");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to accept invitation. Please try again.",
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-page)] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/" aria-label="Back to home">
            <Logo />
          </Link>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
            <MailCheck className="h-6 w-6 text-[var(--color-primary)]" />
            Accept your invite
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Set your name and password to join your company workspace.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger-light)] px-3 py-2.5 text-sm text-[var(--color-danger)]"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="name" className={labelClass}>
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sara Ahmed"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="password" className={labelClass}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-primary-xlight)]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirm-password" className={labelClass}>
                Confirm password
              </label>
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !token}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Join company
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[var(--color-text-muted)]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-[var(--color-primary)] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense>
      <AcceptInvitationForm />
    </Suspense>
  );
}
