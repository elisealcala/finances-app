"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, CreditCard, Landmark, Wallet, PiggyBank, TrendingUp, HelpCircle } from "lucide-react";
import { formatCurrency, ACCOUNT_TYPE_LABELS } from "@/lib/utils";
import { useAvailableBalances } from "@/hooks/use-projection";
import type { AccountWithBalance } from "@/types/finances";

const ACCOUNT_ICONS: Record<string, typeof Landmark> = {
  BANK: Landmark,
  CREDIT_CARD: CreditCard,
  CASH: Wallet,
  SAVINGS: PiggyBank,
  INVESTMENT: TrendingUp,
  OTHER: HelpCircle,
};

type AccountCardProps = {
  account: AccountWithBalance;
  onEdit: (account: AccountWithBalance) => void;
  onDelete: (account: AccountWithBalance) => void;
};

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const Icon = ACCOUNT_ICONS[account.type] ?? HelpCircle;
  const { data: availableBalances } = useAvailableBalances();
  const accountAvailable = availableBalances?.find(
    (a) => a.accountId === account.id,
  );
  const showAvailable =
    accountAvailable && Math.abs(accountAvailable.available - account.balance) > 0.01;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          {account.color && (
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: account.color }}
            />
          )}
          <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Icon className="text-muted-foreground h-4 w-4" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(account)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(account)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatCurrency(
            account.balancesByCurrency?.[account.currency] ?? account.balance,
            account.currency,
          )}
        </div>
        {account.balancesByCurrency &&
          Object.entries(account.balancesByCurrency)
            .filter(([cur]) => cur !== account.currency)
            .map(([cur, amt]) => (
              <div key={cur} className="text-muted-foreground text-lg">
                {formatCurrency(amt, cur as "PEN" | "USD" | "EUR")}
              </div>
            ))}
        {showAvailable && (
          <div className="text-muted-foreground text-sm">
            Available:{" "}
            <span className={accountAvailable.available < 0 ? "text-red-600" : ""}>
              {formatCurrency(accountAvailable.available, account.currency)}
            </span>
          </div>
        )}
        <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
          <Badge variant="secondary" className="text-xs">
            {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
          </Badge>
          {account.type === "CREDIT_CARD" && account.creditLimit != null && (
            <span>
              Limit: {formatCurrency(account.creditLimit, account.currency)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
