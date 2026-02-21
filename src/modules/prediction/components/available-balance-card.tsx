"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAvailableBalances } from "../hooks/use-projection";

export function AvailableBalanceCard() {
  const { data, isLoading } = useAvailableBalances();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-1 h-3 w-24" />
        </CardContent>
      </Card>
    );
  }

  const totalBalance = data?.reduce((sum, a) => sum + a.balance, 0) ?? 0;
  const totalAvailable = data?.reduce((sum, a) => sum + a.available, 0) ?? 0;
  const totalCommitted = data?.reduce((sum, a) => sum + a.committed, 0) ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
        <Shield className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatCurrency(totalAvailable)}
        </div>
        <div className="text-muted-foreground mt-1 space-y-0.5 text-xs">
          <p>Total balance: {formatCurrency(totalBalance)}</p>
          {totalCommitted > 0 && (
            <p>Committed: {formatCurrency(totalCommitted)}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
