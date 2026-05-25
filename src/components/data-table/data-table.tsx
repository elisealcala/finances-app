"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  type RowData,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableToolbar } from "./data-table-toolbar";
import { detectFilterType, type FilterType } from "./detect-filter-type";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    filterType?: FilterType;
    filterable?: boolean;
  }
}

// Re-export to satisfy unused import in declare module
export type { RowData };

type Props<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  emptyMessage?: string;
  onFilteredDataChange?: (rows: TData[]) => void;
  rowClassName?: (row: TData) => string | undefined;
};

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  emptyMessage = "No results.",
  onFilteredDataChange,
  rowClassName,
}: Props<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Auto-detect filter types per column
  const columnFilterTypes = useMemo(() => {
    const map = new Map<string, FilterType>();
    for (const col of columns) {
      const accessorKey = (col as { accessorKey?: string }).accessorKey;
      const accessorFn = (col as { accessorFn?: (row: TData) => unknown }).accessorFn;
      const id = (col as { id?: string }).id ?? accessorKey;
      if (!id) continue;
      const meta = col.meta as { filterType?: FilterType; filterable?: boolean } | undefined;
      if (meta?.filterable === false) continue;
      if (meta?.filterType) {
        map.set(id, meta.filterType);
        continue;
      }
      if (data.length > 0) {
        let values: unknown[] = [];
        if (accessorFn) {
          values = data.map((row) => accessorFn(row));
        } else if (accessorKey) {
          values = data.map((row) => (row as Record<string, unknown>)[accessorKey]);
        }
        if (values.length > 0) {
          map.set(id, detectFilterType(values));
        }
      }
    }
    return map;
  }, [columns, data]);

  // Compute a stable fingerprint of unique values per faceted column
  const facetedValuesKey = useMemo(() => {
    const parts: string[] = [];
    for (const [id, type] of columnFilterTypes.entries()) {
      if (type !== "select" && type !== "boolean") continue;
      const col = columns.find(
        (c) => ((c as { id?: string }).id ?? (c as { accessorKey?: string }).accessorKey) === id,
      );
      const accessorKey = (col as { accessorKey?: string })?.accessorKey;
      const accessorFn = (col as { accessorFn?: (row: TData) => unknown })?.accessorFn;
      let values: string[] = [];
      if (accessorFn) {
        values = [...new Set(data.map((row) => String(accessorFn(row))))].sort();
      } else if (accessorKey) {
        values = [...new Set(data.map((row) => String((row as Record<string, unknown>)[accessorKey])))].sort();
      }
      parts.push(`${id}:${values.join(",")}`);
    }
    return parts.join("|");
  }, [data, columnFilterTypes, columns]);

  // Auto-select all values for faceted filters on first load. When the
  // dataset's unique values change later (new month, new expense, etc.), keep
  // the filter in sync ONLY if the user is still on the default "all selected"
  // state. Any manual narrowing the user has done is preserved verbatim.
  const prevFacetedKey = useRef("");
  const prevAllValuesRef = useRef(new Map<string, string[]>());
  useEffect(() => {
    if (data.length === 0 || facetedValuesKey === prevFacetedKey.current) return;
    prevFacetedKey.current = facetedValuesKey;

    setColumnFilters((prev) => {
      let changed = false;
      const updated = [...prev];
      const existingMap = new Map(updated.map((f, i) => [f.id, i]));

      for (const [id, type] of columnFilterTypes.entries()) {
        if (type !== "select" && type !== "boolean") continue;

        const col = columns.find(
          (c) => ((c as { id?: string }).id ?? (c as { accessorKey?: string }).accessorKey) === id,
        );
        const accessorKey = (col as { accessorKey?: string })?.accessorKey;
        const accessorFn = (col as { accessorFn?: (row: TData) => unknown })?.accessorFn;
        let allValues: string[] = [];
        if (accessorFn) {
          allValues = [...new Set(data.map((row) => String(accessorFn(row))))];
        } else if (accessorKey) {
          allValues = [...new Set(data.map((row) => String((row as Record<string, unknown>)[accessorKey])))];
        }

        const prevAllValues = prevAllValuesRef.current.get(id) ?? null;
        prevAllValuesRef.current.set(id, allValues);

        if (allValues.length === 0) continue;

        const idx = existingMap.get(id);
        if (idx === undefined) {
          // First time: select all
          updated.push({ id, value: allValues });
          changed = true;
        } else {
          const current = updated[idx].value as string[];
          // Was the filter still in its "default" state (every previously-known
          // value selected)? If so, refresh it to the new full set. Otherwise
          // the user has narrowed it manually — leave it alone.
          const isDefault =
            prevAllValues !== null &&
            current.length === prevAllValues.length &&
            prevAllValues.every((v) => current.includes(v));
          if (isDefault) {
            const allMatches =
              current.length === allValues.length &&
              allValues.every((v) => current.includes(v));
            if (!allMatches) {
              updated[idx] = { id, value: allValues };
              changed = true;
            }
          }
        }
      }

      return changed ? updated : prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facetedValuesKey]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    filterFns: {
      // Multi-select filter: row value must be in array of selected values
      arrIncludesSome: (row, columnId, filterValue: string[]) => {
        const value = row.getValue(columnId);
        return filterValue.includes(String(value));
      },
    },
    // Apply auto-detected filter functions
    defaultColumn: {
      filterFn: (row, columnId, filterValue) => {
        if (filterValue === undefined || filterValue === null) return true;
        const value = row.getValue(columnId);
        const type = columnFilterTypes.get(columnId);

        if (type === "select" || type === "boolean") {
          if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
          return filterValue.includes(String(value));
        }
        if (type === "number") {
          const [min, max] = filterValue as [number?, number?];
          const num = Number(value);
          if (isNaN(num)) return false;
          if (min !== undefined && num < min) return false;
          if (max !== undefined && num > max) return false;
          return true;
        }
        if (type === "date") {
          const [start, end] = filterValue as [string?, string?];
          const d = value instanceof Date ? value : new Date(value as string);
          if (isNaN(d.getTime())) return false;
          if (start && d < new Date(start)) return false;
          if (end && d > new Date(end)) return false;
          return true;
        }
        // text
        return String(value ?? "").toLowerCase().includes(String(filterValue).toLowerCase());
      },
    },
  });

  const filteredRows = table.getFilteredRowModel().rows;
  const filteredData = useMemo(
    () => filteredRows.map((r) => r.original),
    [filteredRows],
  );

  useEffect(() => {
    onFilteredDataChange?.(filteredData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredData]);

  return (
    <div className="space-y-3">
      <DataTableToolbar table={table} columnFilterTypes={columnFilterTypes} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className={rowClassName?.(row.original)}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
