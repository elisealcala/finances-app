"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EChart,
  useChartColors,
  type EChartTooltipParam,
  type EChartsOption,
} from "@/components/ui/echart";
import { format, addMonths } from "date-fns";
import {
  generateTimeline,
  type SimulationResult,
} from "@/server/trpc/services/debt/amortization";
import { formatCurrency } from "@/lib/utils";
import type { Debt } from "@/types/debt";

const CHART_TOKEN_REFS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--destructive))",
  "hsl(var(--primary))",
];

type TimePeriod = "all" | "this_year" | "next_3m" | "next_6m" | "next_12m" | "next_24m";

const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  all: "All Time",
  this_year: "This Year",
  next_3m: "Next 3 Months",
  next_6m: "Next 6 Months",
  next_12m: "Next 12 Months",
  next_24m: "Next 24 Months",
};

type AggregatedPayment = {
  monthLabel: string;
  totalAmount: number;
  payments: Array<{ debtName: string; amount: number }>;
};

type TimelineRow = Record<string, number | string>;

function DebtTimelineTooltip({
  params,
  rows,
  debts,
  paymentsByMonth,
}: {
  params: EChartTooltipParam[];
  rows: TimelineRow[];
  debts: Debt[];
  paymentsByMonth: Map<string, AggregatedPayment>;
}) {
  if (!params.length) return null;

  const debtMap = new Map(debts.map((d) => [d.id, d]));
  const dataIndex = params[0].dataIndex;
  const row = rows[dataIndex];
  const label = (row?.monthLabel as string | undefined) ?? params[0].name;
  const items = params.filter((p) => p.seriesName !== "simulation");

  const total = items.reduce(
    (sum, item) => sum + (Number(item.value) || 0),
    0,
  );
  const totalMonthly = items.reduce((sum, item) => {
    const monthly = row
      ? Number(row[`${item.seriesName}_monthly`]) || 0
      : 0;
    return sum + monthly;
  }, 0);

  const monthPayment = paymentsByMonth.get(label);

  return (
    <div className="border-border/60 bg-background w-[640px] max-w-[95vw] rounded-xl border p-4 text-xs shadow-2xl">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-base font-semibold">{label}</span>
        <span className="text-muted-foreground text-xs">
          {items.length} {items.length === 1 ? "debt" : "debts"}
        </span>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="text-muted-foreground border-border border-b text-[10px] uppercase tracking-wide">
            <th className="pb-2 text-left font-medium">Debt</th>
            <th className="pb-2 pl-2 text-right font-medium">Monthly</th>
            <th className="pb-2 pl-2 text-right font-medium">Rate</th>
            <th className="pb-2 pl-2 text-right font-medium">Balance</th>
            <th className="pb-2 pl-2 text-right font-medium">Share</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const debt = debtMap.get(item.seriesName ?? "");
            const balance = Number(item.value);
            const monthly = row
              ? Number(row[`${item.seriesName}_monthly`]) || 0
              : 0;
            const share = total > 0 ? (balance / total) * 100 : 0;
            return (
              <tr
                key={index}
                className="border-border/40 border-b last:border-0"
              >
                <td className="py-2 pr-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="text-foreground truncate text-sm font-medium leading-tight">
                        {debt?.name ?? item.seriesName}
                      </span>
                      {debt?.lender && (
                        <span className="text-muted-foreground truncate text-[11px] leading-tight">
                          {debt.lender}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-2 pl-2 text-right font-mono tabular-nums whitespace-nowrap">
                  {monthly > 0 ? formatCurrency(monthly) : "—"}
                </td>
                <td className="text-muted-foreground py-2 pl-2 text-right font-mono tabular-nums whitespace-nowrap">
                  {debt ? `${debt.interestRate.toFixed(2)}%` : "—"}
                </td>
                <td className="py-2 pl-2 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                  {formatCurrency(balance)}
                </td>
                <td className="text-muted-foreground py-2 pl-2 text-right font-mono tabular-nums whitespace-nowrap">
                  {share.toFixed(0)}%
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-border border-t-2 text-sm font-semibold">
            <td className="pt-2.5 pr-2">Total</td>
            <td className="pt-2.5 pl-2 text-right font-mono tabular-nums whitespace-nowrap">
              {formatCurrency(totalMonthly)}
            </td>
            <td className="pt-2.5 pl-2"></td>
            <td className="pt-2.5 pl-2 text-right font-mono tabular-nums whitespace-nowrap">
              {formatCurrency(total)}
            </td>
            <td className="pt-2.5 pl-2"></td>
          </tr>
        </tfoot>
      </table>

      {monthPayment && (
        <div className="border-border mt-3 border-t pt-3">
          <div className="text-primary mb-1.5 text-xs font-semibold">
            Capital payment this month
          </div>
          <div className="space-y-1">
            {monthPayment.payments.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="text-muted-foreground truncate">
                  {p.debtName}
                </span>
                <span className="text-primary font-mono font-semibold tabular-nums">
                  -{formatCurrency(p.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type DebtTimelineChartProps = {
  debts: Debt[];
  simulation?: SimulationResult | null;
  simulatedDebtName?: string;
};

export function DebtTimelineChart({
  debts,
  simulation,
  simulatedDebtName,
}: DebtTimelineChartProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("next_3m");

  const tokenColors = useChartColors(CHART_TOKEN_REFS);
  const fallbackColors = useMemo(
    () => [
      tokenColors["hsl(var(--chart-1))"] || "#3b82f6",
      tokenColors["hsl(var(--chart-2))"] || "#10b981",
      tokenColors["hsl(var(--chart-3))"] || "#f59e0b",
      tokenColors["hsl(var(--chart-4))"] || "#ef4444",
      tokenColors["hsl(var(--chart-5))"] || "#8b5cf6",
    ],
    [tokenColors],
  );
  const destructive = tokenColors["hsl(var(--destructive))"] || "#dc2626";
  const primary = tokenColors["hsl(var(--primary))"] || "#3b82f6";

  const { rows: timelineData, paymentMarkers } = useMemo(
    () => generateTimeline(debts),
    [debts],
  );

  const mergedData = useMemo(() => {
    if (!simulation) return timelineData;
    const simLookup = new Map(
      simulation.newProjection.map((p) => [p.monthLabel, p.balance]),
    );
    return timelineData.map((row) => ({
      ...row,
      simulation: simLookup.get(row.monthLabel) ?? 0,
    }));
  }, [timelineData, simulation]);

  const filteredData = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let startFilter: Date;
    let endFilter: Date | null = null;

    switch (timePeriod) {
      case "all":
        startFilter = new Date(-8640000000000000);
        break;
      case "this_year":
        startFilter = new Date(now.getFullYear(), 0, 1);
        endFilter = new Date(now.getFullYear(), 11, 31);
        break;
      case "next_3m":
        startFilter = currentMonthStart;
        endFilter = addMonths(now, 3);
        break;
      case "next_6m":
        startFilter = currentMonthStart;
        endFilter = addMonths(now, 6);
        break;
      case "next_12m":
        startFilter = currentMonthStart;
        endFilter = addMonths(now, 12);
        break;
      case "next_24m":
        startFilter = currentMonthStart;
        endFilter = addMonths(now, 24);
        break;
      default:
        startFilter = currentMonthStart;
    }

    return mergedData.filter((row) => {
      const d = new Date(row.date as string);
      if (d < startFilter) return false;
      if (endFilter && d > endFilter) return false;
      return true;
    });
  }, [mergedData, timePeriod]);

  const aggregatedPayments = useMemo(() => {
    const map = new Map<string, AggregatedPayment>();
    for (const m of paymentMarkers) {
      const existing = map.get(m.monthLabel);
      if (existing) {
        existing.totalAmount += m.amount;
        existing.payments.push({ debtName: m.debtName, amount: m.amount });
      } else {
        map.set(m.monthLabel, {
          monthLabel: m.monthLabel,
          totalAmount: m.amount,
          payments: [{ debtName: m.debtName, amount: m.amount }],
        });
      }
    }
    return map;
  }, [paymentMarkers]);

  const payoffMarkers = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const futureRows = mergedData.filter(
      (row) => new Date(row.date as string) >= currentMonthStart,
    );

    const markers: Array<{
      monthLabel: string;
      debtName: string;
      color: string;
      inView: boolean;
    }> = [];
    const filteredLabels = new Set(filteredData.map((r) => r.monthLabel));

    for (let i = 0; i < debts.length; i++) {
      const debt = debts[i];
      if (debt.status === "PAID_OFF") continue;
      const color = debt.color ?? fallbackColors[i % fallbackColors.length];
      let hasStarted = false;
      for (const row of futureRows) {
        const bal = Number((row as Record<string, unknown>)[debt.id]) || 0;
        if (!hasStarted) {
          if (bal > 0) hasStarted = true;
          continue;
        }
        if (bal <= 0) {
          const label = row.monthLabel as string;
          markers.push({
            monthLabel: label,
            debtName: debt.name,
            color,
            inView: filteredLabels.has(label),
          });
          break;
        }
      }
    }
    return markers;
  }, [debts, mergedData, filteredData, fallbackColors]);

  const todayLabel = useMemo(() => format(new Date(), "MMM yyyy"), []);

  const option = useMemo<EChartsOption>(() => {
    const xLabels = filteredData.map((r) => r.monthLabel as string);

    const debtSeries = debts.map((debt, i) => {
      const color = debt.color ?? fallbackColors[i % fallbackColors.length];
      return {
        name: debt.id,
        type: "line" as const,
        stack: "debts",
        smooth: true,
        symbol: "none" as const,
        emphasis: { focus: "series" as const },
        lineStyle: { color, width: 1.5 },
        itemStyle: { color },
        areaStyle: { color, opacity: 0.3 },
        data: filteredData.map(
          (r) => Number((r as Record<string, unknown>)[debt.id]) || 0,
        ),
      };
    });

    // Build markLine entries
    const markLineData: Array<Record<string, unknown>> = [];

    if (xLabels.includes(todayLabel)) {
      markLineData.push({
        xAxis: todayLabel,
        lineStyle: { color: destructive, type: "dashed", width: 1.5 },
        label: {
          show: true,
          position: "insideEndTop",
          formatter: "Today",
          color: destructive,
          fontWeight: 600,
          fontSize: 10,
        },
      });
    }

    for (const marker of aggregatedPayments.values()) {
      if (!xLabels.includes(marker.monthLabel)) continue;
      markLineData.push({
        xAxis: marker.monthLabel,
        lineStyle: { color: primary, type: "dashed", width: 1.5 },
        label: {
          show: true,
          position: "insideStartTop",
          formatter: `-${formatCurrency(marker.totalAmount)}`,
          color: primary,
          fontSize: 10,
        },
      });
    }

    for (const marker of payoffMarkers) {
      if (!marker.inView) continue;
      markLineData.push({
        xAxis: marker.monthLabel,
        lineStyle: { color: marker.color, type: "dashed", width: 2 },
        label: {
          show: true,
          position: "insideStartTop",
          formatter: `${marker.debtName} paid off`,
          color: marker.color,
          fontWeight: 600,
          fontSize: 11,
          rotate: 90,
        },
      });
    }

    const series: EChartsOption["series"] = [...debtSeries];

    if (markLineData.length > 0 && series[0]) {
      (series[0] as Record<string, unknown>).markLine = {
        symbol: ["none", "none"],
        silent: true,
        data: markLineData,
      };
    }

    if (simulation) {
      series.push({
        name: "simulation",
        type: "line",
        smooth: true,
        symbol: "none",
        lineStyle: { color: destructive, type: "dashed", width: 2 },
        itemStyle: { color: destructive },
        areaStyle: { color: destructive, opacity: 0.1 },
        data: filteredData.map(
          (r) => Number((r as Record<string, unknown>).simulation) || 0,
        ),
      });
    }

    return {
      grid: { left: 64, right: 16, top: 16, bottom: 24, containLabel: false },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: xLabels,
        axisLine: { lineStyle: { color: "rgba(127,127,127,0.3)" } },
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
          formatter: (v: number) =>
            v >= 1000
              ? `S/.${new Intl.NumberFormat("en", {
                  maximumFractionDigits: 1,
                }).format(v / 1000)}k`
              : `S/.${v}`,
        },
      },
      legend: { show: false },
      tooltip: { trigger: "axis" },
      series,
    };
  }, [
    filteredData,
    debts,
    fallbackColors,
    todayLabel,
    aggregatedPayments,
    payoffMarkers,
    simulation,
    destructive,
    primary,
  ]);

  const renderTooltip = (params: EChartTooltipParam[]) => (
    <DebtTimelineTooltip
      params={params}
      rows={filteredData as unknown as TimelineRow[]}
      debts={debts}
      paymentsByMonth={aggregatedPayments}
    />
  );

  void simulatedDebtName;

  if (debts.length === 0 || timelineData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Debt Timeline</CardTitle>
          <CardDescription>No active debts to project.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Debt Timeline</CardTitle>
            <CardDescription>
              Projected balance over time based on current payments
            </CardDescription>
          </div>
          <Select
            value={timePeriod}
            onValueChange={(v) => setTimePeriod(v as TimePeriod)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TIME_PERIOD_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <EChart
          option={option}
          tooltip={renderTooltip}
          className="h-[600px]"
        />
      </CardContent>
    </Card>
  );
}
