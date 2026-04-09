"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type { usePeriodFilter } from "../hooks/use-period-filter";

type PeriodSelectorProps = ReturnType<typeof usePeriodFilter>;

const MONTH_LABELS = [
  "Jan", "Feb", "Mar",
  "Apr", "May", "Jun",
  "Jul", "Aug", "Sep",
  "Oct", "Nov", "Dec",
];

export function PeriodSelector(period: PeriodSelectorProps) {
  const [open, setOpen] = useState(false);
  const [gridYear, setGridYear] = useState(period.year);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Determine which preset is active
  const activePreset = (() => {
    if (period.month === currentMonth && period.year === currentYear) return "this-month";
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    if (period.month === lastMonth && period.year === lastMonthYear) return "last-month";
    if (period.month === undefined && period.year === currentYear) return "this-year";
    if (period.month === undefined && period.year === currentYear - 1) return "last-year";
    return null;
  })();

  function selectMonth(m: number) {
    period.setYear(gridYear);
    period.setMonth(m);
    setOpen(false);
  }

  function selectFullYear() {
    period.setYear(gridYear);
    period.setMonth(undefined);
    setOpen(false);
  }

  function handlePreset(preset: "this-month" | "last-month" | "this-year" | "last-year") {
    if (preset === "this-month") period.setThisMonth();
    else if (preset === "last-month") period.setLastMonth();
    else if (preset === "this-year") period.setThisYear();
    else if (preset === "last-year") period.setLastYear();
    setOpen(false);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={period.goToPrev}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={open} onOpenChange={(o) => {
        setOpen(o);
        if (o) setGridYear(period.year);
      }}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[180px] justify-start gap-2">
            <CalendarDays className="h-4 w-4" />
            {period.label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Presets */}
            <div className="border-r p-3 space-y-1 min-w-[130px]">
              <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Quick Select</p>
              {([
                { key: "this-month", label: "This month" },
                { key: "last-month", label: "Last month" },
                { key: "this-year", label: "This year" },
                { key: "last-year", label: "Last year" },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handlePreset(key)}
                  className={cn(
                    "w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors",
                    activePreset === key
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Month grid */}
            <div className="p-3 min-w-[200px]">
              <div className="flex items-center justify-between mb-3">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setGridYear((y) => y - 1)}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-sm font-medium">{gridYear}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setGridYear((y) => y + 1)}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {MONTH_LABELS.map((label, i) => {
                  const m = i + 1;
                  const isSelected = period.month === m && period.year === gridYear;
                  return (
                    <button
                      key={m}
                      onClick={() => selectMonth(m)}
                      className={cn(
                        "text-sm py-1.5 px-2 rounded-md transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 pt-2 border-t">
                <button
                  onClick={selectFullYear}
                  className={cn(
                    "w-full text-sm py-1.5 px-2 rounded-md transition-colors",
                    period.month === undefined && period.year === gridYear
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  )}
                >
                  Full Year {gridYear}
                </button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button variant="outline" size="icon" onClick={period.goToNext}>
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="sm" onClick={period.goToToday}>
        Today
      </Button>
    </div>
  );
}
