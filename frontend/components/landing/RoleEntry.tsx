"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, Check, Loader2, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { Employee } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

function EmployeePickerModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { setEmployeeSession } = useSession();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Employee | null>(null);

  const { data: employees = [], isLoading, isError } = useQuery({
    queryKey: ["employees"],
    queryFn: api.getEmployees,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.employee_id.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q),
    );
  }, [employees, search]);

  const handleContinue = () => {
    if (!selected) return;
    setEmployeeSession(selected);
    router.push("/employee");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[var(--color-text-primary)]/50 backdrop-blur-sm" />
      <div
        className="relative flex max-h-[85vh] w-full max-w-md animate-scale-in flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] p-5">
          <div>
            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Select your profile</h3>
            <p className="text-[13px] text-[var(--color-text-muted)]">Choose your name to access your attendance.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-primary-xlight)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-[var(--color-border)] p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID or department"
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-page)] pl-9 pr-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary-light)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--color-text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading employees...
            </div>
          ) : isError ? (
            <div className="px-4 py-12 text-center text-sm text-[var(--color-danger)]">
              Couldn&apos;t load employees. Make sure the API server is running.
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-[var(--color-text-muted)]">No matches found.</div>
          ) : (
            filtered.map((emp) => {
              const isSel = selected?.employee_id === emp.employee_id;
              return (
                <button
                  key={emp.employee_id}
                  type="button"
                  onClick={() => setSelected(emp)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left transition-colors",
                    isSel ? "bg-[var(--color-primary-xlight)] ring-1 ring-[var(--color-primary-light)]" : "hover:bg-[var(--color-bg-card-hover)]",
                  )}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-xlight)] text-xs font-bold text-[var(--color-primary)]">
                    {initials(emp.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{emp.name}</p>
                    <p className="truncate text-xs text-[var(--color-text-muted)]">
                      {emp.employee_id} · {emp.department}
                    </p>
                  </div>
                  {isSel && <Check className="h-4 w-4 text-[var(--color-primary)]" />}
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-[var(--color-border)] p-4">
          <button
            type="button"
            disabled={!selected}
            onClick={handleContinue}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue to my portal
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function RoleEntry() {
  const router = useRouter();
  const { setHrSession } = useSession();
  const [pickerOpen, setPickerOpen] = useState(false);

  const enterHr = () => {
    setHrSession();
    router.push("/hr");
  };

  return (
    <div id="get-started" className="grid gap-5 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="group relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 text-left shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:border-[var(--color-primary-light)] hover:shadow-[var(--shadow-card-hover)]"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-xlight)] text-[var(--color-primary)] transition-colors group-hover:bg-[var(--color-primary)] group-hover:text-white">
          <UserRound className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-[var(--color-text-primary)]">I&apos;m an Employee</h3>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Check in and out, and view only your own attendance history and summary.
        </p>
        <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)]">
          Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </button>

      <button
        type="button"
        onClick={enterHr}
        className="group relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 text-left shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:border-[var(--color-primary-light)] hover:shadow-[var(--shadow-card-hover)]"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-xlight)] text-[var(--color-primary-dark)] transition-colors group-hover:bg-[var(--color-primary-dark)] group-hover:text-white">
          <Building2 className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-[var(--color-text-primary)]">I&apos;m HR / Manager</h3>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Monitor the whole workforce, track issues, and generate AI insights.
        </p>
        <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary-dark)]">
          Open dashboard <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </button>

      <p className="sm:col-span-2 flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-muted)]">
        <ShieldCheck className="h-3.5 w-3.5" />
        Employees can only access their own records. HR has organization-wide visibility.
      </p>

      {pickerOpen && <EmployeePickerModal onClose={() => setPickerOpen(false)} />}
    </div>
  );
}
