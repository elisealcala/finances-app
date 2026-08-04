"use client";

import { RecurringList } from "./recurring-list";
import { PageShell } from "@/components/page";

export function RecurringPageClient() {
  return (
    <PageShell>
      <RecurringList />
    </PageShell>
  );
}
