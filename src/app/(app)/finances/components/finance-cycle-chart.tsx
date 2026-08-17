"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import {
  EChart,
  type EChartTooltipParam,
  type EChartsOption,
  useChartColors,
} from "@/components/ui/echart";
import type {
  FinanceCurrency,
  FinanceProjectionPoint,
} from "@/lib/finance-cycle";
import { formatCurrency } from "@/lib/utils";

type FinanceCycleChartProps = {
  points: FinanceProjectionPoint[];
  currency: FinanceCurrency;
  emergencyFloor: number;
};

function expenseValue(value: number) {
  return value > 0 ? -value : 0;
}

export function FinanceCycleChart({
  points,
  currency,
  emergencyFloor,
}: FinanceCycleChartProps) {
  const colors = useChartColors(["var(--chart-1)", "var(--border)"]);
  const seriesColor = colors["var(--chart-1)"] ?? "#4f8067";
  const borderColor = colors["var(--border)"] ?? "#d4d4d4";

  const option = useMemo<EChartsOption>(
    () => ({
      animationDurationUpdate: 300,
      grid: { left: 74, right: 28, top: 28, bottom: 38 },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: points.map((point) => format(point.date, "MMM d")),
        axisLine: { lineStyle: { color: borderColor } },
        axisTick: { show: false },
        axisLabel: { color: "var(--muted-foreground)", hideOverlap: true },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: borderColor, opacity: 0.5 } },
        axisLabel: {
          color: "var(--muted-foreground)",
          formatter: (value: number) =>
            new Intl.NumberFormat(undefined, {
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(value),
        },
      },
      series: [
        {
          name: "Cash before goals",
          type: "line",
          data: points.map((point) => point.balance),
          smooth: points.length > 2,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 2, color: seriesColor, type: "dashed" },
          itemStyle: { color: seriesColor },
        },
        {
          name: "Cash after funded goals",
          type: "line",
          data: points.map((point) => point.cashAfterGoals),
          smooth: points.length > 2,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 3, color: seriesColor },
          itemStyle: { color: seriesColor },
          areaStyle: { color: seriesColor, opacity: 0.12 },
          markLine: {
            symbol: ["none", "none"],
            silent: true,
            lineStyle: { color: borderColor, type: "dashed" },
            label: {
              formatter: "Emergency floor",
              color: "var(--muted-foreground)",
              position: "insideEndTop",
            },
            data: [{ yAxis: emergencyFloor }],
          },
        },
      ],
    }),
    [borderColor, emergencyFloor, points, seriesColor],
  );

  function amountClass(value: number) {
    if (value > 0) return "text-positive";
    if (value < 0) return "text-destructive";
    return "text-muted-foreground";
  }

  return (
    <EChart
      className="h-64"
      option={option}
      tooltip={(params: EChartTooltipParam[]) => {
        const point = points[params[0]?.dataIndex ?? 0];
        if (!point) return null;
        return (
          <div className="bg-popover text-popover-foreground w-72 rounded-lg border p-3 text-sm shadow-lg">
            <div className="font-semibold">
              {format(point.date, "MMM d, yyyy")}
            </div>
            <div className="mt-3 space-y-1.5 tabular-nums">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Opening cash</span>
                <span>{formatCurrency(point.openingBalance, currency)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Income to date</span>
                <span className="text-positive font-medium">
                  +{formatCurrency(point.income, currency)}
                </span>
              </div>
              <div className="border-border mt-2 border-t pt-2 text-xs font-medium uppercase tracking-wide">
                Expenses to date
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Household</span>
                <span className="text-destructive">
                  {formatCurrency(expenseValue(point.householdSpending), currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Flexible</span>
                <span className="text-destructive">
                  {formatCurrency(expenseValue(point.flexibleSpending), currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Debt payments</span>
                <span className="text-destructive">
                  {formatCurrency(expenseValue(point.debtPayments), currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 font-medium">
                <span>Total expenses</span>
                <span className="text-destructive">
                  {formatCurrency(expenseValue(point.totalExpenses), currency)}
                </span>
              </div>
              <div className="border-border mt-2 flex items-center justify-between gap-4 border-t pt-2">
                <span className="text-muted-foreground">Net change</span>
                <span className={amountClass(point.netChange)}>
                  {point.netChange > 0 ? "+" : ""}
                  {formatCurrency(point.netChange, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-base font-semibold">
                <span>Cash before goals</span>
                <span>{formatCurrency(point.balance, currency)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Funded goals</span>
                <span className="text-destructive">
                  {formatCurrency(expenseValue(point.goalPurchases), currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-base font-semibold">
                <span>Cash after goals</span>
                <span>{formatCurrency(point.cashAfterGoals, currency)}</span>
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}
