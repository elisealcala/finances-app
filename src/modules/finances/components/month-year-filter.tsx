"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTHS } from "@/lib/utils";

type MonthYearFilterProps = {
  year: number;
  month: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2020 + 2 }, (_, i) => 2020 + i);

export function MonthYearFilter({
  year,
  month,
  onYearChange,
  onMonthChange,
  onPrev,
  onNext,
  onToday,
}: MonthYearFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={onPrev}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Select
        value={String(month)}
        onValueChange={(v) => onMonthChange(parseInt(v))}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((m, i) => (
            <SelectItem key={i} value={String(i + 1)}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(year)}
        onValueChange={(v) => onYearChange(parseInt(v))}
      >
        <SelectTrigger className="w-[90px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {YEARS.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" size="icon" onClick={onNext}>
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="sm" onClick={onToday}>
        Today
      </Button>
    </div>
  );
}
