"use client";

import { Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { DataTableTextFilter } from "./data-table-text-filter";
import { DataTableNumberFilter } from "./data-table-number-filter";
import type { FilterType } from "./detect-filter-type";

type Props<TData> = {
  table: Table<TData>;
  columnFilterTypes: Map<string, FilterType>;
};

export function DataTableToolbar<TData>({
  table,
  columnFilterTypes,
}: Props<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  const filterableColumns = table.getAllColumns().filter((col) => {
    const meta = col.columnDef.meta as { filterable?: boolean } | undefined;
    return col.getCanFilter() && meta?.filterable !== false && columnFilterTypes.has(col.id);
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filterableColumns.map((column) => {
        const filterType = columnFilterTypes.get(column.id);
        const header = column.columnDef.header;
        const title =
          typeof header === "string" ? header : column.id.charAt(0).toUpperCase() + column.id.slice(1);

        if (filterType === "text") {
          return (
            <DataTableTextFilter
              key={column.id}
              column={column}
              placeholder={`Search ${title.toLowerCase()}...`}
            />
          );
        }
        if (filterType === "select" || filterType === "boolean") {
          return (
            <DataTableFacetedFilter
              key={column.id}
              column={column}
              title={title}
            />
          );
        }
        if (filterType === "number") {
          return (
            <DataTableNumberFilter
              key={column.id}
              column={column}
              title={title}
            />
          );
        }
        return null;
      })}

      {isFiltered && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => table.resetColumnFilters()}
          className="h-8 px-2"
        >
          Clear
          <X className="ml-1 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
