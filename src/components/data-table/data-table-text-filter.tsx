"use client";

import { Column } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type Props<TData, TValue> = {
  column: Column<TData, TValue>;
  placeholder: string;
};

export function DataTableTextFilter<TData, TValue>({
  column,
  placeholder,
}: Props<TData, TValue>) {
  const value = (column.getFilterValue() as string) ?? "";

  return (
    <div className="relative">
      <Search className="text-muted-foreground pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => column.setFilterValue(e.target.value || undefined)}
        className="h-8 w-[180px] pl-7"
      />
    </div>
  );
}
