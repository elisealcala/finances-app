"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { MONTHS } from "@/lib/utils";
import { usePeriodFilter } from "../hooks/use-period-filter";
import { usePeriodSummary, useMonthlySummary } from "@/hooks/use-overview";
import { useDebts } from "@/hooks/use-debts";
import { PeriodSelector } from "./period-selector";
import { FinancesSummaryCards } from "./finances-summary-cards";
import { MonthlyOverviewChart } from "./monthly-overview-chart";
import { CategoryBreakdownChart } from "../categories/components/category-breakdown-chart";
import { DebtMonthPaymentTable } from "../debt/components/debt-month-payment-table";
import { generateTimeline } from "@/server/trpc/services/debt/amortization";

type Currency = "PEN" | "USD" | "EUR";

const CURRENCIES = ["PEN", "USD", "EUR"] as const satisfies readonly Currency[];

export function FinancesPageClient() {
  const period = usePeriodFilter();
  const [chartCurrency, setChartCurrency] = useState<Currency>("PEN");
  const [chartYear, setChartYear] = useState(period.year);
  const [categoryDrilldown, setCategoryDrilldown] = useState<{
    year: number;
    month: number;
  } | null>(null);

  const { data: penPeriodData, isLoading: penPeriodLoading } =
    usePeriodSummary(period.year, period.month, "PEN");
  const { data: usdPeriodData, isLoading: usdPeriodLoading } =
    usePeriodSummary(period.year, period.month, "USD");
  const { data: eurPeriodData, isLoading: eurPeriodLoading } =
    usePeriodSummary(period.year, period.month, "EUR");

  const { data: penMonthlyData, isLoading: penMonthlyLoading } =
    useMonthlySummary(chartYear, "PEN");
  const { data: usdMonthlyData, isLoading: usdMonthlyLoading } =
    useMonthlySummary(chartYear, "USD");
  const { data: eurMonthlyData, isLoading: eurMonthlyLoading } =
    useMonthlySummary(chartYear, "EUR");

  const categoryYear = categoryDrilldown?.year ?? period.year;
  const categoryMonth = categoryDrilldown?.month ?? period.month;

  const { data: penCategoryData, isLoading: penCategoryLoading } =
    usePeriodSummary(categoryYear, categoryMonth, "PEN");
  const { data: usdCategoryData, isLoading: usdCategoryLoading } =
    usePeriodSummary(categoryYear, categoryMonth, "USD");
  const { data: eurCategoryData, isLoading: eurCategoryLoading } =
    usePeriodSummary(categoryYear, categoryMonth, "EUR");
  const { data: debtData } = useDebts();

  const summaries = useMemo(
    () => [
      { currency: CURRENCIES[0], summary: penPeriodData },
      { currency: CURRENCIES[1], summary: usdPeriodData },
      { currency: CURRENCIES[2], summary: eurPeriodData },
    ],
    [eurPeriodData, penPeriodData, usdPeriodData],
  );

  const categoryGroups = useMemo(
    () => [
      { currency: CURRENCIES[0], data: penCategoryData?.topCategories },
      { currency: CURRENCIES[1], data: usdCategoryData?.topCategories },
      { currency: CURRENCIES[2], data: eurCategoryData?.topCategories },
    ],
    [eurCategoryData, penCategoryData, usdCategoryData],
  );

  const activeDebts = useMemo(
    () =>
      (debtData?.debts ?? []).filter(
        (debt) => debt.type !== "CREDIT_CARD" && debt.status === "ACTIVE",
      ),
    [debtData],
  );

  const { rows: debtTimelineRows } = useMemo(
    () => generateTimeline(activeDebts),
    [activeDebts],
  );

  const debtMonthLabel = useMemo(() => {
    const fallbackMonth = new Date().getMonth() + 1;
    const month = period.month ?? fallbackMonth;
    return format(new Date(period.year, month - 1, 1), "MMM yyyy");
  }, [period.month, period.year]);

  const monthlyData =
    chartCurrency === "USD"
      ? usdMonthlyData
      : chartCurrency === "EUR"
        ? eurMonthlyData
        : penMonthlyData;
  const monthlyLoading =
    chartCurrency === "USD"
      ? usdMonthlyLoading || penMonthlyLoading
      : chartCurrency === "EUR"
        ? eurMonthlyLoading
        : penMonthlyLoading || usdMonthlyLoading;
  const conversionCurrency =
    chartCurrency === "USD"
      ? "PEN"
      : chartCurrency === "PEN"
        ? "USD"
        : undefined;
  const conversionMonthlyData =
    conversionCurrency === "PEN"
      ? penMonthlyData
      : conversionCurrency === "USD"
        ? usdMonthlyData
        : undefined;
  const selectedChartMonth =
    categoryDrilldown?.year === chartYear
      ? categoryDrilldown.month
      : period.year === chartYear
        ? period.month
        : undefined;
  const selectedMarkerLabel =
    categoryDrilldown?.year === chartYear ? "Category" : "Selected";
  const categoryPeriodLabel = categoryMonth
    ? `${MONTHS[categoryMonth - 1]} ${categoryYear}`
    : String(categoryYear);

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
        <PeriodSelector {...period} />
      </div>

      <FinancesSummaryCards
        summaries={summaries}
        isLoading={penPeriodLoading || usdPeriodLoading || eurPeriodLoading}
      />

      <DebtMonthPaymentTable
        debts={activeDebts}
        rows={debtTimelineRows}
        focusedMonthLabel={debtMonthLabel}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <MonthlyOverviewChart
          data={monthlyData?.months}
          conversionData={conversionMonthlyData?.months}
          conversionCurrency={conversionCurrency}
          isLoading={monthlyLoading}
          year={chartYear}
          currentMonth={selectedChartMonth}
          selectedMarkerLabel={selectedMarkerLabel}
          currency={chartCurrency}
          onCurrencyChange={setChartCurrency}
          onYearChange={setChartYear}
          onMonthSelect={(month) => {
            setCategoryDrilldown({ year: chartYear, month });
          }}
        />
        <CategoryBreakdownChart
          groups={categoryGroups}
          isLoading={
            penCategoryLoading || usdCategoryLoading || eurCategoryLoading
          }
          periodLabel={categoryPeriodLabel}
          onResetPeriod={
            categoryDrilldown ? () => setCategoryDrilldown(null) : undefined
          }
        />
      </div>
    </div>
  );
}
