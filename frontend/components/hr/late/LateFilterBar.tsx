"use client";

import { useEffect, useRef, useState } from "react";
import { Columns3, Download, Filter, Search } from "lucide-react";
import type { ActiveFilters, ColumnKey, SortBy } from "./late-utils";
import { ALL_COLUMNS, SORT_OPTIONS } from "./late-utils";

const DECISION_OPTIONS = ["valid", "acceptable", "weak", "invalid", "pending"];

export function LateFilterBar({
  sortBy,
  onSortChange,
  search,
  onSearchChange,
  activeFilters,
  onFiltersChange,
  allDepartments,
  visibleColumns,
  onColumnsChange,
  onExport,
}: {
  sortBy: SortBy;
  onSortChange: (sort: SortBy) => void;
  search: string;
  onSearchChange: (value: string) => void;
  activeFilters: ActiveFilters;
  onFiltersChange: (f: ActiveFilters) => void;
  allDepartments: string[];
  visibleColumns: Set<ColumnKey>;
  onColumnsChange: (cols: Set<ColumnKey>) => void;
  onExport: () => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
      if (columnsRef.current && !columnsRef.current.contains(e.target as Node)) {
        setColumnsOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeFilterCount = activeFilters.departments.length + activeFilters.decisions.length;

  const toggleDepartment = (dep: string) => {
    const next = activeFilters.departments.includes(dep)
      ? activeFilters.departments.filter((d) => d !== dep)
      : [...activeFilters.departments, dep];
    onFiltersChange({ ...activeFilters, departments: next });
  };

  const toggleDecision = (dec: string) => {
    const next = activeFilters.decisions.includes(dec)
      ? activeFilters.decisions.filter((d) => d !== dec)
      : [...activeFilters.decisions, dec];
    onFiltersChange({ ...activeFilters, decisions: next });
  };

  const toggleColumn = (key: ColumnKey) => {
    const next = new Set(visibleColumns);
    if (next.has(key)) {
      if (next.size > 1) next.delete(key);
    } else {
      next.add(key);
    }
    onColumnsChange(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="shrink-0 text-[13px] font-medium text-[var(--color-text-muted)]">Sort by:</span>
      {SORT_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSortChange(opt.value)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
            sortBy === opt.value
              ? "bg-[var(--color-primary)] text-white shadow-sm"
              : "border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-primary-light)]"
          }`}
        >
          {opt.label}
        </button>
      ))}

      <span className="mx-1 h-5 w-px shrink-0 bg-[var(--color-border)]" />

      {/* Search */}
      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search in table..."
          className="w-44 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white py-2 pl-9 pr-3 text-[13px] outline-none focus:border-[var(--color-primary-light)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
        />
      </div>

      {/* Filters dropdown */}
      <div ref={filtersRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => {
            setFiltersOpen((p) => !p);
            setColumnsOpen(false);
          }}
          className={`inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border px-3 py-2 text-[12px] font-semibold transition-colors ${
            activeFilterCount > 0
              ? "border-[var(--color-primary)] bg-[var(--color-primary-xlight)] text-[var(--color-primary)]"
              : "border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-xlight)]"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        {filtersOpen && (
          <div className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[12px] font-bold text-[var(--color-text-primary)]">Filters</p>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => onFiltersChange({ departments: [], decisions: [] })}
                  className="text-[11px] text-[var(--color-primary)] hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {allDepartments.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Department
                </p>
                <div className="max-h-36 space-y-2 overflow-y-auto">
                  {allDepartments.map((dep) => (
                    <label key={dep} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activeFilters.departments.includes(dep)}
                        onChange={() => toggleDepartment(dep)}
                        className="h-3.5 w-3.5 rounded accent-[var(--color-primary)]"
                      />
                      <span className="text-[12px] text-[var(--color-text-secondary)]">{dep}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                AI Decision
              </p>
              <div className="space-y-2">
                {DECISION_OPTIONS.map((dec) => (
                  <label key={dec} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={activeFilters.decisions.includes(dec)}
                      onChange={() => toggleDecision(dec)}
                      className="h-3.5 w-3.5 rounded accent-[var(--color-primary)]"
                    />
                    <span className="text-[12px] capitalize text-[var(--color-text-secondary)]">{dec}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Columns dropdown */}
      <div ref={columnsRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => {
            setColumnsOpen((p) => !p);
            setFiltersOpen(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-primary-xlight)]"
        >
          <Columns3 className="h-3.5 w-3.5" />
          Columns
        </button>

        {columnsOpen && (
          <div className="absolute right-0 top-full z-50 mt-1.5 w-48 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-4 shadow-xl">
            <p className="mb-3 text-[12px] font-bold text-[var(--color-text-primary)]">Columns</p>
            <div className="space-y-2">
              {ALL_COLUMNS.map((col) => (
                <label key={col.key} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={visibleColumns.has(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    className="h-3.5 w-3.5 rounded accent-[var(--color-primary)]"
                  />
                  <span className="text-[12px] text-[var(--color-text-secondary)]">{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Export */}
      <button
        type="button"
        onClick={onExport}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-primary-xlight)]"
      >
        <Download className="h-3.5 w-3.5" />
        Export
      </button>
    </div>
  );
}
