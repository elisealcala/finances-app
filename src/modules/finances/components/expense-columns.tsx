"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { formatCurrency, PAYMENT_STATUS_LABELS } from "@/lib/utils";
import { format } from "date-fns";
import type { Expense } from "../types";

type ColumnsConfig = {
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
};

export function getExpenseColumns({
  onEdit,
  onDelete,
}: ColumnsConfig): ColumnDef<Expense>[] {
  return [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => format(new Date(row.getValue("date")), "MMM dd, yyyy"),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const expense = row.original;
        const currency = expense.currency ?? expense.account?.currency ?? "PEN";
        return formatCurrency(Number(row.getValue("amount")), currency);
      },
    },
    {
      id: "account",
      header: "Account",
      cell: ({ row }) => {
        const account = row.original.account;
        return account ? (
          <div className="flex items-center gap-1">
            {account.color && (
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: account.color }}
              />
            )}
            <span>{account.name}</span>
          </div>
        ) : (
          "—"
        );
      },
    },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) => {
        const category = row.original.category;
        return category ? (
          <Badge variant="secondary">{category.name}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "paymentStatus",
      header: "Status",
      cell: ({ row }) => {
        const expense = row.original;
        const status = row.getValue("paymentStatus") as string;
        return (
          <div className="flex items-center gap-1">
            <Badge variant={status === "PAID" ? "default" : "outline"}>
              {PAYMENT_STATUS_LABELS[status] ?? status}
            </Badge>
            {expense.payingAccount && status === "NOT_PAID" && (
              <span className="text-muted-foreground text-xs">
                via {expense.payingAccount.name}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const expense = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(expense)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(expense)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
