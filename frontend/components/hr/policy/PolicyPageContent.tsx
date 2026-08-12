"use client";

import { useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CurrentPolicyCard } from "./CurrentPolicyCard";
import { PolicyInformationCard } from "./PolicyInformationCard";
import { PolicyNextStepsCard } from "./PolicyNextStepsCard";
import { PolicyUploadHistoryTable } from "./PolicyUploadHistoryTable";
import { PolicyUploadSection } from "./PolicyUploadSection";

export function PolicyPageContent() {
  const queryClient = useQueryClient();
  const uploadRef = useRef<HTMLDivElement>(null);

  const statusQuery = useQuery({
    queryKey: ["policy-status"],
    queryFn: api.getPolicyStatus,
  });

  const historyQuery = useQuery({
    queryKey: ["policy-history"],
    queryFn: api.getPolicyHistory,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["policy-status"] });
    queryClient.invalidateQueries({ queryKey: ["policy-history"] });
  };

  const scrollToUpload = () => {
    uploadRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => uploadRef.current?.querySelector("input")?.click(), 300);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
      <div className="space-y-6">
        <CurrentPolicyCard
          status={statusQuery.data}
          loading={statusQuery.isLoading}
          onReplace={scrollToUpload}
        />
        <PolicyUploadSection uploadRef={uploadRef} onSuccess={refresh} />
        <PolicyUploadHistoryTable history={historyQuery.data ?? []} loading={historyQuery.isLoading} />
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <PolicyInformationCard status={statusQuery.data} loading={statusQuery.isLoading} />
        <PolicyNextStepsCard />
      </aside>
    </div>
  );
}
