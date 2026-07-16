"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useChartColors } from "@/components/ui/echart";
import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  PaymentMarker,
  TimelineRow,
} from "@/server/trpc/services/debt/amortization";
import type { Debt } from "@/types/debt";

// Mirrors the chart's fallback palette so rail dots match the chart areas.
const CHART_TOKEN_REFS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

type PayoffScheduleRailProps = {
  debts: Debt[];
  rows: TimelineRow[];
  paymentMarkers: PaymentMarker[];
  focusedMonthLabel: string | null;
};

export function PayoffScheduleRail({
  debts,
  rows,
  paymentMarkers,
  focusedMonthLabel,
}: PayoffScheduleRailProps) {
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

  // Color per debt, matched by index in `debts` exactly like the chart.
  const colorByDebt = useMemo(() => {
    const map = new Map<string, string>();
    debts.forEach((d, i) => {
      map.set(d.id, d.color ?? fallbackColors[i % fallbackColors.length]);
    });
    return map;
  }, [debts, fallbackColors]);

  const nowLabel = useMemo(() => format(new Date(), "MMM yyyy"), []);

  // Fall back to the current month if the focused label isn't in range (e.g.
  // after a debt is toggled and the horizon shifts).
  const activeRow = useMemo(() => {
    const preferredLabel = focusedMonthLabel ?? nowLabel;
    return (
      rows.find((r) => r.monthLabel === preferredLabel) ??
      rows.find((r) => r.monthLabel === nowLabel) ??
      rows[0]
    );
  }, [rows, focusedMonthLabel, nowLabel]);

  const activeLabel =
    (activeRow?.monthLabel as string | undefined) ?? focusedMonthLabel ?? nowLabel;

  const paymentsByMonth = useMemo(() => {
    const map = new Map<
      string,
      { totalAmount: number; payments: Array<{ debtName: string; amount: number }> }
    >();

    for (const marker of paymentMarkers) {
      const existing = map.get(marker.monthLabel);
      if (existing) {
        existing.totalAmount += marker.amount;
        existing.payments.push({
          debtName: marker.debtName,
          amount: marker.amount,
        });
      } else {
        map.set(marker.monthLabel, {
          totalAmount: marker.amount,
          payments: [{ debtName: marker.debtName, amount: marker.amount }],
        });
      }
    }

    return map;
  }, [paymentMarkers]);

  const snapshotItems = useMemo(() => {
    const row = activeRow as Record<string, unknown> | undefined;
    return debts.map((debt) => {
      const balance = row ? Number(row[debt.id]) || 0 : 0;
      return {
        debt,
        balance,
        color: colorByDebt.get(debt.id) ?? fallbackColors[0],
        monthly: row ? Number(row[`${debt.id}_monthly`]) || 0 : 0,
      };
    });
  }, [activeRow, debts, colorByDebt, fallbackColors]);

  const total = snapshotItems.reduce((sum, item) => sum + item.balance, 0);
  const totalMonthly = snapshotItems.reduce(
    (sum, item) => sum + item.monthly,
    0,
  );
  const monthPayment = paymentsByMonth.get(activeLabel);

  if (debts.length === 0 || !activeRow) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Debt snapshot</CardTitle>
          <CardDescription>No active debts to project.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <CardTitle>Debt snapshot</CardTitle>
            <CardDescription>Balances and payments by month</CardDescription>
          </div>
          <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums whitespace-nowrap">
            at {activeLabel}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-base font-semibold">{activeLabel}</span>
          <span className="text-muted-foreground text-xs">
            {snapshotItems.length}{" "}
            {snapshotItems.length === 1 ? "debt" : "debts"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-xs">
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
              {snapshotItems.map(({ debt, balance, color, monthly }) => {
                const share = total > 0 ? (balance / total) * 100 : 0;
                return (
                  <tr
                    key={debt.id}
                    className={cn(
                      "border-border/40 border-b last:border-0",
                      balance <= 0 && "opacity-50",
                    )}
                  >
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <div className="flex min-w-0 flex-col">
                          <span className="text-foreground truncate text-sm font-medium leading-tight">
                            {debt.name}
                          </span>
                          {debt.lender && (
                            <span className="text-muted-foreground truncate text-[11px] leading-tight">
                              {debt.lender}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 pl-2 text-right font-mono tabular-nums whitespace-nowrap">
                      {monthly > 0 ? formatCurrency(monthly) : "-"}
                    </td>
                    <td className="text-muted-foreground py-2 pl-2 text-right font-mono tabular-nums whitespace-nowrap">
                      {debt.interestRate.toFixed(2)}%
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
                <td className="pt-2.5 pl-2" />
                <td className="pt-2.5 pl-2 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatCurrency(total)}
                </td>
                <td className="pt-2.5 pl-2" />
              </tr>
            </tfoot>
          </table>
        </div>

        {monthPayment && (
          <div className="border-border mt-3 border-t pt-3">
            <div className="text-primary mb-1.5 text-xs font-semibold">
              Capital payment this month
            </div>
            <div className="space-y-1">
              {monthPayment.payments.map((payment, index) => (
                <div
                  key={`${payment.debtName}-${index}`}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="text-muted-foreground truncate">
                    {payment.debtName}
                  </span>
                  <span className="text-primary font-mono font-semibold tabular-nums">
                    -{formatCurrency(payment.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
