"use client";

import { usePeriodFilter } from "../hooks/use-period-filter";
import { usePeriodSummary, useMonthlySummary } from "../hooks/use-overview";
import { PeriodSelector } from "./period-selector";
import { FinancesSummaryCards } from "./finances-summary-cards";
import { MonthlyOverviewChart } from "./monthly-overview-chart";
import { CategoryBreakdownChart } from "./category-breakdown-chart";

export function FinancesPageClient() {
  const period = usePeriodFilter();
  const { data: periodData } = usePeriodSummary(period.year, period.month);
  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlySummary(
    period.year,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Finances Overview
          </h2>
          <p className="text-muted-foreground">
            Your financial summary at a glance.
          </p>
        </div>
        <PeriodSelector {...period} />
      </div>

      <FinancesSummaryCards summary={periodData} />

      <div className="grid gap-6 lg:grid-cols-2">
        <MonthlyOverviewChart
          data={monthlyData?.months}
          isLoading={monthlyLoading}
        />
        <CategoryBreakdownChart data={periodData?.topCategories} />
      </div>
    </div>
  );
}
