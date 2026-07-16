"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useChartColors } from "@/components/ui/echart";
import { cn, formatCurrency } from "@/lib/utils";
import type { TimelineRow } from "@/server/trpc/services/debt/amortization";
import type { Debt } from "@/types/debt";

const CHART_TOKEN_REFS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

type MonthPaymentStatus =
  | "paid"
  | "pending"
  | "partial"
  | "not_due"
  | "projected";

type MonthPaymentRow = {
  debt: Debt;
  color: string;
  balance: number;
  due: number;
  paid: number;
  left: number;
  status: MonthPaymentStatus;
};

type DebtMonthPaymentTableProps = {
  debts: Debt[];
  rows: TimelineRow[];
  focusedMonthLabel: string | null;
};

const STATUS_STYLES: Record<
  MonthPaymentStatus,
  { label: string; className: string }
> = {
  paid: {
    label: "Paid",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400",
  },
  pending: {
    label: "Pending",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400",
  },
  partial: {
    label: "Partial",
    className:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-400",
  },
  not_due: {
    label: "Not due",
    className:
      "border-border bg-muted/40 text-muted-foreground dark:bg-muted/20",
  },
  projected: {
    label: "Projected",
    className:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-400",
  },
};

function getInstallmentMonthLabel(dueDate: Date | string) {
  return format(new Date(dueDate), "MMM yyyy");
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function DebtMonthPaymentTable({
  debts,
  rows,
  focusedMonthLabel,
}: DebtMonthPaymentTableProps) {
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

  const colorByDebt = useMemo(() => {
    const map = new Map<string, string>();
    debts.forEach((debt, index) => {
      map.set(
        debt.id,
        debt.color ?? fallbackColors[index % fallbackColors.length],
      );
    });
    return map;
  }, [debts, fallbackColors]);

  const nowLabel = useMemo(() => format(new Date(), "MMM yyyy"), []);
  const activeRow = useMemo(() => {
    const preferredLabel = focusedMonthLabel ?? nowLabel;
    return (
      rows.find((row) => row.monthLabel === preferredLabel) ??
      rows.find((row) => row.monthLabel === nowLabel) ??
      rows[0]
    );
  }, [rows, focusedMonthLabel, nowLabel]);

  const activeLabel =
    (activeRow?.monthLabel as string | undefined) ?? focusedMonthLabel ?? nowLabel;

  const paymentRows = useMemo<MonthPaymentRow[]>(() => {
    const row = activeRow as Record<string, unknown> | undefined;

    return debts.map((debt) => {
      const balance = row ? Number(row[debt.id]) || 0 : 0;
      const color = colorByDebt.get(debt.id) ?? fallbackColors[0];

      if (debt.hasSchedule) {
        const monthInstallments = (debt.installments ?? []).filter(
          (installment) =>
            getInstallmentMonthLabel(installment.dueDate) === activeLabel,
        );
        const due = roundCurrency(
          monthInstallments.reduce(
            (sum, installment) => sum + installment.totalAmount,
            0,
          ),
        );
        const paid = roundCurrency(
          monthInstallments
            .filter((installment) => installment.status === "PAID")
            .reduce((sum, installment) => sum + installment.totalAmount, 0),
        );
        const left = roundCurrency(Math.max(due - paid, 0));
        const status: MonthPaymentStatus =
          due <= 0
            ? "not_due"
            : left <= 0
              ? "paid"
              : paid > 0
                ? "partial"
                : "pending";

        return { debt, balance, color, due, paid, left, status };
      }

      const monthly = row ? Number(row[`${debt.id}_monthly`]) || 0 : 0;
      const due = balance > 0 ? monthly : 0;
      const left = due;
      const status: MonthPaymentStatus = due > 0 ? "projected" : "not_due";

      return {
        debt,
        balance,
        color,
        due,
        paid: 0,
        left,
        status,
      };
    });
  }, [activeRow, activeLabel, debts, colorByDebt, fallbackColors]);

  const totals = paymentRows.reduce(
    (acc, row) => ({
      balance: acc.balance + row.balance,
      due: acc.due + row.due,
      paid: acc.paid + row.paid,
      left: acc.left + row.left,
    }),
    { balance: 0, due: 0, paid: 0, left: 0 },
  );

  if (debts.length === 0 || !activeRow) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Month payments</CardTitle>
          <CardDescription>No active debts to track.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <CardTitle>Month payments</CardTitle>
            <CardDescription>
              What is due and left to pay for {activeLabel}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-muted-foreground text-xs">Left to pay</div>
            <div className="font-mono text-lg font-semibold tabular-nums">
              {formatCurrency(totals.left)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Debt</TableHead>
              <TableHead className="text-right">Month Balance</TableHead>
              <TableHead className="text-right">Due This Month</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Left To Pay</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentRows.map((row) => {
              const status = STATUS_STYLES[row.status];
              return (
                <TableRow
                  key={row.debt.id}
                  className={cn(row.balance <= 0 && row.due <= 0 && "opacity-60")}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                      <div className="flex min-w-0 flex-col">
                        <span className="text-foreground truncate font-medium leading-tight">
                          {row.debt.name}
                        </span>
                        {row.debt.lender && (
                          <span className="text-muted-foreground truncate text-xs leading-tight">
                            {row.debt.lender}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(row.balance)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(row.due)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(row.paid)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold tabular-nums">
                    {formatCurrency(row.left)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={status.className}>
                      {status.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total</TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatCurrency(totals.balance)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatCurrency(totals.due)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatCurrency(totals.paid)}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold tabular-nums">
                {formatCurrency(totals.left)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
