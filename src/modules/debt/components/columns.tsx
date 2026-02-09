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
import { MoreHorizontal, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { formatCurrency, formatPercentage, DEBT_TYPE_LABELS } from "@/lib/utils";
import type { Debt } from "../types";

type ColumnsConfig = {
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
  onToggleVisibility?: (debtId: string) => void;
  isHidden?: (debtId: string) => boolean;
};

export function getColumns({ onEdit, onDelete, onToggleVisibility, isHidden }: ColumnsConfig): ColumnDef<Debt>[] {
  return [
    ...(onToggleVisibility
      ? [
          {
            id: "visibility",
            header: () => <span className="sr-only">Visibility</span>,
            cell: ({ row }: { row: { original: Debt } }) => {
              const debt = row.original;
              const hidden = isHidden?.(debt.id) ?? false;
              return (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onToggleVisibility(debt.id)}
                >
                  {hidden ? (
                    <EyeOff className="text-muted-foreground h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              );
            },
          } as ColumnDef<Debt>,
        ]
      : []),
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const hidden = isHidden?.(row.original.id) ?? false;
        return (
          <div className={`font-medium ${hidden ? "opacity-50" : ""}`}>
            {row.getValue("name")}
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {DEBT_TYPE_LABELS[row.getValue("type") as string] ?? row.getValue("type")}
        </Badge>
      ),
    },
    {
      accessorKey: "balance",
      header: "Balance",
      cell: ({ row }) => formatCurrency(Number(row.getValue("balance"))),
    },
    {
      accessorKey: "interestRate",
      header: "Rate",
      cell: ({ row }) =>
        formatPercentage(Number(row.getValue("interestRate"))),
    },
    {
      accessorKey: "minimumPayment",
      header: "Min Payment",
      cell: ({ row }) =>
        formatCurrency(Number(row.getValue("minimumPayment"))),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={status === "ACTIVE" ? "default" : "outline"}>
            {status === "ACTIVE" ? "Active" : "Paid Off"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const debt = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(debt)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(debt)}
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
