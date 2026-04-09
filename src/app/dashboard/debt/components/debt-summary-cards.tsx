"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Percent, CreditCard, CheckCircle } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import type { DebtSummary } from "@/types/debt";

export function DebtSummaryCards({ summary }: { summary?: DebtSummary }) {
  if (!summary) return <DebtSummaryCardsSkeleton />;

  const cards = [
    {
      title: "Total Debt",
      value: formatCurrency(summary.totalDebt),
      icon: DollarSign,
    },
    {
      title: "Monthly Minimum",
      value: formatCurrency(summary.totalMinimumPayment),
      icon: CreditCard,
    },
    {
      title: "Avg Interest Rate",
      value: formatPercentage(summary.averageInterestRate),
      icon: Percent,
    },
    {
      title: "Active / Paid Off",
      value: `${summary.activeCount} / ${summary.paidOffCount}`,
      icon: CheckCircle,
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
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DebtSummaryCardsSkeleton() {
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
