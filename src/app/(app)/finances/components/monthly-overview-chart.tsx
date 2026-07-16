"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EChart,
  type EChartClickParam,
  type EChartTooltipParam,
  type EChartsOption,
} from "@/components/ui/echart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CURRENCY_LABELS, MONTHS, formatCurrency } from "@/lib/utils";
import type { MonthlySummaryItem } from "@/types/finances";

const INCOME_COLOR = "#16a34a";
const EXPENSES_COLOR = "#dc2626";
const SAVINGS_COLOR = "#2563eb";
const DEFAULT_PEN_PER_USD = "3.70";

type Currency = "PEN" | "USD" | "EUR";

type MonthlyOverviewRow = MonthlySummaryItem & {
  primary: {
    currency: Currency;
    income: number;
    expenses: number;
  };
  converted?: {
    currency: Currency;
    income: number;
    expenses: number;
    convertedIncome: number;
    convertedExpenses: number;
  };
};

type MonthlyOverviewChartProps = {
  data?: MonthlySummaryItem[];
  conversionData?: MonthlySummaryItem[];
  conversionCurrency?: Currency;
  isLoading?: boolean;
  year: number;
  currentMonth?: number;
  currency?: Currency;
  selectedMarkerLabel?: string;
  onCurrencyChange?: (currency: Currency) => void;
  onYearChange?: (year: number) => void;
  onMonthSelect?: (month: number) => void;
};

function isPenUsdPair(fromCurrency?: Currency, toCurrency?: Currency) {
  return (
    (fromCurrency === "PEN" && toCurrency === "USD") ||
    (fromCurrency === "USD" && toCurrency === "PEN")
  );
}

function convertPenUsd(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  penPerUsd: number,
) {
  if (fromCurrency === toCurrency) return amount;
  if (fromCurrency === "PEN" && toCurrency === "USD") {
    return amount / penPerUsd;
  }
  if (fromCurrency === "USD" && toCurrency === "PEN") {
    return amount * penPerUsd;
  }
  return amount;
}

function chartCurrencySymbol(currency: Currency) {
  if (currency === "USD") return "$";
  if (currency === "EUR") return "€";
  return "S/.";
}

function MonthlyTooltip({
  params,
  data,
  year,
  currency,
}: {
  params: EChartTooltipParam[];
  data: MonthlyOverviewRow[];
  year: number;
  currency: Currency;
}) {
  const idx = params[0]?.dataIndex ?? 0;
  const row = data[idx];
  if (!row) return null;

  const savingsRate = row.income > 0 ? (row.savings / row.income) * 100 : 0;
  const ytdIncome = data
    .slice(0, idx + 1)
    .reduce((s, r) => s + r.income, 0);
  const ytdExpenses = data
    .slice(0, idx + 1)
    .reduce((s, r) => s + r.expenses, 0);
  const ytdSavings = ytdIncome - ytdExpenses;

  return (
    <div className="border-border/50 bg-background min-w-[260px] rounded-lg border px-4 py-3 text-sm shadow-xl">
      <div className="mb-2 text-base font-semibold">
        {MONTHS[row.month - 1]} {year}
      </div>
      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <td className="text-muted-foreground pr-6">Income</td>
            <td
              className="text-right font-mono font-medium tabular-nums"
              style={{ color: INCOME_COLOR }}
            >
              {formatCurrency(row.income, currency)}
            </td>
          </tr>
          <tr>
            <td className="text-muted-foreground pr-6">Expenses</td>
            <td
              className="text-right font-mono font-medium tabular-nums"
              style={{ color: EXPENSES_COLOR }}
            >
              {formatCurrency(row.expenses, currency)}
            </td>
          </tr>
          <tr className="border-border border-t">
            <td className="text-muted-foreground pt-1 pr-6">Savings</td>
            <td
              className="pt-1 text-right font-mono font-semibold tabular-nums"
              style={{
                color: row.savings >= 0 ? INCOME_COLOR : EXPENSES_COLOR,
              }}
            >
              {formatCurrency(row.savings, currency)}
            </td>
          </tr>
          <tr>
            <td className="text-muted-foreground pr-6">Savings rate</td>
            <td className="text-right font-mono font-medium tabular-nums">
              {savingsRate.toFixed(1)}%
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="border-border border-t text-xs">
            <td className="text-muted-foreground pt-2 pr-6">YTD savings</td>
            <td
              className="pt-2 text-right font-mono font-medium tabular-nums"
              style={{
                color: ytdSavings >= 0 ? INCOME_COLOR : EXPENSES_COLOR,
              }}
            >
              {formatCurrency(ytdSavings, currency)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function MonthlyOverviewChart({
  data,
  conversionData,
  conversionCurrency,
  isLoading,
  year,
  currentMonth,
  currency = "PEN",
  selectedMarkerLabel = "Selected",
  onCurrencyChange,
  onYearChange,
  onMonthSelect,
}: MonthlyOverviewChartProps) {
  const [penPerUsd, setPenPerUsd] = useState(DEFAULT_PEN_PER_USD);
  const parsedPenPerUsd = parseFloat(penPerUsd);
  const hasValidRate = Number.isFinite(parsedPenPerUsd) && parsedPenPerUsd > 0;

  const displayRows = useMemo<MonthlyOverviewRow[]>(() => {
    const rows = data ?? [];
    const conversionRows = new Map(
      (conversionData ?? []).map((row) => [row.month, row]),
    );
    const hasConversionSource =
      !!conversionCurrency && isPenUsdPair(conversionCurrency, currency);
    const canConvert = hasConversionSource && hasValidRate;

    return rows.map((row) => {
      const conversionRow = hasConversionSource
        ? conversionRows.get(row.month)
        : undefined;
      const convertedIncome =
        conversionRow && conversionCurrency && canConvert
          ? convertPenUsd(
              conversionRow.income,
              conversionCurrency,
              currency,
              parsedPenPerUsd,
            )
          : 0;
      const convertedExpenses =
        conversionRow && conversionCurrency && canConvert
          ? convertPenUsd(
              conversionRow.expenses,
              conversionCurrency,
              currency,
              parsedPenPerUsd,
            )
          : 0;
      const income = row.income + convertedIncome;
      const expenses = row.expenses + convertedExpenses;

      return {
        month: row.month,
        income,
        expenses,
        savings: income - expenses,
        primary: {
          currency,
          income: row.income,
          expenses: row.expenses,
        },
        converted:
          conversionRow && conversionCurrency
            ? {
                currency: conversionCurrency,
                income: conversionRow.income,
                expenses: conversionRow.expenses,
                convertedIncome,
                convertedExpenses,
              }
            : undefined,
      };
    });
  }, [
    conversionCurrency,
    conversionData,
    currency,
    data,
    hasValidRate,
    parsedPenPerUsd,
  ]);

  const totals = useMemo(() => {
    const rows = displayRows;
    const totalIncome = rows.reduce((s, r) => s + r.income, 0);
    const totalExpenses = rows.reduce((s, r) => s + r.expenses, 0);
    const totalSavings = totalIncome - totalExpenses;
    const active = rows.filter((r) => r.income > 0 || r.expenses > 0).length;
    const avgSavings = active > 0 ? totalSavings / active : 0;
    return { totalIncome, totalExpenses, totalSavings, avgSavings, active };
  }, [displayRows]);

  const option = useMemo<EChartsOption>(() => {
    const rows = displayRows;
    const xLabels = rows.map((r) => MONTHS[r.month - 1].substring(0, 3));

    const series: EChartsOption["series"] = [
      {
        name: "Income",
        type: "bar",
        data: rows.map((r) => r.income),
        itemStyle: { color: INCOME_COLOR, borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 28,
      },
      {
        name: "Expenses",
        type: "bar",
        data: rows.map((r) => r.expenses),
        itemStyle: { color: EXPENSES_COLOR, borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 28,
      },
      {
        name: "Savings",
        type: "line",
        data: rows.map((r) => r.savings),
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { color: SAVINGS_COLOR, width: 2 },
        itemStyle: { color: SAVINGS_COLOR },
        z: 3,
      },
    ];

    if (
      currentMonth &&
      currentMonth >= 1 &&
      currentMonth <= 12 &&
      series[0]
    ) {
      const label = MONTHS[currentMonth - 1].substring(0, 3);
      if (xLabels.includes(label)) {
        (series[0] as Record<string, unknown>).markLine = {
          symbol: ["none", "none"],
          silent: true,
          data: [
            {
              xAxis: label,
              lineStyle: {
                color: "#94a3b8",
                type: "dashed",
                width: 1.5,
              },
              label: {
                show: true,
                position: "insideEndTop",
                formatter: selectedMarkerLabel,
                fontSize: 10,
                color: "#94a3b8",
                fontWeight: 600,
              },
            },
          ],
        };
      }
    }

    return {
      grid: { left: 72, right: 24, top: 24, bottom: 56 },
      legend: {
        bottom: 0,
        textStyle: { color: "var(--foreground)" },
        icon: "roundRect",
      },
      xAxis: {
        type: "category",
        data: xLabels,
        axisLine: { lineStyle: { color: "rgba(127,127,127,0.3)" } },
        axisTick: { show: false },
        axisLabel: { color: "var(--muted-foreground)" },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: { color: "rgba(127,127,127,0.15)", type: "dashed" },
        },
        axisLabel: {
          color: "var(--muted-foreground)",
          formatter: (v: number) => {
            const symbol = chartCurrencySymbol(currency);
            return v >= 1000
              ? `${symbol}${new Intl.NumberFormat("en", {
                  maximumFractionDigits: 1,
                }).format(v / 1000)}k`
              : `${symbol}${v}`;
          },
        },
      },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      series,
    };
  }, [currentMonth, currency, displayRows, selectedMarkerLabel]);

  const renderTooltip = (params: EChartTooltipParam[]) => (
    <MonthlyTooltip
      params={params}
      data={displayRows}
      year={year}
      currency={currency}
    />
  );

  const handleChartClick = (params: EChartClickParam) => {
    if (typeof params.dataIndex !== "number") return;
    const row = displayRows[params.dataIndex];
    if (!row) return;
    onMonthSelect?.(row.month);
  };

  if (isLoading || !data) {
    return (
      <Card>
        <MonthlyOverviewHeader
          year={year}
          currency={currency}
          onCurrencyChange={onCurrencyChange}
          onYearChange={onYearChange}
          description="Income, expenses, and savings by month"
        />
        <CardContent>
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <MonthlyOverviewHeader
        year={year}
        currency={currency}
        onCurrencyChange={onCurrencyChange}
        onYearChange={onYearChange}
        description={`Income, expenses, and savings across ${year} in ${currency}`}
      />
      <CardContent>
        <EChart
          option={option}
          tooltip={renderTooltip}
          onClick={handleChartClick}
          className="h-[500px]"
        />
        <ConversionSummary
          rows={displayRows}
          currency={currency}
          conversionCurrency={conversionCurrency}
          penPerUsd={penPerUsd}
          onPenPerUsdChange={setPenPerUsd}
          rateIsValid={hasValidRate}
        />
        <div className="border-border mt-6 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-4">
          <Stat
            label="Year income"
            value={formatCurrency(totals.totalIncome, currency)}
            color={INCOME_COLOR}
          />
          <Stat
            label="Year expenses"
            value={formatCurrency(totals.totalExpenses, currency)}
            color={EXPENSES_COLOR}
          />
          <Stat
            label="Year savings"
            value={formatCurrency(totals.totalSavings, currency)}
            color={totals.totalSavings >= 0 ? INCOME_COLOR : EXPENSES_COLOR}
          />
          <Stat
            label={`Avg / month (${totals.active})`}
            value={formatCurrency(totals.avgSavings, currency)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function MonthlyOverviewHeader({
  year,
  currency,
  description,
  onCurrencyChange,
  onYearChange,
}: {
  year: number;
  currency: Currency;
  description: string;
  onCurrencyChange?: (currency: Currency) => void;
  onYearChange?: (year: number) => void;
}) {
  return (
    <CardHeader>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Monthly Overview</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onYearChange?.(year - 1)}
            aria-label="Previous chart year"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="border-input bg-background flex h-10 min-w-20 items-center justify-center rounded-md border px-3 text-sm font-medium">
            {year}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onYearChange?.(year + 1)}
            aria-label="Next chart year"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Select
            value={currency}
            onValueChange={(value) => onCurrencyChange?.(value as Currency)}
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
        </div>
      </div>
    </CardHeader>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div
        className="font-mono text-base font-semibold tabular-nums"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function ConversionSummary({
  rows,
  currency,
  conversionCurrency,
  penPerUsd,
  onPenPerUsdChange,
  rateIsValid,
}: {
  rows: MonthlyOverviewRow[];
  currency: Currency;
  conversionCurrency?: Currency;
  penPerUsd: string;
  onPenPerUsdChange: (value: string) => void;
  rateIsValid: boolean;
}) {
  if (!conversionCurrency || !isPenUsdPair(conversionCurrency, currency)) {
    return null;
  }

  const primaryIncome = rows.reduce((sum, row) => sum + row.primary.income, 0);
  const primaryExpenses = rows.reduce(
    (sum, row) => sum + row.primary.expenses,
    0,
  );
  const sourceIncome = rows.reduce(
    (sum, row) => sum + (row.converted?.income ?? 0),
    0,
  );
  const sourceExpenses = rows.reduce(
    (sum, row) => sum + (row.converted?.expenses ?? 0),
    0,
  );
  const convertedIncome = rows.reduce(
    (sum, row) => sum + (row.converted?.convertedIncome ?? 0),
    0,
  );
  const convertedExpenses = rows.reduce(
    (sum, row) => sum + (row.converted?.convertedExpenses ?? 0),
    0,
  );

  return (
    <div className="border-border mt-6 grid gap-4 border-t pt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Conversion</div>
          <div className="text-muted-foreground text-xs">
            {conversionCurrency} to {currency}
          </div>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="monthly-conversion-rate" className="text-xs">
            Rate
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              1 USD =
            </span>
            <Input
              id="monthly-conversion-rate"
              type="number"
              step="0.0001"
              min="0"
              value={penPerUsd}
              onChange={(event) => onPenPerUsdChange(event.target.value)}
              className="h-8 w-28"
            />
            <span className="text-muted-foreground text-xs">PEN</span>
          </div>
          {!rateIsValid && (
            <div className="text-destructive text-xs">
              Enter a rate greater than 0.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <ConversionStat
          label={`Native ${currency}`}
          income={primaryIncome}
          expenses={primaryExpenses}
          currency={currency}
        />
        <ConversionStat
          label={`Raw ${conversionCurrency}`}
          income={sourceIncome}
          expenses={sourceExpenses}
          currency={conversionCurrency}
        />
        <ConversionStat
          label={`${conversionCurrency} converted`}
          income={convertedIncome}
          expenses={convertedExpenses}
          currency={currency}
        />
      </div>
    </div>
  );
}

function ConversionStat({
  label,
  income,
  expenses,
  currency,
}: {
  label: string;
  income: number;
  expenses: number;
  currency: Currency;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="grid gap-1 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Income</span>
          <span
            className="font-mono font-medium tabular-nums"
            style={{ color: INCOME_COLOR }}
          >
            {formatCurrency(income, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Expenses</span>
          <span
            className="font-mono font-medium tabular-nums"
            style={{ color: EXPENSES_COLOR }}
          >
            {formatCurrency(expenses, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
