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
import {
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  Lock,
  Banknote,
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import type { CreditCardStatement } from "@/types/finances";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  OPEN: "outline",
  CLOSED: "secondary",
  PAID: "default",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  CLOSED: "Closed",
  PAID: "Paid",
};

type StatementRow = CreditCardStatement & {
  account?: { name: string; currency: string; color: string | null };
  expenseCount?: number;
  totalsByCurrency?: Record<string, number>;
};

type ColumnsConfig = {
  onEdit: (statement: StatementRow) => void;
  onClose: (statement: StatementRow) => void;
  onPay: (statement: StatementRow) => void;
  onDelete: (statement: StatementRow) => void;
};

export function getStatementColumns({
  onEdit,
  onClose,
  onPay,
  onDelete,
}: ColumnsConfig): ColumnDef<StatementRow>[] {
  return [
    {
      id: "card",
      accessorFn: (row) => row.account?.name ?? "Unknown",
      header: "Card",
      cell: ({ row }) => {
        const account = row.original.account;
        return (
          <div className="flex items-center gap-2">
            {account?.color && (
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: account.color }}
              />
            )}
            <span className="font-medium">{account?.name ?? "Unknown"}</span>
          </div>
        );
      },
      meta: { filterType: "select" as const },
    },
    {
      id: "period",
      accessorFn: (row) => `${row.year}-${String(row.month).padStart(2, "0")}`,
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Period
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">
          {format(new Date(0, row.original.month - 1), "MMMM")} {row.original.year}
        </span>
      ),
      meta: { filterable: false },
    },
    {
      accessorKey: "billingCloseDate",
      header: "Billing Close",
      cell: ({ row }) => format(new Date(row.original.billingCloseDate), "dd-MM-yyyy"),
      meta: { filterable: false },
    },
    {
      accessorKey: "paymentDueDate",
      header: "Payment Due",
      cell: ({ row }) => format(new Date(row.original.paymentDueDate), "dd-MM-yyyy"),
      meta: { filterable: false },
    },
    {
      id: "total",
      header: "Total",
      cell: ({ row }) => {
        const totalsByCurrency = row.original.totalsByCurrency;
        if (!totalsByCurrency || Object.keys(totalsByCurrency).length === 0) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <div className="font-mono tabular-nums">
            {Object.entries(totalsByCurrency).map(([currency, total]) => (
              <div key={currency}>
                {formatCurrency(total, currency as "PEN" | "USD" | "EUR")}
              </div>
            ))}
          </div>
        );
      },
      meta: { filterable: false },
    },
    {
      accessorKey: "expenseCount",
      header: "Expenses",
      cell: ({ row }) => row.original.expenseCount ?? 0,
      meta: { filterable: false },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge variant={STATUS_VARIANT[status] ?? "outline"}>
            {STATUS_LABELS[status] ?? status}
          </Badge>
        );
      },
      meta: { filterType: "select" as const },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const statement = row.original;
        return (
          <div className="flex items-center gap-1">
            {statement.status === "OPEN" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onClose(statement)}
              >
                <Lock className="mr-1 h-3 w-3" />
                Close
              </Button>
            )}
            {statement.status === "CLOSED" && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onPay(statement)}
              >
                <Banknote className="mr-1 h-3 w-3" />
                Pay
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(statement)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(statement)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      meta: { filterable: false },
    },
  ];
}
