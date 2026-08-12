"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingTable } from "@/components/shared/states";
import { LateFilterBar } from "@/components/hr/late/LateFilterBar";
import { LateIntelligenceTable } from "@/components/hr/late/LateIntelligenceTable";
import { LatePageHeader } from "@/components/hr/late/LatePageHeader";
import { LateSummaryCards } from "@/components/hr/late/LateSummaryCards";
import { TablePagination } from "@/components/hr/late/TablePagination";
import {
  DEFAULT_ACTIVE_FILTERS,
  DEFAULT_VISIBLE_COLUMNS,
  deriveLateStats,
  exportToCsv,
  filterLateRowsAdvanced,
  paginateRows,
  type ActiveFilters,
  type ColumnKey,
  type SortBy,
} from "@/components/hr/late/late-utils";

export default function LatePage() {
  const [sortBy, setSortBy] = useState<SortBy>("late_minutes");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(DEFAULT_ACTIVE_FILTERS);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    new Set(DEFAULT_VISIBLE_COLUMNS),
  );

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["late-intelligence", sortBy],
    queryFn: () => api.getLateIntelligence(sortBy),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    setPage(1);
  }, [sortBy, search, pageSize, activeFilters]);

  const allDepartments = useMemo(
    () => [...new Set(data.map((r) => r.department))].sort(),
    [data],
  );

  const stats = useMemo(() => deriveLateStats(data), [data]);
  const filtered = useMemo(
    () => filterLateRowsAdvanced(data, search, activeFilters),
    [data, search, activeFilters],
  );
  const pageRows = useMemo(() => paginateRows(filtered, page, pageSize), [filtered, page, pageSize]);

  const handleExport = () => exportToCsv(filtered);

  return (
    <div className="space-y-6">
      <LatePageHeader />

      <LateSummaryCards stats={stats} loading={isLoading} />

      <Card className="overflow-hidden shadow-[var(--shadow-card)]">
        <CardContent className="p-0">
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <LateFilterBar
              sortBy={sortBy}
              onSortChange={setSortBy}
              search={search}
              onSearchChange={setSearch}
              activeFilters={activeFilters}
              onFiltersChange={setActiveFilters}
              allDepartments={allDepartments}
              visibleColumns={visibleColumns}
              onColumnsChange={setVisibleColumns}
              onExport={handleExport}
            />
          </div>
          {isLoading ? (
            <div className="p-4">
              <LoadingTable rows={5} />
            </div>
          ) : isError ? (
            <div className="p-4">
              <ErrorState />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Clock}
                title={data.length === 0 ? "No late arrivals" : "No matching employees"}
                description={
                  data.length === 0
                    ? "Everyone who checked in today was on time."
                    : "Try adjusting your search query or active filters."
                }
              />
            </div>
          ) : (
            <>
              <LateIntelligenceTable rows={pageRows} visibleColumns={visibleColumns} />
              <TablePagination
                page={page}
                pageSize={pageSize}
                total={filtered.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
