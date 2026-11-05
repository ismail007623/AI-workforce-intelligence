"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { SignupPayload } from "@/lib/types";

const inputClass =
  "h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15";

const labelClass = "mb-1.5 block text-sm font-semibold text-[var(--color-text-primary)]";

export default function SignupPage() {
  const router = useRouter();
  const { signup, loading } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
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
    if (!employeeId.trim()) {
      setError("Employee ID is required. Ask HR for your employee ID.");
      return;
    }
    const payload: SignupPayload = {
      name: name.trim(),
      email: email.trim(),
      password,
      employee_id: employeeId.trim(),
    };
    try {
      const user = await signup(payload);
      router.push(user.role === "employee" ? "/employee" : "/hr");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to create account. Please try again.",
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
            Create an account
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Create your account, then sign in to your portal.
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
                placeholder="Usman Ali"
                className={inputClass}
              />
            </div>
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

            <p className="rounded-[var(--radius-md)] bg-[var(--color-bg-page)] px-3 py-2.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
              Employee only. Your account links to your existing employee
              record. HR accounts are by invite only.
            </p>

            <div>
              <label htmlFor="employee-id" className={labelClass}>
                Employee ID
              </label>
              <input
                id="employee-id"
                type="text"
                autoComplete="off"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="EMP003"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Your employee ID from HR. If it does not match, we try your
                email against the employee record.
              </p>
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
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create account
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
            Employee accounts only. HR and Admin accounts are created by
            invite from an existing HR or Admin.
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
