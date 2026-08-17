"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  Archive,
  ArchiveRestore,
  ArrowUpDown,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, ACCOUNT_TYPE_LABELS } from "@/lib/utils";
import { getAccountCurrencyBalances } from "@/lib/account-balance-totals";
import type { AccountWithBalance } from "@/types/finances";

type Config = {
  onEdit: (account: AccountWithBalance) => void;
  onDelete: (account: AccountWithBalance) => void;
  onToggleArchive: (account: AccountWithBalance) => void;
  onToggleBalanceVisibility?: (accountId: string) => void;
  isBalanceHidden?: (accountId: string) => boolean;
};

export function getAccountColumns({
  onEdit,
  onDelete,
  onToggleArchive,
  onToggleBalanceVisibility,
  isBalanceHidden,
}: Config): ColumnDef<AccountWithBalance>[] {
  return [
    ...(onToggleBalanceVisibility
      ? [
          {
            id: "balanceVisibility",
            header: () => <span className="sr-only">Balance visibility</span>,
            cell: ({ row }: { row: { original: AccountWithBalance } }) => {
              const account = row.original;
              const hidden = isBalanceHidden?.(account.id) ?? false;
              const unavailable = account.isArchived;
              const label = unavailable
                ? `${account.name} is already excluded because it is closed`
                : hidden
                  ? `Include ${account.name} in balance summary`
                  : `Exclude ${account.name} from balance summary`;

              return (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={unavailable}
                  aria-label={label}
                  title={label}
                  onClick={() => onToggleBalanceVisibility(account.id)}
                >
                  {hidden || unavailable ? (
                    <EyeOff className="text-muted-foreground h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              );
            },
            meta: { filterable: false },
          } as ColumnDef<AccountWithBalance>,
        ]
      : []),
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const account = row.original;
        const hidden = isBalanceHidden?.(account.id) ?? false;
        return (
          <div className={`flex items-center gap-2 ${hidden ? "opacity-50" : ""}`}>
            {account.color && (
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: account.color, opacity: account.isArchived ? 0.4 : 1 }}
              />
            )}
            <span className={account.isArchived ? "text-muted-foreground" : "font-medium"}>
              {account.name}
            </span>
            {account.isArchived && (
              <Badge variant="outline" className="text-muted-foreground text-[10px]">
                Closed
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return <Badge variant="secondary">{ACCOUNT_TYPE_LABELS[type] ?? type}</Badge>;
      },
      meta: { filterType: "select" },
    },
    {
      accessorKey: "currency",
      header: "Currencies",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {getAccountCurrencyBalances(row.original).map((balance) => (
            <Badge
              key={balance.currency}
              variant={balance.isPrimary ? "secondary" : "outline"}
            >
              {balance.currency}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: "balance",
      accessorFn: (account) =>
        account.balancesByCurrency?.[account.currency] ?? account.balance,
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Balance
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        return (
          <div className="space-y-1 font-mono tabular-nums">
            {getAccountCurrencyBalances(row.original).map((balance) => (
              <div
                key={balance.currency}
                className={balance.isPrimary ? "font-medium" : "text-muted-foreground"}
              >
                {formatCurrency(balance.amount, balance.currency)}
              </div>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "creditLimit",
      header: "Limit",
      cell: ({ row }) => {
        const account = row.original;
        if (account.creditLimit == null) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="text-muted-foreground font-mono tabular-nums">
            {formatCurrency(account.creditLimit, account.currency)}
          </span>
        );
      },
      meta: { filterable: false },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const account = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(account)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleArchive(account)}>
                {account.isArchived ? (
                  <>
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    Reopen
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Close
                  </>
                )}
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
        );
      },
      meta: { filterable: false },
    },
  ];
}
