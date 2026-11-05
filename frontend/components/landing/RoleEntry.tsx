"use client";

import Link from "next/link";
import { ArrowRight, Building2, ShieldCheck, UserRound } from "lucide-react";

export function RoleEntry() {
  return (
    <div id="get-started" className="grid gap-5 sm:grid-cols-2">
      <Link
        href="/login"
        className="group relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 text-left shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:border-[var(--color-primary-light)] hover:shadow-[var(--shadow-card-hover)]"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-xlight)] text-[var(--color-primary)] transition-colors group-hover:bg-[var(--color-primary)] group-hover:text-white">
          <UserRound className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-[var(--color-text-primary)]">I&apos;m an Employee</h3>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Sign in to check in and out, and view only your own attendance history and summary.
        </p>
        <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)]">
          Sign in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </Link>

      <Link
        href="/login"
        className="group relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 text-left shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:border-[var(--color-primary-light)] hover:shadow-[var(--shadow-card-hover)]"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-xlight)] text-[var(--color-primary-dark)] transition-colors group-hover:bg-[var(--color-primary-dark)] group-hover:text-white">
          <Building2 className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-[var(--color-text-primary)]">I&apos;m HR / Manager</h3>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Sign in to monitor the whole workforce, track issues, and generate AI insights.
        </p>
        <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary-dark)]">
          Sign in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </Link>

      <p className="sm:col-span-2 flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-muted)]">
        <ShieldCheck className="h-3.5 w-3.5" />
        Employees can only access their own records. HR has organization-wide visibility.
      </p>
      <p className="sm:col-span-2 text-center text-sm text-[var(--color-text-muted)]">
        No account yet?{" "}
        <Link href="/signup" className="font-semibold text-[var(--color-primary)] hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
