"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";

const inputClass =
  "h-12 w-full rounded-full border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15";

const labelClass = "mb-1.5 block text-sm font-semibold text-[var(--color-text-primary)]";

export default function LoginPage() {
  const router = useRouter();
  const { login, loading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const user = await login({ email: email.trim(), password });
      router.push(user.role === "hr" || user.role === "admin" ? "/hr" : "/employee");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to sign in. Please try again.",
      );
    }
  };

  return (
    <AuthSplitLayout>
      <p className="eyebrow">Sign in</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
        Welcome back
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Sign in to access your AI Workforce workspace.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger-light)] px-3 py-2.5 text-sm text-[var(--color-danger)]"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
        <div>
          <label htmlFor="email" className={labelClass}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-primary-xlight)]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Log in
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
        No account yet?{" "}
        <Link
          href="/signup"
          className="font-semibold text-[var(--color-primary)] hover:underline"
        >
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-[var(--color-text-muted)]">
        Registering a company?{" "}
        <Link
          href="/company-signup"
          className="font-semibold text-[var(--color-primary)] hover:underline"
        >
          Register your company
        </Link>
      </p>
      <p className="mt-6 flex items-start gap-1.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        One login for everyone. After you sign in, you go to your own
        portal — employees see only their own records, HR sees the whole
        company. HR accounts are created by invitation only, so nobody
        can sign up as HR.
      </p>
    </AuthSplitLayout>
  );
}
