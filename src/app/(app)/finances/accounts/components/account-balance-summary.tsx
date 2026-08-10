"use client";

import { Landmark } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ACCOUNT_BALANCE_CURRENCIES,
  sumActiveAccountBalances,
} from "@/lib/account-balance-totals";
import { CURRENCY_LABELS, formatCurrency } from "@/lib/utils";
import type { AccountWithBalance } from "@/types/finances";

export function AccountBalanceSummary({
  accounts,
}: {
  accounts: AccountWithBalance[];
}) {
  const totals = sumActiveAccountBalances(accounts);
  const activeAccountCount = accounts.filter(
    (account) => !account.isArchived,
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>Total active balances</CardTitle>
            <CardDescription>
              Net balance across {activeAccountCount} active {activeAccountCount === 1 ? "account" : "accounts"}.
              Credit cards reduce the total; currencies stay separate.
            </CardDescription>
          </div>
          <Landmark className="text-muted-foreground size-5" />
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {ACCOUNT_BALANCE_CURRENCIES.map((currency) => (
          <div key={currency} className="rounded-lg border bg-muted/20 p-4">
            <div className="text-muted-foreground text-xs font-medium">
              {CURRENCY_LABELS[currency]}
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {formatCurrency(totals[currency], currency)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
