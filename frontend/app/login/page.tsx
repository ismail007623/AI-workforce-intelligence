"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";

const inputClass =
  "h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15";

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
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-page)] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/" aria-label="Back to home">
            <Logo />
          </Link>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Sign in with your email and password to open your portal.
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
              <label htmlFor="email" className={labelClass}>
                Email
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
            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[var(--color-text-muted)]">
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
          <p className="mt-4 flex items-start gap-1.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            One login for everyone. After you sign in, you go to your own
            portal — employees see only their own records, HR sees the whole
            company. HR accounts are created by invitation only, so nobody
            can sign up as HR.
          </p>
        </div>
        <p className="mt-4 text-center text-xs text-[var(--color-text-muted)]">
          <Link href="/" className="hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
