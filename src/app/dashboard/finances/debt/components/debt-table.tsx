"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EyeOff } from "lucide-react";
import { getColumns } from "./columns";
import type { Debt } from "@/types/debt";

type DebtTableProps = {
  debts: Debt[];
  isLoading?: boolean;
  onEdit?: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
  onView?: (debt: Debt) => void;
  onToggleVisibility?: (debtId: string) => void;
  isHidden?: (debtId: string) => boolean;
  hiddenCount?: number;
  onShowAll?: () => void;
};

export function DebtTable({
  debts,
  isLoading,
  onEdit,
  onDelete,
  onView,
  onToggleVisibility,
  isHidden,
  hiddenCount = 0,
  onShowAll,
}: DebtTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = getColumns({ onEdit, onDelete, onView, onToggleVisibility, isHidden });

  const table = useReactTable({
    data: debts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  if (isLoading) return <DebtTableSkeleton />;

  return (
    <div className="space-y-2">
      {hiddenCount > 0 && (
        <div className="bg-muted/50 flex items-center gap-2 rounded-md px-4 py-2 text-sm">
          <EyeOff className="h-4 w-4" />
          <span>
            {hiddenCount} debt{hiddenCount > 1 ? "s" : ""} hidden from chart
            and summary
          </span>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0"
            onClick={onShowAll}
          >
            Show all
          </Button>
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No debts found. Add your first debt to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DebtTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 8 }).map((_, j) => (
                <TableCell key={j}>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
