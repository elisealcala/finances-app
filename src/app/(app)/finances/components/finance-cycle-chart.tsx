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
          name: "Projected cash",
          type: "line",
          data: points.map((point) => point.balance),
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

  return (
    <EChart
      className="h-64"
      option={option}
      tooltip={(params: EChartTooltipParam[]) => {
        const point = points[params[0]?.dataIndex ?? 0];
        if (!point) return null;
        return (
          <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-sm shadow-lg">
            <div className="font-medium">{format(point.date, "MMM d, yyyy")}</div>
            <div className="text-muted-foreground mt-1">
              {formatCurrency(point.balance, currency)} projected cash
            </div>
          </div>
        );
      }}
    />
  );
}
