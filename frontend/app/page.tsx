"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  Brain,
  Clock,
  LayoutDashboard,
  LogIn,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { useSession } from "@/lib/session";

const FEATURES = [
  {
    icon: LogIn,
    title: "Check-In / Check-Out",
    desc: "Employees mark attendance through a clean web interface with instant feedback.",
  },
  {
    icon: Clock,
    title: "Attendance Monitoring",
    desc: "Automatically classifies each employee as Present, Late, or Absent in real time.",
  },
  {
    icon: TrendingUp,
    title: "Late Arrival Detection",
    desc: "Tracks late frequency, total late minutes, and assigns an attendance risk level.",
  },
  {
    icon: Mail,
    title: "Automated Notifications",
    desc: "An email agent notifies employees automatically when a late check-in is detected.",
  },
  {
    icon: LayoutDashboard,
    title: "Attendance Dashboard",
    desc: "HR sees presence, lateness, absence and department breakdowns at a glance.",
  },
  {
    icon: Brain,
    title: "AI Workforce Insights",
    desc: "Ask questions in plain English and get findings plus actionable recommendations.",
  },
];

const WORKFLOW = [
  "Employee Check-In",
  "Attendance Monitoring",
  "Late Detection",
  "Email Notification",
  "AI Insights",
  "Manager Dashboard",
];

const STATS = [
  { value: "92%", label: "Attendance rate" },
  { value: "<3s", label: "Check-in to insight" },
  { value: "5", label: "Automated agents" },
  { value: "100%", label: "Hands-free reporting" },
];

export default function LandingPage() {
  const router = useRouter();
  const { user, hydrated, logout } = useSession();
  const dashboardHref =
    user?.role === "hr" || user?.role === "admin" ? "/hr" : "/employee";

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-page)]">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <a
              href="#features"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] sm:block"
            >
              Features
            </a>
            <a
              href="#workflow"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] sm:block"
            >
              How it works
            </a>
            {hydrated && user ? (
              <>
                <span className="hidden max-w-40 truncate px-2 text-sm font-semibold text-[var(--color-text-primary)] sm:block">
                  {user.name}
                </span>
                <Link
                  href={dashboardHref}
                  className="rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-dark)]"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
                >
                  Log in
                </Link>
                <Link
                  href="/company-signup"
                  className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-dark)]"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-glow" />
        <div className="absolute inset-0 grid-pattern opacity-60" />
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/70 px-3 py-1 text-xs font-semibold text-[var(--color-primary)] shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered HR operations platform
            </div>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-6xl">
              Turn attendance data into
              <span className="gradient-text"> workforce intelligence</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-[var(--color-text-muted)]">
              Automate attendance tracking, detect issues early, notify employees instantly, and
              give managers AI-driven insights — without the manual HR effort.
            </p>
          </div>

          {/* Sign-in actions — one login page for everyone */}
          <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/company-signup"
              className="inline-flex h-12 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-dark)]"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-white px-6 text-sm font-semibold text-[var(--color-text-primary)] shadow-sm transition-colors hover:border-[var(--color-primary-light)] hover:text-[var(--color-primary)]"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Employees can only access their own records. HR has organization-wide visibility.
          </p>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white/70 p-5 text-center backdrop-blur shadow-[var(--shadow-card)]"
              >
                <p className="text-2xl font-extrabold text-[var(--color-text-primary)] sm:text-3xl">{s.value}</p>
                <p className="mt-1 text-xs font-medium text-[var(--color-text-muted)]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Everything HR needs, automated
          </h2>
          <p className="mt-3 text-[var(--color-text-muted)]">
            Six capabilities working together to reduce manual monitoring and improve compliance.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-xlight)] text-[var(--color-primary)] transition-colors group-hover:bg-[var(--color-primary)] group-hover:text-white">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[var(--color-text-primary)]">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="border-y border-[var(--color-border)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
              The AI attendance workflow
            </h2>
            <p className="mt-3 text-[var(--color-text-muted)]">
              From a single check-in to manager-ready intelligence — fully automated.
            </p>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            {WORKFLOW.map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-page)] px-4 py-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full gradient-primary text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{step}</span>
                </div>
                {i < WORKFLOW.length - 1 && (
                  <span className="hidden text-[var(--color-border-strong)] sm:block">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] gradient-primary px-8 py-14 text-center shadow-[var(--shadow-hero)]">
          <div className="absolute inset-0 grid-pattern opacity-20" />
          <div className="relative">
            <Bell className="mx-auto h-10 w-10 text-white/90" />
            <h2 className="mt-4 text-3xl font-bold text-white">Ready to see it in action?</h2>
            <p className="mx-auto mt-2 max-w-xl text-white/80">
              Register your company to explore the HR command center, or sign in to open your
              employee portal.
            </p>
            <Link
              href="/company-signup"
              className="mt-6 inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-white px-6 py-3 text-sm font-semibold text-[var(--color-primary)] shadow-lg transition-transform hover:scale-105"
            >
              Get started <Sparkles className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--color-border)] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 sm:flex-row sm:px-6">
          <Logo />
          <p className="text-sm text-[var(--color-text-muted)]">
            AI Workforce Attendance Intelligence — Proof of Concept
          </p>
        </div>
      </footer>
    </div>
  );
}
