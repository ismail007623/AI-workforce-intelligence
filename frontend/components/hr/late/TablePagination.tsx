import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageWindow, totalPages } from "./late-utils";

export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const pages = totalPages(total, pageSize);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const windowPages = pageWindow(page, pages);

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[12px] text-[var(--color-text-muted)]">
        Showing {start} to {end} of {total} entries
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-2 py-1 text-[12px] outline-none"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {windowPages[0] > 1 && (
            <>
              <PageBtn n={1} active={page === 1} onClick={() => onPageChange(1)} />
              {windowPages[0] > 2 && <span className="px-1 text-[var(--color-text-muted)]">…</span>}
            </>
          )}
          {windowPages.map((n) => (
            <PageBtn key={n} n={n} active={page === n} onClick={() => onPageChange(n)} />
          ))}
          {windowPages[windowPages.length - 1] < pages && (
            <>
              {windowPages[windowPages.length - 1] < pages - 1 && (
                <span className="px-1 text-[var(--color-text-muted)]">…</span>
              )}
              <PageBtn n={pages} active={page === pages} onClick={() => onPageChange(pages)} />
            </>
          )}
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => onPageChange(page + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-[var(--radius-sm)] px-2 text-[12px] font-semibold ${
        active
          ? "bg-[var(--color-primary)] text-white"
          : "border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-soft)]"
      }`}
    >
      {n}
    </button>
  );
}
