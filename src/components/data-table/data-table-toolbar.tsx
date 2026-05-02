"use client";

import { Table } from "@tanstack/react-table";
import { SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { DataTableTextFilter } from "./data-table-text-filter";
import { DataTableNumberFilter } from "./data-table-number-filter";
import type { FilterType } from "./detect-filter-type";
import type { Column } from "@tanstack/react-table";

type Props<TData> = {
  table: Table<TData>;
  columnFilterTypes: Map<string, FilterType>;
};

function renderFilter<TData>(
  column: Column<TData, unknown>,
  filterType: FilterType | undefined,
  title: string,
) {
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
      <DataTableFacetedFilter key={column.id} column={column} title={title} />
    );
  }
  if (filterType === "number") {
    return (
      <DataTableNumberFilter key={column.id} column={column} title={title} />
    );
  }
  return null;
}

export function DataTableToolbar<TData>({
  table,
  columnFilterTypes,
}: Props<TData>) {
  const isMobile = useIsMobile();
  const activeCount = table.getState().columnFilters.length;
  const isFiltered = activeCount > 0;

  const filterableColumns = table.getAllColumns().filter((col) => {
    const meta = col.columnDef.meta as { filterable?: boolean } | undefined;
    return (
      col.getCanFilter() &&
      meta?.filterable !== false &&
      columnFilterTypes.has(col.id)
    );
  });

  const filterEntries = filterableColumns.map((column) => {
    const filterType = columnFilterTypes.get(column.id);
    const header = column.columnDef.header;
    const title =
      typeof header === "string"
        ? header
        : column.id.charAt(0).toUpperCase() + column.id.slice(1);
    return { column, filterType, title };
  });

  if (isMobile) {
    return (
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
              {activeCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 rounded-full px-2 py-0 text-xs"
                >
                  {activeCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[85dvh] overflow-y-auto"
          >
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-3 px-4 pb-4">
              {filterEntries.map(({ column, filterType, title }) => (
                <div key={column.id} className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground text-xs font-medium">
                    {title}
                  </span>
                  {renderFilter(column, filterType, title)}
                </div>
              ))}
              {isFiltered && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => table.resetColumnFilters()}
                  className="mt-2 self-start"
                >
                  Clear all
                  <X className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filterEntries.map(({ column, filterType, title }) =>
        renderFilter(column, filterType, title),
      )}

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
