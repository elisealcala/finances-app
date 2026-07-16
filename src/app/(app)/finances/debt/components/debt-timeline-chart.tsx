"use client";

import { useCallback, useMemo, useState } from "react";
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
import type {
  PayoffMilestone,
  PaymentMarker,
  SimulationResult,
  TimelineRow as AmortTimelineRow,
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

type TimePeriod =
  | "until_free"
  | "all"
  | "this_year"
  | "next_3m"
  | "next_6m"
  | "next_12m"
  | "next_24m";

const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  until_free: "Until Debt-Free",
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

type DebtTimelineChartProps = {
  debts: Debt[];
  rows: AmortTimelineRow[];
  milestones: PayoffMilestone[];
  paymentMarkers: PaymentMarker[];
  focusedMonthLabel: string | null;
  onFocusMonth: (label: string | null) => void;
  simulation?: SimulationResult | null;
  simulatedDebtName?: string;
};

export function DebtTimelineChart({
  debts,
  rows: timelineData,
  milestones,
  paymentMarkers,
  focusedMonthLabel,
  onFocusMonth,
  simulation,
  simulatedDebtName,
}: DebtTimelineChartProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("until_free");

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
      case "until_free":
        // Current month through the debt-free point (the timeline already
        // ends at payoff), so the curve descends visibly to zero.
        startFilter = currentMonthStart;
        break;
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

  // Decorate the shared payoff milestones with the chart's per-debt color and
  // whether the payoff month is inside the current period view.
  const payoffMarkers = useMemo(() => {
    const filteredLabels = new Set(filteredData.map((r) => r.monthLabel));
    const indexById = new Map(debts.map((d, i) => [d.id, i]));
    return milestones
      .filter((m) => !m.neverAtCurrentPace)
      .map((m) => {
        const i = indexById.get(m.debtId) ?? 0;
        const debt = debts[i];
        const color = debt?.color ?? fallbackColors[i % fallbackColors.length];
        return {
          monthLabel: m.payoffMonthLabel,
          debtName: m.debtName,
          color,
          inView: filteredLabels.has(m.payoffMonthLabel),
        };
      });
  }, [milestones, debts, filteredData, fallbackColors]);

  // Scrub: every axis-pointer update maps to the focused month. Ignore the
  // globalout (null) case so the cursor stays parked where the user dragged.
  const handleAxisHover = useCallback(
    (params: EChartTooltipParam[] | null) => {
      if (!params?.length) return;
      const label = filteredData[params[0].dataIndex]?.monthLabel;
      if (typeof label === "string") onFocusMonth(label);
    },
    [filteredData, onFocusMonth],
  );

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

    // Scrubber cursor — solid accent line at the focused month (distinct from
    // the dashed "Today" and capital-payment markers).
    if (focusedMonthLabel && xLabels.includes(focusedMonthLabel)) {
      markLineData.push({
        xAxis: focusedMonthLabel,
        lineStyle: { color: primary, type: "solid", width: 2 },
        label: { show: false },
      });
    }

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
    focusedMonthLabel,
  ]);

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
          onAxisHover={handleAxisHover}
          className="h-[360px]"
        />
      </CardContent>
    </Card>
  );
}
