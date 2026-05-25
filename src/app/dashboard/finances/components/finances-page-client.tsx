"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCY_LABELS } from "@/lib/utils";
import { usePeriodFilter } from "../hooks/use-period-filter";
import { usePeriodSummary, useMonthlySummary } from "@/hooks/use-overview";
import { PeriodSelector } from "./period-selector";
import { FinancesSummaryCards } from "./finances-summary-cards";
import { MonthlyOverviewChart } from "./monthly-overview-chart";
import { CategoryBreakdownChart } from "../categories/components/category-breakdown-chart";

type Currency = "PEN" | "USD" | "EUR";

export function FinancesPageClient() {
  const period = usePeriodFilter();
  const [currency, setCurrency] = useState<Currency>("PEN");
  const { data: periodData } = usePeriodSummary(
    period.year,
    period.month,
    currency,
  );
  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlySummary(
    period.year,
    currency,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Finances Overview
          </h2>
          <p className="text-muted-foreground">
            Your financial summary at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={currency}
            onValueChange={(v) => setCurrency(v as Currency)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CURRENCY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PeriodSelector {...period} />
        </div>
      </div>

      <FinancesSummaryCards summary={periodData} currency={currency} />

      <div className="grid gap-6 lg:grid-cols-2">
        <MonthlyOverviewChart
          data={monthlyData?.months}
          isLoading={monthlyLoading}
          year={period.year}
          currentMonth={period.month}
          currency={currency}
        />
        <CategoryBreakdownChart
          data={periodData?.topCategories}
          currency={currency}
        />
      </div>
    </div>
  );
}
