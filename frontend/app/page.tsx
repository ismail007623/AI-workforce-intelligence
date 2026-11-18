"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Brain,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  LogIn,
  LogOut,
  Menu,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Logo } from "@/components/layout/Logo";
import { useSession } from "@/lib/session";

/* ------------------------------------------------------------------ */
/* Demo data — used ONLY in clearly labeled landing-page previews.   */
/* Nothing here is presented as a real customer metric.               */
/* ------------------------------------------------------------------ */

const DEMO_LATE_DEPTS = [
  { dept: "Sales", late: 6 },
  { dept: "Engineering", late: 4 },
  { dept: "Operations", late: 3 },
  { dept: "Design", late: 1 },
];

const HERO_BARS = [
  { label: "Present", value: 11, total: 14 },
  { label: "Late", value: 2, total: 14 },
  { label: "Absent", value: 1, total: 14 },
];

function DemoLabel({ text = "Demo data" }: { text?: string }) {
  return (
    <span className="rounded-full border border-[var(--color-border)] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
      {text}
    </span>
  );
}

function DemoChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 shadow-[var(--shadow-overlay)]">
      <p className="mb-1 text-xs font-semibold text-[var(--color-text-muted)]">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-xs font-medium" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Taqwi-style pieces                                                 */
/* ------------------------------------------------------------------ */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

/* Gentle fade-in on scroll. Content stays visible if the observer
   is unavailable, so nothing is ever hidden by the animation. */
function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero: AI Bridge diagram + animated score bars (demo data)          */
/* ------------------------------------------------------------------ */

function AiBridgeDiagram() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div>
      <div className="overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3.5">
          <p className="eyebrow">One platform</p>
          <DemoLabel />
        </div>

        <div className="px-5 pb-5 pt-5">
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            {/* Employee card */}
            <div className="flex-1 rounded-2xl border border-[var(--color-border)] bg-white p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-xlight)] text-[var(--color-primary)]">
                <UserCheck className="h-5 w-5" />
              </span>
              <p className="mt-3 text-base font-bold text-[var(--color-text-primary)]">Employee</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Check in, see only my own record.
              </p>
            </div>

            {/* Bridge connector + node */}
            <div className="flex flex-col items-center sm:flex-row" aria-hidden>
              <span className="h-8 w-px bg-[var(--color-border-strong)] sm:h-px sm:w-8" />
              <span className="ai-bridge-gradient flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full text-center text-[11px] font-bold leading-tight text-white">
                AI
                <br />
                Bridge
              </span>
              <span className="h-8 w-px bg-[var(--color-border-strong)] sm:h-px sm:w-8" />
            </div>

            {/* HR card */}
            <div className="flex-1 rounded-2xl border border-[var(--color-border)] bg-white p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-xlight)] text-[var(--color-primary)]">
                <Users className="h-5 w-5" />
              </span>
              <p className="mt-3 text-base font-bold text-[var(--color-text-primary)]">HR / Manager</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                The whole company at a glance.
              </p>
            </div>
          </div>

          {/* Animated score bars */}
          <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--color-text-primary)]">Today&apos;s attendance</p>
              <span className="text-[11px] text-[var(--color-text-muted)]">of 14 employees</span>
            </div>
            <div className="mt-4 space-y-3.5">
              {HERO_BARS.map((bar) => (
                <div key={bar.label}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)]">{bar.label}</span>
                    <span className="font-bold text-[var(--color-text-primary)]">
                      {bar.value}
                      <span className="font-medium text-[var(--color-text-muted)]"> / {bar.total}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-primary-xlight)]">
                    <div
                      className="bar-fill"
                      style={{ width: mounted ? `${Math.round((bar.value / bar.total) * 100)}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Capabilities content — same features as the previous redesign,     */
/* restyled: HR as numbered rows, employees as flat cards.            */
/* ------------------------------------------------------------------ */

const HR_CAPABILITIES = [
  {
    title: "Company Attendance Dashboard",
    desc: "The whole workforce at a glance: total employees, present, late, absent, and attendance rate — with live check-ins and trends.",
    icon: BarChart3,
  },
  {
    title: "Late Employees",
    desc: "Searchable late list with check-in time, late duration, the submitted reason, and its validation status.",
    icon: Clock,
  },
  {
    title: "Absent Employees",
    desc: "Everyone who has not checked in, with department and date, plus search and filters to follow up quickly.",
    icon: UserX,
  },
  {
    title: "Department Analytics",
    desc: "Compare departments side by side: attendance rate, lateness, and absence, so patterns are visible instead of anecdotal.",
    icon: Building2,
  },
  {
    title: "AI Attendance Insights",
    desc: "Ask a question in plain English and get an analysis grounded in the company's real attendance data, with a recommendation.",
    icon: Brain,
  },
  {
    title: "Company Policy",
    desc: "Upload the company policy once. Employees ask the Policy Assistant questions and get answers from that document only.",
    icon: FileText,
  },
];

const EMPLOYEE_CAPABILITIES = [
  {
    title: "Check In / Check Out",
    desc: "One tap to mark attendance. The card shows today's date, the live clock, check-in and check-out times, and working-hours progress.",
    icon: LogIn,
  },
  {
    title: "Late Reason Validation",
    desc: "When a check-in is late, the employee submits a reason. The reason is recorded and validated, and its status is shown back to the employee.",
    icon: FileText,
  },
  {
    title: "Attendance History",
    desc: "A clear table of past attendance: date, check-in and check-out times, status, and late minutes — with nothing hidden.",
    icon: Clock,
  },
  {
    title: "Attendance Summary",
    desc: "Monthly overview at a glance: present days, late days, absent days, attendance rate, and average delay.",
    icon: BarChart3,
  },
  {
    title: "HR Policy Chatbot",
    desc: "Employees ask questions in plain language and get answers from the company's own uploaded policy document — nothing else.",
    icon: MessageSquareText,
  },
];

const BENEFITS = [
  {
    icon: Clock,
    title: "Less Manual Work",
    desc: "Automate attendance tracking, monitoring, and routine HR notifications.",
  },
  {
    icon: Bell,
    title: "Early Issue Detection",
    desc: "Identify late arrivals, absences, and attendance patterns before they become recurring problems.",
  },
  {
    icon: TrendingUp,
    title: "Actionable Workforce Insights",
    desc: "Understand attendance trends and make informed HR decisions using AI.",
  },
];

const WORKFLOW = [
  { title: "Employee checks in", desc: "One tap records the check-in with server time." },
  { title: "Attendance is recorded", desc: "Each check-in is stored and monitored in real time." },
  { title: "Late and absent are identified", desc: "Grace periods and office hours decide the status." },
  { title: "Notifications are sent", desc: "Late employees are notified automatically by email." },
  { title: "AI analyzes patterns", desc: "Attendance data is turned into trends and findings." },
  { title: "HR reviews insights", desc: "The dashboard shows what needs attention, and why." },
];

export default function LandingPage() {
  const router = useRouter();
  const { user, hydrated, logout } = useSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const dashboardHref =
    user?.role === "hr" || user?.role === "admin" ? "/hr" : "/employee";

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-white text-[var(--color-text-primary)]">
      {/* Thin purple strip along the very top of the page */}
      <div className="top-strip" aria-hidden />

      {/* Section 1 — Navigation */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1210px] items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            <a href="#features" className="rounded-full px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">Features</a>
            <a href="#workflow" className="rounded-full px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">How it works</a>
            {hydrated && user ? (
              <>
                <span className="max-w-40 truncate px-2 text-sm font-semibold text-[var(--color-text-primary)]">{user.name}</span>
                <Link href={dashboardHref} className="rounded-full border border-[var(--color-border-strong)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[var(--color-primary-light)] hover:text-[var(--color-primary)]">Dashboard</Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--color-primary-dark)]"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-full border border-[var(--color-border-strong)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[var(--color-primary-light)] hover:text-[var(--color-primary)]">Log in</Link>
                <Link href="/company-signup" className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--color-primary-dark)]">Get started</Link>
              </>
            )}
          </nav>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-soft)] md:hidden"
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((v) => !v)}
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileNavOpen && (
          <nav aria-label="Mobile" className="border-t border-[var(--color-border)] bg-white px-4 pb-4 pt-2 md:hidden">
            <div className="flex flex-col gap-1">
              <a href="#features" onClick={() => setMobileNavOpen(false)} className="rounded-full px-3 py-2.5 text-sm font-medium text-[var(--color-text-secondary)]">Features</a>
              <a href="#workflow" onClick={() => setMobileNavOpen(false)} className="rounded-full px-3 py-2.5 text-sm font-medium text-[var(--color-text-secondary)]">How it works</a>
              {hydrated && user ? (
                <>
                  <Link href={dashboardHref} onClick={() => setMobileNavOpen(false)} className="rounded-full px-3 py-2.5 text-sm font-semibold text-[var(--color-text-primary)]">Dashboard</Link>
                  <button type="button" onClick={() => { setMobileNavOpen(false); void handleLogout(); }} className="mt-1 rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-left text-sm font-semibold text-white">Log out</button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileNavOpen(false)} className="rounded-full px-3 py-2.5 text-sm font-semibold text-[var(--color-text-primary)]">Log in</Link>
                  <Link href="/company-signup" onClick={() => setMobileNavOpen(false)} className="mt-1 rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white">Get started</Link>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      {/* Section 2 — Hero */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-[1210px] items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div>
            <Eyebrow>AI-powered workforce intelligence</Eyebrow>
            <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] tracking-tight text-[var(--color-text-primary)] sm:text-[56px]">
              Turn attendance data into{" "}
              <span className="text-[var(--color-primary)]">workforce intelligence</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--color-text-secondary)]">
              Automate attendance tracking, detect issues early, and give HR teams AI-powered
              insights to make smarter workforce decisions.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/company-signup" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--color-primary-dark)]">
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#features" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-white px-6 text-sm font-semibold text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[var(--color-primary-light)] hover:text-[var(--color-primary)]">
                Explore features
              </Link>
            </div>
            <p className="mt-5 flex items-start gap-1.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Role-based access: employees see only their own records. HR sees the whole company.
            </p>
          </div>
          <AiBridgeDiagram />
        </div>
      </section>

      {/* Section 3 — Key benefits */}
      <section aria-label="Key benefits" className="mx-auto max-w-[1210px] px-4 py-24 sm:px-6">
        <Reveal>
          <Eyebrow>Why AI Workforce</Eyebrow>
          <h2 className="mt-4 max-w-2xl text-[44px] font-bold leading-[1.1] tracking-tight text-[var(--color-text-primary)]">
            Less chasing. More knowing.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="flex gap-4 rounded-[20px] border border-[var(--color-border)] bg-white p-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-xlight)] text-[var(--color-primary)]">
                <b.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{b.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 4 — Capabilities */}
      <section id="features" aria-label="Product capabilities" className="mx-auto max-w-[1210px] px-4 py-24 sm:px-6">
        <Reveal>
          <Eyebrow>Capabilities</Eyebrow>
          <h2 className="mt-4 max-w-2xl text-[44px] font-bold leading-[1.1] tracking-tight text-[var(--color-text-primary)]">
            Everything your workforce needs, in one intelligent platform.
          </h2>
          <p className="mt-4 max-w-2xl text-[var(--color-text-secondary)]">
            From daily attendance to workforce analytics, manage the entire process in one
            connected experience.
          </p>
        </Reveal>

        {/* For HR teams — numbered rows */}
        <div className="mt-14">
          <Eyebrow>— For HR teams</Eyebrow>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            See the whole company at a glance.
          </h3>
          <div className="mt-6 border-t border-[var(--color-border)]">
            {HR_CAPABILITIES.map((c, i) => (
              <div
                key={c.title}
                className="flex flex-col gap-4 border-b border-[var(--color-border)] py-7 sm:flex-row sm:items-start sm:gap-8"
              >
                <span
                  className={`outline-number shrink-0 ${i === 0 ? "outline-number--active" : ""}`}
                  aria-hidden
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-xlight)] text-[var(--color-primary)]">
                  <c.icon className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-lg font-semibold text-[var(--color-text-primary)]">{c.title}</h4>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--color-text-secondary)]">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* For employees — flat cards */}
        <div className="mt-16">
          <Eyebrow>— For employees</Eyebrow>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Your own record, in one place.
          </h3>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {EMPLOYEE_CAPABILITIES.map((c, i) => (
              <div
                key={c.title}
                className="rounded-[20px] border border-[var(--color-border)] bg-white p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary-xlight)] text-[var(--color-primary)]">
                  <c.icon className="h-5 w-5" />
                </span>
                <p className="eyebrow mt-5">{String(i + 1).padStart(2, "0")}</p>
                <h4 className="mt-2 text-lg font-semibold text-[var(--color-text-primary)]">{c.title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5 — How it works */}
      <section id="workflow" aria-label="How AI Workforce works" className="border-y border-[var(--color-border)] bg-white">
        <div className="mx-auto max-w-[1210px] px-4 py-24 sm:px-6">
          <Reveal>
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-4 max-w-2xl text-[44px] font-bold leading-[1.1] tracking-tight text-[var(--color-text-primary)]">
              From attendance to action. Automatically.
            </h2>
            <p className="mt-4 max-w-2xl text-[var(--color-text-secondary)]">
              Six steps, no manual chasing — from a single check-in to a decision HR can act on.
            </p>
          </Reveal>
          <ol className="mt-12 grid gap-x-10 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
            {WORKFLOW.map((step, i) => (
              <li key={step.title}>
                <span
                  className={`outline-number ${i === 0 ? "outline-number--active" : ""}`}
                  aria-hidden
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-base font-semibold text-[var(--color-text-primary)]">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Section 6 — AI Insights showcase */}
      <section id="insights" aria-label="AI insights showcase" className="mx-auto max-w-[1210px] px-4 py-24 sm:px-6">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <Reveal>
            <Eyebrow>AI Insights</Eyebrow>
            <h2 className="mt-4 text-[44px] font-bold leading-[1.1] tracking-tight text-[var(--color-text-primary)]">
              Ask better questions. Make smarter workforce decisions.
            </h2>
            <p className="mt-4 text-[var(--color-text-secondary)]">
              HR asks in plain English. The answer is built from the company&apos;s own
              attendance data — with the numbers and a recommendation, not just a summary.
            </p>
            <div className="mt-6 flex items-start gap-3 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
              <Brain className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
              <p className="text-sm font-medium leading-relaxed text-[var(--color-text-primary)]">
                “Which departments have the highest late attendance this month?”
              </p>
            </div>
            <ul className="mt-6 space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-[var(--color-text-secondary)]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" />
                <span><strong className="font-semibold text-[var(--color-text-primary)]">Concise answer</strong> — Sales has the most late arrivals this month (6), followed by Engineering (4).</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-[var(--color-text-secondary)]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" />
                <span><strong className="font-semibold text-[var(--color-text-primary)]">Supporting figures</strong> — 14 late arrivals in total; Sales accounts for 6 of them, and 4 of those were on Mondays.</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-[var(--color-text-secondary)]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" />
                <span><strong className="font-semibold text-[var(--color-text-primary)]">Actionable recommendation</strong> — send the Sales team a Sunday-evening check-in reminder.</span>
              </li>
            </ul>
          </Reveal>
          <div className="overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">Late arrivals by department</p>
              <DemoLabel text="Illustrative example" />
            </div>
            <div className="px-5 py-4">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DEMO_LATE_DEPTS} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e9f1" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7085" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="dept" width={86} tick={{ fontSize: 12, fill: "#17172b" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DemoChartTooltip />} cursor={{ fill: "#f8f8fc" }} />
                    <Bar dataKey="late" name="Late arrivals" radius={[0, 4, 4, 0]}>
                      {DEMO_LATE_DEPTS.map((d) => (
                        <Cell key={d.dept} fill={d.late >= 5 ? "#dc5263" : d.late >= 3 ? "#d58b25" : "#6554e8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex items-start gap-2.5 rounded-[20px] bg-[var(--color-primary-xlight)] p-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  <strong className="font-semibold text-[var(--color-text-primary)]">Recommendation:</strong> late
                  arrivals in Sales cluster on Mondays. A Sunday-evening reminder should reduce
                  them before they become a pattern.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7 — Role-based experience */}
      <section id="roles" aria-label="Role-based experience" className="border-y border-[var(--color-border)] bg-white">
        <div className="mx-auto max-w-[1210px] px-4 py-24 sm:px-6">
          <Reveal>
            <Eyebrow>Choose your path</Eyebrow>
            <h2 className="mt-4 max-w-2xl text-[44px] font-bold leading-[1.1] tracking-tight text-[var(--color-text-primary)]">
              One platform. Two focused experiences.
            </h2>
            <p className="mt-4 max-w-2xl text-[var(--color-text-secondary)]">
              The same login, two different workspaces — each person sees only what their role
              needs.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)]">
              <div className="border-b border-[var(--color-border)] px-6 py-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary-xlight)] text-[var(--color-primary)]">
                  <UserCheck className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">For Employees</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Quick check-ins, personal attendance information, late reason submission, and HR
                  policy assistance — in one focused workspace.
                </p>
              </div>
              <div className="bg-[var(--color-bg-soft)] px-6 py-6">
                <div className="flex items-center justify-between rounded-[20px] border border-[var(--color-border)] bg-white px-4 py-3">
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)]">Today · 09:58 AM</p>
                    <p className="mt-0.5 text-sm font-semibold text-[var(--color-text-primary)]">Checked in — On time</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success-light)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-success)]">
                    <CheckCircle2 className="h-3 w-3" /> Present
                  </span>
                </div>
                <p className="mt-3 text-xs text-[var(--color-text-muted)]">
                  Employees can only access their own records.
                </p>
                <p className="mt-4 text-sm">
                  <Link href="/login" className="font-semibold text-[var(--color-primary)] hover:underline">
                    Open employee portal <ChevronRight className="inline h-4 w-4" />
                  </Link>
                </p>
              </div>
            </div>
            <div className="overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)]">
              <div className="border-b border-[var(--color-border)] px-6 py-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary-xlight)] text-[var(--color-primary)]">
                  <Users className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">For HR Teams</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Company-wide visibility, department analytics, attendance monitoring,
                  notifications, and AI insights.
                </p>
              </div>
              <div className="bg-[var(--color-bg-soft)] px-6 py-6">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Present", value: "11" },
                    { label: "Late", value: "2" },
                    { label: "Absent", value: "1" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-[20px] border border-[var(--color-border)] bg-white p-3 text-center">
                      <p className="text-xl font-bold text-[var(--color-text-primary)]">{s.value}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{s.label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-[var(--color-text-muted)]">
                  HR has organization-wide visibility. Demo figures shown above.
                </p>
                <p className="mt-4 text-sm">
                  <Link href="/login" className="font-semibold text-[var(--color-primary)] hover:underline">
                    Open HR dashboard <ChevronRight className="inline h-4 w-4" />
                  </Link>
                </p>
              </div>
            </div>
          </div>
          <p className="mt-8 text-center text-sm">
            <Link href="/login" className="font-semibold text-[var(--color-primary)] hover:underline">
              Sign in to your portal <ChevronRight className="inline h-4 w-4" />
            </Link>
          </p>
        </div>
      </section>

      {/* Section 8 — Final CTA */}
      <section aria-label="Get started" className="mx-auto max-w-[1210px] px-4 py-24 sm:px-6">
        <div className="rounded-[20px] bg-[#17172b] px-6 py-14 text-center sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Make attendance management effortless.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-white/70">
            Bring attendance tracking, workforce monitoring, and AI-powered insights together in
            one platform.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/company-signup" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--color-primary-dark)]">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/25 px-6 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Section 9 — Footer */}
      <footer className="border-t border-[var(--color-border)] bg-white">
        <div className="mx-auto grid max-w-[1210px] gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--color-text-secondary)]">
              AI-powered attendance monitoring and HR intelligence for modern teams.
            </p>
          </div>
          <div>
            <p className="eyebrow">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li><a href="#features" className="hover:text-[var(--color-text-primary)]">Features</a></li>
              <li><a href="#workflow" className="hover:text-[var(--color-text-primary)]">How it works</a></li>
              <li><Link href="/employee/policy-chat" className="hover:text-[var(--color-text-primary)]">Policy Assistant</Link></li>
              <li><Link href="/hr/insights" className="hover:text-[var(--color-text-primary)]">AI Insights</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow">Account</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li><Link href="/login" className="hover:text-[var(--color-text-primary)]">Log in</Link></li>
              <li><Link href="/company-signup" className="hover:text-[var(--color-text-primary)]">Get started</Link></li>
              <li><Link href="/signup" className="hover:text-[var(--color-text-primary)]">Create an employee account</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow">Explore</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li><a href="#features" className="hover:text-[var(--color-text-primary)]">Capabilities</a></li>
              <li><a href="#workflow" className="hover:text-[var(--color-text-primary)]">How it works</a></li>
              <li><a href="#insights" className="hover:text-[var(--color-text-primary)]">AI Insights showcase</a></li>
              <li><a href="#roles" className="hover:text-[var(--color-text-primary)]">Role-based experience</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[var(--color-border)]">
          <div className="mx-auto flex max-w-[1210px] flex-col gap-2 px-4 py-5 text-xs text-[var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>© 2026 AI Workforce — Attendance Intelligence</p>
            <p>Proof of Concept</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
