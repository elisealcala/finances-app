"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BudgetProgressCard } from "./budget-progress-card";
import type { BudgetStatus } from "../types";

type BudgetOverviewProps = {
  budgets?: BudgetStatus[];
  isLoading?: boolean;
};

export function BudgetOverview({ budgets, isLoading }: BudgetOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-2 w-full" />
              <Skeleton className="mt-2 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!budgets || budgets.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        No categories with budgets set. Add a monthly budget to a category to start tracking.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {budgets.map((budget) => (
        <BudgetProgressCard key={budget.categoryId} budget={budget} />
      ))}
    </div>
  );
}
