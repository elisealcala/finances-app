"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AccountCard } from "./account-card";
import type { AccountWithBalance } from "@/types/finances";

type AccountsGridProps = {
  accounts: AccountWithBalance[];
  isLoading?: boolean;
  onEdit: (account: AccountWithBalance) => void;
  onDelete: (account: AccountWithBalance) => void;
};

export function AccountsGrid({
  accounts,
  isLoading,
  onEdit,
  onDelete,
}: AccountsGridProps) {
  if (isLoading) return <AccountsGridSkeleton />;

  if (accounts.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        No accounts yet. Add your first account to get started.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function AccountsGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-2 h-4 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
