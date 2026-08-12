"use client";

import { Brain, RefreshCw, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ITEMS = [
  {
    icon: Search,
    title: "AI search indexing",
    description: "Your policy is chunked and embedded for semantic search in the AI assistant.",
  },
  {
    icon: Brain,
    title: "Employee Q&A",
    description: "HR and employees can ask attendance policy questions via AI Insights.",
  },
  {
    icon: RefreshCw,
    title: "Single active policy",
    description: "Each new upload replaces the previous document in the vector index.",
  },
];

export function PolicyNextStepsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>What happens next?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {ITEMS.map((item) => (
          <div key={item.title} className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-xlight)]">
              <item.icon className="h-4 w-4 text-[var(--color-policy-accent)]" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">{item.title}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-text-muted)]">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
