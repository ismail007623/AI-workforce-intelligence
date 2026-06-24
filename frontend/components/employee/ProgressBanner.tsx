"use client";

import Link from "next/link";
import { GiTrophy } from "react-icons/gi";
import { FiBarChart2 } from "react-icons/fi";

export function ProgressBanner({ name }: { name: string }) {
  const first = name.split(" ")[0];
  return (
    <div className="ds-card flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-xlight)]">
          <GiTrophy size={22} className="text-[var(--color-primary)]" />
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-[var(--color-text-primary)]">
            Keep it up, {first}!
          </h3>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            You&apos;re building a strong attendance record. Stay consistent to maintain your
            progress.
          </p>
        </div>
      </div>
      <Link
        href="/employee/summary"
        className="flex shrink-0 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] active:scale-[0.97]"
      >
        <FiBarChart2 size={16} />
        View My Progress
      </Link>
    </div>
  );
}
