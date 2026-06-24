"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { PolicyUploadCard } from "@/components/hr/PolicyUploadCard";

export default function PolicyPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Policy"
        description="Upload and manage the company policy document for AI-powered reference."
      />
      <PolicyUploadCard />
    </div>
  );
}
