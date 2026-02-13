"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingDown, TrendingUp, PiggyBank } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import type { PeriodSummary } from "../types";

export function FinancesSummaryCards({ summary }: { summary?: PeriodSummary }) {
  if (!summary) return <SummarySkeleton />;

  const cards = [
    {
      title: "Total Income",
      value: formatCurrency(summary.totalIncome),
      icon: TrendingUp,
      className: "text-green-600",
    },
    {
      title: "Total Expenses",
      value: formatCurrency(summary.totalExpenses),
      icon: TrendingDown,
      className: "text-red-600",
    },
    {
      title: "Savings",
      value: formatCurrency(summary.savings),
      icon: PiggyBank,
      className: summary.savings >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      title: "Savings Rate",
      value: formatPercentage(summary.savingsRate),
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
          <CardContent>
            <div className={`text-2xl font-bold ${card.className ?? ""}`}>
              {card.value}
            </div>
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
