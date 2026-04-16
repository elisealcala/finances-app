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
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { format, addMonths } from "date-fns";
import { generateTimeline, type SimulationResult } from "@/server/trpc/services/debt/amortization";
import { formatCurrency } from "@/lib/utils";
import type { Debt } from "@/types/debt";

const FALLBACK_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
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

function DebtTimelineTooltip({
  active,
  payload,
  label,
  debts,
  paymentsByMonth,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; payload?: Record<string, number | string> }>;
  label?: string;
  debts: Debt[];
  paymentsByMonth: Map<string, AggregatedPayment>;
}) {
  if (!active || !payload?.length) return null;

  const debtMap = new Map(debts.map((d) => [d.id, d]));
  const total = payload
    .filter((item) => item.name !== "simulation")
    .reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const monthPayment = label ? paymentsByMonth.get(label) : undefined;

  const items = payload.filter((item) => item.name !== "simulation");
  const row = items[0]?.payload;
  const totalMonthly = items.reduce((sum, item) => {
    const monthlyFromRow = row ? Number(row[`${item.name}_monthly`]) || 0 : 0;
    return sum + monthlyFromRow;
  }, 0);

  return (
    <div className="border-border/50 bg-background rounded-lg border px-4 py-3 text-sm shadow-xl">
      <div className="mb-3 text-base font-semibold">{label}</div>
      {monthPayment && (
        <div className="border-border mb-3 border-b pb-3">
          <div className="text-primary mb-2 font-semibold">Capital Payment</div>
          {monthPayment.payments.map((p, i) => (
            <div key={i} className="flex justify-between gap-6">
              <span className="text-muted-foreground">{p.debtName}</span>
              <span className="text-primary font-mono font-semibold tabular-nums">
                -{formatCurrency(p.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-muted-foreground text-xs">
            <th className="pb-2 pr-6 text-left font-medium">Name</th>
            <th className="pb-2 pl-4 text-right font-medium">Due</th>
            <th className="pb-2 pl-4 text-right font-medium">Monthly</th>
            <th className="pb-2 pl-4 text-right font-medium">Balance</th>
            <th className="pb-2 pl-4 text-right font-medium">Rate</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const debt = debtMap.get(item.name);
            return (
              <tr key={index} className="border-border/30 border-b last:border-0">
                <td className="py-1.5 pr-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 shrink-0 rounded-[3px]"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex flex-col">
                      <span className="text-foreground font-medium">
                        {debt?.name ?? item.name}
                      </span>
                      {debt?.lender && (
                        <span className="text-muted-foreground text-xs">
                          {debt.lender}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-1.5 pl-4 text-right font-mono font-medium tabular-nums">
                  {debt?.dueDate ? `${debt.dueDate}` : "—"}
                </td>
                <td className="py-1.5 pl-4 text-right font-mono font-medium tabular-nums">
                  {row ? formatCurrency(Number(row[`${item.name}_monthly`]) || 0) : "—"}
                </td>
                <td className="py-1.5 pl-4 text-right font-mono font-medium tabular-nums">
                  {formatCurrency(Number(item.value))}
                </td>
                <td className="py-1.5 pl-4 text-right font-mono font-medium tabular-nums">
                  {debt ? `${debt.interestRate.toFixed(2)}%` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-border border-t text-base font-semibold">
            <td className="pt-2">Total</td>
            <td className="pt-2 pl-4"></td>
            <td className="pt-2 pl-4 text-right font-mono font-semibold tabular-nums">
              {formatCurrency(totalMonthly)}
            </td>
            <td className="pt-2 pl-4 text-right font-mono font-semibold tabular-nums">
              {formatCurrency(total)}
            </td>
            <td className="pt-2 pl-4"></td>
          </tr>
        </tfoot>
      </table>
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

  const { rows: timelineData, paymentMarkers } = useMemo(
    () => generateTimeline(debts),
    [debts],
  );

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    debts.forEach((debt, i) => {
      const color = debt.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
      config[debt.id] = {
        label: debt.lender ? `${debt.name} · ${debt.lender}` : debt.name,
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

  // Filter by time period — always start from the current month
  const filteredData = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Base: only show current month and forward
    const fromNow = mergedData.filter(
      (row) => new Date(row.date) >= currentMonthStart,
    );

    if (timePeriod === "all") return fromNow;

    let endFilter: Date;

    switch (timePeriod) {
      case "this_year":
        endFilter = new Date(now.getFullYear(), 11, 31);
        break;
      case "next_3m":
        endFilter = addMonths(now, 3);
        break;
      case "next_6m":
        endFilter = addMonths(now, 6);
        break;
      case "next_12m":
        endFilter = addMonths(now, 12);
        break;
      case "next_24m":
        endFilter = addMonths(now, 24);
        break;
      default:
        return fromNow;
    }

    return fromNow.filter((row) => new Date(row.date) <= endFilter);
  }, [mergedData, timePeriod]);

  // Aggregate payment markers by month (sum amounts, collect per-debt details)
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

  // Find payoff month for each debt from full timeline data
  const payoffMarkers = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const futureRows = mergedData.filter(
      (row) => new Date(row.date as string) >= currentMonthStart,
    );

    const markers: Array<{ monthLabel: string; debtName: string; color: string; inView: boolean }> = [];
    const filteredLabels = new Set(filteredData.map((r) => r.monthLabel));

    for (let i = 0; i < debts.length; i++) {
      const debt = debts[i];
      if (debt.status === "PAID_OFF") continue;
      const color = debt.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
      for (const row of futureRows) {
        const bal = Number((row as Record<string, unknown>)[debt.id]) || 0;
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
  }, [debts, mergedData, filteredData]);

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
        <ChartContainer config={chartConfig} className="aspect-auto h-[600px] w-full">
          <AreaChart data={filteredData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="monthLabel"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickCount={12}
              tickFormatter={(v: number) =>
                v >= 1000
                  ? `S/.${new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(v / 1000)}k`
                  : `S/.${v}`
              }
            />
            <ChartTooltip
              content={<DebtTimelineTooltip debts={debts} paymentsByMonth={aggregatedPayments} />}
            />
            <ChartLegend
              content={
                <ChartLegendContent
                  key="debt-legend"
                  nameKey="id"
                  payload={debts.map((debt, i) => ({
                    value: `${debt.name}${debt.lender ? ` · ${debt.lender}` : ""} — ${formatCurrency(debt.balance)}`,
                    type: "rect" as const,
                    color: debt.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
                    id: debt.id,
                  }))}
                />
              }
            />
            {/* Capital payment markers */}
            {Array.from(aggregatedPayments.values()).map((marker) => (
              <ReferenceLine
                key={`payment-${marker.monthLabel}`}
                x={marker.monthLabel}
                stroke="hsl(var(--primary))"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{
                  value: `-${formatCurrency(marker.totalAmount)}`,
                  position: "insideTopLeft",
                  fontSize: 10,
                  fill: "hsl(var(--primary))",
                }}
              />
            ))}
            {/* Payoff date markers */}
            {payoffMarkers
              .filter((m) => m.inView)
              .map((marker, idx) => (
                <ReferenceLine
                  key={`payoff-${marker.debtName}-${idx}`}
                  x={marker.monthLabel}
                  stroke={marker.color}
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  label={{
                    value: `${marker.debtName} paid off`,
                    position: "insideBottomRight",
                    fontSize: 11,
                    fill: marker.color,
                    fontWeight: 600,
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
                  dataKey={debt.id}
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
        {payoffMarkers.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {payoffMarkers.map((marker, idx) => (
              <div
                key={`${marker.debtName}-${idx}`}
                className="flex items-center gap-3 rounded-md border px-3 py-2"
              >
                <div
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: marker.color }}
                />
                <div className="flex flex-col text-sm">
                  <span className="font-medium">{marker.debtName}</span>
                  <span className="text-muted-foreground text-xs">
                    Paid off {marker.monthLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
