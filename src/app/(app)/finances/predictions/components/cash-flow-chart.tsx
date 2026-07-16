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
  echarts,
  useChartColors,
  type EChartsOption,
} from "@/components/ui/echart";
import { formatCurrency } from "@/lib/utils";
import { useCashFlow } from "@/hooks/use-projection";

const COLOR_REF = "hsl(var(--chart-1))";

function CashFlowTooltip({
  label,
  totalBalance,
}: {
  label: string;
  totalBalance: number;
}) {
  return (
    <div className="bg-background rounded-lg border p-3 shadow-sm">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-muted-foreground text-sm">
        {formatCurrency(totalBalance)}
      </p>
    </div>
  );
}

export function CashFlowChart() {
  const { data, isLoading } = useCashFlow(6);
  const colors = useChartColors([COLOR_REF]);
  const seriesColor = colors[COLOR_REF] || "#3b82f6";

  const option = useMemo<EChartsOption>(() => {
    const rows = (data ?? []).map((m) => ({
      label: m.label,
      totalBalance: m.totalBalance,
    }));

    return {
      grid: { left: 56, right: 16, top: 16, bottom: 32, containLabel: false },
      xAxis: {
        type: "category",
        data: rows.map((r) => r.label),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "var(--muted-foreground)" },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: "rgba(127,127,127,0.15)" } },
        axisLabel: {
          color: "var(--muted-foreground)",
          formatter: (v: number) => formatCurrency(v),
        },
      },
      tooltip: { trigger: "axis" },
      series: [
        {
          name: "totalBalance",
          type: "line",
          smooth: true,
          showSymbol: false,
          data: rows.map((r) => r.totalBalance),
          lineStyle: { color: seriesColor, width: 2 },
          itemStyle: { color: seriesColor },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: withAlpha(seriesColor, 0.8) },
              { offset: 1, color: withAlpha(seriesColor, 0.1) },
            ]),
          },
        },
      ],
    };
  }, [data, seriesColor]);

  const renderTooltip = (
    params: { axisValueLabel?: string; value: number | number[] | string | null }[],
  ) => {
    const p = params[0];
    if (!p) return null;
    const value =
      typeof p.value === "number"
        ? p.value
        : Array.isArray(p.value)
          ? Number(p.value[1])
          : Number(p.value ?? 0);
    return (
      <CashFlowTooltip label={p.axisValueLabel ?? ""} totalBalance={value} />
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Projection</CardTitle>
          <CardDescription>
            Add recurring transactions to see projections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex h-[300px] items-center justify-center text-sm">
            No projection data available yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow Projection</CardTitle>
        <CardDescription>
          Projected total balance over the next 6 months
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EChart
          option={option}
          tooltip={renderTooltip}
          className="h-[300px]"
        />
      </CardContent>
    </Card>
  );
}

function withAlpha(color: string, alpha: number): string {
  // rgb(r,g,b) -> rgba(r,g,b,a)
  const m = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (m) return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
  // already rgba or any other color string: return as-is (acceptable for canvas)
  return color;
}
