"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Archive, ArchiveRestore, ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, ACCOUNT_TYPE_LABELS } from "@/lib/utils";
import type { AccountWithBalance } from "@/types/finances";

type Config = {
  onEdit: (account: AccountWithBalance) => void;
  onDelete: (account: AccountWithBalance) => void;
  onToggleArchive: (account: AccountWithBalance) => void;
};

export function getAccountColumns({
  onEdit,
  onDelete,
  onToggleArchive,
}: Config): ColumnDef<AccountWithBalance>[] {
  return [
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
        return (
          <div className="flex items-center gap-2">
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
      header: "Currency",
      cell: ({ row }) => row.getValue("currency"),
    },
    {
      accessorKey: "balance",
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
        const account = row.original;
        return (
          <span className="font-mono tabular-nums">
            {formatCurrency(account.balance, account.currency)}
          </span>
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
