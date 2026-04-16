"use client";

import { Column } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";

type Props<TData, TValue> = {
  column: Column<TData, TValue>;
  title: string;
};

export function DataTableNumberFilter<TData, TValue>({
  column,
  title,
}: Props<TData, TValue>) {
  const [min, max] = (column.getFilterValue() as [number?, number?]) ?? [undefined, undefined];

  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground text-xs">{title}:</span>
      <Input
        type="number"
        placeholder="Min"
        value={min ?? ""}
        onChange={(e) => {
          const v = e.target.value === "" ? undefined : Number(e.target.value);
          column.setFilterValue([v, max]);
        }}
        className="h-8 w-[80px]"
      />
      <span className="text-muted-foreground text-xs">to</span>
      <Input
        type="number"
        placeholder="Max"
        value={max ?? ""}
        onChange={(e) => {
          const v = e.target.value === "" ? undefined : Number(e.target.value);
          column.setFilterValue([min, v]);
        }}
        className="h-8 w-[80px]"
      />
    </div>
  );
}
