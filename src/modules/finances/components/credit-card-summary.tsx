"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, ExternalLink } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import Link from "next/link";
import type { AccountWithBalance } from "../types";

type CreditCardSummaryProps = {
  account: AccountWithBalance;
  onSyncToDebt?: () => void;
  isSyncing?: boolean;
};

export function CreditCardSummary({
  account,
  onSyncToDebt,
  isSyncing,
}: CreditCardSummaryProps) {
  const creditLimit = account.creditLimit ?? 0;
  const used = Math.abs(account.balance);
  const available = creditLimit - used;
  const utilization = creditLimit > 0 ? (used / creditLimit) * 100 : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <CreditCard className="h-4 w-4" />
          {account.name}
        </CardTitle>
        {account.debtId && (
          <Link href="/dashboard/debt">
            <Button variant="ghost" size="sm">
              <ExternalLink className="mr-1 h-3 w-3" />
              Debt
            </Button>
          </Link>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Balance</span>
            <p className="font-medium">
              {formatCurrency(used, account.currency)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Available</span>
            <p className="font-medium">
              {formatCurrency(available, account.currency)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Limit</span>
            <p className="font-medium">
              {formatCurrency(creditLimit, account.currency)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Utilization</span>
            <p className="font-medium">{formatPercentage(utilization)}</p>
          </div>
          {account.apr != null && (
            <div>
              <span className="text-muted-foreground">APR</span>
              <p className="font-medium">{formatPercentage(account.apr)}</p>
            </div>
          )}
        </div>

        {account.debtId && onSyncToDebt && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onSyncToDebt}
            disabled={isSyncing}
          >
            {isSyncing ? "Syncing..." : "Sync Balance to Debt"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
