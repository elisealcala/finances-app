"use client";

import { AlertBanner } from "./alert-banner";
import { PreventionInsights } from "./prevention-insights";
import { AvailableBalanceCard } from "./available-balance-card";
import { CashFlowChart } from "./cash-flow-chart";
import { UpcomingObligations } from "./upcoming-obligations";

export function PredictionPageClient() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Predictions</h2>
        <p className="text-muted-foreground">
          Financial projections and spending prevention.
        </p>
      </div>

      <AlertBanner />

      <div className="grid gap-4 md:grid-cols-2">
        <PreventionInsights />
        <AvailableBalanceCard />
      </div>

      <CashFlowChart />

      <UpcomingObligations />
    </div>
  );
}
