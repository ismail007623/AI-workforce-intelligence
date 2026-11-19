"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Headphones,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  MousePointerClick,
  Play,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { useSession } from "@/lib/session";
import { PaymentModal } from "@/components/landing/PaymentModal";

/* ------------------------------------------------------------------ */
/* Reveal helper — gentle fade-in on scroll; content stays visible    */
/* by default if the observer is unavailable.                         */
/* ------------------------------------------------------------------ */

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
/* Count-up number: counts from 0 to the final value on load,        */
/* ease-out, tabular numerals so nothing jumps. Reduced motion       */
/* shows the final value instantly.                                   */
/* ------------------------------------------------------------------ */

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 1200;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span className="tabular-nums">
      {n}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Hero dashboard — attendance trend chart. The line draws itself    */
/* and a dot travels along it. Reduced motion shows the final line.  */
/* ------------------------------------------------------------------ */

const TREND_PATH = "M12,86 L86,64 L160,40 L234,56 L308,26";
const TREND_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const TREND_X = [12, 86, 160, 234, 308];

function TrendChart() {
  const pathRef = useRef<SVGPathElement>(null);
  const [length, setLength] = useState(1000);
  const [progress, setProgress] = useState(0);
  const [dot, setDot] = useState({ x: 308, y: 26 });

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const total = path.getTotalLength();
    setLength(total);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      const pt = path.getPointAtLength(total);
      setDot({ x: pt.x, y: pt.y });
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 1800;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setProgress(p);
      const pt = path.getPointAtLength(total * p);
      setDot({ x: pt.x, y: pt.y });
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg viewBox="0 0 320 118" className="h-auto w-full" role="img" aria-label="Attendance trend, Monday to Friday">
      {[22, 52, 82].map((y) => (
        <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="#E8E9F1" strokeWidth="1" />
      ))}
      <path
        d={`${TREND_PATH} L308,108 L12,108 Z`}
        fill="#6554E8"
        fillOpacity="0.06"
        stroke="none"
      />
      <path
        ref={pathRef}
        d={TREND_PATH}
        fill="none"
        stroke="#6554E8"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - progress)}
      />
      <circle cx={dot.x} cy={dot.y} r="5" fill="#6554E8" stroke="#ffffff" strokeWidth="2" />
      {TREND_LABELS.map((label, i) => (
        <text key={label} x={TREND_X[i]} y="114" textAnchor="middle" fontSize="10" fill="#8A8FA3">
          {label}
        </text>
      ))}
    </svg>
  );
}

/* Live check-in ticker — rotates names every ~3s. */
const LIVE_CHECKINS = [
  { name: "Ali Raza", time: "09:02 AM" },
  { name: "Hira Shahid", time: "09:05 AM" },
  { name: "Bilal Ahmed", time: "09:11 AM" },
  { name: "Usman Ali", time: "09:14 AM" },
];

function LiveTicker() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % LIVE_CHECKINS.length), 3000);
    return () => window.clearInterval(id);
  }, []);
  const current = LIVE_CHECKINS[index];
  return (
    <div className="flex items-center gap-2 border-t border-[var(--color-border)] px-4 py-3">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)]" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-success)]" />
      </span>
      <p key={index} className="ticker-in truncate text-xs text-[var(--color-text-secondary)]">
        <strong className="font-semibold text-[var(--color-text-primary)]">{current.name}</strong>
        {" checked in · "}
        {current.time}
      </p>
    </div>
  );
}

const SIDEBAR_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Attendance", icon: Clock, active: false },
  { label: "Employees", icon: Users, active: false },
  { label: "AI Insights", icon: Sparkles, active: false },
  { label: "Policies", icon: FileText, active: false },
  { label: "Reports", icon: BarChart3, active: false },
];

function HeroDashboard() {
  return (
    <div className="hero-float">
      <div className="hero-tilt overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-white text-left shadow-[0_24px_60px_rgba(23,23,43,0.14)]">
        <div className="flex">
          {/* Sidebar */}
          <div className="hidden w-44 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-4 sm:flex">
            <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
              AI Workforce
            </p>
            <nav className="mt-4 space-y-1" aria-label="Dashboard preview">
              {SIDEBAR_ITEMS.map((item) => (
                <span
                  key={item.label}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium ${
                    item.active
                      ? "bg-[var(--color-primary-xlight)] text-[var(--color-primary)]"
                      : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </span>
              ))}
            </nav>
            <span className="mt-auto flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[var(--color-text-secondary)]">
              <Settings className="h-4 w-4 shrink-0" />
              Settings
            </span>
          </div>

          {/* Main panel */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3">
              <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">Workforce Overview</p>
              <div className="flex shrink-0 items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-success-light)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-success)]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)]" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
                  </span>
                  LIVE
                </span>
                <span className="hidden text-xs font-medium text-[var(--color-text-muted)] sm:block">HR Admin</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-px border-b border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-4">
              {[
                { label: "Total Employees", value: <CountUp value={248} />, delta: null },
                { label: "On-time Rate", value: <CountUp value={94} suffix="%" />, delta: { text: "↑ +4%", up: true } },
                { label: "Late Arrivals", value: <CountUp value={16} />, delta: { text: "↓ −37%", up: false } },
                { label: "Overtime", value: <CountUp value={128} suffix=" h" />, delta: null },
              ].map((s) => (
                <div key={s.label} className="bg-white px-3.5 py-3">
                  <p className="text-[11px] font-medium text-[var(--color-text-muted)]">{s.label}</p>
                  <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{s.value}</p>
                  {s.delta && (
                    <p className={`mt-0.5 text-[11px] font-semibold ${s.delta.up ? "text-[var(--color-success)]" : "text-[var(--color-success)]"}`}>
                      {s.delta.text}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Trend chart */}
            <div className="border-b border-[var(--color-border)] px-4 pb-2 pt-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[var(--color-text-primary)]">Attendance Trend</p>
                <p className="text-xs font-bold text-[var(--color-primary)]">
                  94% <span className="font-medium text-[var(--color-text-muted)]">on-time</span>
                </p>
              </div>
              <TrendChart />
            </div>

            {/* AI insight */}
            <div className="mx-4 mb-3 mt-3 flex items-start gap-2.5 rounded-xl bg-[var(--color-primary-xlight)] p-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
              <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
                <strong className="font-semibold text-[var(--color-text-primary)]">AI Insight:</strong> Late
                arrivals are 37% lower this month. Recommendation: Maintain the current shift plan
                for Operations.
              </p>
            </div>

            <LiveTicker />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                        */
/* ------------------------------------------------------------------ */

function GreenCheck({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-success-light)]">
      <Check className={`${className} text-[var(--color-success)]`} strokeWidth={3} />
    </span>
  );
}

function SectionPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
      {children}
    </span>
  );
}

type PlanChoice = { plan: string; price: string } | null;

/* ------------------------------------------------------------------ */
/* Landing page                                                       */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const router = useRouter();
  const { user, hydrated, logout } = useSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [payPlan, setPayPlan] = useState<PlanChoice>(null);
  const dashboardHref = user?.role === "hr" || user?.role === "admin" ? "/hr" : "/employee";

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const proPrice = billing === "annual" ? "$39" : "$49";

  return (
    <div className="min-h-screen bg-white text-[var(--color-text-primary)]">
      <div className="top-strip" aria-hidden />

      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-[1280px] items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            <a href="#features" className="rounded-full px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">Features</a>
            <a href="#how" className="rounded-full px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">How it works</a>
            <a href="#plans" className="rounded-full px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">Pricing</a>
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
              <a href="#how" onClick={() => setMobileNavOpen(false)} className="rounded-full px-3 py-2.5 text-sm font-medium text-[var(--color-text-secondary)]">How it works</a>
              <a href="#plans" onClick={() => setMobileNavOpen(false)} className="rounded-full px-3 py-2.5 text-sm font-medium text-[var(--color-text-secondary)]">Pricing</a>
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

      {/* Hero */}
      <section className="bg-[#F7F5FE]">
        <div className="mx-auto grid max-w-[1280px] items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-[96px] lg:min-h-[82vh]">
          <div>
            <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-[var(--color-text-primary)] sm:text-[56px]">
              Turn attendance data into{" "}
              <span className="hero-gradient-text">workforce intelligence.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--color-text-secondary)]">
              Automate attendance, catch issues early, and turn workforce data into actionable HR insights.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#plans" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#F0760A] px-6 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#D96508]">
                Get started free <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#how" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-white px-6 text-sm font-semibold text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[var(--color-primary-light)] hover:text-[var(--color-primary)]">
                <Play className="h-4 w-4 fill-current" /> See how it works
              </a>
            </div>
            <ul className="mt-8 space-y-2.5">
              {[
                { bold: "Save time", rest: "— Automate HR tasks" },
                { bold: "Spot issues early", rest: "— With AI insights" },
                { bold: "Keep data private", rest: "— Your data, your company" },
              ].map((b) => (
                <li key={b.bold} className="flex items-center gap-2.5 text-sm text-[var(--color-text-secondary)]">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-success)]" />
                  <span><strong className="font-semibold text-[var(--color-text-primary)]">{b.bold}</strong> {b.rest}</span>
                </li>
              ))}
            </ul>
          </div>
          <HeroDashboard />
        </div>
      </section>

      {/* Features */}
      <section id="features" aria-label="Product features" className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:py-24">
        <Reveal className="text-center">
          <SectionPill>
            <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
            PRODUCT FEATURES
          </SectionPill>
          <h2 className="mx-auto mt-5 max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight text-[var(--color-text-primary)] sm:text-[44px]">
            Built for <span className="text-[var(--color-primary)]">employees and HR teams</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[var(--color-text-secondary)]">
            Employee self-service for check-ins, attendance, and policy support — with real-time HR visibility across people, exceptions, and departments.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 lg:grid-cols-6">
          {/* Employee Portal — large */}
          <Reveal className="lg:col-span-4">
            <div className="landing-card-hover flex h-full flex-col gap-6 rounded-[20px] border border-[var(--color-border)] bg-white p-6 sm:p-8 lg:flex-row">
              <div className="flex-1">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary-xlight)] text-[var(--color-primary)]">
                  <UserCheck className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-xl font-bold text-[var(--color-text-primary)]">Employee Portal</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  A simple self-service workspace for daily attendance and policy support.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {["Check In / Check Out", "Late Reason Validation", "My Attendance History", "My Attendance Summary", "HR Policy Chatbot"].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm font-medium text-[var(--color-text-primary)]">
                      <GreenCheck /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="w-full shrink-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-5 lg:w-72">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">My Attendance</p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-secondary)]">Checked In Today</span>
                    <strong className="font-semibold text-[var(--color-text-primary)]">09:02 AM</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-secondary)]">Today&apos;s Hours</span>
                    <strong className="font-semibold text-[var(--color-text-primary)]">7h 48m</strong>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-text-secondary)]">This Week</span>
                      <strong className="font-semibold text-[var(--color-text-primary)]">32h 15m</strong>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
                      <div className="h-full w-[81%] rounded-full bg-[var(--color-primary)]" />
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[var(--color-border)] bg-white p-3">
                  <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-text-primary)]">HR Policy Chatbot</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">Ask about leave, late policy, or any HR rule.</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* AI Attendance Insights */}
          <Reveal className="lg:col-span-2">
            <div className="landing-card-hover flex h-full flex-col rounded-[20px] border border-[var(--color-border)] bg-white p-6 sm:p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary-xlight)] text-[var(--color-primary)]">
                <Brain className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-xl font-bold text-[var(--color-text-primary)]">AI Attendance Insights</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Turn attendance patterns into clear, actionable recommendations.
              </p>
              <div className="mt-auto flex h-28 items-end gap-2 pt-6" aria-hidden>
                {[32, 48, 40, 62, 54, 78, 96].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-md bg-[var(--color-primary)]"
                    style={{ height: `${h}%`, opacity: 0.35 + (i / 6) * 0.65 }}
                  />
                ))}
              </div>
            </div>
          </Reveal>

          {/* Self-service for employees */}
          <Reveal className="lg:col-span-3">
            <div className="landing-card-hover h-full rounded-[20px] border border-[var(--color-border)] bg-white p-6 sm:p-8">
              <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                  <Calendar className="h-4 w-4 text-[var(--color-primary)]" /> Mon 19 Nov
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success-light)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-success)]">
                  <Check className="h-3 w-3" strokeWidth={3} /> Checked in
                </span>
              </div>
              <h3 className="mt-5 text-xl font-bold text-[var(--color-text-primary)]">Self-service for employees</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Check in, track hours, and get policy answers instantly.
              </p>
            </div>
          </Reveal>

          {/* Visibility for HR */}
          <Reveal className="lg:col-span-3">
            <div className="landing-card-hover h-full rounded-[20px] border border-[var(--color-border)] bg-white p-6 sm:p-8">
              <div className="flex items-end gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 pb-0 pt-3" aria-hidden>
                {[45, 70, 55, 90, 65].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-md bg-[var(--color-primary)]" style={{ height: `${h * 0.5}px`, opacity: 0.45 + (i / 4) * 0.55 }} />
                ))}
                <span className="pb-3 pl-1 text-xs font-semibold text-[var(--color-primary)]">Live</span>
              </div>
              <h3 className="mt-5 text-xl font-bold text-[var(--color-text-primary)]">Visibility for HR</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Monitor attendance, exceptions, and team patterns in real time.
              </p>
            </div>
          </Reveal>

          {/* HR Portal — large dark purple */}
          <Reveal className="lg:col-span-6">
            <div className="landing-card-hover flex flex-col gap-8 rounded-[20px] bg-[var(--color-primary-deeper)] p-6 sm:p-8 lg:flex-row">
              <div className="flex-1">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white">
                  <Building2 className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-xl font-bold text-white">HR Portal</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-white/75">
                  A central command center for monitoring attendance, exceptions, and AI-powered insights.
                </p>
                <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {["Company Attendance Dashboard", "Late Employees", "Absent Employees", "Department Analytics", "AI Attendance Insights", "Company Policy"].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm font-medium text-white">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="w-full shrink-0 rounded-2xl bg-white p-5 lg:w-80">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">Attendance Dashboard</p>
                  <button type="button" className="flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
                    This Month <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xl font-bold text-[var(--color-primary)]">96%</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">On-time Rate</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[var(--color-text-primary)]">12</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Late Employees</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[var(--color-text-primary)]">7</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Absent Employees</p>
                  </div>
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Department Analytics</p>
                <div className="mt-3 space-y-2.5">
                  {[
                    { dept: "Eng", w: 92 },
                    { dept: "Sales", w: 78 },
                    { dept: "Ops", w: 85 },
                    { dept: "HR", w: 96 },
                    { dept: "Finance", w: 88 },
                  ].map((d) => (
                    <div key={d.dept} className="flex items-center gap-2.5">
                      <span className="w-14 shrink-0 text-xs text-[var(--color-text-secondary)]">{d.dept}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-primary-xlight)]">
                        <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${d.w}%` }} />
                      </div>
                      <span className="w-8 shrink-0 text-right text-xs font-semibold text-[var(--color-text-primary)]">{d.w}%</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[var(--color-bg-soft)] p-3">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-text-primary)]">Company Policy</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">View and manage company policies in one place.</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section id="how" aria-label="How it works" className="bg-[#F7F5FE]">
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:py-24">
          <Reveal className="text-center">
            <SectionPill>How It Works</SectionPill>
            <h2 className="mx-auto mt-5 max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight text-[var(--color-text-primary)] sm:text-[44px]">
              Get started in just <span className="text-[var(--color-primary)]">three simple steps</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[var(--color-text-secondary)]">
              From setup to actionable insights — go live with AI Workforce in minutes.
            </p>
          </Reveal>

          <div className="mt-12 flex flex-col items-stretch gap-6 lg:flex-row lg:items-center">
            {/* Step 1 */}
            <Reveal className="flex-1">
              <div className="landing-card-hover h-full rounded-[20px] border border-[var(--color-border)] bg-white p-6">
                <p className="eyebrow text-[var(--color-primary)]">01</p>
                <h3 className="mt-3 text-lg font-bold text-[var(--color-text-primary)]">Set up your company</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-secondary)]">Add your team, roles, and HR policies in minutes.</p>
                <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Create Organization</p>
                  <p className="mt-3 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--color-text-primary)]">Acme Technologies</p>
                  <p className="mt-3 text-xs font-medium text-[var(--color-text-secondary)]">Add Team Members</p>
                  <div className="mt-2 flex items-center">
                    {["AK", "HS", "BA", "UA"].map((ini, i) => (
                      <span key={ini} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[11px] font-bold text-white ${i % 2 === 0 ? "bg-[var(--color-primary)]" : "bg-[var(--color-info)]"} ${i > 0 ? "-ml-2" : ""}`}>
                        {ini}
                      </span>
                    ))}
                    <span className="ml-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-[var(--color-border-strong)] text-sm font-bold text-[var(--color-text-muted)]">+</span>
                  </div>
                  <p className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]">
                    <FileText className="h-4 w-4 text-[var(--color-primary)]" /> Company Policy.pdf
                  </p>
                </div>
              </div>
            </Reveal>
            <ArrowRight className="hidden h-6 w-6 shrink-0 text-[var(--color-primary)] lg:block" aria-hidden />

            {/* Step 2 */}
            <Reveal className="flex-1">
              <div className="landing-card-hover h-full rounded-[20px] border border-[var(--color-border)] bg-white p-6">
                <p className="eyebrow text-[var(--color-primary)]">02</p>
                <h3 className="mt-3 text-lg font-bold text-[var(--color-text-primary)]">Track attendance</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-secondary)]">Employees check in and out, with hours and late arrivals recorded automatically.</p>
                <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4 text-center">
                  <p className="text-3xl font-bold tabular-nums text-[var(--color-text-primary)]">09:00 AM</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">Today · Mon 19 Nov</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-success-light)] px-3 py-1 text-xs font-semibold text-[var(--color-success)]">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Checked In
                  </span>
                  <span className="mt-3 block rounded-full bg-[var(--color-primary)] py-2.5 text-sm font-semibold text-white">Check Out</span>
                </div>
              </div>
            </Reveal>
            <ArrowRight className="hidden h-6 w-6 shrink-0 text-[var(--color-primary)] lg:block" aria-hidden />

            {/* Step 3 */}
            <Reveal className="flex-1">
              <div className="landing-card-hover h-full rounded-[20px] border border-[var(--color-border)] bg-white p-6">
                <p className="eyebrow text-[var(--color-primary)]">03</p>
                <h3 className="mt-3 text-lg font-bold text-[var(--color-text-primary)]">Get AI insights</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-secondary)]">Turn attendance patterns into clear summaries and actionable recommendations.</p>
                <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                  <p className="flex items-start gap-2 text-sm leading-relaxed text-[var(--color-text-primary)]">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                    <span><strong className="font-semibold">AI Insight:</strong> Late arrivals are 37% lower this month.</span>
                  </p>
                  <p className="mt-3 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                    <strong className="font-semibold text-[var(--color-text-primary)]">Recommendation:</strong> Maintain the current shift plan for Operations.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Bottom strip */}
          <div className="mt-8 grid gap-4 rounded-[20px] border border-[var(--color-border)] bg-white p-6 sm:grid-cols-3">
            {[
              { icon: Zap, title: "Quick setup", desc: "Be up and running in minutes" },
              { icon: MousePointerClick, title: "Seamless for your team", desc: "Easy, one-tap check-in" },
              { icon: TrendingUp, title: "Actionable from day one", desc: "AI insights that drive real decisions" },
            ].map((s) => (
              <div key={s.title} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-xlight)] text-[var(--color-primary)]">
                  <s.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{s.title}</p>
                  <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="plans" aria-label="Pricing" className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:py-24">
        <Reveal className="text-center">
          <SectionPill>
            <Zap className="h-3.5 w-3.5 text-[var(--color-primary)]" /> Pricing
          </SectionPill>
          <h2 className="mx-auto mt-5 max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight text-[var(--color-text-primary)] sm:text-[44px]">
            Simple pricing. Powerful attendance intelligence.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[var(--color-text-secondary)]">
            Start free, scale as your team grows.
          </p>
          <div className="mt-6 inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-1">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              aria-pressed={billing === "monthly"}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${billing === "monthly" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-secondary)]"}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              aria-pressed={billing === "annual"}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${billing === "annual" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-secondary)]"}`}
            >
              Annual
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${billing === "annual" ? "bg-white/20 text-white" : "bg-[var(--color-success-light)] text-[var(--color-success)]"}`}>
                Save 20%
              </span>
            </button>
          </div>
        </Reveal>

        <div className="mx-auto mt-10 grid max-w-4xl gap-4 lg:grid-cols-3">
          {/* Free */}
          <div className="pricing-card flex flex-col rounded-[20px] border border-[var(--color-border)] bg-white p-6">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Free</h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Get started with the essentials.</p>
            <p className="mt-4 text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
              $0<span className="text-base font-medium text-[var(--color-text-muted)]">/month</span>
            </p>
            <ul className="mt-5 flex-1 space-y-2.5">
              {["Up to 10 employees", "Check in / Check out", "Attendance history", "Basic reports"].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-[var(--color-text-secondary)]">
                  <GreenCheck /> {f}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setPayPlan({ plan: "Free", price: "$0/month" })}
              className="mt-6 flex h-11 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-white text-sm font-semibold text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[var(--color-primary-light)] hover:text-[var(--color-primary)]"
            >
              Subscribe to Free
            </button>
          </div>

          {/* Pro */}
          <div className="pricing-card pricing-card--popular relative flex flex-col rounded-[20px] border-2 border-[var(--color-primary)] bg-[#FBFAFF] p-6">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--color-primary)] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              Most Popular
            </span>
            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Pro</h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">For growing teams.</p>
            <p className="mt-4 text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
              {proPrice}<span className="text-base font-medium text-[var(--color-text-muted)]">/month</span>
            </p>
            {billing === "annual" && (
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                <span className="line-through">$49</span> billed annually
              </p>
            )}
            <ul className="mt-5 flex-1 space-y-2.5 rounded-xl bg-[var(--color-primary-xlight)] p-3">
              {["Up to 200 employees", "All Employee Portal features", "HR Portal & dashboards", "AI attendance insights", "Company policy management"].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-[var(--color-text-secondary)]">
                  <GreenCheck /> {f}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setPayPlan({ plan: "Pro", price: `${proPrice}/month` })}
              className="mt-6 flex h-11 items-center justify-center gap-1.5 rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--color-primary-dark)]"
            >
              Subscribe to Pro <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Enterprise */}
          <div className="pricing-card flex flex-col rounded-[20px] border border-[var(--color-border)] bg-white p-6">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Enterprise</h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">For larger organizations.</p>
            <p className="mt-4 text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)]">Custom</p>
            <ul className="mt-5 flex-1 space-y-2.5">
              {["Unlimited employees", "Advanced analytics", "Custom policies & workflows", "Priority support", "Dedicated onboarding"].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-[var(--color-text-secondary)]">
                  <GreenCheck /> {f}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-6 flex h-11 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-white text-sm font-semibold text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[var(--color-primary-light)] hover:text-[var(--color-primary)]"
            >
              Contact sales
            </button>
          </div>
        </div>

        {/* Trust row */}
        <div className="mx-auto mt-8 flex max-w-4xl flex-col items-center justify-center gap-4 text-sm text-[var(--color-text-secondary)] sm:flex-row sm:gap-10">
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" /> Secure &amp; Reliable</span>
          <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-[var(--color-primary)]" /> Quick Setup</span>
          <span className="flex items-center gap-2"><Headphones className="h-4 w-4 text-[var(--color-primary)]" /> Dedicated Support</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] bg-white">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
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
              <li><a href="#how" className="hover:text-[var(--color-text-primary)]">How it works</a></li>
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
              <li><a href="#how" className="hover:text-[var(--color-text-primary)]">How it works</a></li>
              <li><a href="#plans" className="hover:text-[var(--color-text-primary)]">Pricing</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[var(--color-border)]">
          <div className="mx-auto max-w-[1280px] px-4 py-5 text-xs text-[var(--color-text-muted)] sm:px-6">
            <p>© 2026 AI Workforce — Attendance Intelligence</p>
          </div>
        </div>
      </footer>

      <PaymentModal
        open={payPlan !== null}
        planName={payPlan?.plan ?? ""}
        priceLabel={payPlan?.price ?? ""}
        onClose={() => setPayPlan(null)}
      />
    </div>
  );
}
