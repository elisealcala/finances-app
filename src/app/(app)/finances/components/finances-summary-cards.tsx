"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  PiggyBank,
  type LucideIcon,
} from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import type { PeriodSummary } from "@/types/finances";

type Currency = "PEN" | "USD" | "EUR";

type SummaryByCurrency = {
  currency: Currency;
  summary?: PeriodSummary;
};

type SummaryCardRow = {
  currency: Currency;
  value: string;
  className?: string;
};

type SummaryCard = {
  title: string;
  rows: SummaryCardRow[];
  icon: LucideIcon;
};

export function FinancesSummaryCards({
  summaries,
  isLoading,
}: {
  summaries: SummaryByCurrency[];
  isLoading?: boolean;
}) {
  if (isLoading || summaries.some((item) => !item.summary)) {
    return <SummarySkeleton />;
  }

  const activeSummaries = summaries.filter(({ summary }) => {
    if (!summary) return false;
    return summary.totalIncome > 0 || summary.totalExpenses > 0;
  });
  const fallback = summaries.find((item) => item.currency === "PEN") ?? {
    currency: "PEN" as const,
    summary: {
      totalIncome: 0,
      totalExpenses: 0,
      savings: 0,
      savingsRate: 0,
      topCategories: [],
    },
  };
  const activeOrFallback =
    activeSummaries.length > 0 ? activeSummaries : [fallback];

  const incomeRows = summaries
    .filter(({ summary }) => (summary?.totalIncome ?? 0) > 0)
    .map(({ currency, summary }) => ({
      currency,
      value: formatCurrency(summary?.totalIncome ?? 0, currency),
      className: "text-green-600",
    }));
  const expenseRows = summaries
    .filter(({ summary }) => (summary?.totalExpenses ?? 0) > 0)
    .map(({ currency, summary }) => ({
      currency,
      value: formatCurrency(summary?.totalExpenses ?? 0, currency),
      className: "text-red-600",
    }));

  const cards: SummaryCard[] = [
    {
      title: "Total Income",
      rows:
        incomeRows.length > 0
          ? incomeRows
          : [
              {
                currency: fallback.currency,
                value: formatCurrency(
                  fallback.summary?.totalIncome ?? 0,
                  fallback.currency,
                ),
                className: "text-green-600",
              },
            ],
      icon: TrendingUp,
    },
    {
      title: "Total Expenses",
      rows:
        expenseRows.length > 0
          ? expenseRows
          : [
              {
                currency: fallback.currency,
                value: formatCurrency(
                  fallback.summary?.totalExpenses ?? 0,
                  fallback.currency,
                ),
                className: "text-red-600",
              },
            ],
      icon: TrendingDown,
    },
    {
      title: "Savings",
      rows: activeOrFallback.map(({ currency, summary }) => ({
        currency,
        value: formatCurrency(summary?.savings ?? 0, currency),
        className:
          (summary?.savings ?? 0) >= 0 ? "text-green-600" : "text-red-600",
      })),
      icon: PiggyBank,
    },
    {
      title: "Savings Rate",
      rows: activeOrFallback.map(({ currency, summary }) => ({
        currency,
        value:
          (summary?.totalIncome ?? 0) > 0
            ? formatPercentage(summary?.savingsRate ?? 0)
            : "--",
      })),
      icon: DollarSign,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent className="space-y-2">
            {card.rows.map((row) => (
              <div
                key={row.currency}
                className="flex items-baseline justify-between gap-3"
              >
                <span className="text-muted-foreground text-xs font-medium">
                  {row.currency}
                </span>
                <span
                  className={`font-mono text-xl font-bold tabular-nums ${row.className ?? ""}`}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
