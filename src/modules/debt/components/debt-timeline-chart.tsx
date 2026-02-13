"use client";

import { useState, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { format, addMonths } from "date-fns";
import { generateTimeline, type SimulationResult } from "../utils/amortization";
import { formatCurrency } from "@/lib/utils";
import type { Debt } from "../types";

const FALLBACK_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

type TimePeriod = "all" | "this_year" | "next_6m" | "next_12m" | "next_24m";

const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  all: "All Time",
  this_year: "This Year",
  next_6m: "Next 6 Months",
  next_12m: "Next 12 Months",
  next_24m: "Next 24 Months",
};

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
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");

  const { rows: timelineData, paymentMarkers } = useMemo(
    () => generateTimeline(debts),
    [debts],
  );

  const todayLabel = format(new Date(), "MMM yyyy");

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    debts.forEach((debt, i) => {
      const color = debt.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
      config[debt.name] = {
        label: debt.name,
        color,
      };
    });
    if (simulation && simulatedDebtName) {
      config["simulation"] = {
        label: `${simulatedDebtName} (simulated)`,
        color: "hsl(var(--destructive))",
      };
    }
    return config;
  }, [debts, simulation, simulatedDebtName]);

  // Merge simulation data by monthLabel (not index) to handle historical timelines
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

  // Filter by time period
  const filteredData = useMemo(() => {
    const data = mergedData;
    if (timePeriod === "all") return data;

    const now = new Date();
    let startFilter: Date;
    let endFilter: Date;

    switch (timePeriod) {
      case "this_year":
        startFilter = new Date(now.getFullYear(), 0, 1);
        endFilter = new Date(now.getFullYear(), 11, 31);
        break;
      case "next_6m":
        startFilter = now;
        endFilter = addMonths(now, 6);
        break;
      case "next_12m":
        startFilter = now;
        endFilter = addMonths(now, 12);
        break;
      case "next_24m":
        startFilter = now;
        endFilter = addMonths(now, 24);
        break;
      default:
        return data;
    }

    return data.filter((row) => {
      const rowDate = new Date(row.date);
      return rowDate >= startFilter && rowDate <= endFilter;
    });
  }, [mergedData, timePeriod]);

  // Deduplicate payment markers by monthLabel (multiple payments in same month)
  const uniquePaymentMonths = useMemo(() => {
    const seen = new Set<string>();
    return paymentMarkers.filter((m) => {
      if (seen.has(m.monthLabel)) return false;
      seen.add(m.monthLabel);
      return true;
    });
  }, [paymentMarkers]);

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
        <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
          <AreaChart data={filteredData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="monthLabel"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v: number) =>
                v >= 1000 ? `S/.${Math.round(v / 1000)}k` : `S/.${v}`
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    `S/. ${Number(value).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`
                  }
                />
              }
            />
            <ChartLegend content={<ChartLegendContent key="debt-legend" />} />
            <ReferenceLine
              x={todayLabel}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
              label={{ value: "Today", position: "insideTopRight", fontSize: 11 }}
            />
            {/* Capital payment markers */}
            {uniquePaymentMonths.map((marker) => (
              <ReferenceLine
                key={`payment-${marker.monthLabel}`}
                x={marker.monthLabel}
                stroke="hsl(var(--primary))"
                strokeDasharray="2 4"
                strokeOpacity={0.5}
                label={{
                  value: `${formatCurrency(marker.amount)}`,
                  position: "insideTopLeft",
                  fontSize: 10,
                  fill: "hsl(var(--primary))",
                }}
              />
            ))}
            {debts.map((debt, i) => {
              const color =
                debt.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
              return (
                <Area
                  key={debt.id}
                  type="monotone"
                  dataKey={debt.name}
                  stackId="debts"
                  fill={color}
                  stroke={color}
                  fillOpacity={0.3}
                />
              );
            })}
            {simulation && (
              <Area
                type="monotone"
                dataKey="simulation"
                stackId="sim"
                fill="hsl(var(--destructive))"
                stroke="hsl(var(--destructive))"
                fillOpacity={0.1}
                strokeDasharray="5 5"
                strokeWidth={2}
              />
            )}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
