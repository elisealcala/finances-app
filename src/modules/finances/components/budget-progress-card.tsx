"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import type { BudgetStatus } from "../types";

type BudgetProgressCardProps = {
  budget: BudgetStatus;
};

export function BudgetProgressCard({ budget }: BudgetProgressCardProps) {
  const isOverBudget = budget.percentUsed > 100;
  const barWidth = Math.min(budget.percentUsed, 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            <div className="flex items-center gap-2">
              {budget.color && (
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: budget.color }}
                />
              )}
              {budget.categoryName}
            </div>
          </CardTitle>
          <span className="text-muted-foreground text-sm">
            {formatPercentage(budget.percentUsed)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full transition-all ${
                isOverBudget ? "bg-destructive" : "bg-primary"
              }`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span>
              {formatCurrency(budget.spent)} / {formatCurrency(budget.budget)}
            </span>
            <span
              className={
                isOverBudget
                  ? "text-destructive font-medium"
                  : "text-muted-foreground"
              }
            >
              {budget.remaining >= 0
                ? `${formatCurrency(budget.remaining)} left`
                : `${formatCurrency(Math.abs(budget.remaining))} over`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
