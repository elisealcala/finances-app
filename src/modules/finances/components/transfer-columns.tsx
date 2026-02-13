"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import type { Transfer } from "../types";

type ColumnsConfig = {
  onEdit: (transfer: Transfer) => void;
  onDelete: (transfer: Transfer) => void;
};

export function getTransferColumns({
  onEdit,
  onDelete,
}: ColumnsConfig): ColumnDef<Transfer>[] {
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
      cell: ({ row }) => formatCurrency(Number(row.getValue("amount"))),
    },
    {
      id: "fromTo",
      header: "From / To",
      cell: ({ row }) => {
        const from = row.original.fromAccount;
        const to = row.original.toAccount;
        return (
          <div className="flex items-center gap-1 text-sm">
            <span>{from?.name ?? "—"}</span>
            <ArrowRight className="h-3 w-3" />
            <span>{to?.name ?? "—"}</span>
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const transfer = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(transfer)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(transfer)}
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
