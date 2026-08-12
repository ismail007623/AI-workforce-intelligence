"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { PolicyPageContent } from "@/components/hr/policy/PolicyPageContent";

export default function PolicyPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Policy"
        description="Upload and manage the company policy document for AI-powered reference."
      />
      <PolicyPageContent />
    </div>
  );
}
