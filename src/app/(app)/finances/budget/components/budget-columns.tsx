"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, MoreHorizontal, Pencil, Archive, ArchiveRestore } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import type { BudgetStatus } from "@/types/finances";

type ColumnsConfig = {
  onEdit: (budget: BudgetStatus) => void;
  onArchive: (budget: BudgetStatus) => void;
};

export function getBudgetColumns({
  onEdit,
  onArchive,
}: ColumnsConfig): ColumnDef<BudgetStatus>[] {
  return [
    {
      accessorKey: "categoryName",
      header: "Category",
      cell: ({ row }) => {
        const budget = row.original;
        return (
          <div className="flex items-center gap-2">
            {budget.color && (
              <div
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: budget.color }}
              />
            )}
            <span className="font-medium">{budget.categoryName}</span>
          </div>
        );
      },
      meta: { filterType: "select" as const },
    },
    {
      accessorKey: "budget",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Budget
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">
          {formatCurrency(row.getValue("budget"))}
        </span>
      ),
      meta: { filterable: false },
    },
    {
      accessorKey: "grossSpent",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Expenses
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-destructive font-mono tabular-nums">
          {formatCurrency(row.getValue("grossSpent"))}
        </span>
      ),
      meta: { filterable: false },
    },
    {
      accessorKey: "categoryIncome",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Income
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const income = row.getValue("categoryIncome") as number;
        return (
          <span className={`font-mono tabular-nums ${income > 0 ? "text-positive" : "text-muted-foreground"}`}>
            {formatCurrency(income)}
          </span>
        );
      },
      meta: { filterable: false },
    },
    {
      accessorKey: "spent",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Net Spent
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono font-medium tabular-nums">
          {formatCurrency(row.getValue("spent"))}
        </span>
      ),
      meta: { filterable: false },
    },
    {
      accessorKey: "remaining",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Remaining
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const remaining = row.getValue("remaining") as number;
        return (
          <span
            className={`font-mono tabular-nums ${remaining < 0 ? "text-destructive" : "text-positive"}`}
          >
            {formatCurrency(remaining)}
          </span>
        );
      },
      meta: { filterable: false },
    },
    {
      accessorKey: "percentUsed",
      header: "Progress",
      cell: ({ row }) => {
        const percent = row.getValue("percentUsed") as number;
        return (
          <div className="flex items-center gap-2">
            <Progress
              value={Math.min(percent, 100)}
              className={`h-2 w-24 ${
                percent > 100
                  ? "[&>div]:bg-destructive"
                  : percent > 80
                    ? "[&>div]:bg-warning"
                    : "[&>div]:bg-positive"
              }`}
            />
            <span className="text-muted-foreground font-mono text-xs tabular-nums">
              {percent.toFixed(0)}%
            </span>
          </div>
        );
      },
      meta: { filterable: false },
    },
    {
      id: "status",
      accessorFn: (row) =>
        row.percentUsed > 100 ? "Over Budget" : row.percentUsed > 80 ? "Warning" : "On Track",
      header: "Status",
      cell: ({ row }) => {
        const percent = row.original.percentUsed;
        if (percent > 100) {
          return <span className="text-destructive text-sm font-medium">Over budget</span>;
        }
        if (percent > 80) {
          return <span className="text-warning text-sm font-medium">Warning</span>;
        }
        return <span className="text-positive text-sm font-medium">On track</span>;
      },
      meta: { filterType: "select" as const },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const budget = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(budget)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Budget
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onArchive(budget)}>
                {budget.isArchived ? (
                  <>
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    Unarchive
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      meta: { filterable: false },
    },
  ];
}
