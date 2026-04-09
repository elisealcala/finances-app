"use client";

import { usePeriodFilter } from "../../hooks/use-period-filter";
import { useBudgetStatus } from "@/hooks/use-categories";
import { PeriodSelector } from "../../components/period-selector";
import { BudgetOverview } from "./budget-overview";

export function BudgetPageClient() {
  const period = usePeriodFilter();
  const { data, isLoading } = useBudgetStatus(period.year, period.month);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Budget</h2>
          <p className="text-muted-foreground">
            Track spending against category budgets.
          </p>
        </div>
        <PeriodSelector {...period} />
      </div>

      <BudgetOverview budgets={data} isLoading={isLoading} />
    </div>
  );
}
