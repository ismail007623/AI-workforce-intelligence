"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

const DEMO_WEEK = [
  { day: "Mon", present: 12, late: 1 },
  { day: "Tue", present: 13, late: 1 },
  { day: "Wed", present: 11, late: 2 },
  { day: "Thu", present: 12, late: 1 },
  { day: "Fri", present: 11, late: 2 },
];

const DEMO_CHECKINS = [
  { name: "Usman Ali", dept: "Engineering", time: "9:58 AM", status: "On time", tone: "success" },
  { name: "Ayesha Malik", dept: "Sales", time: "10:22 AM", status: "Late 7m", tone: "warning" },
  { name: "Bilal Hussain", dept: "Design", time: "10:04 AM", status: "On time", tone: "success" },
];

const DEMO_LATE_DEPTS = [
  { dept: "Sales", late: 6 },
  { dept: "Engineering", late: 4 },
  { dept: "Operations", late: 3 },
  { dept: "Design", late: 1 },
];

const toneClasses: Record<string, string> = {
  success: "bg-[var(--color-success-light)] text-[var(--color-success)]",
  warning: "bg-[var(--color-warning-light)] text-[var(--color-warning)]",
  danger: "bg-[var(--color-danger-light)] text-[var(--color-danger)]",
  neutral: "bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)]",
};

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
    <div className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 shadow-md">
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
/* Hero dashboard preview (demo data)                                 */
/* ------------------------------------------------------------------ */

function HeroDashboardPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-hero)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3.5">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            Attendance overview
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">Today · Wednesday, Nov 4</p>
        </div>
        <DemoLabel />
      </div>

      <div className="grid grid-cols-3 divide-x divide-[var(--color-border)] border-b border-[var(--color-border)]">
        {[
          { label: "Present", value: "11", icon: UserCheck, tone: "success" },
          { label: "Late", value: "2", icon: Clock, tone: "warning" },
          { label: "Absent", value: "1", icon: UserX, tone: "danger" },
        ].map((kpi) => (
          <div key={kpi.label} className="px-4 py-3.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)]">
              <kpi.icon className="h-3.5 w-3.5" />
              {kpi.label}
            </p>
            <p className="mt-1 text-2xl font-bold leading-none text-[var(--color-text-primary)]">
              {kpi.value}
            </p>
            <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">of 14 employees</p>
          </div>
        ))}
      </div>

      <div className="border-b border-[var(--color-border)] px-5 py-4">
        <p className="text-xs font-semibold text-[var(--color-text-primary)]">
          Check-ins this week
        </p>
        <div className="mt-2 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DEMO_WEEK} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e9f1" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "#6b7085" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7085" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<DemoChartTooltip />} cursor={{ fill: "#f8f8fc" }} />
              <Bar dataKey="present" name="Present" fill="#15966a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="late" name="Late" fill="#d58b25" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
            <span className="h-2 w-2 rounded-full bg-[#15966a]" /> Present
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
            <span className="h-2 w-2 rounded-full bg-[#d58b25]" /> Late
          </span>
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-start gap-2.5 rounded-xl bg-[var(--color-primary-xlight)] p-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-primary)]">AI insight</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">
              Late arrivals cluster on Mondays. Consider a reminder sent Sunday evening.
            </p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {DEMO_CHECKINS.slice(0, 2).map((c) => (
            <div key={c.name} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-xlight)] text-[11px] font-bold text-[var(--color-primary)]">
                  {c.name.split(" ").map((n) => n[0]).join("")}
                </span>
                <p className="truncate text-xs font-medium text-[var(--color-text-primary)]">
                  {c.name} <span className="font-normal text-[var(--color-text-muted)]">· {c.dept} · {c.time}</span>
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${toneClasses[c.tone]}`}
              >
                {c.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Capabilities: interactive Employee / HR tabs                       */
/* ------------------------------------------------------------------ */

type Capability = {
  id: string;
  title: string;
  desc: string;
  icon: React.ElementType;
  preview: React.ReactNode;
};

function PreviewShell({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
        <DemoLabel />
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const EMPLOYEE_CAPABILITIES: Capability[] = [
  {
    id: "checkin",
    title: "Check In / Check Out",
    desc: "One tap to mark attendance. The card shows today's date, the live clock, check-in and check-out times, and working-hours progress.",
    icon: LogIn,
    preview: (
      <PreviewShell title="Today — Check in / out">
        <p className="text-xs text-[var(--color-text-muted)]">Wednesday, November 4</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">09:58 AM</p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-success-light)] px-2.5 py-1 text-xs font-semibold text-[var(--color-success)]">
          <CheckCircle2 className="h-3.5 w-3.5" /> Checked in — On time
        </span>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
          <div className="h-full w-[12%] rounded-full bg-[var(--color-success)]" />
        </div>
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">1h 02m worked · 7h 58m remaining</p>
        <button
          type="button"
          tabIndex={-1}
          className="mt-4 w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)] py-2.5 text-sm font-semibold text-[var(--color-text-primary)]"
        >
          Check Out
        </button>
      </PreviewShell>
    ),
  },
  {
    id: "late-reason",
    title: "Late Reason Validation",
    desc: "When a check-in is late, the employee submits a reason. The reason is recorded and validated, and its status is shown back to the employee.",
    icon: FileText,
    preview: (
      <PreviewShell title="Late reason — 10:22 AM">
        <label htmlFor="demo-late-reason" className="text-xs font-semibold text-[var(--color-text-primary)]">
          Why were you late today?
        </label>
        <textarea
          id="demo-late-reason"
          rows={3}
          readOnly
          value="My bus was delayed by road work on the main route."
          className="mt-2 w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)]"
        />
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-warning-light)] px-2.5 py-1 text-xs font-semibold text-[var(--color-warning)]">
          <Clock className="h-3.5 w-3.5" /> Submitted — Awaiting validation
        </span>
      </PreviewShell>
    ),
  },
  {
    id: "history",
    title: "Attendance History",
    desc: "A clear table of past attendance: date, check-in and check-out times, status, and late minutes — with nothing hidden.",
    icon: Clock,
    preview: (
      <PreviewShell title="My attendance — this week">
        <div className="space-y-2">
          {[
            { d: "Wed, Nov 4", in: "09:58 AM", out: "—", s: "On time", tone: "success" },
            { d: "Tue, Nov 3", in: "10:22 AM", out: "07:05 PM", s: "Late 7m", tone: "warning" },
            { d: "Mon, Nov 2", in: "10:01 AM", out: "07:00 PM", s: "On time", tone: "success" },
          ].map((r) => (
            <div key={r.d} className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2 text-sm last:border-0 last:pb-0">
              <span className="font-medium text-[var(--color-text-primary)]">{r.d}</span>
              <span className="text-[var(--color-text-muted)]">{r.in} – {r.out}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneClasses[r.tone]}`}>{r.s}</span>
            </div>
          ))}
        </div>
      </PreviewShell>
    ),
  },
  {
    id: "summary",
    title: "Attendance Summary",
    desc: "Monthly overview at a glance: present days, late days, absent days, attendance rate, and average delay.",
    icon: BarChart3,
    preview: (
      <PreviewShell title="My summary — November">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Present days", value: "18" },
            { label: "Late days", value: "2" },
            { label: "Absent days", value: "0" },
            { label: "Attendance rate", value: "90%" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3">
              <p className="text-xs text-[var(--color-text-muted)]">{s.label}</p>
              <p className="mt-0.5 text-xl font-bold text-[var(--color-text-primary)]">{s.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">Average delay when late: 12 min</p>
      </PreviewShell>
    ),
  },
  {
    id: "policy-chat",
    title: "HR Policy Chatbot",
    desc: "Employees ask questions in plain language and get answers from the company's own uploaded policy document — nothing else.",
    icon: MessageSquareText,
    preview: (
      <PreviewShell title="Policy Assistant">
        <div className="space-y-2.5">
          <div className="ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-[var(--color-primary)] px-3 py-2 text-sm text-white">
            How many annual leave days do we get?
          </div>
          <div className="w-fit max-w-[95%] rounded-xl rounded-bl-sm border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">
            Your company policy provides 20 annual leave days per year, to be
            requested at least 3 days in advance.
          </div>
        </div>
        <p className="mt-3 text-[11px] text-[var(--color-text-muted)]">
          Answers use your company&apos;s uploaded policy only.
        </p>
      </PreviewShell>
    ),
  },
];

const HR_CAPABILITIES: Capability[] = [
  {
    id: "dashboard",
    title: "Company Attendance Dashboard",
    desc: "The whole workforce at a glance: total employees, present, late, absent, and attendance rate — with live check-ins and trends.",
    icon: BarChart3,
    preview: (
      <PreviewShell title="Company dashboard — today">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: "14" },
            { label: "Present", value: "11" },
            { label: "Late", value: "2" },
            { label: "Absent", value: "1" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3">
              <p className="text-xs text-[var(--color-text-muted)]">{s.label}</p>
              <p className="mt-0.5 text-xl font-bold text-[var(--color-text-primary)]">{s.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">Attendance rate today: 79% of 14 employees checked in.</p>
      </PreviewShell>
    ),
  },
  {
    id: "late",
    title: "Late Employees",
    desc: "Searchable late list with check-in time, late duration, the submitted reason, and its validation status.",
    icon: Clock,
    preview: (
      <PreviewShell title="Late today">
        <div className="space-y-2">
          {[
            { n: "Ayesha Malik", d: "Sales", t: "10:22 AM", late: "7m", s: "Valid", tone: "success" },
            { n: "Omar Farooq", d: "Operations", t: "10:41 AM", late: "26m", s: "Pending", tone: "warning" },
          ].map((r) => (
            <div key={r.n} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2 text-sm last:border-0 last:pb-0">
              <span className="font-medium text-[var(--color-text-primary)]">{r.n} <span className="font-normal text-[var(--color-text-muted)]">· {r.d}</span></span>
              <span className="text-[var(--color-text-muted)]">{r.t} · Late {r.late}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneClasses[r.tone]}`}>{r.s}</span>
            </div>
          ))}
        </div>
      </PreviewShell>
    ),
  },
  {
    id: "absent",
    title: "Absent Employees",
    desc: "Everyone who has not checked in, with department and date, plus search and filters to follow up quickly.",
    icon: UserX,
    preview: (
      <PreviewShell title="Absent today">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2 text-sm last:border-0 last:pb-0">
          <span className="font-medium text-[var(--color-text-primary)]">Hina Sheikh <span className="font-normal text-[var(--color-text-muted)]">· Design</span></span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-danger-light)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-danger)]">
            <UserX className="h-3 w-3" /> Absent
          </span>
        </div>
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">No check-in recorded for today, Nov 4.</p>
      </PreviewShell>
    ),
  },
  {
    id: "departments",
    title: "Department Analytics",
    desc: "Compare departments side by side: attendance rate, lateness, and absence, so patterns are visible instead of anecdotal.",
    icon: Building2,
    preview: (
      <PreviewShell title="Lateness rate by department">
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DEMO_LATE_DEPTS} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e9f1" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7085" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="dept" width={86} tick={{ fontSize: 11, fill: "#17172b" }} axisLine={false} tickLine={false} />
              <Tooltip content={<DemoChartTooltip />} cursor={{ fill: "#f8f8fc" }} />
              <Bar dataKey="late" name="Late arrivals" radius={[0, 4, 4, 0]}>
                {DEMO_LATE_DEPTS.map((d) => (
                  <Cell key={d.dept} fill={d.late >= 5 ? "#dc5263" : d.late >= 3 ? "#d58b25" : "#6554e8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">Late arrivals per department, this month.</p>
      </PreviewShell>
    ),
  },
  {
    id: "insights",
    title: "AI Attendance Insights",
    desc: "Ask a question in plain English and get an analysis grounded in the company's real attendance data, with a recommendation.",
    icon: Brain,
    preview: (
      <PreviewShell title="AI Attendance Insights">
        <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">
          “Which departments have the highest late attendance this month?”
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          Sales has the most late arrivals (6), followed by Engineering (4).
          Late arrivals in Sales cluster on Mondays.
        </p>
        <p className="mt-2 flex items-start gap-1.5 text-sm font-medium text-[var(--color-text-primary)]">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
          Recommendation: send the Sales team a Sunday-evening check-in reminder.
        </p>
      </PreviewShell>
    ),
  },
  {
    id: "policy",
    title: "Company Policy",
    desc: "Upload the company policy once. Employees ask the Policy Assistant questions and get answers from that document only.",
    icon: FileText,
    preview: (
      <PreviewShell title="Company policy">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-danger-light)]">
            <FileText className="h-5 w-5 text-[var(--color-danger)]" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Company Policy.pdf</p>
            <p className="text-xs text-[var(--color-text-muted)]">3 pages · Uploaded Jul 1 · Active</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-success-light)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-success)]">
              <CheckCircle2 className="h-3 w-3" /> Active policy
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          Uploading a new policy replaces the active one for the whole company.
        </p>
      </PreviewShell>
    ),
  },
];

function CapabilitiesSection() {
  const [group, setGroup] = useState<"employee" | "hr">("employee");
  const list = group === "employee" ? EMPLOYEE_CAPABILITIES : HR_CAPABILITIES;
  const [activeId, setActiveId] = useState(list[0].id);
  const active = list.find((c) => c.id === activeId) ?? list[0];

  const switchGroup = (next: "employee" | "hr") => {
    setGroup(next);
    setActiveId((next === "employee" ? EMPLOYEE_CAPABILITIES : HR_CAPABILITIES)[0].id);
  };

  return (
    <section id="features" aria-label="Product capabilities" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Everything your workforce needs, in one intelligent platform.
        </h2>
        <p className="mt-3 text-[var(--color-text-secondary)]">
          From daily attendance to workforce analytics, manage the entire process in one
          connected experience.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Choose an experience"
        className="mt-8 inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-1"
      >
        {(
          [
            { id: "employee", label: "Employee Experience" },
            { id: "hr", label: "HR Intelligence" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={group === tab.id}
            onClick={() => switchGroup(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
              group === tab.id
                ? "bg-white text-[var(--color-text-primary)] shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <div role="tablist" aria-label="Features" className="flex flex-col gap-1 lg:col-span-2">
          {list.map((c) => {
            const selected = c.id === active.id;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveId(c.id)}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors duration-200 ${
                  selected
                    ? "border-[var(--color-primary)]/30 bg-[var(--color-primary-xlight)]"
                    : "border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-bg-soft)]"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    selected
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)]"
                  }`}
                >
                  <c.icon className="h-4.5 w-4.5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[var(--color-text-primary)]">
                    {c.title}
                  </span>
                  {selected && (
                    <span className="mt-1 block text-sm leading-relaxed text-[var(--color-text-secondary)]">
                      {c.desc}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <div className="lg:col-span-3" key={active.id}>
          {active.preview}
        </div>
      </div>
    </section>
  );
}

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
      {/* Section 1 — Navigation */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            <a href="#features" className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">Features</a>
            <a href="#workflow" className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">How it works</a>
            {hydrated && user ? (
              <>
                <span className="max-w-40 truncate px-2 text-sm font-semibold text-[var(--color-text-primary)]">{user.name}</span>
                <Link href={dashboardHref} className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">Dashboard</Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--color-primary-dark)]"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">Log in</Link>
                <Link href="/company-signup" className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--color-primary-dark)]">Get started</Link>
              </>
            )}
          </nav>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-soft)] md:hidden"
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
              <a href="#features" onClick={() => setMobileNavOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-text-secondary)]">Features</a>
              <a href="#workflow" onClick={() => setMobileNavOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-text-secondary)]">How it works</a>
              {hydrated && user ? (
                <>
                  <Link href={dashboardHref} onClick={() => setMobileNavOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[var(--color-text-primary)]">Dashboard</Link>
                  <button type="button" onClick={() => { setMobileNavOpen(false); void handleLogout(); }} className="mt-1 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-left text-sm font-semibold text-white">Log out</button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileNavOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[var(--color-text-primary)]">Log in</Link>
                  <Link href="/company-signup" onClick={() => setMobileNavOpen(false)} className="mt-1 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white">Get started</Link>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      {/* Section 2 — Hero */}
      <section className="border-b border-[var(--color-border)] bg-[var(--color-bg-soft)]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
              <Sparkles className="h-3.5 w-3.5" /> AI-powered HR operations platform
            </p>
            <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-[var(--color-text-primary)] sm:text-5xl lg:text-[3.4rem]">
              Turn attendance data into{" "}
              <span className="text-[var(--color-primary)]">workforce intelligence</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--color-text-secondary)]">
              Automate attendance tracking, detect issues early, and give HR teams AI-powered
              insights to make smarter workforce decisions.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/company-signup" className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--color-primary-dark)]">
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#features" className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-white px-6 text-sm font-semibold text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[var(--color-primary-light)] hover:text-[var(--color-primary)]">
                Explore features
              </Link>
            </div>
            <p className="mt-5 flex items-start gap-1.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Role-based access: employees see only their own records. HR sees the whole company.
            </p>
          </div>
          <HeroDashboardPreview />
        </div>
      </section>

      {/* Section 3 — Key benefits */}
      <section aria-label="Key benefits" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="flex gap-4 rounded-2xl border border-[var(--color-border)] bg-white p-5">
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
      <CapabilitiesSection />

      {/* Section 5 — How it works */}
      <section id="workflow" aria-label="How AI Workforce works" className="border-y border-[var(--color-border)] bg-[var(--color-bg-soft)]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
              From attendance to action. Automatically.
            </h2>
            <p className="mt-3 text-[var(--color-text-secondary)]">
              Six steps, no manual chasing — from a single check-in to a decision HR can act on.
            </p>
          </div>
          <ol className="relative mt-12 space-y-8 lg:grid lg:grid-cols-3 lg:gap-x-10 lg:gap-y-12 lg:space-y-0">
            {WORKFLOW.map((step, i) => (
              <li key={step.title} className="relative flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Section 6 — AI Insights showcase */}
      <section aria-label="AI insights showcase" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Ask better questions. Make smarter workforce decisions.
            </h2>
            <p className="mt-3 text-[var(--color-text-secondary)]">
              HR asks in plain English. The answer is built from the company&apos;s own
              attendance data — with the numbers and a recommendation, not just a summary.
            </p>
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
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
          </div>
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)]">
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
              <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-[var(--color-primary-xlight)] p-3">
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
      <section aria-label="Role-based experience" className="border-y border-[var(--color-border)] bg-[var(--color-bg-soft)]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
              One platform. Two focused experiences.
            </h2>
            <p className="mt-3 text-[var(--color-text-secondary)]">
              The same login, two different workspaces — each person sees only what their role
              needs.
            </p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)]">
              <div className="border-b border-[var(--color-border)] px-6 py-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-xlight)] text-[var(--color-primary)]">
                  <UserCheck className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-lg font-semibold text-[var(--color-text-primary)]">For Employees</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Quick check-ins, personal attendance information, late reason submission, and HR
                  policy assistance — in one focused workspace.
                </p>
              </div>
              <div className="bg-[var(--color-bg-soft)] px-6 py-5">
                <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-white px-4 py-3">
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
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)]">
              <div className="border-b border-[var(--color-border)] px-6 py-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-xlight)] text-[var(--color-primary)]">
                  <Users className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-lg font-semibold text-[var(--color-text-primary)]">For HR Teams</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Company-wide visibility, department analytics, attendance monitoring,
                  notifications, and AI insights.
                </p>
              </div>
              <div className="bg-[var(--color-bg-soft)] px-6 py-5">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Present", value: "11" },
                    { label: "Late", value: "2" },
                    { label: "Absent", value: "1" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-[var(--color-border)] bg-white p-3 text-center">
                      <p className="text-xl font-bold text-[var(--color-text-primary)]">{s.value}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{s.label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-[var(--color-text-muted)]">
                  HR has organization-wide visibility. Demo figures shown above.
                </p>
              </div>
            </div>
          </div>
          <p className="mt-6 text-center text-sm">
            <Link href="/login" className="font-semibold text-[var(--color-primary)] hover:underline">
              Sign in to your portal <ChevronRight className="inline h-4 w-4" />
            </Link>
          </p>
        </div>
      </section>

      {/* Section 8 — Final CTA */}
      <section aria-label="Get started" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="rounded-2xl bg-[#17172b] px-6 py-12 text-center sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Make attendance management effortless.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-white/70">
            Bring attendance tracking, workforce monitoring, and AI-powered insights together in
            one platform.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/company-signup" className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--color-primary-dark)]">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-white/25 px-6 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Section 9 — Footer */}
      <footer className="border-t border-[var(--color-border)] bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-3 sm:px-6">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--color-text-secondary)]">
              AI-powered attendance monitoring and HR intelligence for modern teams.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li><a href="#features" className="hover:text-[var(--color-text-primary)]">Features</a></li>
              <li><a href="#workflow" className="hover:text-[var(--color-text-primary)]">How it works</a></li>
              <li><Link href="/employee/policy-chat" className="hover:text-[var(--color-text-primary)]">Policy Assistant</Link></li>
              <li><Link href="/hr/insights" className="hover:text-[var(--color-text-primary)]">AI Insights</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Account</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li><Link href="/login" className="hover:text-[var(--color-text-primary)]">Log in</Link></li>
              <li><Link href="/company-signup" className="hover:text-[var(--color-text-primary)]">Get started</Link></li>
              <li><Link href="/signup" className="hover:text-[var(--color-text-primary)]">Create an employee account</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[var(--color-border)]">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-[var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>© 2026 AI Workforce — Attendance Intelligence</p>
            <p>Proof of Concept</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
