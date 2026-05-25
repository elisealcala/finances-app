"use client";

import { useMemo } from "react";
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
  type EChartTooltipParam,
  type EChartsOption,
} from "@/components/ui/echart";
import { MONTHS, formatCurrency } from "@/lib/utils";
import type { MonthlySummaryItem } from "@/types/finances";

const INCOME_COLOR = "#16a34a";
const EXPENSES_COLOR = "#dc2626";
const SAVINGS_COLOR = "#2563eb";

type MonthlyOverviewChartProps = {
  data?: MonthlySummaryItem[];
  isLoading?: boolean;
  year: number;
  currentMonth?: number;
  currency?: "PEN" | "USD" | "EUR";
};

function MonthlyTooltip({
  params,
  data,
  year,
  currency,
}: {
  params: EChartTooltipParam[];
  data: MonthlySummaryItem[];
  year: number;
  currency: "PEN" | "USD" | "EUR";
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
  isLoading,
  year,
  currentMonth,
  currency = "PEN",
}: MonthlyOverviewChartProps) {
  const totals = useMemo(() => {
    const rows = data ?? [];
    const totalIncome = rows.reduce((s, r) => s + r.income, 0);
    const totalExpenses = rows.reduce((s, r) => s + r.expenses, 0);
    const totalSavings = totalIncome - totalExpenses;
    const active = rows.filter((r) => r.income > 0 || r.expenses > 0).length;
    const avgSavings = active > 0 ? totalSavings / active : 0;
    return { totalIncome, totalExpenses, totalSavings, avgSavings, active };
  }, [data]);

  const option = useMemo<EChartsOption>(() => {
    const rows = data ?? [];
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
                formatter: "Selected",
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
            const symbol =
              currency === "USD" ? "$" : currency === "EUR" ? "€" : "S/.";
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
  }, [data, currentMonth, currency]);

  const renderTooltip = (params: EChartTooltipParam[]) => (
    <MonthlyTooltip
      params={params}
      data={data ?? []}
      year={year}
      currency={currency}
    />
  );

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Overview</CardTitle>
          <CardDescription>
            Income, expenses, and savings by month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Overview</CardTitle>
        <CardDescription>
          Income, expenses, and savings across {year}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EChart
          option={option}
          tooltip={renderTooltip}
          className="h-[500px]"
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
