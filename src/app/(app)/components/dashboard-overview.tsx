"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard,
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useDebts } from "@/hooks/use-debts";
import { usePeriodSummary } from "@/hooks/use-overview";
import Link from "next/link";
import { PageHeader, PageShell } from "@/components/page";

export function DashboardOverview() {
  const now = new Date();
  const { data: debtData } = useDebts();
  const { data: periodData } = usePeriodSummary(
    now.getFullYear(),
    now.getMonth() + 1,
  );
  const totalDebt = debtData?.summary?.totalDebt ?? 0;
  const activeDebts = debtData?.summary?.activeCount ?? 0;
  const totalIncome = periodData?.totalIncome ?? 0;
  const totalExpenses = periodData?.totalExpenses ?? 0;
  const savings = periodData?.savings ?? 0;
  const isLoading = !debtData && !periodData;

  return (
    <PageShell>
      <PageHeader
        title="Dashboard"
        description="Your finances and obligations at a glance."
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="mt-1 h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/finances/debt">
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Debt
                </CardTitle>
                <CreditCard className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalDebt)}
                </div>
                <p className="text-muted-foreground text-xs">
                  {activeDebts} active debt{activeDebts !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/finances/incomes">
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Monthly Income
                </CardTitle>
                <TrendingUp className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-positive text-2xl font-semibold tracking-[-0.025em]">
                  {formatCurrency(totalIncome)}
                </div>
                <p className="text-muted-foreground text-xs">This month</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/finances/expenses">
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Monthly Expenses
                </CardTitle>
                <TrendingDown className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-destructive text-2xl font-semibold tracking-[-0.025em]">
                  {formatCurrency(totalExpenses)}
                </div>
                <p className="text-muted-foreground text-xs">This month</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/finances">
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Savings</CardTitle>
                <PiggyBank className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-semibold tracking-[-0.025em] ${savings >= 0 ? "text-positive" : "text-destructive"}`}
                >
                  {formatCurrency(savings)}
                </div>
                <p className="text-muted-foreground text-xs">This month</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/finances/budget">
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Budget</CardTitle>
                <Wallet className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground text-2xl font-bold">
                  View
                </div>
                <p className="text-muted-foreground text-xs">
                  Category budgets
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}
    </PageShell>
  );
}
