"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HandCoins } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useSpendingRoom } from "@/hooks/use-projection";

export function PreventionInsights() {
  const { data, isLoading } = useSpendingRoom();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-3 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalRoom = data?.reduce((sum, a) => sum + a.room, 0) ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Spending Room</CardTitle>
        <HandCoins className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(totalRoom)}</div>
        <p className="text-muted-foreground mt-1 text-xs">
          Total you can still spend this month across all accounts
        </p>
        {data && data.length > 0 && (
          <div className="mt-3 space-y-1">
            {data.map((account) => (
              <div
                key={account.accountId}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-muted-foreground truncate">
                  {account.accountName}
                </span>
                <span className={account.room <= 0 ? "text-red-600" : ""}>
                  {formatCurrency(account.room)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
