"use client";

import { AlertBanner } from "./alert-banner";
import { PreventionInsights } from "./prevention-insights";
import { AvailableBalanceCard } from "./available-balance-card";
import { CashFlowChart } from "./cash-flow-chart";
import { UpcomingObligations } from "./upcoming-obligations";
import { PageHeader, PageShell } from "@/components/page";

export function PredictionPageClient() {
  return (
    <PageShell>
      <PageHeader
        title="Predictions"
        description="Financial projections, upcoming obligations, and spending guidance."
      />

      <AlertBanner />

      <div className="grid gap-4 md:grid-cols-2">
        <PreventionInsights />
        <AvailableBalanceCard />
      </div>

      <CashFlowChart />

      <UpcomingObligations />
    </PageShell>
  );
}
