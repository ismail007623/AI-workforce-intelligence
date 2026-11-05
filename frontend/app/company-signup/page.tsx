"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { CompanySignupPayload } from "@/lib/types";

const inputClass =
  "h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15";

const labelClass = "mb-1.5 block text-sm font-semibold text-[var(--color-text-primary)]";

export default function CompanySignupPage() {
  const router = useRouter();
  const { companySignup, loading } = useSession();
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [timezone, setTimezone] = useState("Asia/Karachi");
  const [workStart, setWorkStart] = useState("10:00");
  const [workEnd, setWorkEnd] = useState("19:00");
  const [graceMinutes, setGraceMinutes] = useState("15");
  const [error, setError] = useState<string | null>(null);

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
    const grace = Number(graceMinutes);
    if (!Number.isInteger(grace) || grace < 0 || grace > 120) {
      setError("Grace minutes must be a whole number between 0 and 120.");
      return;
    }
    const payload: CompanySignupPayload = {
      company_name: companyName.trim(),
      admin_name: adminName.trim(),
      email: email.trim(),
      password,
      timezone: timezone.trim() || "Asia/Karachi",
      work_start: workStart,
      work_end: workEnd,
      grace_minutes: grace,
    };
    try {
      await companySignup(payload);
      router.push("/hr");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to create company. Please try again.",
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
            <Building2 className="h-6 w-6 text-[var(--color-primary)]" />
            Register your company
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Create your company workspace. You become its first admin.
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
              <label htmlFor="company-name" className={labelClass}>
                Company name
              </label>
              <input
                id="company-name"
                type="text"
                autoComplete="organization"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Corp"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="admin-name" className={labelClass}>
                Your name (admin)
              </label>
              <input
                id="admin-name"
                type="text"
                autoComplete="name"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Ayesha Khan"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>
                Work email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@acme.com"
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="work-start" className={labelClass}>
                  Work starts
                </label>
                <input
                  id="work-start"
                  type="time"
                  value={workStart}
                  onChange={(e) => setWorkStart(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="work-end" className={labelClass}>
                  Work ends
                </label>
                <input
                  id="work-end"
                  type="time"
                  value={workEnd}
                  onChange={(e) => setWorkEnd(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="timezone" className={labelClass}>
                  Timezone
                </label>
                <input
                  id="timezone"
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="Asia/Karachi"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="grace-minutes" className={labelClass}>
                  Grace (minutes)
                </label>
                <input
                  id="grace-minutes"
                  type="number"
                  min={0}
                  max={120}
                  value={graceMinutes}
                  onChange={(e) => setGraceMinutes(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create company
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
          <p className="mt-4 flex items-start gap-1.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            After creating your company, invite HR and staff from your
            dashboard. Email verification is not part of this release.
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
